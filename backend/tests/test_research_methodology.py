import numpy as np
import polars as pl
from app.ml.spatiotemporal import SpatiotemporalClusterer
from app.ml.baselines import LocalizedBaselineEngine
from app.ml.splits import SplitEngine
from app.ml.evaluation import EvaluationEngine


def test_spatiotemporal_clustering():
    df = pl.DataFrame({
        "rx_x": [100.0, 105.0, 110.0, 900.0, 910.0, 920.0],
        "rx_y": [200.0, 205.0, 210.0, 500.0, 510.0, 520.0],
        "rx_speed": [5.0, 4.0, 6.0, 30.0, 31.0, 29.0]
    })
    clusterer = SpatiotemporalClusterer(n_clusters=2)
    labels, meta = clusterer.fit_predict(df)
    assert len(labels) == 6
    assert meta["chosen_k"] == 2
    # First 3 should belong to one cluster, last 3 to another
    assert labels[0] == labels[1] == labels[2]
    assert labels[3] == labels[4] == labels[5]
    assert labels[0] != labels[3]


def test_localized_baseline_and_z_scores():
    df = pl.DataFrame({
        "cluster_id": [0, 0, 0, 1, 1, 1],
        "packet_rate": [40.0, 42.0, 38.0, 10.0, 12.0, 8.0],
        "label": [0, 0, 0, 0, 0, 0]
    })
    engine = LocalizedBaselineEngine(metric_col="packet_rate")
    engine.fit(df, cluster_col="cluster_id", label_col="label")

    # Cluster 0 baseline mean should be ~40, Cluster 1 ~10
    assert abs(engine.cluster_baselines[0]["mean"] - 40.0) < 1.0
    assert abs(engine.cluster_baselines[1]["mean"] - 10.0) < 1.0

    test_df = pl.DataFrame({
        "cluster_id": [0, 1],
        "packet_rate": [42.0, 42.0]  # Same rate observed in both clusters
    })
    transformed = engine.transform(test_df, cluster_col="cluster_id")
    z_scores = transformed["contextual_z_score"].to_list()

    # Rate of 42 in Cluster 0 (congested) should have small Z-score (normal)
    # Rate of 42 in Cluster 1 (freeflow baseline 10) should have huge positive Z-score (anomalous surge)!
    assert z_scores[0] < 2.0
    assert z_scores[1] > 10.0


def test_leakage_safe_scenario_split():
    df = pl.DataFrame({
        "scenario": ["highway", "highway", "highway", "urban", "urban", "urban"],
        "packet_rate": [10.0, 12.0, 14.0, 30.0, 32.0, 34.0],
        "label": [0, 0, 1, 0, 0, 1]
    })
    train_df, test_df, meta = SplitEngine.split(df, strategy="scenario_split", test_size=0.5)
    train_scenarios = set(train_df["scenario"].to_list())
    test_scenarios = set(test_df["scenario"].to_list())

    # Partitions must be completely disjoint by scenario
    assert len(train_scenarios.intersection(test_scenarios)) == 0
    assert "Disjoint scenario partitioning" in meta["leakage_safeguards"][0]


def test_two_tailed_mcnemar_test():
    y_true = np.array([0, 0, 0, 0, 1, 1, 1, 1, 1, 1])
    # Model A: Raw (gets some wrong)
    y_pred_a = np.array([0, 1, 0, 0, 0, 1, 1, 1, 0, 1])
    # Model B: Contextual (improves on discordant cases)
    y_pred_b = np.array([0, 0, 0, 0, 1, 1, 1, 1, 1, 1])

    result = EvaluationEngine.paired_mcnemar_test(
        y_true, y_pred_a, y_pred_b, model_a_name="Raw GB", model_b_name="Contextual GB"
    )
    assert "contingency_table" in result
    assert "statistic" in result
    assert "p_value" in result
    assert result["p_value"] <= 1.0
