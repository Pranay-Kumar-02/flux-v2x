import datetime
from typing import Optional, List
from sqlalchemy import (
    String, Integer, Boolean, DateTime, ForeignKey, Text, JSON, Float
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_superuser: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=datetime.datetime.utcnow)
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow
    )

    workspaces: Mapped[List["WorkspaceMembership"]] = relationship("WorkspaceMembership", back_populates="user")


class Workspace(Base):
    __tablename__ = "workspaces"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    owner_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=datetime.datetime.utcnow)

    members: Mapped[List["WorkspaceMembership"]] = relationship("WorkspaceMembership", back_populates="workspace")
    datasets: Mapped[List["Dataset"]] = relationship("Dataset", back_populates="workspace", cascade="all, delete-orphan")
    experiments: Mapped[List["Experiment"]] = relationship("Experiment", back_populates="workspace", cascade="all, delete-orphan")


class WorkspaceMembership(Base):
    __tablename__ = "workspace_memberships"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    workspace_id: Mapped[str] = mapped_column(String(36), ForeignKey("workspaces.id"), nullable=False)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    role: Mapped[str] = mapped_column(String(50), default="researcher")  # owner, researcher, viewer
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=datetime.datetime.utcnow)

    workspace: Mapped["Workspace"] = relationship("Workspace", back_populates="members")
    user: Mapped["User"] = relationship("User", back_populates="workspaces")


class Dataset(Base):
    __tablename__ = "datasets"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    workspace_id: Mapped[str] = mapped_column(String(36), ForeignKey("workspaces.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    file_format: Mapped[str] = mapped_column(String(50), nullable=False)  # csv, tsv, json, jsonl, parquet, xlsx
    file_path: Mapped[str] = mapped_column(String(512), nullable=False)
    file_size_bytes: Mapped[int] = mapped_column(Integer, default=0)
    sha256_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    row_count: Mapped[int] = mapped_column(Integer, default=0)
    column_count: Mapped[int] = mapped_column(Integer, default=0)
    is_synthetic: Mapped[bool] = mapped_column(Boolean, default=False)
    provenance: Mapped[Optional[str]] = mapped_column(String(255), default="user_upload")
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=datetime.datetime.utcnow)

    workspace: Mapped["Workspace"] = relationship("Workspace", back_populates="datasets")
    versions: Mapped[List["DatasetVersion"]] = relationship("DatasetVersion", back_populates="dataset", cascade="all, delete-orphan")


class DatasetVersion(Base):
    __tablename__ = "dataset_versions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    dataset_id: Mapped[str] = mapped_column(String(36), ForeignKey("datasets.id"), nullable=False)
    version_num: Mapped[int] = mapped_column(Integer, default=1)
    file_path: Mapped[str] = mapped_column(String(512), nullable=False)
    row_count: Mapped[int] = mapped_column(Integer, default=0)
    column_count: Mapped[int] = mapped_column(Integer, default=0)
    sha256_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    parent_version_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    transformation_metadata: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=datetime.datetime.utcnow)

    dataset: Mapped["Dataset"] = relationship("Dataset", back_populates="versions")
    profile: Mapped[Optional["DatasetProfile"]] = relationship("DatasetProfile", uselist=False, back_populates="version", cascade="all, delete-orphan")
    schema_mappings: Mapped[List["SchemaMapping"]] = relationship("SchemaMapping", back_populates="version", cascade="all, delete-orphan")


class DatasetProfile(Base):
    __tablename__ = "dataset_profiles"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    dataset_version_id: Mapped[str] = mapped_column(String(36), ForeignKey("dataset_versions.id"), unique=True, nullable=False)
    profile_data: Mapped[dict] = mapped_column(JSON, nullable=False)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=datetime.datetime.utcnow)

    version: Mapped["DatasetVersion"] = relationship("DatasetVersion", back_populates="profile")


