import os
import sys
import subprocess
from pathlib import Path
from typing import Optional, Dict, Any
import logging

logger = logging.getLogger(__name__)

def get_sumo_paths():
    # Detect sumo paths from venv or environment
    sumo_home = os.environ.get("SUMO_HOME")
    if not sumo_home or not Path(sumo_home).exists():
        cand = Path(sys.executable).parent.parent / "Lib" / "site-packages" / "sumo"
        if cand.exists():
            sumo_home = str(cand)
            os.environ["SUMO_HOME"] = sumo_home

    bin_dir = Path(sumo_home) / "bin" if sumo_home else None
    tools_dir = Path(sumo_home) / "tools" if sumo_home else None
    
    # Executable names
    exe_suffix = ".exe" if sys.platform == "win32" else ""
    sumo_bin = str(bin_dir / f"sumo{exe_suffix}") if bin_dir else "sumo"
    netgenerate_bin = str(bin_dir / f"netgenerate{exe_suffix}") if bin_dir else "netgenerate"
    random_trips = str(tools_dir / "randomTrips.py") if tools_dir else "randomTrips.py"
    
    return {
        "sumo_home": sumo_home,
        "sumo_bin": sumo_bin,
        "netgenerate_bin": netgenerate_bin,
        "random_trips": random_trips,
    }

def generate_urban_scenario(
    output_dir: Optional[Path] = None,
    grid_number: int = 4,
    grid_length: float = 150.0,
    duration_seconds: int = 120,
    vehicle_demand_period: float = 2.0, # seconds per vehicle emission
    scenario_name: str = "urban_grid"
) -> Dict[str, Any]:
    """
    Generates a genuine SUMO urban road network with netgenerate and randomTrips.
    """
    paths = get_sumo_paths()
    if not output_dir:
        output_dir = Path(__file__).parent / "scenarios"
    output_dir.mkdir(parents=True, exist_ok=True)

    net_file = output_dir / f"{scenario_name}.net.xml"
    trips_file = output_dir / f"{scenario_name}.trips.xml"
    rou_file = output_dir / f"{scenario_name}.rou.xml"
    cfg_file = output_dir / f"{scenario_name}.sumocfg"

    # Step 1: Netgenerate urban grid
    logger.info(f"Generating road network: {net_file}")
    net_cmd = [
        paths["netgenerate_bin"],
        "--grid",
        f"--grid.number={grid_number}",
        f"--grid.length={grid_length}",
        "--grid.attach-length=30",
        "--default.speed=13.89",
        "--output-file=" + str(net_file),
        "--no-turnarounds=false",
    ]
    subprocess.check_call(net_cmd)

    # Step 2: Generate realistic vehicle trips & routes using randomTrips.py
    logger.info(f"Generating routes: {rou_file}")
    trips_cmd = [
        sys.executable,
        paths["random_trips"],
        "-n", str(net_file),
        "-r", str(rou_file),
        "-e", str(duration_seconds),
        "-p", str(vehicle_demand_period),
        "--validate"
    ]
    env = os.environ.copy()
    if paths["sumo_home"]:
        env["SUMO_HOME"] = paths["sumo_home"]
    subprocess.check_call(trips_cmd, env=env)

    # Step 3: Write .sumocfg
    cfg_content = f"""<?xml version="1.0" encoding="UTF-8"?>
<configuration xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="http://sumo.dlr.de/xsd/sumoConfiguration.xsd">
    <input>
        <net-file value="{net_file.name}"/>
        <route-files value="{rou_file.name}"/>
    </input>
    <time>
        <begin value="0"/>
        <end value="{duration_seconds}"/>
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
    logger.info(f"Generated SUMO config: {cfg_file}")

    return {
        "scenario_name": scenario_name,
        "net_file": str(net_file),
        "rou_file": str(rou_file),
        "cfg_file": str(cfg_file),
        "grid_number": grid_number,
        "grid_length": grid_length,
        "duration": duration_seconds,
        "period": vehicle_demand_period,
    }

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    res = generate_urban_scenario()
    print("Scenario generation completed successfully:", res)

