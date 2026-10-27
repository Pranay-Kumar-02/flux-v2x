import os
import logging
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
import polars as pl
import numpy as np

from app.db.session import get_db
from app.models.entities import Dataset, DatasetVersion, Workspace
from app.api.deps import get_current_workspace
from app.ml.spatiotemporal import SpatiotemporalClusterer
from app.ml.baselines import LocalizedBaselineEngine

logger = logging.getLogger("fluxv2x.context")
router = APIRouter(prefix="/context", tags=["Network Context Explorer"])


@router.get("/explorer-data/{dataset_id}")
def get_context_explorer_data(
    dataset_id: str,
    max_points: int = Query(250, ge=50, le=1000),
    workspace: Workspace = Depends(get_current_workspace),
    db: Session = Depends(get_db)
):
    dataset = db.query(Dataset).filter(
        Dataset.id == dataset_id,
        Dataset.workspace_id == workspace.id
    ).first()
    if not dataset:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dataset not found in active workspace.")

    latest_version = db.query(DatasetVersion).filter(
        DatasetVersion.dataset_id == dataset.id
    ).order_by(DatasetVersion.version_num.desc()).first()
    if not latest_version or not os.path.exists(latest_version.file_path):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dataset file not found on disk.")

    try:
        df = pl.read_parquet(latest_version.file_path)
    except Exception as e:
        logger.error(f"Failed to load dataset parquet file for context exploration: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to load dataset records.")

    # Spatiotemporal points for 2D spatial map
    spatial_points: List[Dict[str, Any]] = []
    has_spatial = "rx_x" in df.columns and "rx_y" in df.columns

    try:
        # Cluster context if spatial available
        cluster_labels = np.zeros(df.height, dtype=int)
        if has_spatial:
            clusterer = SpatiotemporalClusterer(n_clusters=4)
            cluster_labels, _ = clusterer.fit_predict(df)
            df = df.with_columns(pl.Series("cluster_id", cluster_labels))

        # Baseline & deviation features
        baseline_engine = LocalizedBaselineEngine(metric_col="packet_rate")
        baseline_engine.fit(df, cluster_col="cluster_id", label_col="label" if "label" in df.columns else None)
        df = baseline_engine.transform(df, cluster_col="cluster_id")

        # Downsample points for responsive visualization
        step = max(1, df.height // max_points)
        sampled = df.gather(list(range(0, df.height, step)))

        for row in sampled.iter_rows(named=True):
            pt = {
                "index": row.get("index", 0),
                "timestamp": row.get("timestamp", 0.0),
                "dst_id": str(row.get("dst_id", "rx_0")),
                "cluster_id": int(row.get("cluster_id", 0)),
                "packet_rate": round(float(row.get("packet_rate", 0.0)), 2),
                "z_score": round(float(row.get("contextual_z_score", 0.0)), 3),
                "label": int(row.get("label", 0)) if "label" in row and row["label"] is not None else 0,
            }
            if has_spatial:
                pt["x"] = round(float(row.get("rx_x", 0.0)), 2)
                pt["y"] = round(float(row.get("rx_y", 0.0)), 2)
            if "rx_speed" in row:
                pt["speed"] = round(float(row.get("rx_speed", 0.0)), 2)
            if "scenario" in row:
                pt["scenario"] = str(row.get("scenario", "unknown"))

            spatial_points.append(pt)

        # Scenario distributions if scenario column present
        scenario_stats = {}
        if "scenario" in df.columns:
            sc_aggs = df.group_by("scenario").agg([
                pl.col("packet_rate").mean().alias("avg_rate"),
                pl.len().alias("count")
            ])
            for row in sc_aggs.iter_rows(named=True):
                scenario_stats[str(row["scenario"])] = {
                    "count": int(row["count"]),
                    "avg_rate": round(float(row["avg_rate"]), 2) if row["avg_rate"] else 0.0
                }

        # Cluster baseline stats
        cluster_stats = {}
        for cid, stats in baseline_engine.cluster_baselines.items():
            cluster_stats[f"Cluster {cid}"] = {
                "mean_rate_pps": round(stats["mean"], 2),
                "std_rate_pps": round(stats["std"], 2),
                "sample_count": stats["count"]
            }

        return {
            "dataset_name": dataset.name,
            "total_records": df.height,
            "has_spatial_coordinates": has_spatial,
            "spatial_points": spatial_points,
            "scenario_stats": scenario_stats,
            "cluster_baselines": cluster_stats,
        }
    except Exception as e:
        logger.error(f"Context explorer computation failed: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to process context explorer visual data.")