class SchemaMapping(Base):
    __tablename__ = "schema_mappings"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    dataset_version_id: Mapped[str] = mapped_column(String(36), ForeignKey("dataset_versions.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    target_domain: Mapped[str] = mapped_column(String(50), default="vcn")  # vcn or generic
    target_label: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    column_mappings: Mapped[dict] = mapped_column(JSON, default=dict)  # source_col -> canonical_col
    feature_configs: Mapped[dict] = mapped_column(JSON, default=dict)  # exclusions, scale, clustering
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=datetime.datetime.utcnow)

    version: Mapped["DatasetVersion"] = relationship("DatasetVersion", back_populates="schema_mappings")


class Experiment(Base):
    __tablename__ = "experiments"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    workspace_id: Mapped[str] = mapped_column(String(36), ForeignKey("workspaces.id"), nullable=False)
    dataset_version_id: Mapped[str] = mapped_column(String(36), ForeignKey("dataset_versions.id"), nullable=False)
    schema_mapping_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("schema_mappings.id"), nullable=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    target_column: Mapped[str] = mapped_column(String(100), default="label")
    model_family: Mapped[str] = mapped_column(String(100), nullable=False)
    hyperparameters: Mapped[dict] = mapped_column(JSON, default=dict)
    split_strategy: Mapped[str] = mapped_column(String(50), default="scenario_split")  # scenario_split, chronological, stratified
    test_size: Mapped[float] = mapped_column(Float, default=0.25)
    random_seed: Mapped[int] = mapped_column(Integer, default=42)
    status: Mapped[str] = mapped_column(String(50), default="queued")  # queued, running, completed, failed
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    metrics: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    confusion_matrix: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    duration_seconds: Mapped[float] = mapped_column(Float, default=0.0)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=datetime.datetime.utcnow)
    finished_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, nullable=True)

    workspace: Mapped["Workspace"] = relationship("Workspace", back_populates="experiments")
    artifacts: Mapped[List["ModelArtifact"]] = relationship("ModelArtifact", back_populates="experiment", cascade="all, delete-orphan")


class ModelArtifact(Base):
    __tablename__ = "model_artifacts"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    experiment_id: Mapped[str] = mapped_column(String(36), ForeignKey("experiments.id"), nullable=False)
    artifact_path: Mapped[str] = mapped_column(String(512), nullable=False)
    artifact_type: Mapped[str] = mapped_column(String(50), default="joblib")  # joblib, json, onnx
    sha256_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=datetime.datetime.utcnow)

    experiment: Mapped["Experiment"] = relationship("Experiment", back_populates="artifacts")


class ACAFDMConfig(Base):
    __tablename__ = "acafdm_configs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    workspace_id: Mapped[str] = mapped_column(String(36), ForeignKey("workspaces.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    cluster_count: Mapped[int] = mapped_column(Integer, default=4)
    rolling_window_size: Mapped[int] = mapped_column(Integer, default=50)
    alpha_update_rate: Mapped[float] = mapped_column(Float, default=0.1)
    z_threshold: Mapped[float] = mapped_column(Float, default=2.5)
    persistence_k: Mapped[int] = mapped_column(Integer, default=3)
    cooldown_seconds: Mapped[int] = mapped_column(Integer, default=30)
    benign_validation_gate: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=datetime.datetime.utcnow)


class MitigationSimulation(Base):
    __tablename__ = "mitigation_simulations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    workspace_id: Mapped[str] = mapped_column(String(36), ForeignKey("workspaces.id"), nullable=False)
    dataset_version_id: Mapped[str] = mapped_column(String(36), ForeignKey("dataset_versions.id"), nullable=False)
    acafdm_config_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("acafdm_configs.id"), nullable=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    policy_action: Mapped[str] = mapped_column(String(50), default="selective_rate_limiting")
    rate_limit_ratio: Mapped[float] = mapped_column(Float, default=0.5)  # reduce transmission rate by 50%
    priority_preservation: Mapped[bool] = mapped_column(Boolean, default=True)
    status: Mapped[str] = mapped_column(String(50), default="completed")
    results: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=datetime.datetime.utcnow)


class BackgroundJob(Base):
    __tablename__ = "background_jobs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    workspace_id: Mapped[str] = mapped_column(String(36), ForeignKey("workspaces.id"), nullable=False)
    job_type: Mapped[str] = mapped_column(String(100), nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="pending")  # pending, processing, completed, failed, cancelled
    progress_pct: Mapped[int] = mapped_column(Integer, default=0)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    result_metadata: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=datetime.datetime.utcnow)
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow
    )


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    workspace_id: Mapped[str] = mapped_column(String(36), nullable=False)
    user_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    action: Mapped[str] = mapped_column(String(100), nullable=False)
    resource_type: Mapped[str] = mapped_column(String(100), nullable=False)
    resource_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    details: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=datetime.datetime.utcnow)
