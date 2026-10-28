import pytest
import numpy as np
from app.ml.evaluation import EvaluationEngine


def test_perfect_known_confusion_matrix():
    """
    Test known confusion matrix with realistic imperfect performance:
    TP=40, TN=50, FP=5, FN=5 (Total=100)
    Formulas:
    Accuracy = (40 + 50) / 100 = 0.9000
    Precision = 40 / (40 + 5) = 40/45 = 0.8889
    Recall = 40 / (40 + 5) = 40/45 = 0.8889
    Specificity = 50 / (50 + 5) = 50/55 = 0.9091
    FPR = 5 / (50 + 5) = 5/55 = 0.0909
    FNR = 5 / (40 + 5) = 5/45 = 0.1111
    Malicious F1 = 2 * (0.888889 * 0.888889) / (0.888889 + 0.888889) = 0.8889
    """
    y_true = np.array([1] * 45 + [0] * 55)
    # 40 TP (pred 1), 5 FN (pred 0) from the 45 true positives
    # 50 TN (pred 0), 5 FP (pred 1) from the 55 true negatives
    y_pred = np.array([1] * 40 + [0] * 5 + [0] * 50 + [1] * 5)

    metrics = EvaluationEngine.compute_metrics(y_true, y_pred)

    assert metrics["confusion_matrix"]["true_positive"] == 40
    assert metrics["confusion_matrix"]["true_negative"] == 50
    assert metrics["confusion_matrix"]["false_positive"] == 5
    assert metrics["confusion_matrix"]["false_negative"] == 5

    assert abs(metrics["accuracy"] - 0.9000) <= 0.0001
    assert abs(metrics["precision"] - 0.8889) <= 0.0001
    assert abs(metrics["recall"] - 0.8889) <= 0.0001
    assert abs(metrics["specificity"] - 0.9091) <= 0.0001
    assert abs(metrics["false_positive_rate"] - 0.0909) <= 0.0001
    assert abs(metrics["false_negative_rate"] - 0.1111) <= 0.0001
    assert abs(metrics["malicious_f1"] - 0.8889) <= 0.0001

    # Invariants
    assert abs((metrics["false_positive_rate"] + metrics["specificity"]) - 1.0) <= 0.0002
    assert abs((metrics["recall"] + metrics["false_negative_rate"]) - 1.0) <= 0.0002


def test_zero_division_no_positive_predictions():
    """
    When model predicts all 0s (never predicts attack):
    TP = 0, FP = 0 -> Precision denominator is 0.
    Must return 0.0, NEVER 1.0 or 100%.
    """
    y_true = np.array([1, 1, 0, 0, 0])
    y_pred = np.array([0, 0, 0, 0, 0])

    metrics = EvaluationEngine.compute_metrics(y_true, y_pred)
    assert metrics["precision"] == 0.0
    assert metrics["recall"] == 0.0
    assert metrics["malicious_f1"] == 0.0
    assert metrics["false_positive_rate"] == 0.0
    assert metrics["false_negative_rate"] == 1.0
    assert metrics["accuracy"] == 0.6000


def test_zero_division_all_benign_ground_truth():
    """
    When test set contains only benign samples (Class 1 count = 0):
    TP = 0, FN = 0 -> FNR denominator is 0.
    Must return 0.0 without crashing or defaulting to 100%.
    """
    y_true = np.array([0, 0, 0, 0])
    y_pred = np.array([0, 0, 1, 0])

    metrics = EvaluationEngine.compute_metrics(y_true, y_pred)
    assert metrics["confusion_matrix"]["true_positive"] == 0
    assert metrics["confusion_matrix"]["false_negative"] == 0
    assert metrics["false_negative_rate"] == 0.0
    assert metrics["roc_auc"] is None


def test_mismatched_array_lengths_raises_error():
    """Lengths of y_true and y_pred must strictly match."""
    y_true = np.array([0, 1, 0])
    y_pred = np.array([0, 1])

    with pytest.raises(ValueError, match="Length mismatch"):
        EvaluationEngine.compute_metrics(y_true, y_pred)


def test_roc_auc_and_pr_curve_calculation():
    """Continuous probability scores produce authentic ROC-AUC and PR-AUC."""
    y_true = np.array([0, 0, 0, 1, 1, 1])
    y_prob = np.array([0.1, 0.2, 0.8, 0.4, 0.9, 0.95])  # 1 misclassification on rank
    y_pred = (y_prob >= 0.5).astype(int)

    metrics = EvaluationEngine.compute_metrics(y_true, y_pred, y_prob=y_prob)
    assert metrics["roc_auc"] is not None
    assert 0.5 < metrics["roc_auc"] < 1.0  # Not perfect, genuine score
    assert len(metrics["roc_curve_points"]) > 0
    assert len(metrics["pr_curve_points"]) > 0


def test_mcnemar_identical_models():
    """Two identical models must produce statistic=0 and p_value=1.0."""
    y_true = np.array([0, 1, 0, 1, 0])
    y_pred = np.array([0, 1, 0, 0, 0])

    result = EvaluationEngine.paired_mcnemar_test(
        y_true, y_pred, y_pred, model_a_name="Model A", model_b_name="Model B"
    )
    assert result["statistic"] == 0.0
    assert result["p_value"] == 1.0
    assert result["is_significant"] is False
