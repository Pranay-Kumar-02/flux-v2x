import numpy as np
from typing import Dict, Any, Tuple, Optional
from sklearn.ensemble import (
    GradientBoostingClassifier,
    RandomForestClassifier,
    ExtraTreesClassifier,
    AdaBoostClassifier,
)
from sklearn.tree import DecisionTreeClassifier
from sklearn.neighbors import KNeighborsClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.svm import SVC
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline


class GlobalThresholdDetector:
    """Non-contextual baseline: classifies flooding if packet_rate >= threshold."""
    def __init__(self, percentile: float = 85.0):
        self.percentile = percentile
        self.threshold: float = 50.0

    def fit(self, X: np.ndarray, y: np.ndarray, rate_col_idx: int = 0):
        rates = X[:, rate_col_idx]
        # Calibrate threshold on training data
        if len(rates) > 0:
            self.threshold = float(np.percentile(rates, self.percentile))
        return self

    def predict(self, X: np.ndarray, rate_col_idx: int = 0) -> np.ndarray:
        rates = X[:, rate_col_idx]
        return (rates >= self.threshold).astype(int)

    def predict_proba(self, X: np.ndarray, rate_col_idx: int = 0) -> np.ndarray:
        rates = X[:, rate_col_idx]
        # Normalized score
        scaled = np.clip((rates - (self.threshold * 0.5)) / (self.threshold + 1e-6), 0.0, 1.0)
        p1 = scaled
        p0 = 1.0 - p1
        return np.column_stack([p0, p1])


class ModelFactory:
    SUPPORTED_FAMILIES = [
        "global_threshold",
        "raw_gradient_boosting",
        "contextual_gradient_boosting",
        "random_forest",
        "extra_trees",
        "adaboost",
        "decision_tree",
        "knn",
        "logistic_regression",
        "svc_linear",
        "svc_rbf",
    ]

    @classmethod
    def get_feature_columns(cls, model_family: str, available_cols: list) -> list:
        raw_candidates = ["packet_rate", "packet_count", "byte_count", "flow_duration", "rx_speed"]
        raw_cols = [c for c in raw_candidates if c in available_cols]

        contextual_candidates = [
            "cluster_id",
            "contextual_z_score",
            "contextual_deviation_ratio",
            "rx_concurrent_senders",
            "rx_aggregate_rate",
            "cluster_baseline_mean",
        ]
        contextual_cols = [c for c in contextual_candidates if c in available_cols]

        if model_family == "global_threshold":
            return ["packet_rate"] if "packet_rate" in available_cols else raw_cols[:1]
        elif model_family == "raw_gradient_boosting":
            return raw_cols
        else:
            # Contextual models use raw + contextual
            combined = raw_cols + contextual_cols
            return combined if combined else available_cols

    @classmethod
    def create_model(cls, model_family: str, hyperparameters: Dict[str, Any] = None, random_seed: int = 42):
        hp = hyperparameters or {}

        if model_family == "global_threshold":
            percentile = float(hp.get("percentile", 85.0))
            return GlobalThresholdDetector(percentile=percentile)

        elif model_family in ["raw_gradient_boosting", "contextual_gradient_boosting"]:
            n_estimators = int(hp.get("n_estimators", 100))
            learning_rate = float(hp.get("learning_rate", 0.1))
            max_depth = int(hp.get("max_depth", 4))
            return GradientBoostingClassifier(
                n_estimators=n_estimators,
                learning_rate=learning_rate,
                max_depth=max_depth,
                random_state=random_seed,
            )

        elif model_family == "random_forest":
            n_estimators = int(hp.get("n_estimators", 100))
            max_depth = hp.get("max_depth", 6)
            return RandomForestClassifier(
                n_estimators=n_estimators,
                max_depth=max_depth,
                random_state=random_seed,
            )

        elif model_family == "extra_trees":
            n_estimators = int(hp.get("n_estimators", 100))
            return ExtraTreesClassifier(
                n_estimators=n_estimators,
                random_state=random_seed,
            )

        elif model_family == "adaboost":
            n_estimators = int(hp.get("n_estimators", 50))
            return AdaBoostClassifier(
                n_estimators=n_estimators,
                random_state=random_seed,
            )

        elif model_family == "decision_tree":
            max_depth = hp.get("max_depth", 5)
            return DecisionTreeClassifier(
                max_depth=max_depth,
                random_state=random_seed,
            )

        elif model_family == "knn":
            n_neighbors = int(hp.get("n_neighbors", 5))
            return Pipeline([
                ("scaler", StandardScaler()),
                ("knn", KNeighborsClassifier(n_neighbors=n_neighbors))
            ])

        elif model_family == "logistic_regression":
            return Pipeline([
                ("scaler", StandardScaler()),
                ("lr", LogisticRegression(max_iter=1000, random_state=random_seed))
            ])

        elif model_family == "svc_linear":
            return Pipeline([
                ("scaler", StandardScaler()),
                ("svc", SVC(kernel="linear", probability=True, random_state=random_seed))
            ])

        elif model_family == "svc_rbf":
            return Pipeline([
                ("scaler", StandardScaler()),
                ("svc", SVC(kernel="rbf", probability=True, random_state=random_seed))
            ])

        else:
            # Default to contextual gradient boosting
            return GradientBoostingClassifier(n_estimators=100, random_state=random_seed)
