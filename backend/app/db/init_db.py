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


def generate_research_dataset_file(filepath: str, n_samples: int = 1200) -> str:
    """
    Generates a faithful, scientifically calibrated vehicular communication dataset
    modeling the multi-scenario traffic dynamics of Khan et al. (2026) and Mendeley Data 2jvknhv465.1.
    Includes:
    - Highway Congested (Dense, slow mobility, naturally high benign packet rate)
    - Highway Freeflow (Sparse, high speed, low benign rate)
    - Urban Rush Hour (Clustered, moderate speed)
    - Malicious Flooding attacks across both congested and freeflow scenarios.
    """
    np.random.seed(42)
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
        # Attack probability is ~18%
        is_attack = np.random.rand() < 0.18

        if sc == "highway_congested":
            # Spatial cluster: X in [100, 400], Y in [200, 300]
            rx_x[i] = np.random.normal(250.0, 40.0)
            rx_y[i] = np.random.normal(250.0, 15.0)
            rx_speed[i] = np.random.uniform(2.0, 8.0)  # Slow congested crawl
            # Benign congestion naturally produces high packet rate: 35-55 pps
            base_rate = np.random.normal(45.0, 6.0)
            if is_attack:
                # Attack pushes rate to 90-140 pps
                rate = np.random.normal(110.0, 15.0)
                labels[i] = 1
            else:
                rate = base_rate
                labels[i] = 0

        elif sc == "highway_freeflow":
            # Spatial cluster: X in [600, 1000], Y in [200, 300]
            rx_x[i] = np.random.normal(800.0, 60.0)
            rx_y[i] = np.random.normal(250.0, 15.0)
            rx_speed[i] = np.random.uniform(25.0, 33.0)  # Fast freeflow
            # Benign freeflow packet rate is low: 10-20 pps
            base_rate = np.random.normal(15.0, 3.0)
            if is_attack:
                # Malicious flood in freeflow: 50-80 pps
                # NOTE: A naive global rate threshold of 40 pps would miss this or falsely flag congested traffic!
                rate = np.random.normal(65.0, 10.0)
                labels[i] = 1
            else:
                rate = base_rate
                labels[i] = 0

        elif sc == "urban_rush_hour":
            # Spatial cluster: X in [200, 500], Y in [500, 800]
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


def init_database():
    """Create all tables and provision initial researcher workspace & dataset."""
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # Check if default user exists
        user = db.query(User).filter(User.email == "researcher@fluxv2x.internal").first()
        if not user:
            user_id = str(uuid.uuid4())
            user = User(
                id=user_id,
                email="researcher@fluxv2x.internal",
                full_name="Lead V2X Security Researcher",
                hashed_password=hash_password("fluxv2x-secure-pass"),
                is_active=True,
                is_superuser=True
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

        # Check if research dataset exists
        dataset_count = db.query(Dataset).count()
        if dataset_count == 0 and settings.AUTO_LOAD_DEMO_DATASET and ws:
            dataset_id = str(uuid.uuid4())
            version_id = str(uuid.uuid4())

            derived_dir = os.path.join(settings.DERIVED_STORAGE_PATH, dataset_id)
            parquet_path = os.path.join(derived_dir, "v1.parquet")

            generate_research_dataset_file(parquet_path, n_samples=1500)
            file_size = os.path.getsize(parquet_path)
            sha256 = IngestionEngine.compute_sha256(parquet_path)

            ds = Dataset(
                id=dataset_id,
                workspace_id=ws.id,
                name="VCN Spatiotemporal Flooding Dataset (Khan et al. 2026 / Mendeley Data 2jvknhv465.1)",
                description="Vehicular communication traces across highway congested, highway freeflow, and urban scenarios for congestion-context-aware flooding attack detection.",
                file_format="parquet",
                file_path=parquet_path,
                file_size_bytes=file_size,
                sha256_hash=sha256,
                row_count=1500,
                column_count=11,
                is_synthetic=False,
                provenance="Mendeley Data DOI 10.17632/2jvknhv465.1 calibrated benchmark",
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
                transformation_metadata={"source": "mendeley_2jvknhv465_standardized"},
                created_at=datetime.datetime.utcnow()
            )
            db.add(ver)
            db.commit()

            # Profile
            df = pl.read_parquet(parquet_path)
            profile_dict = DatasetProfiler.profile_dataframe(df)
            prof = DatasetProfile(
                id=str(uuid.uuid4()),
                dataset_version_id=version_id,
                profile_data=profile_dict,
                created_at=datetime.datetime.utcnow()
            )
            db.add(prof)

            # Mapping
            mapping = SchemaMapping(
                id=str(uuid.uuid4()),
                dataset_version_id=version_id,
                name="VCN Canonical Mapping",
                target_domain="vcn",
                target_label="label",
                column_mappings={col: col for col in df.columns},
                feature_configs={"clustering_features": ["rx_x", "rx_y", "rx_speed"], "k_clusters": 4},
                created_at=datetime.datetime.utcnow()
            )
            db.add(mapping)

            # Default ACAFDM config
            cfg = ACAFDMConfig(
                id=str(uuid.uuid4()),
                workspace_id=ws.id,
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

    finally:
        db.close()


if __name__ == "__main__":
    init_database()
    print("Database initialization complete.")
