import polars as pl
import pytest
from app.acafdm.policy import ACAFDMDecisionPolicy
from app.acafdm.engine import ACAFDMEngine
from app.simulation.simulator import MitigationSimulator


def test_acafdm_persistence_policy():
    policy = ACAFDMDecisionPolicy(persistence_k=3, z_threshold=2.5, confidence_threshold=0.7)

    # 1st anomalous observation: streak = 1 -> FLAG_SUSPICIOUS, no baseline update
    dec1, r1, streak1, update1 = policy.evaluate_observation("node_1", z_score=3.5, model_score=0.8)
    assert dec1 == "FLAG_SUSPICIOUS"
    assert streak1 == 1
    assert update1 is False

    # 2nd anomalous observation: streak = 2 -> FLAG_SUSPICIOUS
    dec2, r2, streak2, update2 = policy.evaluate_observation("node_1", z_score=3.8, model_score=0.85)
    assert dec2 == "FLAG_SUSPICIOUS"
    assert streak2 == 2
    assert update2 is False

    # 3rd anomalous observation: streak = 3 -> MITIGATE_RATE_LIMIT
    dec3, r3, streak3, update3 = policy.evaluate_observation("node_1", z_score=4.0, model_score=0.9)
    assert dec3 == "MITIGATE_RATE_LIMIT"
    assert streak3 == 3
    assert update3 is False


def test_acafdm_poison_prevention_gate():
    # Construct trace with normal traffic followed by flooding attack
    df = pl.DataFrame({
        "timestamp": [1.0, 2.0, 3.0, 4.0, 5.0, 6.0],
        "packet_rate": [15.0, 16.0, 15.5, 90.0, 95.0, 100.0],
        "rx_x": [100.0, 105.0, 102.0, 101.0, 103.0, 104.0],
        "rx_y": [200.0, 202.0, 201.0, 200.0, 201.0, 202.0],
        "rx_speed": [20.0, 21.0, 20.5, 20.0, 21.0, 20.5],
        "dst_id": ["rx_1", "rx_1", "rx_1", "rx_1", "rx_1", "rx_1"],
        "label": [0, 0, 0, 1, 1, 1]
    })

    engine = ACAFDMEngine(
        cluster_count=1,
        z_threshold=2.0,
        persistence_k=2,
        benign_validation_gate=True
    )
    result = engine.process_trace(df)

    assert result["total_observations"] == 6
    # Benign updates accepted, attack updates blocked by gate
    assert result["baseline_updates_accepted"] >= 3
    assert result["baseline_updates_rejected_poison_prevented"] >= 2
    assert result["mitigated_count"] >= 1


def test_offline_mitigation_simulator():
    df = pl.DataFrame({
        "timestamp": [1.0, 2.0, 3.0, 4.0, 5.0],
        "packet_rate": [15.0, 16.0, 15.5, 90.0, 95.0],
        "packet_count": [15, 16, 15, 90, 95],
        "byte_count": [1500, 1600, 1550, 9000, 9500],
        "rx_x": [100.0, 102.0, 101.0, 101.0, 102.0],
        "rx_y": [200.0, 201.0, 200.0, 200.0, 201.0],
        "rx_speed": [20.0, 20.0, 20.0, 20.0, 20.0],
        "dst_id": ["rx_1", "rx_1", "rx_1", "rx_1", "rx_1"],
        "label": [0, 0, 0, 1, 1]
    })

    sim_res = MitigationSimulator.run_simulation(
        df=df,
        policy_action="selective_rate_limiting",
        rate_limit_ratio=0.5,
        priority_preservation=True
    )

    assert "unmitigated_total_packets" in sim_res
    assert "simulated_delivered_packets" in sim_res
    assert "simulated_dropped_packets" in sim_res
    assert "bandwidth_saved_percentage" in sim_res
    assert "OFFLINE REPLAY SIMULATION" in sim_res["environment_note"]
