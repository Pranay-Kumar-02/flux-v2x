import numpy as np
import polars as pl
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score
from typing import Tuple, Dict, Any, Optional


class SpatiotemporalClusterer:
    """
    Implements destination-centric spatiotemporal clustering from Khan et al. (2026).
    Groups receiver positions and mobility dynamics into localized congestion clusters.
    """

    def __init__(self, n_clusters: Optional[int] = None, random_state: int = 42):
        self.n_clusters = n_clusters
        self.random_state = random_state
        self.kmeans: Optional[KMeans] = None
        self.feature_means: Optional[np.ndarray] = None
        self.feature_stds: Optional[np.ndarray] = None

    def fit_predict(self, df: pl.DataFrame) -> Tuple[np.ndarray, Dict[str, Any]]:
        # Extract spatial and mobility features: rx_x, rx_y, and optionally rx_speed, timestamp
        cols = []
        for c in ["rx_x", "rx_y"]:
            if c in df.columns:
                cols.append(c)
        if not cols:
            # Fallback to dummy cluster
            return np.zeros(df.height, dtype=int), {"k": 1, "method": "fallback"}

        if "rx_speed" in df.columns:
            cols.append("rx_speed")

        X = df.select(cols).to_numpy()
        # Handle nulls
        X = np.nan_to_num(X, nan=0.0)

        # Standardize features
        self.feature_means = np.mean(X, axis=0)
        self.feature_stds = np.std(X, axis=0) + 1e-8
        X_scaled = (X - self.feature_means) / self.feature_stds

        n_samples = len(X_scaled)
        if n_samples < 4:
            return np.zeros(n_samples, dtype=int), {"k": 1, "method": "insufficient_samples"}

        # Select cluster count k if not specified
        if self.n_clusters is None or self.n_clusters < 2:
            best_k = 3
            best_score = -1.0
            candidate_ks = [2, 3, 4, 5]
            candidate_ks = [k for k in candidate_ks if k < n_samples]

            for k in candidate_ks:
                km = KMeans(n_clusters=k, random_state=self.random_state, n_init=5)
                labels = km.fit_predict(X_scaled)
                try:
                    score = silhouette_score(X_scaled, labels)
                    if score > best_score:
                        best_score = score
                        best_k = k
                except Exception:
                    best_k = k
            chosen_k = best_k
        else:
            chosen_k = min(self.n_clusters, n_samples - 1)

        self.kmeans = KMeans(n_clusters=chosen_k, random_state=self.random_state, n_init=10)
        cluster_labels = self.kmeans.fit_predict(X_scaled)

        cluster_metadata = {
            "chosen_k": chosen_k,
            "features_used": cols,
            "cluster_centers": self.kmeans.cluster_centers_.tolist(),
            "n_samples": n_samples,
        }

        return cluster_labels, cluster_metadata

    def predict(self, df: pl.DataFrame) -> np.ndarray:
        if self.kmeans is None or self.feature_means is None:
            return np.zeros(df.height, dtype=int)

        cols = [c for c in ["rx_x", "rx_y", "rx_speed"] if c in df.columns]
        X = df.select(cols).to_numpy()
        X = np.nan_to_num(X, nan=0.0)
        X_scaled = (X - self.feature_means[:len(cols)]) / self.feature_stds[:len(cols)]
        return self.kmeans.predict(X_scaled)
