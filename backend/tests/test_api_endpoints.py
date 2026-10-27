import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.db.init_db import init_database

# Initialize database before running test client
init_database()
client = TestClient(app)


def test_health_and_system_stats():
    res = client.get("/api/v1/health")
    assert res.status_code == 200
    assert res.json()["status"] in ["healthy", "degraded"]

    stats_res = client.get("/api/v1/system/stats")
    assert stats_res.status_code == 200
    data = stats_res.json()
    assert data["backend_status"] == "online"
    assert data["total_datasets"] >= 1


def test_datasets_api():
    res = client.get("/api/v1/datasets")
    assert res.status_code == 200
    datasets = res.json()
    assert len(datasets) >= 1
    ds_id = datasets[0]["id"]

    # Preview
    preview_res = client.get(f"/api/v1/datasets/{ds_id}/preview?limit=10")
    assert preview_res.status_code == 200
    prev_data = preview_res.json()
    assert len(prev_data["data"]) == 10
    assert "packet_rate" in prev_data["columns"]

    # Profile
    prof_res = client.get(f"/api/v1/datasets/{ds_id}/profile")
    assert prof_res.status_code == 200
    prof_data = prof_res.json()
    assert prof_data["total_rows"] >= 1000


def test_context_explorer_api():
    res = client.get("/api/v1/datasets")
    ds_id = res.json()[0]["id"]

    ctx_res = client.get(f"/api/v1/context/explorer-data/{ds_id}?max_points=50")
    assert ctx_res.status_code == 200
    ctx_data = ctx_res.json()
    assert "spatial_points" in ctx_data
    assert len(ctx_data["spatial_points"]) > 0
    assert "cluster_baselines" in ctx_data


def test_experiment_and_benchmark_api():
    res = client.get("/api/v1/datasets")
    ds = res.json()[0]

    # Get versions
    preview = client.get(f"/api/v1/datasets/{ds['id']}/preview").json()
    version_id = preview["version_id"]

    # Launch Model 1: Global Threshold
    exp1_payload = {
        "dataset_version_id": version_id,
        "name": "Global Baseline Threshold",
        "model_family": "global_threshold",
        "split_strategy": "stratified",
        "test_size": 0.25,
        "random_seed": 42
    }
    r1 = client.post("/api/v1/experiments", json=exp1_payload)
    assert r1.status_code == 200
    exp1_data = r1.json()
    assert exp1_data["status"] == "completed"
    assert exp1_data["metrics"]["accuracy"] > 0.0

    # Launch Model 2: Contextual Gradient Boosting
    exp2_payload = {
        "dataset_version_id": version_id,
        "name": "Contextual Gradient Boosting (Khan et al. 2026)",
        "model_family": "contextual_gradient_boosting",
        "split_strategy": "stratified",
        "test_size": 0.25,
        "random_seed": 42
    }
    r2 = client.post("/api/v1/experiments", json=exp2_payload)
    assert r2.status_code == 200
    exp2_data = r2.json()
    assert exp2_data["status"] == "completed"
    assert exp2_data["metrics"]["macro_f1"] > 0.0

    # Compare benchmark
    cmp_res = client.get(f"/api/v1/benchmarks/compare?experiment_ids={exp1_data['id']},{exp2_data['id']}")
    assert cmp_res.status_code == 200
    assert len(cmp_res.json()["experiments"]) == 2

    # Paired McNemar Test
    mcnemar_res = client.get(f"/api/v1/benchmarks/mcnemar?model_a_id={exp1_data['id']}&model_b_id={exp2_data['id']}")
    assert mcnemar_res.status_code == 200
    assert "statistic" in mcnemar_res.json()
    assert "p_value" in mcnemar_res.json()


def test_acafdm_and_simulator_api():
    res = client.get("/api/v1/datasets")
    ds = res.json()[0]
    preview = client.get(f"/api/v1/datasets/{ds['id']}/preview").json()
    version_id = preview["version_id"]

    # ACAFDM Evaluate
    acafdm_res = client.post(f"/api/v1/acafdm/evaluate/{version_id}")
    assert acafdm_res.status_code == 200
    ac_data = acafdm_res.json()
    assert ac_data["total_observations"] > 0
    assert len(ac_data["decision_trace"]) > 0

    # Simulator Run
    sim_payload = {
        "dataset_version_id": version_id,
        "name": "Selective Rate Limiting Simulation",
        "policy_action": "selective_rate_limiting",
        "rate_limit_ratio": 0.5,
        "priority_preservation": True
    }
    sim_res = client.post("/api/v1/simulator/run", json=sim_payload)
    assert sim_res.status_code == 200
    assert sim_res.json()["status"] == "completed"
    assert "malicious_traffic" in sim_res.json()["results"]
