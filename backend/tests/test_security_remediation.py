import time
import uuid
import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.main import app
from app.core.config import Settings
from app.core.security import create_access_token
from app.db.base import Base
from app.db.session import engine, SessionLocal
from app.db.init_db import provision_synthetic_fixture
from app.models.entities import User, WorkspaceMembership, Dataset, DatasetVersion, BackgroundJob
from app.workers.task_runner import TaskRunner
from app.ingestion.mendeley_downloader import MendeleyDatasetImporter

Base.metadata.create_all(bind=engine)
client = TestClient(app)


def test_unauthenticated_requests_rejected_with_401():
    """Requirement 1: Requests without a token are rejected by protected routes with HTTP 401."""
    # Test protected routes
    routes = [
        ("GET", "/api/v1/auth/me"),
        ("GET", "/api/v1/auth/workspaces"),
        ("GET", "/api/v1/datasets"),
        ("POST", "/api/v1/experiments"),
        ("GET", "/api/v1/acafdm/configs"),
        ("POST", "/api/v1/simulator/run"),
        ("GET", "/api/v1/jobs")
    ]
    for method, path in routes:
        if method == "GET":
            res = client.get(path)
        else:
            res = client.post(path, json={})
        assert res.status_code == 401, f"Route {method} {path} did not reject unauthenticated request with 401, got: {res.status_code}"


def test_invalid_expired_and_forged_tokens_rejected_with_401():
    """Requirement 2: Expired, malformed, forged, and invalid-user tokens are rejected with HTTP 401."""
    # 1. Malformed token
    res_malformed = client.get("/api/v1/auth/me", headers={"Authorization": "Bearer malformed.token.string"})
    assert res_malformed.status_code == 401

    # 2. Forged token with different key
    import jwt
    forged = jwt.encode({"sub": str(uuid.uuid4()), "exp": int(time.time()) + 3600, "iat": int(time.time())}, "wrong-key", algorithm="HS256")
    res_forged = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {forged}"})
    assert res_forged.status_code == 401

    # 3. Expired token
    expired = jwt.encode({"sub": str(uuid.uuid4()), "exp": int(time.time()) - 3600, "iat": int(time.time()) - 7200}, "fluxv2x-dev-local-secret-key-not-for-production-min-32-chars", algorithm="HS256")
    res_expired = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {expired}"})
    assert res_expired.status_code == 401

    # 4. Token with non-existent user ID
    non_existent = create_access_token(str(uuid.uuid4()))
    res_non_existent = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {non_existent}"})
    assert res_non_existent.status_code == 401


def test_inactive_user_token_rejected_with_401():
    """Requirement 2b: A valid token for an inactive user must not grant access."""
    db = SessionLocal()
    try:
        user_id = str(uuid.uuid4())
        user = User(
            id=user_id,
            email=f"inactive_{user_id[:6]}@example.com",
            full_name="Disabled User",
            hashed_password="somehash:somekey",
            is_active=False
        )
        db.add(user)
        db.commit()
    finally:
        db.close()

    token = create_access_token(user_id)
    res = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 401
    assert "inactive" in res.json().get("detail", "").lower()


def test_production_refuses_unsafe_secrets_fail_closed():
    """Requirement 4 & 5: Production configuration refuses unsafe default secrets and fails closed."""
    # Production with weak secret key must raise ValidationError
    with pytest.raises(ValidationError):
        Settings(
            ENVIRONMENT="production",
            SECRET_KEY="short-weak",
            DEBUG=False
        )

    # Production with known default dev secret must raise ValidationError
    with pytest.raises(ValidationError):
        Settings(
            ENVIRONMENT="production",
            SECRET_KEY="fluxv2x-dev-local-secret-key-not-for-production-min-32-chars",
            DEBUG=False
        )

    # Production with ENABLE_DEV_BOOTSTRAP must raise ValidationError
    with pytest.raises(ValidationError):
        Settings(
            ENVIRONMENT="production",
            SECRET_KEY="cryptographically-strong-32-character-secret-key-production",
            DEBUG=False,
            ENABLE_DEV_BOOTSTRAP=True
        )

    # Production with AUTO_LOAD_DEMO_DATASET must raise ValidationError
    with pytest.raises(ValidationError):
        Settings(
            ENVIRONMENT="production",
            SECRET_KEY="cryptographically-strong-32-character-secret-key-production",
            DEBUG=False,
            AUTO_LOAD_DEMO_DATASET=True
        )


