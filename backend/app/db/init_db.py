import os
import uuid
import datetime
import numpy as np
import polars as pl
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.base import Base
from app.db.session import engine, SessionLocal
from app.core.security import hash_password
from app.models.entities import (
    User,
    Workspace,
    WorkspaceMembership,
    Dataset,
    DatasetVersion,
    DatasetProfile,
    SchemaMapping,
    ACAFDMConfig,
)
from app.ingestion.parser import IngestionEngine
from app.profiling.profiler import DatasetProfiler


def generate_synthetic_vcn_fixture(filepath: str, n_samples: int = 1500, random_seed: int = 42) -> str:
    """
    Generates a deterministic synthetic VCN development fixture for local testing and pipeline validation.
    Explicitly marked as synthetic.
    Simulates multi-scenario vehicular traffic with legitimate congestion surges and malicious flooding.
    """
    np.random.seed(random_seed)
    os.makedirs(os.path.dirname(filepath), exist_ok=True)

    scenarios = ["highway_congested", "highway_freeflow", "urban_rush_hour", "urban_normal"]
    sc_choices = np.random.choice(scenarios, size=n_samples, p=[0.35, 0.25, 0.25, 0.15])

    timestamps = np.sort(np.random.uniform(0.0, 600.0, size=n_samples))
    src_ids = [f"tx_veh_{np.random.randint(1, 45)}" for _ in range(n_samples)]
    dst_ids = [f"rx_veh_{np.random.randint(1, 15)}" for _ in range(n_samples)]

    rx_x = np.zeros(n_samples)
    rx_y = np.zeros(n_samples)
    rx_speed = np.zeros(n_samples)
    packet_rate = np.zeros(n_samples)
    packet_count = np.zeros(n_samples, dtype=int)
    byte_count = np.zeros(n_samples, dtype=int)
    labels = np.zeros(n_samples, dtype=int)

    for i in range(n_samples):
        sc = sc_choices[i]
        is_attack = np.random.rand() < 0.18

        if sc == "highway_congested":
            rx_x[i] = np.random.normal(250.0, 40.0)
            rx_y[i] = np.random.normal(250.0, 15.0)
            rx_speed[i] = np.random.uniform(2.0, 8.0)
            base_rate = np.random.normal(45.0, 6.0)
            if is_attack:
                rate = np.random.normal(110.0, 15.0)
                labels[i] = 1
            else:
                rate = base_rate
                labels[i] = 0

        elif sc == "highway_freeflow":
            rx_x[i] = np.random.normal(800.0, 60.0)
            rx_y[i] = np.random.normal(250.0, 15.0)
            rx_speed[i] = np.random.uniform(25.0, 33.0)
            base_rate = np.random.normal(15.0, 3.0)
            if is_attack:
                rate = np.random.normal(65.0, 10.0)
                labels[i] = 1
            else:
                rate = base_rate
                labels[i] = 0

        elif sc == "urban_rush_hour":
            rx_x[i] = np.random.normal(350.0, 50.0)
            rx_y[i] = np.random.normal(650.0, 40.0)
            rx_speed[i] = np.random.uniform(5.0, 14.0)
            base_rate = np.random.normal(30.0, 5.0)
            if is_attack:
                rate = np.random.normal(95.0, 12.0)
                labels[i] = 1
            else:
                rate = base_rate
                labels[i] = 0

        else:  # urban_normal
            rx_x[i] = np.random.normal(700.0, 70.0)
            rx_y[i] = np.random.normal(650.0, 50.0)
            rx_speed[i] = np.random.uniform(10.0, 18.0)
            base_rate = np.random.normal(18.0, 4.0)
            if is_attack:
                rate = np.random.normal(75.0, 10.0)
                labels[i] = 1
            else:
                rate = base_rate
                labels[i] = 0

        rate = max(1.0, rate)
        packet_rate[i] = round(rate, 2)
        dur = np.random.uniform(0.5, 3.0)
        p_count = max(1, int(round(rate * dur)))
        packet_count[i] = p_count
        byte_count[i] = int(p_count * np.random.uniform(256, 1024))

    df = pl.DataFrame({
        "timestamp": np.round(timestamps, 3),
        "src_id": src_ids,
        "dst_id": dst_ids,
        "rx_x": np.round(rx_x, 2),
        "rx_y": np.round(rx_y, 2),
        "rx_speed": np.round(rx_speed, 2),
        "packet_count": packet_count,
        "byte_count": byte_count,
        "packet_rate": packet_rate,
        "scenario": sc_choices,
        "label": labels
    })

    df.write_parquet(filepath)
    return filepath


