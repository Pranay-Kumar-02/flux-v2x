from typing import Optional
from fastapi import APIRouter, Depends, Header
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.db.session import get_db
from app.core.config import settings
from app.models.entities import Dataset, Experiment, MitigationSimulation, WorkspaceMembership
from app.schemas.api_models import SystemStatsOut
from app.api.deps import oauth2_scheme
from app.core.security import decode_access_token

router = APIRouter(tags=["Health & System Diagnostics"])


@router.get("/health")
def health_check(db: Session = Depends(get_db)):
    """Liveness and dependency readiness probe."""
    db_status = "healthy"
    try:
        db.execute(text("SELECT 1"))
    except Exception as e:
        db_status = "unhealthy"

    return {
        "status": "healthy" if db_status == "healthy" else "degraded",
        "service": "fluxv2x-backend",
        "version": settings.VERSION,
        "database": db_status,
        "environment": settings.ENVIRONMENT
    }


@router.get("/system/stats", response_model=SystemStatsOut)
def get_system_stats(
    x_workspace_id: Optional[str] = Header(None, alias="X-Workspace-Id"),
    token: Optional[str] = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    """
    Returns statistics scoped strictly to the authenticated user's authorized workspace.
    Prevents cross-tenant metadata leakage.
    """
    ws_id = None
    if token:
        payload = decode_access_token(token)
        if payload and "sub" in payload:
            user_id = payload["sub"]
            if x_workspace_id:
                mem = db.query(WorkspaceMembership).filter(
                    WorkspaceMembership.workspace_id == x_workspace_id,
                    WorkspaceMembership.user_id == user_id
                ).first()
                if mem:
                    ws_id = x_workspace_id
            if not ws_id:
                mem = db.query(WorkspaceMembership).filter(
                    WorkspaceMembership.user_id == user_id
                ).first()
                if mem:
                    ws_id = mem.workspace_id

    if ws_id:
        total_datasets = db.query(Dataset).filter(Dataset.workspace_id == ws_id).count()
        total_experiments = db.query(Experiment).filter(Experiment.workspace_id == ws_id).count()
        completed_exp = db.query(Experiment).filter(
            Experiment.workspace_id == ws_id,
            Experiment.status == "completed"
        ).count()
        failed_exp = db.query(Experiment).filter(
            Experiment.workspace_id == ws_id,
            Experiment.status == "failed"
        ).count()
        total_sims = db.query(MitigationSimulation).filter(
            MitigationSimulation.workspace_id == ws_id
        ).count()

        total_records = 0
        all_datasets = db.query(Dataset).filter(Dataset.workspace_id == ws_id).all()
        for d in all_datasets:
            total_records += d.row_count
    else:
        total_datasets = 0
        total_experiments = 0
        completed_exp = 0
        failed_exp = 0
        total_sims = 0
        total_records = 0

    return SystemStatsOut(
        total_datasets=total_datasets,
        total_records=total_records,
        total_experiments=total_experiments,
        completed_experiments=completed_exp,
        failed_experiments=failed_exp,
        total_simulations=total_sims,
        active_workers=4,
        storage_used_bytes=0,
        backend_status="online",
        database_status="connected"
    )
