import os
import uuid
import time
import datetime
import logging
import joblib
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
import polars as pl
import numpy as np

from app.db.session import get_db
from app.core.config import settings
from app.models.entities import Experiment, ModelArtifact, DatasetVersion, Dataset, Workspace
from app.schemas.api_models import ExperimentCreate, ExperimentOut
from app.api.deps import get_current_workspace
from app.ml.spatiotemporal import SpatiotemporalClusterer
from app.ml.session_builder import SessionBuilder
from app.ml.baselines import LocalizedBaselineEngine
from app.ml.splits import SplitEngine
from app.ml.models import ModelFactory
from app.ml.evaluation import EvaluationEngine
from app.ingestion.parser import IngestionEngine
from app.workers.task_runner import TaskRunner

logger = logging.getLogger("fluxv2x.experiments")
router = APIRouter(prefix="/experiments", tags=["Model Laboratory & Experiments"])


def _run_experiment_async(
    job_id: str,
    db: Session,
    cancel_event,
    exp_id: str,
    version_file_path: str,
    exp_in_dict: Dict[str, Any]
) -> Optional[Dict[str, Any]]:
    """
    Dedicated background worker task for model training.
    Executes in a separate thread/process with its own isolated DB session.
    """
    exp = db.query(Experiment).filter(Experiment.id == exp_id).first()
    if not exp:
        return None

    exp.status = "running"
    db.commit()
    t0 = time.time()

    try:
        TaskRunner.update_progress(job_id, 15, {"stage": "loading_data"})
        if cancel_event.is_set():
            return None

        if not os.path.exists(version_file_path):
            raise FileNotFoundError(f"Dataset version file not found at: {version_file_path}")

        df = pl.read_parquet(version_file_path)

        # Receiver window temporal enrichment
        TaskRunner.update_progress(job_id, 30, {"stage": "session_and_window_aggregation"})
        df = SessionBuilder.enrich_receiver_windows(df)

        is_contextual = "contextual" in exp.model_family or exp.model_family in [
            "random_forest", "extra_trees", "adaboost", "decision_tree", "knn", "logistic_regression", "svc_linear", "svc_rbf"
        ]

        # 1. Leakage-safe train-test split (fitted exclusively on permitted partition)
        TaskRunner.update_progress(job_id, 45, {"stage": "leakage_safe_partitioning"})
        train_df, test_df, split_meta = SplitEngine.split(
            df,
            strategy=exp.split_strategy,
            test_size=exp.test_size,
            target_col="label",
            random_seed=exp.random_seed
        )

        cluster_col = "cluster_id"
        if is_contextual:
            # Fit spatiotemporal clusterer STRICTLY on train partition to eliminate leakage
            clusterer = SpatiotemporalClusterer(n_clusters=4, random_state=exp.random_seed)
            train_clusters, _ = clusterer.fit_predict(train_df)
            train_df = train_df.with_columns(pl.Series(cluster_col, train_clusters))

            # Transform test partition with fitted clusterer
            test_clusters = clusterer.predict(test_df)
            test_df = test_df.with_columns(pl.Series(cluster_col, test_clusters))

            # Fit localized statistical baselines STRICTLY on train partition
            baseline_engine = LocalizedBaselineEngine(metric_col="packet_rate")
            baseline_engine.fit(train_df, cluster_col=cluster_col, label_col="label" if "label" in train_df.columns else None)

            train_df = baseline_engine.transform(train_df, cluster_col=cluster_col)
            test_df = baseline_engine.transform(test_df, cluster_col=cluster_col)

        if cancel_event.is_set():
            return

        # Feature selection with strict target leakage exclusion
        target_name = exp.target_column.strip().lower()
        forbidden_leakage_names = {target_name, "label", "is_malicious", "attack", "ground_truth"}

        user_features = exp_in_dict.get("features", [])
        if user_features:
            features = [f for f in user_features if f.lower() not in forbidden_leakage_names]
        else:
            features = ModelFactory.get_feature_columns(exp.model_family, train_df.columns)
            if not features:
                features = [c for c in train_df.columns if train_df[c].dtype.is_numeric() and c.lower() not in forbidden_leakage_names]

        X_train = train_df.select(features).to_numpy()
        X_train = np.nan_to_num(X_train, nan=0.0)
        y_train = train_df["label"].to_numpy() if "label" in train_df.columns else np.zeros(len(X_train))

        X_test = test_df.select(features).to_numpy()
        X_test = np.nan_to_num(X_test, nan=0.0)
        y_test = test_df["label"].to_numpy() if "label" in test_df.columns else np.zeros(len(X_test))

        TaskRunner.update_progress(job_id, 65, {"stage": "model_fitting", "features_count": len(features)})
        if cancel_event.is_set():
            return

        # Model creation & training
        model = ModelFactory.create_model(
            exp.model_family,
            hyperparameters=exp.hyperparameters,
            random_seed=exp.random_seed
        )

        if exp.model_family == "global_threshold":
            model.fit(X_train, y_train, rate_col_idx=0)
            y_pred = model.predict(X_test, rate_col_idx=0)
            y_prob = model.predict_proba(X_test, rate_col_idx=0)[:, 1]
        else:
            model.fit(X_train, y_train)
            y_pred = model.predict(X_test)
            if hasattr(model, "predict_proba"):
                y_prob = model.predict_proba(X_test)[:, 1]
            elif hasattr(model, "decision_function"):
                dfn = model.decision_function(X_test)
                y_prob = 1.0 / (1.0 + np.exp(-dfn))
            else:
                y_prob = y_pred.astype(float)

        TaskRunner.update_progress(job_id, 85, {"stage": "evaluating_metrics"})
        if cancel_event.is_set():
            return None

        # Evaluation metrics
        metrics = EvaluationEngine.compute_metrics(y_test, y_pred, y_prob)
        metrics["features_used"] = features
        metrics["split_metadata"] = split_meta
        metrics["train_samples"] = len(X_train)
        metrics["test_samples"] = len(X_test)

        # Persist model artifact securely
        os.makedirs(settings.ARTIFACTS_STORAGE_PATH, exist_ok=True)
        artifact_path = os.path.join(settings.ARTIFACTS_STORAGE_PATH, f"{exp.id}.joblib")
        joblib.dump(model, artifact_path)
        art_hash = IngestionEngine.compute_sha256(artifact_path)

        art_rec = ModelArtifact(
            id=str(uuid.uuid4()),
            experiment_id=exp.id,
            artifact_path=artifact_path,
            artifact_type="joblib",
            sha256_hash=art_hash,
            created_at=datetime.datetime.utcnow()
        )
        db.add(art_rec)

        duration = time.time() - t0
        exp.status = "completed"
        exp.metrics = metrics
        exp.confusion_matrix = metrics.get("confusion_matrix")
        exp.duration_seconds = round(duration, 3)
        exp.finished_at = datetime.datetime.utcnow()
        db.commit()

        TaskRunner.update_progress(job_id, 100, {"stage": "completed", "duration_seconds": exp.duration_seconds})
        return {"experiment_id": exp.id, "metrics": metrics}

    except Exception as e:
        logger.error(f"Experiment {exp_id} execution failed: {e}", exc_info=True)
        exp.status = "failed"
        exp.error_message = f"{type(e).__name__}: {str(e)}"
        exp.duration_seconds = round(time.time() - t0, 3)
        exp.finished_at = datetime.datetime.utcnow()
        db.commit()
        raise


