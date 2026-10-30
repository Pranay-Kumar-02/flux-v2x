import os
import asyncio
import logging
from typing import Optional, Dict, Any, List
from pathlib import Path
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, HTTPException, status
from pydantic import BaseModel, Field

from app.cosim.orchestrator import CoSimulationOrchestrator
from app.cosim.scenarios import SCENARIOS_META

logger = logging.getLogger("fluxv2x.api.cosim")
router = APIRouter(prefix="/cosim", tags=["Co-Simulation Studio"])

class CoSimStartRequest(BaseModel):
    scenario_id: str = Field(default="scenario_a", description="Scenario identifier (scenario_a to scenario_e)")
    duration: int = Field(default=120, ge=10, le=600, description="Simulation duration in seconds")
    demand_period: float = Field(default=1.8, ge=0.5, le=10.0, description="Vehicle demand emission period (sec)")
    random_seed: int = Field(default=42, description="Random seed for reproducibility")
    attack_enabled: bool = Field(default=False, description="Enable malicious flooding attack")
    attacker_id: Optional[str] = Field(default=None, description="Designated attacker vehicle ID")
    target_rsu: str = Field(default="RSU_J0", description="Target RSU node")
    attack_intensity: float = Field(default=100.0, ge=20.0, le=500.0, description="Attack packet rate (pkts/sec)")
    attack_start_time: float = Field(default=15.0, ge=0.0, description="Attack onset timestamp (sec)")
    attack_duration: float = Field(default=60.0, ge=5.0, description="Attack active window (sec)")
    persistence_k: int = Field(default=3, ge=1, le=10, description="ACAFDM persistence gate threshold k")
    z_threshold: float = Field(default=2.5, ge=1.0, le=5.0, description="ACAFDM statistical deviation Z-threshold")
    rate_limit_ratio: float = Field(default=0.70, ge=0.1, le=1.0, description="Defensive rate-limiting drop ratio")

@router.get("/status")
def get_cosim_status():
    """Returns current co-simulation status, telemetry, active vehicles and RSUs."""
    orchestrator = CoSimulationOrchestrator.get_instance()
    return orchestrator.get_status()

@router.get("/scenarios")
def list_scenarios():
    """Lists all available SUMO + NS-3 co-simulation research scenarios and metadata."""
    return {
        "scenarios": list(SCENARIOS_META.values()),
        "sumo_version": "1.28.0",
        "ns3_version": "3.41",
        "wireless_standard": "IEEE 802.11p (5.9 GHz WAVE / DSRC)"
    }

@router.get("/topology")
def get_topology(scenario_id: str = Query("scenario_a")):
    """Returns the road network topology and RSU coordinates for Three.js rendering."""
    orchestrator = CoSimulationOrchestrator.get_instance()
    return orchestrator.load_scenario_topology(scenario_id)

@router.post("/start")
def start_cosim(req: CoSimStartRequest):
    """Starts the synchronized SUMO + NS-3 + ACAFDM co-simulation."""
    orchestrator = CoSimulationOrchestrator.get_instance()
    res = orchestrator.start_simulation(
        scenario_id=req.scenario_id,
        duration=req.duration,
        demand_period=req.demand_period,
        random_seed=req.random_seed,
        attack_enabled=req.attack_enabled,
        attacker_id=req.attacker_id,
        target_rsu=req.target_rsu,
        attack_intensity=req.attack_intensity,
        attack_start_time=req.attack_start_time,
        attack_duration=req.attack_duration,
        persistence_k=req.persistence_k,
        z_threshold=req.z_threshold,
        rate_limit_ratio=req.rate_limit_ratio
    )
    return res

@router.post("/pause")
def pause_cosim():
    """Pauses the co-simulation."""
    orchestrator = CoSimulationOrchestrator.get_instance()
    return orchestrator.pause_simulation()

@router.post("/resume")
def resume_cosim():
    """Resumes the paused co-simulation."""
    orchestrator = CoSimulationOrchestrator.get_instance()
    return orchestrator.resume_simulation()

@router.post("/stop")
def stop_cosim():
    """Stops the co-simulation cleanly."""
    orchestrator = CoSimulationOrchestrator.get_instance()
    return orchestrator.stop_simulation()

@router.get("/telemetry")
def get_telemetry():
    """Returns historical telemetry data series for charts."""
    orchestrator = CoSimulationOrchestrator.get_instance()
    return {
        "experiment_id": orchestrator.experiment_id,
        "history": orchestrator.telemetry_history
    }

@router.get("/replay")
def get_replay(experiment_id: Optional[str] = Query(None)):
    """Returns recorded simulation frames for digital twin timeline scrub and replay."""
    orchestrator = CoSimulationOrchestrator.get_instance()
    return orchestrator.get_replay_frames(experiment_id)

@router.websocket("/ws")
async def websocket_cosim_endpoint(websocket: WebSocket):
    """
    Streams live synchronized SUMO vehicle positions, NS-3 wireless metrics,
    and ACAFDM mitigation decisions directly to the Three.js viewport and telemetry charts.
    """
    await websocket.accept()
    orchestrator = CoSimulationOrchestrator.get_instance()
    try:
        while True:
            data = orchestrator.get_status()
            await websocket.send_json(data)
            await asyncio.sleep(0.35)
    except WebSocketDisconnect:
        logger.debug("CoSim WebSocket client disconnected.")
    except Exception as e:
        logger.debug(f"CoSim WebSocket stream finished: {e}")

