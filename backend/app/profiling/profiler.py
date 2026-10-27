import polars as pl
import numpy as np
from typing import Dict, Any, List


class DatasetProfiler:
    @classmethod
    def profile_dataframe(cls, df: pl.DataFrame) -> Dict[str, Any]:
        total_rows = df.height
        total_cols = df.width

        # Check duplicate rows
        if total_rows > 0:
            unique_rows = df.unique().height
            dup_rows = total_rows - unique_rows
            dup_pct = round((dup_rows / total_rows) * 100, 2)
        else:
            dup_rows = 0
            dup_pct = 0.0

        memory_usage_mb = round(df.estimated_size() / (1024 * 1024), 2)

        columns_profile: List[Dict[str, Any]] = []
        candidate_target_col: str = None
        class_dist: Dict[str, int] = {}
        leakage_warnings: List[str] = []

        for col_name in df.columns:
            series = df[col_name]
            null_count = series.null_count()
            null_pct = round((null_count / total_rows) * 100, 2) if total_rows > 0 else 0.0
            n_unique = series.n_unique()

            # Samples
            sample_slice = series.drop_nulls().head(5).to_list()

            is_numeric = series.dtype.is_numeric()
            is_temporal = series.dtype.is_temporal()
            is_string = series.dtype == pl.Utf8 or series.dtype == pl.String

            inferred_type = "string"
            min_val = None
            max_val = None
            mean_val = None
            std_val = None

            if is_numeric:
                inferred_type = "numeric"
                if series.drop_nulls().len() > 0:
                    try:
                        min_val = float(series.min())
                        max_val = float(series.max())
                        mean_val = round(float(series.mean()), 4)
                        std_val = round(float(series.std()), 4) if series.std() is not None else 0.0
                    except Exception:
                        pass
            elif is_temporal:
                inferred_type = "timestamp"
            elif is_string:
                inferred_type = "categorical" if n_unique <= 50 else "text"
            elif series.dtype == pl.Boolean:
                inferred_type = "boolean"

            # Check candidate target
            is_candidate_target = False
            lower_name = col_name.lower()
            if lower_name in ["label", "attack", "is_malicious", "class", "target", "anomaly", "is_attack"]:
                is_candidate_target = True
                candidate_target_col = col_name
            elif n_unique == 2 and total_rows > 10 and not lower_name.endswith("_id"):
                if lower_name in ["flag", "status", "y"]:
                    is_candidate_target = True
                    candidate_target_col = col_name

            # Check candidate timestamp
            is_candidate_timestamp = False
            if is_temporal or any(t in lower_name for t in ["time", "timestamp", "datetime", "date"]):
                is_candidate_timestamp = True

            # Check candidate identifier
            is_candidate_identifier = False
            if any(id_key in lower_name for id_key in ["id", "guid", "uuid", "hash"]) and n_unique > (total_rows * 0.8):
                is_candidate_identifier = True

            # Leakage check
            col_leakage = None
            if any(leak_hint in lower_name for leak_hint in ["predicted", "pred", "ground_truth", "leak", "mitigated", "blocked"]):
                col_leakage = f"Feature name '{col_name}' suggests derived outcome or post-attack mitigation field."
                leakage_warnings.append(col_leakage)

            columns_profile.append({
                "name": col_name,
                "inferred_type": inferred_type,
                "null_count": null_count,
                "null_percentage": null_pct,
                "unique_count": n_unique,
                "min_val": min_val,
                "max_val": max_val,
                "mean_val": mean_val,
                "std_val": std_val,
                "sample_values": sample_slice,
                "is_candidate_target": is_candidate_target,
                "is_candidate_identifier": is_candidate_identifier,
                "is_candidate_timestamp": is_candidate_timestamp,
                "leakage_warning": col_leakage,
            })

        # Calculate class distribution if target found
        if candidate_target_col:
            target_series = df[candidate_target_col].drop_nulls()
            vc = target_series.value_counts()
            for row in vc.iter_rows(named=True):
                class_dist[str(row[candidate_target_col])] = int(row["count"])

        return {
            "total_rows": total_rows,
            "total_columns": total_cols,
            "duplicate_rows": dup_rows,
            "duplicate_percentage": dup_pct,
            "memory_usage_mb": memory_usage_mb,
            "columns": columns_profile,
            "class_distribution": class_dist if class_dist else None,
            "leakage_warnings": leakage_warnings,
        }