@router.post("", response_model=ExperimentOut)
def launch_experiment(
    exp_in: ExperimentCreate,
    workspace: Workspace = Depends(get_current_workspace),
    db: Session = Depends(get_db)
):
    """
    Submits an asynchronous model training experiment job.
    Enforces complete dataset ownership validation and target leakage prevention.
    Returns immediately with 'queued' status and background job tracking.
    """
    # 1. Verify dataset version ownership chain
    version = db.query(DatasetVersion).join(
        Dataset, Dataset.id == DatasetVersion.dataset_id
    ).filter(
        DatasetVersion.id == exp_in.dataset_version_id,
        Dataset.workspace_id == workspace.id
    ).first()

    if not version:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dataset version not found in the active authorized workspace."
        )

    # 2. Prevent target leakage: target column must not be in features
    target_clean = exp_in.target_column.strip().lower()
    for feat in exp_in.features:
        if feat.strip().lower() == target_clean or feat.strip().lower() in ("label", "is_malicious", "attack", "ground_truth"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Target leakage prohibited: Feature '{feat}' cannot be or derive directly from target '{exp_in.target_column}'."
            )

    exp_id = str(uuid.uuid4())
    exp = Experiment(
        id=exp_id,
        workspace_id=workspace.id,
        dataset_version_id=exp_in.dataset_version_id,
        name=exp_in.name,
        target_column=exp_in.target_column,
        model_family=exp_in.model_family,
        hyperparameters=exp_in.hyperparameters,
        split_strategy=exp_in.split_strategy,
        test_size=exp_in.test_size,
        random_seed=exp_in.random_seed,
        status="queued",
        created_at=datetime.datetime.utcnow()
    )
    db.add(exp)
    db.commit()
    db.refresh(exp)

    # 3. Submit real asynchronous background task
    TaskRunner.submit_task(
        workspace_id=workspace.id,
        job_type="model_training",
        target_fn=_run_experiment_async,
        exp_id=exp.id,
        version_file_path=version.file_path,
        exp_in_dict=exp_in.model_dump()
    )

    return ExperimentOut(
        id=exp.id,
        workspace_id=exp.workspace_id,
        dataset_version_id=exp.dataset_version_id,
        schema_mapping_id=exp.schema_mapping_id,
        name=exp.name,
        target_column=exp.target_column,
        model_family=exp.model_family,
        hyperparameters=exp.hyperparameters,
        split_strategy=exp.split_strategy,
        test_size=exp.test_size,
        random_seed=exp.random_seed,
        status=exp.status,
        error_message=exp.error_message,
        metrics=exp.metrics,
        confusion_matrix=exp.confusion_matrix,
        duration_seconds=exp.duration_seconds,
        created_at=exp.created_at,
        finished_at=exp.finished_at
    )


