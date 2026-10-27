import os
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.db.session import get_db
from app.core.config import settings
from app.models.entities import Dataset, Experiment, MitigationSimulation
from app.schemas.api_models import SystemStatsOut
from app.api.deps import get_current_workspace

router = APIRouter(tags=["Health & System Diagnostics"])


@router.get("/health")
def health_check(db: Session = Depends(get_db)):
    db_status = "healthy"
    try:
        db.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"

    return {
        "status": "healthy" if db_status == "healthy" else "degraded",
        "service": "fluxv2x-backend",
        "version": settings.VERSION,
        "database": db_status,
        "environment": settings.ENVIRONMENT
    }


@router.get("/system/stats", response_model=SystemStatsOut)
def get_system_stats(
    db: Session = Depends(get_db)
):
    total_datasets = db.query(Dataset).count()
    total_experiments = db.query(Experiment).count()
    completed_exp = db.query(Experiment).filter(Experiment.status == "completed").count()
    failed_exp = db.query(Experiment).filter(Experiment.status == "failed").count()
    total_sims = db.query(MitigationSimulation).count()

    total_records = 0
    all_datasets = db.query(Dataset).all()
    for d in all_datasets:
        total_records += d.row_count

    # Storage calculation
    storage_bytes = 0
    for path in [settings.LOCAL_STORAGE_PATH, settings.DERIVED_STORAGE_PATH, settings.ARTIFACTS_STORAGE_PATH]:
        if os.path.exists(path):
            for root, dirs, files in os.walk(path):
                for f in files:
                    fp = os.path.join(root, f)
                    try:
                        storage_bytes += os.path.getsize(fp)
                    except Exception:
                        pass

    return SystemStatsOut(
        total_datasets=total_datasets,
        total_records=total_records,
        total_experiments=total_experiments,
        completed_experiments=completed_exp,
        failed_experiments=failed_exp,
        total_simulations=total_sims,
        active_workers=4,
        storage_used_bytes=storage_bytes,
        backend_status="online",
        database_status="connected"
    )
