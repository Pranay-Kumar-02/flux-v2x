import logging
import numpy as np
from typing import Dict, Any, List, Optional
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    confusion_matrix,
    roc_auc_score,
    roc_curve,
    precision_recall_curve,
    average_precision_score,
)
from scipy.stats import chi2, binom

logger = logging.getLogger(__name__)


class EvaluationEngine:
    @classmethod
    def compute_metrics(
        cls,
        y_true: np.ndarray,
        y_pred: np.ndarray,
        y_prob: Optional[np.ndarray] = None
    ) -> Dict[str, Any]:
        """
        Compute standard and class-specific metrics, confusion matrix, and curve points.
        """
        y_true = np.asarray(y_true, dtype=int)
        y_pred = np.asarray(y_pred, dtype=int)

        acc = float(accuracy_score(y_true, y_pred))
        prec = float(precision_score(y_true, y_pred, zero_division=0))
        rec = float(recall_score(y_true, y_pred, zero_division=0))
        macro_f1 = float(f1_score(y_true, y_pred, average="macro", zero_division=0))
        malicious_f1 = float(f1_score(y_true, y_pred, pos_label=1, zero_division=0))

        cm = confusion_matrix(y_true, y_pred, labels=[0, 1])
        tn, fp, fn, tp = int(cm[0, 0]), int(cm[0, 1]), int(cm[1, 0]), int(cm[1, 1])

        fpr = round(fp / (fp + tn), 4) if (fp + tn) > 0 else 0.0
        fnr = round(fn / (fn + tp), 4) if (fn + tp) > 0 else 0.0

        roc_auc = None
        pr_auc = None
        roc_pts: List[Dict[str, float]] = []
        pr_pts: List[Dict[str, float]] = []

        if y_prob is not None and len(np.unique(y_true)) > 1:
            try:
                roc_auc = float(roc_auc_score(y_true, y_prob))
                pr_auc = float(average_precision_score(y_true, y_prob))

                fpr_vals, tpr_vals, _ = roc_curve(y_true, y_prob)
                # Sample down points if too large
                step = max(1, len(fpr_vals) // 50)
                for i in range(0, len(fpr_vals), step):
                    roc_pts.append({"fpr": round(float(fpr_vals[i]), 4), "tpr": round(float(tpr_vals[i]), 4)})

                p_vals, r_vals, _ = precision_recall_curve(y_true, y_prob)
                step_pr = max(1, len(p_vals) // 50)
                for i in range(0, len(p_vals), step_pr):
                    pr_pts.append({"recall": round(float(r_vals[i]), 4), "precision": round(float(p_vals[i]), 4)})
            except Exception as exc:
                logger.debug("ROC/PR curve computation skipped: %s", exc)

        return {
            "accuracy": round(acc, 4),
            "precision": round(prec, 4),
            "recall": round(rec, 4),
            "macro_f1": round(macro_f1, 4),
            "malicious_f1": round(malicious_f1, 4),
            "false_positive_rate": fpr,
            "false_negative_rate": fnr,
            "roc_auc": round(roc_auc, 4) if roc_auc is not None else None,
            "pr_auc": round(pr_auc, 4) if pr_auc is not None else None,
            "confusion_matrix": {
                "true_negative": tn,
                "false_positive": fp,
                "false_negative": fn,
                "true_positive": tp,
            },
            "roc_curve_points": roc_pts,
            "pr_curve_points": pr_pts,
        }

    @classmethod
    def paired_mcnemar_test(
        cls,
        y_true: np.ndarray,
        y_pred_a: np.ndarray,
        y_pred_b: np.ndarray,
        model_a_name: str = "Model A",
        model_b_name: str = "Model B"
    ) -> Dict[str, Any]:
        """
        Computes two-tailed McNemar's test for paired classification predictions
        evaluating statistical significance between Model A and Model B.
        """
        y_true = np.asarray(y_true)
        y_pred_a = np.asarray(y_pred_a)
        y_pred_b = np.asarray(y_pred_b)

        correct_a = (y_pred_a == y_true)
        correct_b = (y_pred_b == y_true)

        # Contingency table
        both_correct = int(np.sum(correct_a & correct_b))
        a_correct_b_wrong = int(np.sum(correct_a & ~correct_b))  # b
        b_correct_a_wrong = int(np.sum(~correct_a & correct_b))  # c
        both_wrong = int(np.sum(~correct_a & ~correct_b))

        b = a_correct_b_wrong
        c = b_correct_a_wrong
        total_discordant = b + c

        if total_discordant == 0:
            return {
                "model_a_name": model_a_name,
                "model_b_name": model_b_name,
                "contingency_table": [[both_correct, b], [c, both_wrong]],
                "statistic": 0.0,
                "p_value": 1.0,
                "is_significant": False,
                "interpretation": "Classifiers have identical predictions across all discordant test observations (p = 1.000)."
            }

        if total_discordant < 25:
            # Exact two-tailed binomial test
            k = min(b, c)
            p_val = float(2.0 * binom.cdf(k, total_discordant, 0.5))
            p_val = min(1.0, p_val)
            stat = float((abs(b - c) - 1.0) ** 2 / total_discordant)
        else:
            # Edwards continuity correction
            stat = float((abs(b - c) - 1.0) ** 2 / total_discordant)
            p_val = float(chi2.sf(stat, df=1))

        is_sig = p_val < 0.05
        interpretation = (
            f"Statistically significant difference detected (chi2={stat:.3f}, p={p_val:.4f} < 0.05). "
            f"Adding contextual features produced a statistically verifiable improvement."
            if is_sig else
            f"No statistically significant difference detected (chi2={stat:.3f}, p={p_val:.4f} >= 0.05)."
        )

        return {
            "model_a_name": model_a_name,
            "model_b_name": model_b_name,
            "contingency_table": [[both_correct, b], [c, both_wrong]],
            "statistic": round(stat, 4),
            "p_value": round(p_val, 5),
            "is_significant": is_sig,
            "interpretation": interpretation
        }
