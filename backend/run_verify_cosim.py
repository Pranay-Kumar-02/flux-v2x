import time
import json
from app.cosim.orchestrator import CoSimulationOrchestrator

def run_test():
    orch = CoSimulationOrchestrator.get_instance()
    print("Starting Co-Simulation run for Scenario A (Urban Intersection Network)...")
    res = orch.start_simulation(
        scenario_id="scenario_a",
        duration=20,
        demand_period=1.5,
        attack_enabled=True,
        attack_intensity=95.0,
        attack_start_time=3.0,
        attack_duration=15.0,
        persistence_k=3,
        z_threshold=2.5,
        rate_limit_ratio=0.75
    )
    print("Start response:", res)

    for i in range(12):
        time.sleep(0.9)
        st = orch.get_status()
        net = st["network_metrics"]
        print(f"Tick {i:02d} | SimClock: {st['sim_clock']}s | ActiveVehicles: {st['active_vehicle_count']} | Tx: {net['total_tx']} | Rx: {net['total_rx']} | Dropped: {net['total_dropped']} | MaliciousSuppressed: {net['malicious_dropped']} | PDR: {net['pdr']}% | Delay: {net['delay_ms']}ms | Engine: {net['ns3_engine']}")

    stop_res = orch.stop_simulation()
    print("Simulation stopped cleanly:", stop_res)

if __name__ == "__main__":
    run_test()
