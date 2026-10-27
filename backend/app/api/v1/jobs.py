from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
import datetime

from app.db.session import get_db
from app.models.entities import BackgroundJob, Workspace
from app.api.deps import get_current_workspace
from app.workers.task_runner import TaskRunner

router = APIRouter(prefix="/jobs", tags=["Background Job Observability"])


class JobOut(BaseModel):
    id: str
    workspace_id: str
    job_type: str
    status: str
    progress_pct: int
    error_message: Optional[str] = None
    result_metadata: Optional[Dict[str, Any]] = None
    created_at: datetime.datetime
    updated_at: datetime.datetime


@router.get("", response_model=List[JobOut])
def list_jobs(
    workspace: Workspace = Depends(get_current_workspace),
    db: Session = Depends(get_db)
):
    """List all background jobs associated with the current workspace."""
    jobs = db.query(BackgroundJob).filter(
        BackgroundJob.workspace_id == workspace.id
    ).order_by(BackgroundJob.created_at.desc()).limit(100).all()

    return [
        JobOut(
            id=j.id,
            workspace_id=j.workspace_id,
            job_type=j.job_type,
            status=j.status,
            progress_pct=j.progress_pct,
            error_message=j.error_message,
            result_metadata=j.result_metadata,
            created_at=j.created_at,
            updated_at=j.updated_at
        )
        for j in jobs
    ]


@router.get("/{job_id}", response_model=JobOut)
def get_job(
    job_id: str,
    workspace: Workspace = Depends(get_current_workspace),
    db: Session = Depends(get_db)
):
    """Retrieve execution status and progress for a specific background job."""
    job = db.query(BackgroundJob).filter(
        BackgroundJob.id == job_id,
        BackgroundJob.workspace_id == workspace.id
    ).first()

    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Background job not found in the active workspace."
        )

    return JobOut(
        id=job.id,
        workspace_id=job.workspace_id,
        job_type=job.job_type,
        status=job.status,
        progress_pct=job.progress_pct,
        error_message=job.error_message,
        result_metadata=job.result_metadata,
        created_at=job.created_at,
        updated_at=job.updated_at
    )


@router.post("/{job_id}/cancel")
def cancel_job(
    job_id: str,
    workspace: Workspace = Depends(get_current_workspace)
):
    """Safely request cancellation of a pending or running background job."""
    cancelled = TaskRunner.cancel_task(job_id=job_id, workspace_id=workspace.id)
    if not cancelled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Job is either not running, already terminated, or does not exist."
        )
    return {"message": "Job cancellation requested successfully", "job_id": job_id}
