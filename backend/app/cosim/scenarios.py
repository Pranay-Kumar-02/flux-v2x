import os
import sys
import subprocess
from pathlib import Path
from typing import Dict, Any, List
import logging

logger = logging.getLogger("fluxv2x.cosim.scenarios")

def get_sumo_binaries():
    sumo_home = os.environ.get("SUMO_HOME")
    if not sumo_home or not Path(sumo_home).exists():
        cand = Path(sys.executable).parent.parent / "Lib" / "site-packages" / "sumo"
        if cand.exists():
            sumo_home = str(cand)
            os.environ["SUMO_HOME"] = sumo_home

    bin_dir = Path(sumo_home) / "bin" if sumo_home else None
    tools_dir = Path(sumo_home) / "tools" if sumo_home else None
    exe_suffix = ".exe" if sys.platform == "win32" else ""

    return {
        "sumo_home": sumo_home,
        "sumo": str(bin_dir / f"sumo{exe_suffix}") if bin_dir else "sumo",
        "netgenerate": str(bin_dir / f"netgenerate{exe_suffix}") if bin_dir else "netgenerate",
        "randomTrips": str(tools_dir / "randomTrips.py") if tools_dir else "randomTrips.py",
    }

SCENARIOS_META = {
    "scenario_a": {
        "id": "scenario_a",
        "name": "Urban Intersection Network",
        "type": "urban",
        "description": "Multi-intersection grid network with coordinated traffic lights, queuing, and 4 Roadside Units (RSUs) monitoring dense junction traffic.",
        "duration": 120,
        "default_demand_period": 1.8,
        "speed_limit": 13.89,  # 50 km/h
        "rsus": [
            {"id": "RSU_J0", "name": "RSU Downtown Core", "x": 150.0, "y": 150.0, "range": 120.0, "type": "traffic_light"},
            {"id": "RSU_J1", "name": "RSU North Ave", "x": 300.0, "y": 150.0, "range": 120.0, "type": "intersection"},
            {"id": "RSU_J2", "name": "RSU South Blvd", "x": 150.0, "y": 300.0, "range": 120.0, "type": "intersection"},
            {"id": "RSU_J3", "name": "RSU Market Square", "x": 300.0, "y": 300.0, "range": 120.0, "type": "traffic_light"}
        ]
    },
    "scenario_b": {
        "id": "scenario_b",
        "name": "Multi-Lane Highway Corridor",
        "type": "highway",
        "description": "3-lane dual carriageway corridor (1000m) with high-speed vehicle overtaking, lane changes, and 5 sequential RSUs along the arterial axis.",
        "duration": 120,
        "default_demand_period": 1.2,
        "speed_limit": 33.33,  # 120 km/h
        "rsus": [
            {"id": "RSU_HWY_01", "name": "Highway Portal West", "x": 100.0, "y": 50.0, "range": 180.0, "type": "gantry"},
            {"id": "RSU_HWY_02", "name": "Mid-Corridor Station 1", "x": 300.0, "y": 50.0, "range": 180.0, "type": "corridor"},
            {"id": "RSU_HWY_03", "name": "Central Toll Plaza", "x": 500.0, "y": 50.0, "range": 180.0, "type": "toll_plaza"},
            {"id": "RSU_HWY_04", "name": "Mid-Corridor Station 2", "x": 700.0, "y": 50.0, "range": 180.0, "type": "corridor"},
            {"id": "RSU_HWY_05", "name": "Highway Portal East", "x": 900.0, "y": 50.0, "range": 180.0, "type": "gantry"}
        ]
    },
    "scenario_c": {
        "id": "scenario_c",
        "name": "Congested Metropolitan Traffic",
        "type": "congested",
        "description": "High vehicle density grid representing metropolitan bottleneck congestion with stop-and-go shockwaves and high receiver concurrency.",
        "duration": 120,
        "default_demand_period": 0.8,
        "speed_limit": 11.11,  # 40 km/h
        "rsus": [
            {"id": "RSU_METRO_01", "name": "Metro Gateway 1", "x": 120.0, "y": 120.0, "range": 140.0, "type": "metro_hub"},
            {"id": "RSU_METRO_02", "name": "Metro Gateway 2", "x": 240.0, "y": 120.0, "range": 140.0, "type": "metro_hub"},
            {"id": "RSU_METRO_03", "name": "Metro Gateway 3", "x": 120.0, "y": 240.0, "range": 140.0, "type": "metro_hub"},
            {"id": "RSU_METRO_04", "name": "Metro Gateway 4", "x": 240.0, "y": 240.0, "range": 140.0, "type": "metro_hub"}
        ]
    },
    "scenario_d": {
        "id": "scenario_d",
        "name": "Highway Flooding Experiment",
        "type": "attack_evaluation",
        "description": "Dedicated adversarial evaluation testbed with designated high-rate flooding vehicles attacking RSUs and vehicle safety queues.",
        "duration": 120,
        "default_demand_period": 1.5,
        "speed_limit": 27.78,  # 100 km/h
        "rsus": [
            {"id": "RSU_TARGET_01", "name": "Critical Junction RSU (Target)", "x": 200.0, "y": 100.0, "range": 160.0, "type": "primary_target"},
            {"id": "RSU_TARGET_02", "name": "Secondary Bypass RSU", "x": 400.0, "y": 100.0, "range": 160.0, "type": "secondary_target"}
        ]
    },
    "scenario_e": {
        "id": "scenario_e",
        "name": "Reproducible Research Benchmark",
        "type": "benchmark",
        "description": "Standardized canonical evaluation setup with fixed random seed (4242), deterministic vehicle insertion, and immutable metrics baseline.",
        "duration": 60,
        "default_demand_period": 1.5,
        "speed_limit": 16.67,  # 60 km/h
        "rsus": [
            {"id": "RSU_BENCH_01", "name": "Benchmark Evaluation Node A", "x": 150.0, "y": 150.0, "range": 150.0, "type": "standard_benchmark"},
            {"id": "RSU_BENCH_02", "name": "Benchmark Evaluation Node B", "x": 300.0, "y": 300.0, "range": 150.0, "type": "standard_benchmark"}
        ]
    }
}

