import pytest
import time
from fastapi.testclient import TestClient
from app.main import app
from app.db.base import Base
from app.db.session import engine, SessionLocal
from app.db.init_db import provision_synthetic_fixture
from app.models.entities import User, Workspace, WorkspaceMembership

# Ensure clean schema initialization
Base.metadata.create_all(bind=engine)
client = TestClient(app)


@pytest.fixture(scope="module")
def auth_headers():
    """Register and authenticate an explicit test user and workspace."""
    email = f"test_api_user_{int(time.time())}@example.com"
    reg_res = client.post("/api/v1/auth/register", json={
        "email": email,
        "password": "StrongTestPassword123!",
        "full_name": "API Test Researcher"
    })
    assert reg_res.status_code == 200, f"Registration failed: {reg_res.text}"
    token = reg_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Resolve workspace
    ws_res = client.get("/api/v1/auth/workspaces", headers=headers)
    assert ws_res.status_code == 200
    workspaces = ws_res.json()
    assert len(workspaces) >= 1
    ws_id = workspaces[0]["id"]
    headers["X-Workspace-Id"] = ws_id

    # Provision one test dataset in this workspace for API tests
    db = SessionLocal()
    try:
        provision_synthetic_fixture(db, ws_id)
    finally:
        db.close()

    return headers


def test_health_and_system_stats(auth_headers):
    # Public health check
    res = client.get("/api/v1/health")
    assert res.status_code == 200
    assert res.json()["status"] in ["healthy", "degraded"]

    # Scoped stats with auth
    stats_res = client.get("/api/v1/system/stats", headers=auth_headers)
    assert stats_res.status_code == 200
    data = stats_res.json()
    assert data["backend_status"] == "online"
    assert data["total_datasets"] >= 1


def test_datasets_api(auth_headers):
    res = client.get("/api/v1/datasets", headers=auth_headers)
    assert res.status_code == 200
    datasets = res.json()
    assert len(datasets) >= 1
    ds_id = datasets[0]["id"]

    # Preview
    preview_res = client.get(f"/api/v1/datasets/{ds_id}/preview?limit=10", headers=auth_headers)
    assert preview_res.status_code == 200
    prev_data = preview_res.json()
    assert len(prev_data["data"]) == 10
    assert "packet_rate" in prev_data["columns"]

    # Profile
    prof_res = client.get(f"/api/v1/datasets/{ds_id}/profile", headers=auth_headers)
    assert prof_res.status_code == 200
    prof_data = prof_res.json()
    assert prof_data["total_rows"] >= 1000


def test_context_explorer_api(auth_headers):
    res = client.get("/api/v1/datasets", headers=auth_headers)
    ds_id = res.json()[0]["id"]

    ctx_res = client.get(f"/api/v1/context/explorer-data/{ds_id}?max_points=50", headers=auth_headers)
    assert ctx_res.status_code == 200
    ctx_data = ctx_res.json()
    assert "spatial_points" in ctx_data
    assert len(ctx_data["spatial_points"]) > 0
    assert "cluster_baselines" in ctx_data


def test_experiment_and_benchmark_api(auth_headers):
    res = client.get("/api/v1/datasets", headers=auth_headers)
    ds = res.json()[0]

    # Get versions
    preview = client.get(f"/api/v1/datasets/{ds['id']}/preview", headers=auth_headers).json()
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
    r1 = client.post("/api/v1/experiments", json=exp1_payload, headers=auth_headers)
    assert r1.status_code == 200
    exp1_data = r1.json()
    exp1_id = exp1_data["id"]

    # Poll until background job completes (usually ~0.5 - 2s)
    max_wait = 10
    start_t = time.time()
    while time.time() - start_t < max_wait:
        poll_res = client.get(f"/api/v1/experiments/{exp1_id}", headers=auth_headers)
        if poll_res.json()["status"] in ("completed", "failed"):
            exp1_data = poll_res.json()
            break
        time.sleep(0.3)

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
    r2 = client.post("/api/v1/experiments", json=exp2_payload, headers=auth_headers)
    assert r2.status_code == 200
    exp2_id = r2.json()["id"]

    exp2_data = {}
    start_t = time.time()
    while time.time() - start_t < max_wait:
        poll_res = client.get(f"/api/v1/experiments/{exp2_id}", headers=auth_headers)
        if poll_res.json()["status"] in ("completed", "failed"):
            exp2_data = poll_res.json()
            break
        time.sleep(0.3)

    assert exp2_data.get("status") == "completed"
    assert exp2_data["metrics"]["macro_f1"] > 0.0

    # Compare benchmark
    cmp_res = client.get(
        f"/api/v1/benchmarks/compare?experiment_ids={exp1_id},{exp2_id}",
        headers=auth_headers
    )
    assert cmp_res.status_code == 200
    assert len(cmp_res.json()["experiments"]) == 2

    # Paired McNemar Test
    mcnemar_res = client.get(
        f"/api/v1/benchmarks/mcnemar?model_a_id={exp1_id}&model_b_id={exp2_id}",
        headers=auth_headers
    )
    assert mcnemar_res.status_code == 200
    assert "statistic" in mcnemar_res.json()
    assert "p_value" in mcnemar_res.json()


def test_acafdm_and_simulator_api(auth_headers):
    res = client.get("/api/v1/datasets", headers=auth_headers)
    ds = res.json()[0]
    preview = client.get(f"/api/v1/datasets/{ds['id']}/preview", headers=auth_headers).json()
    version_id = preview["version_id"]

    # ACAFDM Evaluate
    acafdm_res = client.post(f"/api/v1/acafdm/evaluate/{version_id}", headers=auth_headers)
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
    sim_res = client.post("/api/v1/simulator/run", json=sim_payload, headers=auth_headers)
    assert sim_res.status_code == 200
    assert sim_res.json()["status"] == "completed"
    assert "malicious_traffic" in sim_res.json()["results"]
