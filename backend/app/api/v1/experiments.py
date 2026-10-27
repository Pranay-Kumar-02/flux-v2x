import os
import uuid
import time
import datetime
import joblib
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
import polars as pl
import numpy as np

from app.db.session import get_db
from app.core.config import settings
from app.models.entities import Experiment, ModelArtifact, DatasetVersion, Workspace
from app.schemas.api_models import ExperimentCreate, ExperimentOut
from app.api.deps import get_current_workspace
from app.ml.spatiotemporal import SpatiotemporalClusterer
from app.ml.session_builder import SessionBuilder
from app.ml.baselines import LocalizedBaselineEngine
from app.ml.splits import SplitEngine
from app.ml.models import ModelFactory
from app.ml.evaluation import EvaluationEngine
from app.ingestion.parser import IngestionEngine

router = APIRouter(prefix="/experiments", tags=["Model Laboratory & Experiments"])


def _run_experiment_sync(exp_id: str, db: Session):
    exp = db.query(Experiment).filter(Experiment.id == exp_id).first()
    if not exp:
        return

    exp.status = "running"
    db.commit()
    t0 = time.time()

    try:
        version = db.query(DatasetVersion).filter(DatasetVersion.id == exp.dataset_version_id).first()
        if not version or not os.path.exists(version.file_path):
            raise ValueError("Dataset version file not found")

        df = pl.read_parquet(version.file_path)

        # Ensure receiver window enrichments
        df = SessionBuilder.enrich_receiver_windows(df)

        is_contextual = "contextual" in exp.model_family or exp.model_family in [
            "random_forest", "extra_trees", "adaboost", "decision_tree", "knn", "logistic_regression", "svc_linear", "svc_rbf"
        ]

        # 1. Leakage-safe train-test split
        train_df, test_df, split_meta = SplitEngine.split(
            df,
            strategy=exp.split_strategy,
            test_size=exp.test_size,
            target_col="label",
            random_seed=exp.random_seed
        )

        cluster_col = "cluster_id"
        if is_contextual:
            # Fit spatiotemporal clusterer STRICTLY on train partition
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

        # Feature selection
        features = ModelFactory.get_feature_columns(exp.model_family, train_df.columns)
        if not features:
            features = [c for c in train_df.columns if train_df[c].dtype.is_numeric() and c != "label"]

        X_train = train_df.select(features).to_numpy()
        X_train = np.nan_to_num(X_train, nan=0.0)
        y_train = train_df["label"].to_numpy() if "label" in train_df.columns else np.zeros(len(X_train))

        X_test = test_df.select(features).to_numpy()
        X_test = np.nan_to_num(X_test, nan=0.0)
        y_test = test_df["label"].to_numpy() if "label" in test_df.columns else np.zeros(len(X_test))

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

        # Evaluation metrics
        metrics = EvaluationEngine.compute_metrics(y_test, y_pred, y_prob)
        metrics["features_used"] = features
        metrics["split_metadata"] = split_meta
        metrics["train_samples"] = len(X_train)
        metrics["test_samples"] = len(X_test)

        # Persist model artifact
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

    except Exception as e:
        exp.status = "failed"
        exp.error_message = f"{type(e).__name__}: {str(e)}"
        exp.duration_seconds = round(time.time() - t0, 3)
        exp.finished_at = datetime.datetime.utcnow()
        db.commit()


@router.post("", response_model=ExperimentOut)
def launch_experiment(
    exp_in: ExperimentCreate,
    workspace: Workspace = Depends(get_current_workspace),
    db: Session = Depends(get_db)
):
    version = db.query(DatasetVersion).filter(DatasetVersion.id == exp_in.dataset_version_id).first()
    if not version:
        raise HTTPException(status_code=404, detail="Dataset version not found")

    exp_id = str(uuid.uuid4())
    exp = Experiment(
        id=exp_id,
        workspace_id=workspace.id,
        dataset_version_id=exp_in.dataset_version_id,
        schema_mapping_id=exp_in.schema_mapping_id,
        name=exp_in.name,
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

    # Run synchronously or in threadpool for quick feedback
    _run_experiment_sync(exp_id, db)
    db.refresh(exp)

    return ExperimentOut(
        id=exp.id,
        workspace_id=exp.workspace_id,
        dataset_version_id=exp.dataset_version_id,
        schema_mapping_id=exp.schema_mapping_id,
        name=exp.name,
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
    exp = db.query(Experiment).filter(
        Experiment.id == experiment_id,
        Experiment.workspace_id == workspace.id
    ).first()
    if not exp:
        raise HTTPException(status_code=404, detail="Experiment not found")

    return ExperimentOut(
        id=exp.id,
        workspace_id=exp.workspace_id,
        dataset_version_id=exp.dataset_version_id,
        schema_mapping_id=exp.schema_mapping_id,
        name=exp.name,
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