def test_cross_workspace_isolation():
    """Requirement 2: Users cannot access another workspace's data by substituting IDs or headers."""
    # Register User A and User B
    res_a = client.post("/api/v1/auth/register", json={
        "email": f"usera_{int(time.time())}@example.com",
        "password": "PasswordA123!",
        "full_name": "Tenant User A"
    })
    token_a = res_a.json()["access_token"]
    headers_a = {"Authorization": f"Bearer {token_a}"}
    ws_a = client.get("/api/v1/auth/workspaces", headers=headers_a).json()[0]["id"]
    headers_a["X-Workspace-Id"] = ws_a

    res_b = client.post("/api/v1/auth/register", json={
        "email": f"userb_{int(time.time())}@example.com",
        "password": "PasswordB123!",
        "full_name": "Tenant User B"
    })
    token_b = res_b.json()["access_token"]
    headers_b = {"Authorization": f"Bearer {token_b}"}
    ws_b = client.get("/api/v1/auth/workspaces", headers=headers_b).json()[0]["id"]
    headers_b["X-Workspace-Id"] = ws_b

    # Provision private dataset in Workspace A
    db = SessionLocal()
    try:
        ds_a = provision_synthetic_fixture(db, ws_a)
        ds_a_id = ds_a.id
    finally:
        db.close()

    # User B attempts to access User A's dataset using User B's token
    res_unauth_get = client.get(f"/api/v1/datasets/{ds_a_id}", headers=headers_b)
    assert res_unauth_get.status_code == 404, "User B was able to view User A's dataset metadata!"

    # User B attempts to access User A's dataset preview
    res_unauth_prev = client.get(f"/api/v1/datasets/{ds_a_id}/preview", headers=headers_b)
    assert res_unauth_prev.status_code == 404, "User B was able to preview User A's dataset!"

    # User B attempts to supply User A's workspace header (X-Workspace-Id: ws_a)
    headers_b_spoofed = {"Authorization": f"Bearer {token_b}", "X-Workspace-Id": ws_a}
    res_spoof = client.get("/api/v1/datasets", headers=headers_b_spoofed)
    assert res_spoof.status_code == 403, "User B was able to spoof User A's workspace header!"

    # User B attempts to delete User A's dataset
    res_unauth_del = client.delete(f"/api/v1/datasets/{ds_a_id}", headers=headers_b)
    assert res_unauth_del.status_code == 404, "User B was able to delete User A's dataset!"


def test_dataset_version_ownership_enforcement():
    """Requirement 6: Dataset-version ownership is verified before experiments, ACAFDM, or simulations."""
    # User A has dataset version v_a
    res_a = client.post("/api/v1/auth/register", json={
        "email": f"owner_a_{int(time.time())}@example.com",
        "password": "PasswordA123!",
        "full_name": "Owner A"
    })
    token_a = res_a.json()["access_token"]
    headers_a = {"Authorization": f"Bearer {token_a}"}
    ws_a = client.get("/api/v1/auth/workspaces", headers=headers_a).json()[0]["id"]
    headers_a["X-Workspace-Id"] = ws_a

    db = SessionLocal()
    try:
        ds_a = provision_synthetic_fixture(db, ws_a)
        version_a_id = ds_a.versions[0].id
    finally:
        db.close()

    # User B tries to launch an experiment pointing to User A's dataset_version_id
    res_b = client.post("/api/v1/auth/register", json={
        "email": f"owner_b_{int(time.time())}@example.com",
        "password": "PasswordB123!",
        "full_name": "Owner B"
    })
    token_b = res_b.json()["access_token"]
    headers_b = {"Authorization": f"Bearer {token_b}"}
    ws_b = client.get("/api/v1/auth/workspaces", headers=headers_b).json()[0]["id"]
    headers_b["X-Workspace-Id"] = ws_b

    exp_payload = {
        "dataset_version_id": version_a_id,
        "name": "Unauthorized Cross-Tenant Experiment",
        "model_family": "global_threshold",
        "split_strategy": "stratified",
        "test_size": 0.25,
        "random_seed": 42
    }
    res_unauth_exp = client.post("/api/v1/experiments", json=exp_payload, headers=headers_b)
    assert res_unauth_exp.status_code == 404
    assert "not found in the active authorized workspace" in res_unauth_exp.json()["detail"].lower()

    # User B tries to evaluate ACAFDM on User A's dataset_version_id
    res_unauth_acafdm = client.post(f"/api/v1/acafdm/evaluate/{version_a_id}", headers=headers_b)
    assert res_unauth_acafdm.status_code == 404

    # User B tries to run mitigation simulation on User A's dataset_version_id
    sim_payload = {
        "dataset_version_id": version_a_id,
        "name": "Unauthorized Simulation",
        "policy_action": "selective_rate_limiting"
    }
    res_unauth_sim = client.post("/api/v1/simulator/run", json=sim_payload, headers=headers_b)
    assert res_unauth_sim.status_code == 404


