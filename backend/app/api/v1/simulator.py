import uuid
import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import polars as pl

from app.db.session import get_db
from app.models.entities import MitigationSimulation, DatasetVersion, Workspace, ACAFDMConfig
from app.schemas.api_models import MitigationSimulationCreate, MitigationSimulationOut
from app.api.deps import get_current_workspace
from app.simulation.simulator import MitigationSimulator

router = APIRouter(prefix="/simulator", tags=["Mitigation Simulator"])


@router.post("/run", response_model=MitigationSimulationOut)
def run_simulation(
    sim_in: MitigationSimulationCreate,
    workspace: Workspace = Depends(get_current_workspace),
    db: Session = Depends(get_db)
):
    version = db.query(DatasetVersion).filter(DatasetVersion.id == sim_in.dataset_version_id).first()
    if not version:
        raise HTTPException(status_code=404, detail="Dataset version not found")

    cfg = None
    if sim_in.acafdm_config_id:
        cfg = db.query(ACAFDMConfig).filter(ACAFDMConfig.id == sim_in.acafdm_config_id).first()

    cluster_count = cfg.cluster_count if cfg else 4
    z_thresh = cfg.z_threshold if cfg else 2.5
    persistence_k = cfg.persistence_k if cfg else 3

    df = pl.read_parquet(version.file_path)

    results = MitigationSimulator.run_simulation(
        df=df,
        policy_action=sim_in.policy_action,
        rate_limit_ratio=sim_in.rate_limit_ratio,
        priority_preservation=sim_in.priority_preservation,
        cluster_count=cluster_count,
        z_threshold=z_thresh,
        persistence_k=persistence_k
    )

    sim_id = str(uuid.uuid4())
    sim_rec = MitigationSimulation(
        id=sim_id,
        workspace_id=workspace.id,
        dataset_version_id=sim_in.dataset_version_id,
        acafdm_config_id=sim_in.acafdm_config_id,
        name=sim_in.name,
        policy_action=sim_in.policy_action,
        rate_limit_ratio=sim_in.rate_limit_ratio,
        priority_preservation=sim_in.priority_preservation,
        status="completed",
        results=results,
        created_at=datetime.datetime.utcnow()
    )
    db.add(sim_rec)
    db.commit()
    db.refresh(sim_rec)

    return MitigationSimulationOut(
        id=sim_rec.id,
        workspace_id=sim_rec.workspace_id,
        dataset_version_id=sim_rec.dataset_version_id,
        acafdm_config_id=sim_rec.acafdm_config_id,
        name=sim_rec.name,
        policy_action=sim_rec.policy_action,
        rate_limit_ratio=sim_rec.rate_limit_ratio,
        priority_preservation=sim_rec.priority_preservation,
        status=sim_rec.status,
        results=sim_rec.results,
        created_at=sim_rec.created_at
    )


@router.get("/list", response_model=List[MitigationSimulationOut])
def list_simulations(
    workspace: Workspace = Depends(get_current_workspace),
    db: Session = Depends(get_db)
):
    sims = db.query(MitigationSimulation).filter(
        MitigationSimulation.workspace_id == workspace.id
    ).order_by(MitigationSimulation.created_at.desc()).all()

    return [
        MitigationSimulationOut(
            id=s.id,
            workspace_id=s.workspace_id,
            dataset_version_id=s.dataset_version_id,
            acafdm_config_id=s.acafdm_config_id,
            name=s.name,
            policy_action=s.policy_action,
            rate_limit_ratio=s.rate_limit_ratio,
            priority_preservation=s.priority_preservation,
            status=s.status,
            results=s.results,
            created_at=s.created_at
        )
        for s in sims
    ]
