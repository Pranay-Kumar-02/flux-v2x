import concurrent.futures
import threading
import uuid
import datetime
import logging
from typing import Callable, Any, Dict, Optional
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models.entities import BackgroundJob

logger = logging.getLogger("fluxv2x.workers")


class TaskRunner:
    """
    Asynchronous Background Job Manager.
    Executes heavy ML training, profiling, and benchmarking asynchronously
    with persistent database status tracking, progress updates, failure reporting,
    and cancellation support.
    """
    _executor = concurrent.futures.ThreadPoolExecutor(max_workers=4)
    _active_futures: Dict[str, concurrent.futures.Future] = {}
    _cancel_events: Dict[str, threading.Event] = {}
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
        """
        Creates a persistent job record and dispatches execution asynchronously.
        Returns the job identifier immediately without blocking the HTTP request.
        """
        job_id = str(uuid.uuid4())
        cancel_event = threading.Event()

        # Persist initial job record
        db = SessionLocal()
        try:
            job = BackgroundJob(
                id=job_id,
                workspace_id=workspace_id,
                job_type=job_type,
                status="pending",
                progress_pct=0,
                created_at=datetime.datetime.utcnow(),
                updated_at=datetime.datetime.utcnow()
            )
            db.add(job)
            db.commit()
        finally:
            db.close()

        with cls._lock:
            cls._cancel_events[job_id] = cancel_event

        def _worker_wrapper():
            worker_db = SessionLocal()
            try:
                # Mark as processing
                w_job = worker_db.query(BackgroundJob).filter(BackgroundJob.id == job_id).first()
                if w_job:
                    w_job.status = "processing"
                    w_job.progress_pct = 10
                    w_job.updated_at = datetime.datetime.utcnow()
                    worker_db.commit()

                # Check if cancelled before execution
                if cancel_event.is_set():
                    w_job = worker_db.query(BackgroundJob).filter(BackgroundJob.id == job_id).first()
                    if w_job:
                        w_job.status = "cancelled"
                        w_job.updated_at = datetime.datetime.utcnow()
                        worker_db.commit()
                    return

                # Execute target function with dedicated worker db session
                result = target_fn(job_id=job_id, db=worker_db, cancel_event=cancel_event, *args, **kwargs)

                # Check if cancelled during execution
                if cancel_event.is_set():
                    w_job = worker_db.query(BackgroundJob).filter(BackgroundJob.id == job_id).first()
                    if w_job:
                        w_job.status = "cancelled"
                        w_job.updated_at = datetime.datetime.utcnow()
                        worker_db.commit()
                    return

                # Mark completed
                w_job = worker_db.query(BackgroundJob).filter(BackgroundJob.id == job_id).first()
                if w_job:
                    w_job.status = "completed"
                    w_job.progress_pct = 100
                    w_job.updated_at = datetime.datetime.utcnow()
                    if isinstance(result, dict):
                        w_job.result_metadata = result
                    worker_db.commit()

            except Exception as e:
                logger.error(f"Background job {job_id} ({job_type}) failed: {e}", exc_info=True)
                try:
                    w_job = worker_db.query(BackgroundJob).filter(BackgroundJob.id == job_id).first()
                    if w_job:
                        w_job.status = "failed"
                        w_job.error_message = f"{type(e).__name__}: {str(e)}"
                        w_job.updated_at = datetime.datetime.utcnow()
                        worker_db.commit()
                except Exception as db_err:
                    logger.error(f"Failed to record job failure in db: {db_err}")
            finally:
                worker_db.close()
                with cls._lock:
                    cls._active_futures.pop(job_id, None)
                    cls._cancel_events.pop(job_id, None)

        future = cls._executor.submit(_worker_wrapper)
        with cls._lock:
            cls._active_futures[job_id] = future

        return job_id

    @classmethod
    def cancel_task(cls, job_id: str, workspace_id: str) -> bool:
        """Requests cancellation of a running background job."""
        with cls._lock:
            if job_id in cls._cancel_events:
                cls._cancel_events[job_id].set()

        db = SessionLocal()
        try:
            job = db.query(BackgroundJob).filter(
                BackgroundJob.id == job_id,
                BackgroundJob.workspace_id == workspace_id
            ).first()
            if job and job.status in ("pending", "processing"):
                job.status = "cancelled"
                job.updated_at = datetime.datetime.utcnow()
                db.commit()
                return True
            return False
        finally:
            db.close()

    @classmethod
    def update_progress(cls, job_id: str, progress_pct: int, metadata: Optional[Dict[str, Any]] = None):
        """Update live progress percentage and metadata for a job."""
        db = SessionLocal()
        try:
            job = db.query(BackgroundJob).filter(BackgroundJob.id == job_id).first()
            if job and job.status == "processing":
                job.progress_pct = min(100, max(0, progress_pct))
                job.updated_at = datetime.datetime.utcnow()
                if metadata:
                    job.result_metadata = metadata
                db.commit()
        finally:
            db.close()