def provision_synthetic_fixture(db: Session, workspace_id: str) -> Dataset:
    """
    Explicitly provisions the synthetic development fixture with truthful metadata:
    is_synthetic=True, generator provenance, and parameter audit trail.
    """
    dataset_id = str(uuid.uuid4())
    version_id = str(uuid.uuid4())

    derived_dir = os.path.join(settings.DERIVED_STORAGE_PATH, dataset_id)
    parquet_path = os.path.join(derived_dir, "synthetic_fixture_v1.parquet")

    generate_synthetic_vcn_fixture(parquet_path, n_samples=1500, random_seed=42)
    file_size = os.path.getsize(parquet_path)
    sha256 = IngestionEngine.compute_sha256(parquet_path)

    ds = Dataset(
        id=dataset_id,
        workspace_id=workspace_id,
        name="FluxV2X Synthetic VCN Development Fixture (Seed: 42)",
        description="Synthetic multi-scenario vehicular communication fixture modeled for development testing. Explicitly synthetic.",
        file_format="parquet",
        file_path=parquet_path,
        file_size_bytes=file_size,
        sha256_hash=sha256,
        row_count=1500,
        column_count=11,
        is_synthetic=True,
        provenance="FluxV2X In-House Synthetic Generator (Seed: 42, Samples: 1500, v1.0)",
        created_at=datetime.datetime.utcnow()
    )
    db.add(ds)

    ver = DatasetVersion(
        id=version_id,
        dataset_id=dataset_id,
        version_num=1,
        file_path=parquet_path,
        row_count=1500,
        column_count=11,
        sha256_hash=sha256,
        transformation_metadata={
            "generator": "FluxV2X Synthetic VCN Traffic Generator",
            "version": "1.0",
            "seed": 42,
            "n_samples": 1500,
            "scenarios": ["highway_congested", "highway_freeflow", "urban_rush_hour", "urban_normal"],
            "generated_at": datetime.datetime.utcnow().isoformat(),
            "is_synthetic": True
        },
        created_at=datetime.datetime.utcnow()
    )
    db.add(ver)
    db.commit()

    df = pl.read_parquet(parquet_path)
    profile_dict = DatasetProfiler.profile_dataframe(df)
    prof = DatasetProfile(
        id=str(uuid.uuid4()),
        dataset_version_id=version_id,
        profile_data=profile_dict,
        created_at=datetime.datetime.utcnow()
    )
    db.add(prof)

    mapping = SchemaMapping(
        id=str(uuid.uuid4()),
        dataset_version_id=version_id,
        name="Synthetic VCN Canonical Mapping",
        target_domain="vcn",
        target_label="label",
        column_mappings={col: col for col in df.columns},
        feature_configs={"clustering_features": ["rx_x", "rx_y", "rx_speed"], "k_clusters": 4},
        created_at=datetime.datetime.utcnow()
    )
    db.add(mapping)

    cfg = ACAFDMConfig(
        id=str(uuid.uuid4()),
        workspace_id=workspace_id,
        name="Standard Congestion-Aware Baseline Policy",
        cluster_count=4,
        rolling_window_size=50,
        alpha_update_rate=0.08,
        z_threshold=2.5,
        persistence_k=3,
        cooldown_seconds=30,
        benign_validation_gate=True,
        created_at=datetime.datetime.utcnow()
    )
    db.add(cfg)
    db.commit()
    db.refresh(ds)
    return ds


def bootstrap_development_environment(db: Session):
    """
    Explicitly opted-in development bootstrapping.
    Fails immediately if called in a production environment.
    """
    if settings.ENVIRONMENT in ("production", "prod"):
        raise RuntimeError("CRITICAL SECURITY ERROR: Development bootstrapping attempted in production.")

    user = db.query(User).filter(User.email == "researcher@fluxv2x.internal").first()
    if not user:
        user_id = str(uuid.uuid4())
        user = User(
            id=user_id,
            email="researcher@fluxv2x.internal",
            full_name="Lead V2X Security Researcher",
            hashed_password=hash_password("fluxv2x-secure-pass"),
            is_active=True,
            is_superuser=False
        )
        db.add(user)
        db.commit()

        ws_id = str(uuid.uuid4())
        ws = Workspace(
            id=ws_id,
            name="Vehicular Security Lab",
            slug="vcn-lab",
            description="Primary spatiotemporal malicious flooding experimentation workspace",
            owner_id=user.id
        )
        db.add(ws)

        mem = WorkspaceMembership(
            id=str(uuid.uuid4()),
            workspace_id=ws.id,
            user_id=user.id,
            role="owner"
        )
        db.add(mem)
        db.commit()
    else:
        ws = db.query(Workspace).filter(Workspace.owner_id == user.id).first()

    if ws and settings.AUTO_LOAD_DEMO_DATASET:
        existing = db.query(Dataset).filter(Dataset.workspace_id == ws.id).count()
        if existing == 0:
            provision_synthetic_fixture(db, ws.id)


def init_database():
    """
    Production-grade database initialization:
    - Creates required schema tables.
    - Zero default superusers or backdoors.
    - Zero fake data loaded unless explicitly opted in via development environment flags.
    """
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        if settings.ENVIRONMENT == "development" and settings.ENABLE_DEV_BOOTSTRAP:
            bootstrap_development_environment(db)
    finally:
        db.close()


if __name__ == "__main__":
    init_database()
    print("Database schema successfully initialized.")