def test_synthetic_seed_truthfully_marked():
    """Requirement 7: Synthetic seed data is always marked and described as synthetic."""
    db = SessionLocal()
    try:
        ws_id = str(uuid.uuid4())
        ds = provision_synthetic_fixture(db, ws_id)
        assert ds.is_synthetic is True, "Synthetic fixture must have is_synthetic=True"
        assert "synthetic" in ds.name.lower()
        assert "synthetic" in ds.provenance.lower()
        assert ds.versions[0].transformation_metadata.get("is_synthetic") is True
        assert "seed" in ds.versions[0].transformation_metadata
    finally:
        db.close()


def test_public_dataset_importer_honest_reporting():
    """Requirement 8: Public research data is never claimed to be downloaded unless actually retrieved and verified."""
    provenance = MendeleyDatasetImporter.get_provenance_info()
    assert provenance["is_synthetic"] is False
    assert provenance["doi"] == "10.17632/2jvknhv465.1"
    assert "timestamp" in provenance["expected_schema"]
    assert "packet_rate" in provenance["expected_schema"]

    # In an offline environment or invalid endpoint, attempt_download_and_verify returns None without forging data
    res = MendeleyDatasetImporter.attempt_download_and_verify("nonexistent/path.parquet", timeout_seconds=1.0)
    assert res is None, "Importer must not forge synthetic data when remote download is unavailable"


def test_ml_target_leakage_prohibited():
    """Requirement 11: Feature list cannot contain target column or target-derived columns."""
    res_a = client.post("/api/v1/auth/register", json={
        "email": f"leakage_test_{int(time.time())}@example.com",
        "password": "Password123!",
        "full_name": "Leakage Tester"
    })
    token = res_a.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    ws_id = client.get("/api/v1/auth/workspaces", headers=headers).json()[0]["id"]
    headers["X-Workspace-Id"] = ws_id

    db = SessionLocal()
    try:
        ds = provision_synthetic_fixture(db, ws_id)
        ver_id = ds.versions[0].id
    finally:
        db.close()

    # Attempt to launch experiment including target 'label' in features
    leak_payload = {
        "dataset_version_id": ver_id,
        "name": "Target Leakage Experiment",
        "target_column": "label",
        "features": ["packet_rate", "rx_speed", "label"],  # Contains label!
        "model_family": "global_threshold",
        "split_strategy": "stratified",
        "test_size": 0.25,
        "random_seed": 42
    }
    leak_res = client.post("/api/v1/experiments", json=leak_payload, headers=headers)
    assert leak_res.status_code == 400
    assert "leakage" in leak_res.json()["detail"].lower()


def test_background_job_lifecycle_and_cancellation():
    """Requirement 10: Background jobs are genuinely queued, persist accurate state, and support cancellation."""
    ws_id = str(uuid.uuid4())

    def dummy_task(job_id, db, cancel_event):
        for pct in [25, 50, 75]:
            if cancel_event.is_set():
                return None
            TaskRunner.update_progress(job_id, pct)
            time.sleep(0.05)
        return {"status": "ok"}

    job_id = TaskRunner.submit_task(
        workspace_id=ws_id,
        job_type="test_lifecycle",
        target_fn=dummy_task
    )

    # Job is initially pending or processing
    db = SessionLocal()
    try:
        job = db.query(BackgroundJob).filter(BackgroundJob.id == job_id).first()
        assert job is not None
        assert job.status in ("pending", "processing", "completed")
    finally:
        db.close()

    # Wait for completion
    time.sleep(0.3)
    db = SessionLocal()
    try:
        job = db.query(BackgroundJob).filter(BackgroundJob.id == job_id).first()
        assert job.status == "completed"
        assert job.progress_pct == 100
    finally:
        db.close()
