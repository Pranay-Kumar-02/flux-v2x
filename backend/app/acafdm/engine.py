import numpy as np
import polars as pl
from typing import Dict, Any, List, Optional
from app.acafdm.policy import ACAFDMDecisionPolicy
from app.ml.spatiotemporal import SpatiotemporalClusterer
from app.ml.baselines import LocalizedBaselineEngine


class ACAFDMEngine:
    """
    Adaptive Context-Aware Malicious Flooding Detection and Mitigation (ACAFDM) Engine.
    Executes real-time rolling baseline maintenance, benign validation gating,
    and confidence/persistence policy enforcement.
    """

    def __init__(
        self,
        cluster_count: int = 4,
        alpha_update_rate: float = 0.05,
        z_threshold: float = 2.5,
        confidence_threshold: float = 0.65,
        persistence_k: int = 3,
        cooldown_ticks: int = 5,
        benign_validation_gate: bool = True
    ):
        self.cluster_count = cluster_count
        self.alpha = alpha_update_rate
        self.z_threshold = z_threshold
        self.confidence_threshold = confidence_threshold
        self.persistence_k = persistence_k
        self.cooldown_ticks = cooldown_ticks
        self.benign_validation_gate = benign_validation_gate

        self.clusterer = SpatiotemporalClusterer(n_clusters=cluster_count)
        self.policy = ACAFDMDecisionPolicy(
            persistence_k=persistence_k,
            z_threshold=z_threshold,
            confidence_threshold=confidence_threshold,
            cooldown_ticks=cooldown_ticks
        )

        # Dynamic rolling baselines: cluster_id -> {"mean": float, "std": float}
        self.rolling_baselines: Dict[int, Dict[str, float]] = {}

    def process_trace(
        self,
        df: pl.DataFrame,
        model=None,
        feature_cols: List[str] = None
    ) -> Dict[str, Any]:
        """
        Executes sequential chronological evaluation of traffic trace.
        """
        # Ensure chronological order
        if "timestamp" in df.columns:
            sorted_df = df.sort("timestamp")
        else:
            sorted_df = df

        # Cluster spatiotemporal context
        cluster_labels, _ = self.clusterer.fit_predict(sorted_df)
        df_clustered = sorted_df.with_columns(pl.Series("cluster_id", cluster_labels))

        # Initial baseline warm-up using initial benign window or first samples
        baseline_engine = LocalizedBaselineEngine(metric_col="packet_rate")
        baseline_engine.fit(df_clustered, cluster_col="cluster_id", label_col="label" if "label" in df_clustered.columns else None)

        for cid, stats in baseline_engine.cluster_baselines.items():
            self.rolling_baselines[cid] = {
                "mean": stats["mean"],
                "std": stats["std"]
            }

        decision_trace: List[Dict[str, Any]] = []
        mitigated_count = 0
        suspicious_count = 0
        allowed_count = 0
        accepted_updates = 0
        rejected_updates = 0

        # Iterate through records
        rate_vals = df_clustered["packet_rate"].fill_null(10.0).to_numpy() if "packet_rate" in df_clustered.columns else np.zeros(df_clustered.height)
        ts_vals = df_clustered["timestamp"].fill_null(0.0).to_numpy() if "timestamp" in df_clustered.columns else np.arange(df_clustered.height, dtype=float)
        rx_ids = df_clustered["dst_id"].to_list() if "dst_id" in df_clustered.columns else [f"rx_{i % 5}" for i in range(df_clustered.height)]

        # Precompute model scores if model provided
        model_scores = np.zeros(df_clustered.height)
        if model is not None and feature_cols:
            available = [c for c in feature_cols if c in df_clustered.columns]
            if available:
                X = df_clustered.select(available).to_numpy()
                X = np.nan_to_num(X, nan=0.0)
                try:
                    if hasattr(model, "predict_proba"):
                        model_scores = model.predict_proba(X)[:, 1]
                    else:
                        model_scores = model.predict(X).astype(float)
                except Exception:
                    pass

        for idx in range(df_clustered.height):
            c_id = int(cluster_labels[idx])
            rate = float(rate_vals[idx])
            ts = float(ts_vals[idx])
            rx = str(rx_ids[idx])
            m_score = float(model_scores[idx])

            # Get local baseline for this cluster
            c_base = self.rolling_baselines.get(c_id, {"mean": 20.0, "std": 10.0})
            cur_mean = c_base["mean"]
            cur_std = max(c_base["std"], 1e-4)

            z_score = (rate - cur_mean) / cur_std

            # Evaluate with policy
            decision, reason, streak, is_eligible = self.policy.evaluate_observation(
                node_id=rx,
                z_score=z_score,
                model_score=m_score
            )

            baseline_updated = False
            if self.benign_validation_gate:
                if is_eligible:
                    # Update rolling baseline using EWMA
                    new_mean = (1.0 - self.alpha) * cur_mean + self.alpha * rate
                    dev = abs(rate - new_mean)
                    new_std = (1.0 - self.alpha) * cur_std + self.alpha * dev
                    self.rolling_baselines[c_id] = {
                        "mean": round(new_mean, 4),
                        "std": max(round(new_std, 4), 1e-4)
                    }
                    baseline_updated = True
                    accepted_updates += 1
                else:
                    # Poisoning attempt blocked!
                    rejected_updates += 1
            else:
                # Naive update without gate
                new_mean = (1.0 - self.alpha) * cur_mean + self.alpha * rate
                self.rolling_baselines[c_id]["mean"] = round(new_mean, 4)
                baseline_updated = True
                accepted_updates += 1

            if decision == "MITIGATE_RATE_LIMIT":
                mitigated_count += 1
            elif decision == "FLAG_SUSPICIOUS":
                suspicious_count += 1
            else:
                allowed_count += 1

            if idx < 100 or decision != "ALLOW":  # keep all anomalies and sample of normal for compact representation
                decision_trace.append({
                    "index": idx,
                    "timestamp": round(ts, 3),
                    "rx_id": rx,
                    "cluster_id": c_id,
                    "raw_rate": round(rate, 2),
                    "baseline_rate": round(cur_mean, 2),
                    "z_score": round(z_score, 3),
                    "model_score": round(m_score, 3),
                    "confidence": round(m_score if m_score > 0 else min(1.0, abs(z_score) / 4.0), 3),
                    "persistence_count": streak,
                    "decision": decision,
                    "reason": reason,
                    "baseline_updated": baseline_updated
                })

        return {
            "total_observations": df_clustered.height,
            "mitigated_count": mitigated_count,
            "flagged_suspicious_count": suspicious_count,
            "allowed_count": allowed_count,
            "baseline_updates_accepted": accepted_updates,
            "baseline_updates_rejected_poison_prevented": rejected_updates,
            "rolling_baselines_final": self.rolling_baselines,
            "decision_trace": decision_trace[:200],  # bounded preview for UI
        }
