from typing import Optional, List, Dict, Any, Union
from pydantic import BaseModel, EmailStr, Field
import datetime


# Auth & User
class UserCreate(BaseModel):
    email: EmailStr
    full_name: str
    password: str = Field(min_length=6)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: str
    email: str
    full_name: str
    is_active: bool
    is_superuser: bool
    created_at: datetime.datetime


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class WorkspaceCreate(BaseModel):
    name: str
    description: Optional[str] = None


class WorkspaceOut(BaseModel):
    id: str
    name: str
    slug: str
    description: Optional[str]
    owner_id: str
    created_at: datetime.datetime


# Dataset & Ingestion
class DatasetOut(BaseModel):
    id: str
    workspace_id: str
    name: str
    description: Optional[str]
    file_format: str
    file_size_bytes: int
    sha256_hash: str
    row_count: int
    column_count: int
    is_synthetic: bool
    provenance: Optional[str]
    created_at: datetime.datetime
    versions_count: Optional[int] = 1


class DatasetVersionOut(BaseModel):
    id: str
    dataset_id: str
    version_num: int
    row_count: int
    column_count: int
    sha256_hash: str
    transformation_metadata: Optional[Dict[str, Any]]
    created_at: datetime.datetime


class DatasetPreview(BaseModel):
    dataset_id: str
    version_id: str
    total_rows: int
    columns: List[str]
    data: List[Dict[str, Any]]
    dtypes: Dict[str, str]


class ColumnProfile(BaseModel):
    name: str
    inferred_type: str
    null_count: int
    null_percentage: float
    unique_count: int
    min_val: Optional[Any] = None
    max_val: Optional[Any] = None
    mean_val: Optional[float] = None
    std_val: Optional[float] = None
    sample_values: List[Any] = []
    is_candidate_target: bool = False
    is_candidate_identifier: bool = False
    is_candidate_timestamp: bool = False
    leakage_warning: Optional[str] = None


class DatasetProfileOut(BaseModel):
    dataset_version_id: str
    total_rows: int
    total_columns: int
    duplicate_rows: int
    duplicate_percentage: float
    memory_usage_mb: float
    columns: List[ColumnProfile]
    class_distribution: Optional[Dict[str, int]] = None
    leakage_warnings: List[str] = []
    created_at: datetime.datetime


# Schema Lab & VCN Adapter
class SchemaMappingCreate(BaseModel):
    name: str
    target_domain: str = "vcn"  # vcn, generic
    target_label: Optional[str] = "label"
    column_mappings: Dict[str, str] = Field(default_factory=dict)
    feature_configs: Dict[str, Any] = Field(default_factory=dict)


class SchemaMappingOut(BaseModel):
    id: str
    dataset_version_id: str
    name: str
    target_domain: str
    target_label: Optional[str]
    column_mappings: Dict[str, str]
    feature_configs: Dict[str, Any]
    created_at: datetime.datetime


# Experiments & ML
class ExperimentCreate(BaseModel):
    dataset_version_id: str
    schema_mapping_id: Optional[str] = None
    name: str
    target_column: str = "label"
    features: List[str] = Field(default_factory=list)
    model_family: str  # e.g., "contextual_gradient_boosting", "raw_gradient_boosting", "random_forest", etc.
    hyperparameters: Dict[str, Any] = Field(default_factory=dict)
    split_strategy: str = "scenario_split"  # scenario_split, chronological, stratified
    test_size: float = 0.25
    random_seed: int = 42


class ExperimentOut(BaseModel):
    id: str
    workspace_id: str
    dataset_version_id: str
    schema_mapping_id: Optional[str] = None
    name: str
    target_column: Optional[str] = "label"
    model_family: str
    hyperparameters: Dict[str, Any]
    split_strategy: str
    test_size: float
    random_seed: int
    status: str
    error_message: Optional[str] = None
    metrics: Optional[Dict[str, Any]] = None
    confusion_matrix: Optional[Dict[str, Any]] = None
    duration_seconds: float
    created_at: datetime.datetime
    finished_at: Optional[datetime.datetime] = None


class PairedMcNemarResult(BaseModel):
    model_a_name: str
    model_b_name: str
    contingency_table: List[List[int]]  # [[both_correct, a_correct_b_wrong], [b_correct_a_wrong, both_wrong]]
    statistic: float
    p_value: float
    is_significant: bool
    interpretation: str


# ACAFDM & Mitigation
class ACAFDMConfigCreate(BaseModel):
    name: str
    cluster_count: int = 4
    rolling_window_size: int = 50
    alpha_update_rate: float = 0.1
    z_threshold: float = 2.5
    persistence_k: int = 3
    cooldown_seconds: int = 30
    benign_validation_gate: bool = True


class ACAFDMConfigOut(BaseModel):
    id: str
    workspace_id: str
    name: str
    cluster_count: int
    rolling_window_size: int
    alpha_update_rate: float
    z_threshold: float
    persistence_k: int
    cooldown_seconds: int
    benign_validation_gate: bool
    created_at: datetime.datetime


class ACAFDMDecisionRecord(BaseModel):
    index: int
    timestamp: float
    rx_id: str
    cluster_id: int
    raw_rate: float
    baseline_rate: float
    z_score: float
    model_score: float
    confidence: float
    persistence_count: int
    decision: str  # "ALLOW", "FLAG_SUSPICIOUS", "MITIGATE_RATE_LIMIT"
    reason: str
    baseline_updated: bool


class ACAFDMRunResult(BaseModel):
    config_id: str
    total_observations: int
    mitigated_count: int
    flagged_suspicious_count: int
    allowed_count: int
    baseline_updates_accepted: int
    baseline_updates_rejected_poison_prevented: int
    decision_trace: List[ACAFDMDecisionRecord]


class MitigationSimulationCreate(BaseModel):
    dataset_version_id: str
    acafdm_config_id: Optional[str] = None
    name: str
    policy_action: str = "selective_rate_limiting"
    rate_limit_ratio: float = 0.5
    priority_preservation: bool = True


class MitigationSimulationOut(BaseModel):
    id: str
    workspace_id: str
    dataset_version_id: str
    acafdm_config_id: Optional[str]
    name: str
    policy_action: str
    rate_limit_ratio: float
    priority_preservation: bool
    status: str
    results: Dict[str, Any]
    created_at: datetime.datetime


# System Diagnostics & Jobs
class BackgroundJobOut(BaseModel):
    id: str
    workspace_id: str
    job_type: str
    status: str
    progress_pct: int
    error_message: Optional[str]
    result_metadata: Optional[Dict[str, Any]]
    created_at: datetime.datetime
    updated_at: datetime.datetime


class SystemStatsOut(BaseModel):
    total_datasets: int
    total_records: int
    total_experiments: int
    completed_experiments: int
    failed_experiments: int
    total_simulations: int
    active_workers: int
    storage_used_bytes: int
    backend_status: str
    database_status: str
