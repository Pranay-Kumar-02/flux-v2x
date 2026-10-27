import numpy as np
import polars as pl
from typing import Dict, Any, Tuple


class LocalizedBaselineEngine:
    """
    Computes cluster-specific statistical baselines and metric-specific Z-score
    deviation features as defined in Khan et al. (2026).
    """

    def __init__(self, metric_col: str = "packet_rate"):
        self.metric_col = metric_col
        # Mapping: cluster_id -> {"mean": float, "std": float, "count": int}
        self.cluster_baselines: Dict[int, Dict[str, float]] = {}
        self.global_mean: float = 0.0
        self.global_std: float = 1.0

    def fit(self, df: pl.DataFrame, cluster_col: str = "cluster_id", label_col: str = None) -> "LocalizedBaselineEngine":
        """
        Fit localized statistical baselines on training data.
        If label_col is provided, computes baseline strictly on benign samples (label == 0)
        to prevent attack traffic from distorting baseline statistics.
        """
        data = df
        if label_col and label_col in df.columns:
            # Filter strictly benign observations for baseline calculation
            benign_data = df.filter(pl.col(label_col) == 0)
            if benign_data.height > 0:
                data = benign_data

        if self.metric_col not in data.columns:
            return self

        # Global stats
        vals = data[self.metric_col].drop_nulls().to_numpy()
        if len(vals) > 0:
            self.global_mean = float(np.mean(vals))
            self.global_std = float(np.std(vals)) + 1e-6

        # Per-cluster stats
        if cluster_col in data.columns:
            groups = data.group_by(cluster_col).agg([
                pl.col(self.metric_col).mean().alias("mean"),
                pl.col(self.metric_col).std().alias("std"),
                pl.len().alias("count")
            ])

            for row in groups.iter_rows(named=True):
                cid = int(row[cluster_col])
                c_mean = float(row["mean"]) if row["mean"] is not None else self.global_mean
                c_std = float(row["std"]) if row["std"] is not None and row["std"] > 1e-6 else self.global_std
                self.cluster_baselines[cid] = {
                    "mean": c_mean,
                    "std": c_std,
                    "count": int(row["count"])
                }

        return self

    def transform(self, df: pl.DataFrame, cluster_col: str = "cluster_id") -> pl.DataFrame:
        """
        Appends localized baseline features:
        - `cluster_baseline_mean`
        - `cluster_baseline_std`
        - `contextual_z_score`: (metric - mean) / std
        - `contextual_deviation_ratio`: metric / (mean + eps)
        """
        if self.metric_col not in df.columns:
            return df

        means = []
        stds = []
        z_scores = []
        dev_ratios = []

        metric_vals = df[self.metric_col].fill_null(0.0).to_numpy()
        cluster_vals = df[cluster_col].fill_null(0).to_numpy() if cluster_col in df.columns else np.zeros(len(metric_vals), dtype=int)

        for m_val, c_id in zip(metric_vals, cluster_vals):
            baseline = self.cluster_baselines.get(int(c_id), {
                "mean": self.global_mean,
                "std": self.global_std
            })
            b_mean = baseline["mean"]
            b_std = max(baseline["std"], 1e-6)

            z = (m_val - b_mean) / b_std
            ratio = m_val / (b_mean + 1e-4)

            means.append(b_mean)
            stds.append(b_std)
            z_scores.append(round(float(z), 4))
            dev_ratios.append(round(float(ratio), 4))

        enriched = df.with_columns([
            pl.Series("cluster_baseline_mean", means),
            pl.Series("cluster_baseline_std", stds),
            pl.Series("contextual_z_score", z_scores),
            pl.Series("contextual_deviation_ratio", dev_ratios),
        ])

        return enriched
