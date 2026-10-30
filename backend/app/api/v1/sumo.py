import os
import asyncio
import logging
from typing import Optional, Dict, Any, List
from pathlib import Path
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, HTTPException, status
from pydantic import BaseModel, Field

from app.sumo.manager import SUMOSimulationManager
from app.sumo.generator import get_sumo_paths, generate_urban_scenario

logger = logging.getLogger("fluxv2x.api.sumo")
router = APIRouter(prefix="/sumo", tags=["SUMO Mobility Lab"])

class SUMOStartRequest(BaseModel):
    scenario_name: str = Field(default="urban_grid", description="Scenario name")
    duration: int = Field(default=120, ge=10, le=600, description="Simulation duration in seconds")
    demand_period: float = Field(default=2.0, ge=0.5, le=10.0, description="Vehicle emission interval (seconds/veh)")
    attack_enabled: bool = Field(default=False, description="Enable simulated flooding attack")
    attacker_id: Optional[str] = Field(default=None, description="Specific vehicle ID to execute attack")
    target_receiver: str = Field(default="RSU_Central", description="Target receiver or RSU node")
    attack_intensity: float = Field(default=80.0, ge=20.0, le=500.0, description="Attack packet rate (packets/sec)")
    attack_start_time: float = Field(default=15.0, ge=0.0, description="Simulation time when flooding begins")
    packet_rate_multiplier: float = Field(default=8.0, ge=2.0, le=30.0, description="Traffic multiplier during flood")

@router.get("/status")
def get_simulation_status():
    """Returns the current SUMO simulation status, vehicle observations, and ACAFDM mitigation metrics."""
    mgr = SUMOSimulationManager.get_instance()
    return mgr.get_status()

@router.get("/network")
def get_network_topology(scenario: str = "urban_grid"):
    """Returns the SUMO road network topology (edges, lanes, junctions, bounding box) for visual rendering."""
    mgr = SUMOSimulationManager.get_instance()
    scenarios_dir = Path(__file__).parent.parent.parent / "sumo" / "scenarios"
    net_path = str(scenarios_dir / f"{scenario}.net.xml")
    topo = mgr.load_network_topology(net_path)
    return topo

@router.get("/scenarios")
def list_scenarios():
    """Lists available SUMO scenarios and system binaries."""
    scenarios_dir = Path(__file__).parent.parent.parent / "sumo" / "scenarios"
    scenarios_dir.mkdir(parents=True, exist_ok=True)
    scenarios = []
    for cfg in scenarios_dir.glob("*.sumocfg"):
        scenarios.append({
            "name": cfg.stem,
            "config_file": cfg.name,
            "has_net": (scenarios_dir / f"{cfg.stem}.net.xml").exists(),
            "has_routes": (scenarios_dir / f"{cfg.stem}.rou.xml").exists(),
        })

    paths = get_sumo_paths()
    return {
        "scenarios": scenarios,
        "sumo_paths": paths,
        "sumo_available": Path(paths["sumo_bin"]).exists() if paths.get("sumo_bin") else False
    }

@router.post("/generate")
def generate_scenario(
    grid_number: int = Query(4, ge=2, le=8),
    grid_length: float = Query(150.0, ge=50.0, le=400.0),
    duration: int = Query(120, ge=30, le=600),
    demand_period: float = Query(2.0, ge=0.5, le=10.0),
    scenario_name: str = Query("urban_grid")
):
    """Generates a new SUMO road network and trip configuration via netgenerate and randomTrips."""
    try:
        res = generate_urban_scenario(
            grid_number=grid_number,
            grid_length=grid_length,
            duration_seconds=duration,
            vehicle_demand_period=demand_period,
            scenario_name=scenario_name
        )
        return {"status": "SUCCESS", "scenario": res}
    except Exception as e:
        logger.error(f"Failed to generate scenario: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/start")
def start_simulation(req: SUMOStartRequest):
    """Launches the real SUMO simulation via TraCI."""
    mgr = SUMOSimulationManager.get_instance()
    res = mgr.start_simulation(
        scenario_name=req.scenario_name,
        duration=req.duration,
        demand_period=req.demand_period,
        attack_enabled=req.attack_enabled,
        attacker_id=req.attacker_id,
        target_receiver=req.target_receiver,
        attack_intensity=req.attack_intensity,
        attack_start_time=req.attack_start_time,
        packet_rate_multiplier=req.packet_rate_multiplier
    )
    return res

@router.post("/stop")
def stop_simulation():
    """Stops the active SUMO simulation cleanly."""
    mgr = SUMOSimulationManager.get_instance()
    res = mgr.stop_simulation()
    return res

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """
    Streams live SUMO vehicle positions, communication events, and ACAFDM mitigation decisions
    directly to connected frontend visualization clients.
    """
    await websocket.accept()
    mgr = SUMOSimulationManager.get_instance()
    try:
        while True:
            status_data = mgr.get_status()
            await websocket.send_json(status_data)
            await asyncio.sleep(0.4)
    except WebSocketDisconnect:
        logger.debug("SUMO WebSocket client disconnected.")
    except Exception as e:
        logger.debug(f"SUMO WebSocket stream ended: {e}")