def generate_scenario_files(scenario_id: str, scenarios_dir: Path) -> Dict[str, Any]:
    """
    Generates genuine SUMO network, route, and config files for the scenario.
    """
    if scenario_id not in SCENARIOS_META:
        scenario_id = "scenario_a"

    meta = SCENARIOS_META[scenario_id]
    bins = get_sumo_binaries()
    scenarios_dir.mkdir(parents=True, exist_ok=True)

    net_file = scenarios_dir / f"{scenario_id}.net.xml"
    trips_file = scenarios_dir / f"{scenario_id}.trips.xml"
    rou_file = scenarios_dir / f"{scenario_id}.rou.xml"
    cfg_file = scenarios_dir / f"{scenario_id}.sumocfg"

    if cfg_file.exists() and net_file.exists() and rou_file.exists():
        return {
            "meta": meta,
            "net_file": str(net_file),
            "rou_file": str(rou_file),
            "cfg_file": str(cfg_file)
        }

    logger.info(f"Generating SUMO scenario: {scenario_id} ({meta['name']})")

    # Generate road network using netgenerate
    if meta["type"] == "highway":
        # 1000m corridor with 3 lanes per direction
        cmd_net = [
            bins["netgenerate"],
            "--grid",
            "--grid.x-number=5",
            "--grid.y-number=1",
            "--grid.x-length=200",
            "--grid.y-length=50",
            "--default.lanenumber=3",
            f"--default.speed={meta['speed_limit']}",
            "--output-file=" + str(net_file),
            "--no-turnarounds=false",
        ]
    else:
        # Urban / metropolitan grid network with 4x4 or 3x3 intersections
        grid_num = 4 if meta["type"] in ["urban", "congested"] else 3
        grid_len = 150.0 if meta["type"] != "congested" else 100.0
        cmd_net = [
            bins["netgenerate"],
            "--grid",
            f"--grid.number={grid_num}",
            f"--grid.length={grid_len}",
            "--grid.attach-length=30",
            "--default.lanenumber=2",
            f"--default.speed={meta['speed_limit']}",
            "--output-file=" + str(net_file),
            "--no-turnarounds=false",
        ]

    subprocess.check_call(cmd_net)

    # Generate routes using randomTrips
    seed = "4242" if scenario_id == "scenario_e" else "12345"
    cmd_trips = [
        sys.executable,
        bins["randomTrips"],
        "-n", str(net_file),
        "-r", str(rou_file),
        "-e", str(meta["duration"]),
        "-p", str(meta["default_demand_period"]),
        "-s", seed,
        "--validate"
    ]
    env = os.environ.copy()
    if bins["sumo_home"]:
        env["SUMO_HOME"] = bins["sumo_home"]
    subprocess.check_call(cmd_trips, env=env)

    # Write .sumocfg
    cfg_content = f"""<?xml version="1.0" encoding="UTF-8"?>
<configuration xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="http://sumo.dlr.de/xsd/sumoConfiguration.xsd">
    <input>
        <net-file value="{net_file.name}"/>
        <route-files value="{rou_file.name}"/>
    </input>
    <time>
        <begin value="0"/>
        <end value="{meta['duration']}"/>
        <step-length value="1.0"/>
    </time>
    <processing>
        <time-to-teleport value="-1"/>
    </processing>
    <report>
        <no-step-log value="true"/>
    </report>
</configuration>
"""
    cfg_file.write_text(cfg_content, encoding="utf-8")
    logger.info(f"Successfully generated scenario {scenario_id} sumocfg.")

    return {
        "meta": meta,
        "net_file": str(net_file),
        "rou_file": str(rou_file),
        "cfg_file": str(cfg_file)
    }

def ensure_all_scenarios():
    """Generates all 5 research scenarios."""
    scenarios_dir = Path(__file__).parent / "scenarios"
    scenarios_dir.mkdir(parents=True, exist_ok=True)
    results = {}
    for sid in SCENARIOS_META.keys():
        results[sid] = generate_scenario_files(sid, scenarios_dir)
    return results

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    res = ensure_all_scenarios()
    print("All 5 scenarios generated:", list(res.keys()))

