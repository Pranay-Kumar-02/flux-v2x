import os
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
import polars as pl
import numpy as np
import joblib

from app.db.session import get_db
from app.models.entities import Experiment, DatasetVersion, Workspace, ModelArtifact
from app.schemas.api_models import PairedMcNemarResult
from app.api.deps import get_current_workspace
from app.ml.evaluation import EvaluationEngine
from app.ml.splits import SplitEngine
from app.ml.spatiotemporal import SpatiotemporalClusterer
from app.ml.baselines import LocalizedBaselineEngine
from app.ml.session_builder import SessionBuilder
from app.ml.models import ModelFactory

router = APIRouter(prefix="/benchmarks", tags=["Benchmark Center"])



@router.get("/compare")
def compare_experiments(
    experiment_ids: str = Query(..., description="Comma-separated experiment IDs"),
    workspace: Workspace = Depends(get_current_workspace),
    db: Session = Depends(get_db)
):
    ids = [i.strip() for i in experiment_ids.split(",") if i.strip()]
    if not ids:
        raise HTTPException(status_code=400, detail="No experiment IDs provided")

    experiments = db.query(Experiment).filter(
        Experiment.id.in_(ids),
        Experiment.workspace_id == workspace.id
    ).all()

    comparison = []
    for exp in experiments:
        m = exp.metrics or {}
        comparison.append({
            "id": exp.id,
            "name": exp.name,
            "model_family": exp.model_family,
            "status": exp.status,
            "accuracy": m.get("accuracy"),
            "precision": m.get("precision"),
            "recall": m.get("recall"),
            "macro_f1": m.get("macro_f1"),
            "malicious_f1": m.get("malicious_f1"),
            "false_positive_rate": m.get("false_positive_rate"),
            "false_negative_rate": m.get("false_negative_rate"),
            "roc_auc": m.get("roc_auc"),
            "duration_seconds": exp.duration_seconds,
            "split_strategy": exp.split_strategy,
            "random_seed": exp.random_seed,
        })

    return {"experiments": comparison}


@router.get("/mcnemar", response_model=PairedMcNemarResult)
def run_mcnemar_test(
    model_a_id: str = Query(...),
    model_b_id: str = Query(...),
    workspace: Workspace = Depends(get_current_workspace),
    db: Session = Depends(get_db)
):
    exp_a = db.query(Experiment).filter(Experiment.id == model_a_id, Experiment.workspace_id == workspace.id).first()
    exp_b = db.query(Experiment).filter(Experiment.id == model_b_id, Experiment.workspace_id == workspace.id).first()

    if not exp_a or not exp_b:
        raise HTTPException(status_code=404, detail="One or both experiments not found")

    if exp_a.dataset_version_id != exp_b.dataset_version_id:
        raise HTTPException(status_code=400, detail="Cannot pair experiments evaluated on different dataset versions")

    version = db.query(DatasetVersion).filter(DatasetVersion.id == exp_a.dataset_version_id).first()
    if not version or not os.path.exists(version.file_path):
        raise HTTPException(status_code=404, detail="Dataset file not found")

    art_a = db.query(ModelArtifact).filter(ModelArtifact.experiment_id == exp_a.id).first()
    art_b = db.query(ModelArtifact).filter(ModelArtifact.experiment_id == exp_b.id).first()

    if not art_a or not art_b or not os.path.exists(art_a.artifact_path) or not os.path.exists(art_b.artifact_path):
        raise HTTPException(status_code=404, detail="Serialized model artifacts not found for comparison")

    # Load artifacts
    model_a = joblib.load(art_a.artifact_path)
    model_b = joblib.load(art_b.artifact_path)

    # Reconstruct test partition identically
    df = pl.read_parquet(version.file_path)
    df = SessionBuilder.enrich_receiver_windows(df)
    train_df, test_df, _ = SplitEngine.split(

        df,
        strategy=exp_a.split_strategy,
        test_size=exp_a.test_size,
        target_col="label",
        random_seed=exp_a.random_seed
    )

    # Transform with clustering & baseline if contextual
    clusterer = SpatiotemporalClusterer(n_clusters=4, random_state=exp_a.random_seed)
    train_clusters, _ = clusterer.fit_predict(train_df)
    train_df = train_df.with_columns(pl.Series("cluster_id", train_clusters))
    test_clusters = clusterer.predict(test_df)
    test_df = test_df.with_columns(pl.Series("cluster_id", test_clusters))

    baseline_engine = LocalizedBaselineEngine(metric_col="packet_rate")
    baseline_engine.fit(train_df, cluster_col="cluster_id", label_col="label" if "label" in train_df.columns else None)
    test_df = baseline_engine.transform(test_df, cluster_col="cluster_id")

    y_true = test_df["label"].to_numpy() if "label" in test_df.columns else np.zeros(test_df.height)

    # Feature extraction for Model A
    features_a = ModelFactory.get_feature_columns(exp_a.model_family, test_df.columns)
    X_a = test_df.select(features_a).to_numpy()
    X_a = np.nan_to_num(X_a, nan=0.0)

    # Feature extraction for Model B
    features_b = ModelFactory.get_feature_columns(exp_b.model_family, test_df.columns)
    X_b = test_df.select(features_b).to_numpy()
    X_b = np.nan_to_num(X_b, nan=0.0)

    if exp_a.model_family == "global_threshold":
        y_pred_a = model_a.predict(X_a, rate_col_idx=0)
    else:
        y_pred_a = model_a.predict(X_a)

    if exp_b.model_family == "global_threshold":
        y_pred_b = model_b.predict(X_b, rate_col_idx=0)
    else:
        y_pred_b = model_b.predict(X_b)

    mcnemar_res = EvaluationEngine.paired_mcnemar_test(
        y_true=y_true,
        y_pred_a=y_pred_a,
        y_pred_b=y_pred_b,
        model_a_name=f"{exp_a.name} ({exp_a.model_family})",
        model_b_name=f"{exp_b.name} ({exp_b.model_family})"
    )

    return PairedMcNemarResult(**mcnemar_res)