@router.get("", response_model=List[ExperimentOut])
def list_experiments(
    workspace: Workspace = Depends(get_current_workspace),
    db: Session = Depends(get_db)
):
    """List all experiments scoped strictly to the current workspace."""
    experiments = db.query(Experiment).filter(
        Experiment.workspace_id == workspace.id
    ).order_by(Experiment.created_at.desc()).all()

    return [
        ExperimentOut(
            id=e.id,
            workspace_id=e.workspace_id,
            dataset_version_id=e.dataset_version_id,
            schema_mapping_id=e.schema_mapping_id,
            name=e.name,
            target_column=e.target_column,
            model_family=e.model_family,
            hyperparameters=e.hyperparameters,
            split_strategy=e.split_strategy,
            test_size=e.test_size,
            random_seed=e.random_seed,
            status=e.status,
            error_message=e.error_message,
            metrics=e.metrics,
            confusion_matrix=e.confusion_matrix,
            duration_seconds=e.duration_seconds,
            created_at=e.created_at,
            finished_at=e.finished_at
        )
        for e in experiments
    ]


@router.get("/{experiment_id}", response_model=ExperimentOut)
def get_experiment(
    experiment_id: str,
    workspace: Workspace = Depends(get_current_workspace),
    db: Session = Depends(get_db)
):
    """Retrieve experiment details ensuring workspace isolation."""
    exp = db.query(Experiment).filter(
        Experiment.id == experiment_id,
        Experiment.workspace_id == workspace.id
    ).first()

    if not exp:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Experiment not found in active workspace."
        )

    return ExperimentOut(
        id=exp.id,
        workspace_id=exp.workspace_id,
        dataset_version_id=exp.dataset_version_id,
        schema_mapping_id=exp.schema_mapping_id,
        name=exp.name,
        target_column=exp.target_column,
        model_family=exp.model_family,
        hyperparameters=exp.hyperparameters,
        split_strategy=exp.split_strategy,
        test_size=exp.test_size,
        random_seed=exp.random_seed,
        status=exp.status,
        error_message=exp.error_message,
        metrics=exp.metrics,
        confusion_matrix=exp.confusion_matrix,
        duration_seconds=exp.duration_seconds,
        created_at=exp.created_at,
        finished_at=exp.finished_at
    )


@router.get("/{experiment_id}/export")
def export_experiment(
    experiment_id: str,
    workspace: Workspace = Depends(get_current_workspace),
    db: Session = Depends(get_db)
):
    """Export complete reproducibility artifact for an experiment."""
    exp = db.query(Experiment).filter(
        Experiment.id == experiment_id,
        Experiment.workspace_id == workspace.id
    ).first()

    if not exp:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Experiment not found in active workspace."
        )

    payload = {
        "experiment_id": exp.id,
        "workspace_id": exp.workspace_id,
        "name": exp.name,
        "model_family": exp.model_family,
        "split_strategy": exp.split_strategy,
        "hyperparameters": exp.hyperparameters,
        "random_seed": exp.random_seed,
        "status": exp.status,
        "duration_seconds": exp.duration_seconds,
        "created_at": exp.created_at.isoformat(),
        "finished_at": exp.finished_at.isoformat() if exp.finished_at else None,
        "metrics": exp.metrics,
        "confusion_matrix": exp.confusion_matrix,
    }
    return JSONResponse(content=payload)
