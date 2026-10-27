import os
import uuid
import datetime
import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import polars as pl

from app.db.session import get_db
from app.models.entities import MitigationSimulation, DatasetVersion, Dataset, Workspace, ACAFDMConfig
from app.schemas.api_models import MitigationSimulationCreate, MitigationSimulationOut
from app.api.deps import get_current_workspace
from app.simulation.simulator import MitigationSimulator

logger = logging.getLogger("fluxv2x.simulator")
router = APIRouter(prefix="/simulator", tags=["Mitigation Simulator"])


@router.post("/run", response_model=MitigationSimulationOut)
def run_simulation(
    sim_in: MitigationSimulationCreate,
    workspace: Workspace = Depends(get_current_workspace),
    db: Session = Depends(get_db)
):
    # Enforce strict ownership: DatasetVersion -> Dataset -> Workspace
    version = db.query(DatasetVersion).join(
        Dataset, Dataset.id == DatasetVersion.dataset_id
    ).filter(
        DatasetVersion.id == sim_in.dataset_version_id,
        Dataset.workspace_id == workspace.id
    ).first()

    if not version or not os.path.exists(version.file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dataset version not found in active authorized workspace."
        )

    cfg = None
    if sim_in.acafdm_config_id:
        cfg = db.query(ACAFDMConfig).filter(
            ACAFDMConfig.id == sim_in.acafdm_config_id,
            ACAFDMConfig.workspace_id == workspace.id
        ).first()
        if not cfg:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="ACAFDM config not found in active authorized workspace."
            )

    cluster_count = cfg.cluster_count if cfg else 4
    z_thresh = cfg.z_threshold if cfg else 2.5
    persistence_k = cfg.persistence_k if cfg else 3

    try:
        df = pl.read_parquet(version.file_path)
    except Exception as e:
        logger.error(f"Failed to read parquet for simulation: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to load dataset records.")

    try:
        results = MitigationSimulator.run_simulation(
            df=df,
            policy_action=sim_in.policy_action,
            rate_limit_ratio=sim_in.rate_limit_ratio,
            priority_preservation=sim_in.priority_preservation,
            cluster_count=cluster_count,
            z_threshold=z_thresh,
            persistence_k=persistence_k
        )
    except Exception as e:
        logger.error(f"Simulation execution failed: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to execute mitigation simulation.")

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


@router.get("", response_model=List[MitigationSimulationOut])
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
        ) for s in sims
    ]


@router.get("/{simulation_id}", response_model=MitigationSimulationOut)
def get_simulation_run(
    simulation_id: str,
    workspace: Workspace = Depends(get_current_workspace),
    db: Session = Depends(get_db)
):
    sim = db.query(MitigationSimulation).filter(
        MitigationSimulation.id == simulation_id,
        MitigationSimulation.workspace_id == workspace.id
    ).first()

    if not sim:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Simulation run not found in active workspace."
        )

    return MitigationSimulationOut(
        id=sim.id,
        workspace_id=sim.workspace_id,
        dataset_version_id=sim.dataset_version_id,
        acafdm_config_id=sim.acafdm_config_id,
        name=sim.name,
        policy_action=sim.policy_action,
        rate_limit_ratio=sim.rate_limit_ratio,
        priority_preservation=sim.priority_preservation,
        status=sim.status,
        results=sim.results,
        created_at=sim.created_at
    )
