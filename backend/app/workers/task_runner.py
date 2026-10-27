import concurrent.futures
import threading
import uuid
import datetime
import traceback
from typing import Callable, Any, Dict, Optional
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models.entities import BackgroundJob


class TaskRunner:
    _executor = concurrent.futures.ThreadPoolExecutor(max_workers=4)
    _active_tasks: Dict[str, concurrent.futures.Future] = {}
    _lock = threading.Lock()

    @classmethod
    def submit_task(
        cls,
        workspace_id: str,
        job_type: str,
        target_fn: Callable[..., Any],
        *args,
        **kwargs
    ) -> str:
        job_id = str(uuid.uuid4())
        db = SessionLocal()
        try:
            job = BackgroundJob(
                id=job_id,
                workspace_id=workspace_id,
                job_type=job_type,
                status="pending",
                progress_pct=0,
                created_at=datetime.datetime.utcnow()
            )
            db.add(job)
            db.commit()
        finally:
            db.close()

        def _worker_wrapper():
            w_db = SessionLocal()
            try:
                # Mark as processing
                w_job = w_db.query(BackgroundJob).filter(BackgroundJob.id == job_id).first()
                if w_job:
                    w_job.status = "processing"
                    w_job.progress_pct = 10
                    w_db.commit()

                # Execute target function
                result = target_fn(job_id=job_id, *args, **kwargs)

                # Mark completed
                w_job = w_db.query(BackgroundJob).filter(BackgroundJob.id == job_id).first()
                if w_job:
                    w_job.status = "completed"
                    w_job.progress_pct = 100
                    if isinstance(result, dict):
                        w_job.result_metadata = result
                    w_db.commit()

            except Exception as e:
                w_job = w_db.query(BackgroundJob).filter(BackgroundJob.id == job_id).first()
                if w_job:
                    w_job.status = "failed"
                    w_job.error_message = f"{type(e).__name__}: {str(e)}"
                    w_db.commit()
            finally:
                w_db.close()
                with cls._lock:
                    cls._active_tasks.pop(job_id, None)

        future = cls._executor.submit(_worker_wrapper)
        with cls._lock:
            cls._active_tasks[job_id] = future

        return job_id

    @classmethod
    def update_progress(cls, job_id: str, progress_pct: int, metadata: Dict[str, Any] = None):
        db = SessionLocal()
        try:
            job = db.query(BackgroundJob).filter(BackgroundJob.id == job_id).first()
            if job and job.status == "processing":
                job.progress_pct = min(100, max(0, progress_pct))
                if metadata:
                    job.result_metadata = metadata
                db.commit()
        finally:
            db.close()
