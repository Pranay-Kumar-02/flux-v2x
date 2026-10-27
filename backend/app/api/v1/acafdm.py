import uuid
import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import polars as pl

from app.db.session import get_db
from app.models.entities import ACAFDMConfig, DatasetVersion, Workspace
from app.schemas.api_models import (
    ACAFDMConfigCreate,
    ACAFDMConfigOut,
    ACAFDMRunResult,
    ACAFDMDecisionRecord
)
from app.api.deps import get_current_workspace
from app.acafdm.engine import ACAFDMEngine

router = APIRouter(prefix="/acafdm", tags=["ACAFDM Engine"])


@router.post("/configs", response_model=ACAFDMConfigOut)
def create_config(
    cfg_in: ACAFDMConfigCreate,
    workspace: Workspace = Depends(get_current_workspace),
    db: Session = Depends(get_db)
):
    cfg_id = str(uuid.uuid4())
    cfg = ACAFDMConfig(
        id=cfg_id,
        workspace_id=workspace.id,
        name=cfg_in.name,
        cluster_count=cfg_in.cluster_count,
        rolling_window_size=cfg_in.rolling_window_size,
        alpha_update_rate=cfg_in.alpha_update_rate,
        z_threshold=cfg_in.z_threshold,
        persistence_k=cfg_in.persistence_k,
        cooldown_seconds=cfg_in.cooldown_seconds,
        benign_validation_gate=cfg_in.benign_validation_gate,
        created_at=datetime.datetime.utcnow()
    )
    db.add(cfg)
    db.commit()
    db.refresh(cfg)

    return ACAFDMConfigOut(
        id=cfg.id,
        workspace_id=cfg.workspace_id,
        name=cfg.name,
        cluster_count=cfg.cluster_count,
        rolling_window_size=cfg.rolling_window_size,
        alpha_update_rate=cfg.alpha_update_rate,
        z_threshold=cfg.z_threshold,
        persistence_k=cfg.persistence_k,
        cooldown_seconds=cfg.cooldown_seconds,
        benign_validation_gate=cfg.benign_validation_gate,
        created_at=cfg.created_at
    )


@router.get("/configs", response_model=List[ACAFDMConfigOut])
def list_configs(
    workspace: Workspace = Depends(get_current_workspace),
    db: Session = Depends(get_db)
):
    configs = db.query(ACAFDMConfig).filter(ACAFDMConfig.workspace_id == workspace.id).all()
    if not configs:
        # Create default config if none
        default_cfg = ACAFDMConfig(
            id=str(uuid.uuid4()),
            workspace_id=workspace.id,
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
        db.add(default_cfg)
        db.commit()
        db.refresh(default_cfg)
        configs = [default_cfg]

    return [
        ACAFDMConfigOut(
            id=c.id,
            workspace_id=c.workspace_id,
            name=c.name,
            cluster_count=c.cluster_count,
            rolling_window_size=c.rolling_window_size,
            alpha_update_rate=c.alpha_update_rate,
            z_threshold=c.z_threshold,
            persistence_k=c.persistence_k,
            cooldown_seconds=c.cooldown_seconds,
            benign_validation_gate=c.benign_validation_gate,
            created_at=c.created_at
        )
        for c in configs
    ]


@router.post("/evaluate/{dataset_version_id}", response_model=ACAFDMRunResult)
def evaluate_acafdm(
    dataset_version_id: str,
    config_id: Optional[str] = None,
    workspace: Workspace = Depends(get_current_workspace),
    db: Session = Depends(get_db)
):
    version = db.query(DatasetVersion).filter(DatasetVersion.id == dataset_version_id).first()
    if not version:
        raise HTTPException(status_code=404, detail="Dataset version not found")

    cfg = None
    if config_id:
        cfg = db.query(ACAFDMConfig).filter(ACAFDMConfig.id == config_id).first()

    cluster_count = cfg.cluster_count if cfg else 4
    alpha = cfg.alpha_update_rate if cfg else 0.08
    z_thresh = cfg.z_threshold if cfg else 2.5
    persistence_k = cfg.persistence_k if cfg else 3
    gate = cfg.benign_validation_gate if cfg else True

    df = pl.read_parquet(version.file_path)

    engine = ACAFDMEngine(
        cluster_count=cluster_count,
        alpha_update_rate=alpha,
        z_threshold=z_thresh,
        persistence_k=persistence_k,
        benign_validation_gate=gate
    )

    result = engine.process_trace(df)

    trace_records = [
        ACAFDMDecisionRecord(
            index=r["index"],
            timestamp=r["timestamp"],
            rx_id=r["rx_id"],
            cluster_id=r["cluster_id"],
            raw_rate=r["raw_rate"],
            baseline_rate=r["baseline_rate"],
            z_score=r["z_score"],
            model_score=r["model_score"],
            confidence=r["confidence"],
            persistence_count=r["persistence_count"],
            decision=r["decision"],
            reason=r["reason"],
            baseline_updated=r["baseline_updated"]
        )
        for r in result["decision_trace"]
    ]

    return ACAFDMRunResult(
        config_id=config_id or "default",
        total_observations=result["total_observations"],
        mitigated_count=result["mitigated_count"],
        flagged_suspicious_count=result["flagged_suspicious_count"],
        allowed_count=result["allowed_count"],
        baseline_updates_accepted=result["baseline_updates_accepted"],
        baseline_updates_rejected_poison_prevented=result["baseline_updates_rejected_poison_prevented"],
        decision_trace=trace_records
    )
