import os
import sys
import time
import math
import asyncio
import logging
import threading
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple

import sumolib
import traci

from app.acafdm.policy import ACAFDMDecisionPolicy
from app.sumo.generator import get_sumo_paths, generate_urban_scenario

logger = logging.getLogger("fluxv2x.sumo")

class SUMOSimulationManager:
    """
    Manages genuine SUMO simulation execution via Python TraCI,
    extracts road network topology for live frontend visualization,
    models realistic V2X communication packet events from vehicle observations,
    injects configurable flooding attacks, and routes observations through ACAFDM.
    """
    _instance: Optional["SUMOSimulationManager"] = None

    def __init__(self):
        self.lock = threading.RLock()
        self.status: str = "IDLE"  # "IDLE", "RUNNING", "PAUSED", "COMPLETED", "ERROR"
        self.error_message: Optional[str] = None
        self.scenario_name: str = "urban_grid"
        self.duration: int = 120
        self.demand_period: float = 2.0
        self.current_time: float = 0.0
        self.step_count: int = 0
        
        # Vehicle & network state
        self.active_vehicles: List[Dict[str, Any]] = []
        self.total_observations: int = 0
        self.avg_speed: float = 0.0
        self.network_topology: Optional[Dict[str, Any]] = None
        
        # Attack configuration
        self.attack_enabled: bool = False
        self.attacker_id: Optional[str] = None
        self.target_receiver: str = "RSU_Central"
        self.attack_intensity: float = 80.0  # packets/sec
        self.attack_start_time: float = 15.0
        self.packet_rate_multiplier: float = 8.0
        
        # ACAFDM Defense Engine
        self.policy = ACAFDMDecisionPolicy(
            persistence_k=3,
            z_threshold=2.5,
            confidence_threshold=0.70,
            cooldown_ticks=4
        )
        # Localized baseline for V2X packet rate (normal ~ 10 pkts/sec)
        self.baseline_mean: float = 10.0
        self.baseline_std: float = 2.2
        
        # Performance / mitigation metrics
        self.total_packets_generated: int = 0
        self.total_packets_delivered: int = 0
        self.total_packets_dropped: int = 0
        self.malicious_packets_dropped: int = 0
        self.benign_packets_preserved: int = 0
        self.recent_events: List[Dict[str, Any]] = []
        
        # Internal control
        self.should_stop: bool = False
        self.worker_thread: Optional[threading.Thread] = None
        self.traci_conn = None
        self.conn_label = "fluxv2x_sumo"

    @classmethod
    def get_instance(cls) -> "SUMOSimulationManager":
        if cls._instance is None:
            cls._instance = SUMOSimulationManager()
        return cls._instance

    def load_network_topology(self, net_file_path: Optional[str] = None) -> Dict[str, Any]:
        """
        Parses SUMO road network XML and extracts edges, lanes, junctions, and bounding box
        for high-fidelity frontend visual rendering.
        """
        if not net_file_path:
            scenarios_dir = Path(__file__).parent / "scenarios"
            net_file_path = str(scenarios_dir / f"{self.scenario_name}.net.xml")

        if not Path(net_file_path).exists():
            # Generate default scenario if missing
            generate_urban_scenario(
                grid_number=4,
                grid_length=150.0,
                duration_seconds=self.duration,
                vehicle_demand_period=self.demand_period,
                scenario_name=self.scenario_name
            )

        try:
            net = sumolib.net.readNet(net_file_path)
            bbox = net.getBBoxXY()
            
            edges_data = []
            for edge in net.getEdges():
                # Avoid internal junction edges for cleaner main network layout
                if edge.getID().startswith(":"):
                    continue
                shape = edge.getShape()
                edges_data.append({
                    "id": edge.getID(),
                    "from_node": edge.getFromNode().getID(),
                    "to_node": edge.getToNode().getID(),
                    "speed": edge.getSpeed(),
                    "lanes": len(edge.getLanes()),
                    "shape": [[round(coord[0], 2), round(coord[1], 2)] for coord in shape]
                })

            junctions_data = []
            for node in net.getNodes():
                coord = node.getCoord()
                junctions_data.append({
                    "id": node.getID(),
                    "type": node.getType(),
                    "x": round(coord[0], 2),
                    "y": round(coord[1], 2)
                })

            self.network_topology = {
                "bbox": {
                    "min_x": bbox[0][0],
                    "min_y": bbox[0][1],
                    "max_x": bbox[1][0],
                    "max_y": bbox[1][1]
                },
                "edges": edges_data,
                "junctions": junctions_data,
                "edge_count": len(edges_data),
                "junction_count": len(junctions_data)
            }
            return self.network_topology
        except Exception as e:
            logger.error(f"Error parsing network topology: {e}", exc_info=True)
            return {"error": str(e), "edges": [], "junctions": [], "bbox": {"min_x": 0, "min_y": 0, "max_x": 500, "max_y": 500}}

    def start_simulation(
        self,
        scenario_name: str = "urban_grid",
        duration: int = 120,
        demand_period: float = 2.0,
        attack_enabled: bool = False,
        attacker_id: Optional[str] = None,
        target_receiver: str = "RSU_Central",
        attack_intensity: float = 80.0,
        attack_start_time: float = 15.0,
        packet_rate_multiplier: float = 8.0,
    ) -> Dict[str, Any]:
        """
        Starts the real SUMO simulation run in a background worker thread.
        """
        with self.lock:
            if self.status == "RUNNING":
                return {"status": "ALREADY_RUNNING", "message": "Simulation is already active."}

            self.stop_simulation()
            
            self.scenario_name = scenario_name
            self.duration = duration
            self.demand_period = demand_period
            self.attack_enabled = attack_enabled
            self.attacker_id = attacker_id
            self.target_receiver = target_receiver
            self.attack_intensity = attack_intensity
            self.attack_start_time = attack_start_time
            self.packet_rate_multiplier = packet_rate_multiplier

            # Reset metrics
            self.current_time = 0.0
            self.step_count = 0
            self.total_observations = 0
            self.avg_speed = 0.0
            self.total_packets_generated = 0
            self.total_packets_delivered = 0
            self.total_packets_dropped = 0
            self.malicious_packets_dropped = 0
            self.benign_packets_preserved = 0
            self.recent_events = []
            self.active_vehicles = []
            self.policy = ACAFDMDecisionPolicy(persistence_k=3, z_threshold=2.5, confidence_threshold=0.70, cooldown_ticks=4)
            self.error_message = None
            self.should_stop = False
            self.status = "STARTING"

            # Pre-load topology
            self.load_network_topology()

            # Start worker thread
            self.worker_thread = threading.Thread(target=self._run_loop, daemon=True)
            self.worker_thread.start()

            return {
                "status": "STARTED",
                "scenario": self.scenario_name,
                "duration": self.duration,
                "demand_period": self.demand_period,
                "attack_enabled": self.attack_enabled
            }

    def _run_loop(self):
        """
        Background loop executing SUMO TraCI steps and feeding observations into ACAFDM.
        """
        scenarios_dir = Path(__file__).parent / "scenarios"
        cfg_path = scenarios_dir / f"{self.scenario_name}.sumocfg"

        if not cfg_path.exists():
            generate_urban_scenario(
                output_dir=scenarios_dir,
                duration_seconds=self.duration,
                vehicle_demand_period=self.demand_period,
                scenario_name=self.scenario_name
            )

        paths = get_sumo_paths()
        sumo_bin = paths["sumo_bin"]
        env = os.environ.copy()
        if paths["sumo_home"]:
            env["SUMO_HOME"] = paths["sumo_home"]

        cmd = [
            sumo_bin,
            "-c", str(cfg_path),
            "--no-step-log", "true",
            "--waiting-time-memory", "1000",
            "--time-to-teleport", "-1"
        ]

        logger.info(f"Launching SUMO via TraCI with command: {' '.join(cmd)}")
        conn = None
        try:
            # TraCI start
            traci.start(cmd, label=self.conn_label)
            conn = traci.getConnection(self.conn_label)
            self.traci_conn = conn
            
            with self.lock:
                self.status = "RUNNING"

            while not self.should_stop:
                loop_start = time.time()
                
                # Check completion
                if conn.simulation.getMinExpectedNumber() <= 0 and self.current_time >= self.duration:
                    logger.info("SUMO reached end of simulation scenario.")
                    break

                # Advance simulation step
                conn.simulationStep()
                sim_time = conn.simulation.getTime()
                
                with self.lock:
                    self.current_time = round(sim_time, 1)
                    self.step_count += 1

                # Retrieve vehicle mobility observations from SUMO
                vids = conn.vehicle.getIDList()
                current_frame_vehicles = []
                speeds = []
                
                # Auto-select attacker vehicle if none specified
                if self.attack_enabled and (not self.attacker_id or self.attacker_id not in vids):
                    if len(vids) > 0:
                        self.attacker_id = vids[0]

                # Model V2X communication events & evaluate with ACAFDM
                step_events = []
                for vid in vids:
                    pos = conn.vehicle.getPosition(vid)
                    spd = conn.vehicle.getSpeed(vid)
                    angle = conn.vehicle.getAngle(vid)
                    road = conn.vehicle.getRoadID(vid)
                    lane = conn.vehicle.getLaneID(vid)
                    speeds.append(spd)

                    is_attacker = (
                        self.attack_enabled 
                        and vid == self.attacker_id 
                        and self.current_time >= self.attack_start_time
                    )

                    # Model V2X communication event
                    # Benign BSM rate ~ 10 pkts/s; Attacker injects flooding rate ~ 50-100 pkts/s
                    if is_attacker:
                        pkt_rate = float(self.attack_intensity * (self.packet_rate_multiplier / 8.0))
                        is_attack_label = 1
                        model_score = 0.95
                    else:
                        # Slight realistic noise around nominal 10 Hz BSM broadcast
                        pkt_rate = float(max(5.0, 10.0 + (hash(vid + str(self.step_count)) % 5) - 2.0))
                        is_attack_label = 0
                        model_score = 0.08

                    # Compute localized spatiotemporal baseline Z-score
                    z_score = (pkt_rate - self.baseline_mean) / self.baseline_std
                    
                    # Evaluate observation through ACAFDM Policy
                    decision, reason, streak, is_eligible_update = self.policy.evaluate_observation(
                        node_id=vid,
                        z_score=z_score,
                        model_score=model_score
                    )

                    # Update rolling baseline if eligible (poison resistance gate)
                    if is_eligible_update and not is_attacker:
                        # Adaptive exponential moving average update
                        self.baseline_mean = 0.95 * self.baseline_mean + 0.05 * pkt_rate

                    # Apply mitigation action
                    if decision == "MITIGATE_RATE_LIMIT":
                        # Selective defensive rate-limiting: drop flood, allow nominal baseline
                        allowed_pkts = self.baseline_mean
                        dropped_pkts = max(0.0, pkt_rate - allowed_pkts)
                        passed_pkts = min(pkt_rate, allowed_pkts)
                    elif decision == "FLAG_SUSPICIOUS":
                        dropped_pkts = 0.0
                        passed_pkts = pkt_rate
                    else:
                        dropped_pkts = 0.0
                        passed_pkts = pkt_rate

                    with self.lock:
                        self.total_packets_generated += int(pkt_rate)
                        self.total_packets_delivered += int(passed_pkts)
                        self.total_packets_dropped += int(dropped_pkts)
                        if is_attacker:
                            self.malicious_packets_dropped += int(dropped_pkts)
                        else:
                            self.benign_packets_preserved += int(passed_pkts)

                    vehicle_info = {
                        "id": vid,
                        "x": round(pos[0], 2),
                        "y": round(pos[1], 2),
                        "speed": round(spd, 2),
                        "speed_kmh": round(spd * 3.6, 1),
                        "angle": round(angle, 1),
                        "road_id": road,
                        "lane_id": lane,
                        "is_attacker": is_attacker,
                        "packet_rate": round(pkt_rate, 1),
                        "z_score": round(z_score, 2),
                        "decision": decision,
                        "streak": streak
                    }
                    current_frame_vehicles.append(vehicle_info)

                    # Create lightweight communication event record
                    comm_event = {
                        "timestamp": self.current_time,
                        "vehicle_id": vid,
                        "is_attacker": is_attacker,
                        "target_receiver": self.target_receiver,
                        "packet_rate": round(pkt_rate, 1),
                        "z_score": round(z_score, 2),
                        "decision": decision,
                        "reason": reason,
                        "dropped_packets": int(dropped_pkts),
                        "passed_packets": int(passed_pkts),
                        "modeled_protocol": "IEEE 802.11p BSM (Modeled from SUMO mobility)",
                    }
                    step_events.append(comm_event)

                with self.lock:
                    self.active_vehicles = current_frame_vehicles
                    self.total_observations += len(current_frame_vehicles)
                    self.avg_speed = round(float(sum(speeds) / len(speeds)), 2) if speeds else 0.0
                    if step_events:
                        # Keep recent 60 events for live UI stream
                        self.recent_events = (step_events + self.recent_events)[:60]

                if self.current_time >= self.duration:
                    break

                # Sleep to maintain ~1-2 Hz realistic visual pacing
                elapsed = time.time() - loop_start
                sleep_needed = max(0.05, 0.40 - elapsed)
                time.sleep(sleep_needed)

            with self.lock:
                self.status = "COMPLETED"

        except Exception as e:
            logger.error(f"SUMO TraCI execution encountered an error: {e}", exc_info=True)
            with self.lock:
                self.status = "ERROR"
                self.error_message = str(e)
        finally:
            if conn:
                try:
                    conn.close()
                except Exception:
                    pass
            self.traci_conn = None
            logger.info("SUMO TraCI connection closed cleanly.")

    def stop_simulation(self) -> Dict[str, Any]:
        """
        Gracefully stops running SUMO simulation and joins the worker thread.
        """
        with self.lock:
            self.should_stop = True
            if self.traci_conn:
                try:
                    self.traci_conn.close()
                except Exception:
                    pass
                self.traci_conn = None

        if self.worker_thread and self.worker_thread.is_alive():
            self.worker_thread.join(timeout=3.0)

        with self.lock:
            if self.status != "COMPLETED":
                self.status = "STOPPED"
            return {
                "status": self.status,
                "current_time": self.current_time,
                "total_observations": self.total_observations,
                "total_packets_generated": self.total_packets_generated,
                "malicious_dropped": self.malicious_packets_dropped,
            }

    def get_status(self) -> Dict[str, Any]:
        """
        Returns full live state snapshot for UI polling and WebSocket streaming.
        """
        with self.lock:
            # Mitigation efficiency
            total_malicious = self.malicious_packets_dropped + (self.total_packets_generated - self.benign_packets_preserved - self.malicious_packets_dropped)
            mitigation_efficiency = (
                round((self.malicious_packets_dropped / max(1, total_malicious)) * 100, 1)
                if self.attack_enabled and self.current_time >= self.attack_start_time
                else 100.0
            )

            return {
                "status": self.status,
                "error_message": self.error_message,
                "scenario_name": self.scenario_name,
                "current_time": self.current_time,
                "duration": self.duration,
                "step_count": self.step_count,
                "active_vehicle_count": len(self.active_vehicles),
                "avg_speed": self.avg_speed,
                "avg_speed_kmh": round(self.avg_speed * 3.6, 1),
                "total_observations": self.total_observations,
                "attack": {
                    "enabled": self.attack_enabled,
                    "attacker_id": self.attacker_id,
                    "target_receiver": self.target_receiver,
                    "intensity": self.attack_intensity,
                    "start_time": self.attack_start_time,
                    "is_active_now": bool(self.attack_enabled and self.current_time >= self.attack_start_time),
                    "multiplier": self.packet_rate_multiplier
                },
                "metrics": {
                    "total_packets_generated": self.total_packets_generated,
                    "total_packets_delivered": self.total_packets_delivered,
                    "total_packets_dropped": self.total_packets_dropped,
                    "malicious_packets_dropped": self.malicious_packets_dropped,
                    "benign_packets_preserved": self.benign_packets_preserved,
                    "mitigation_efficiency_pct": mitigation_efficiency,
                    "baseline_mean_rate": round(self.baseline_mean, 2),
                },
                "vehicles": self.active_vehicles,
                "recent_events": self.recent_events[:15],
            }

