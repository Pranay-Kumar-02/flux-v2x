import polars as pl
import numpy as np
from typing import Tuple, Dict, Any
from sklearn.model_selection import train_test_split


class SplitEngine:
    """
    Leakage-safe splitting strategies for vehicular communication networks.
    """

    @classmethod
    def split(
        cls,
        df: pl.DataFrame,
        strategy: str = "scenario_split",
        test_size: float = 0.25,
        target_col: str = "label",
        random_seed: int = 42
    ) -> Tuple[pl.DataFrame, pl.DataFrame, Dict[str, Any]]:
        total_rows = df.height
        metadata = {
            "strategy": strategy,
            "test_size": test_size,
            "random_seed": random_seed,
            "leakage_safeguards": [],
        }

        if strategy == "scenario_split" and "scenario" in df.columns:
            unique_scenarios = df["scenario"].unique().to_list()
            if len(unique_scenarios) >= 2:
                # Group-aware split by scenario
                np.random.seed(random_seed)
                np.random.shuffle(unique_scenarios)
                n_test_scenarios = max(1, int(round(len(unique_scenarios) * test_size)))
                test_scenarios = set(unique_scenarios[:n_test_scenarios])
                train_scenarios = set(unique_scenarios[n_test_scenarios:])

                train_df = df.filter(pl.col("scenario").is_in(list(train_scenarios)))
                test_df = df.filter(pl.col("scenario").is_in(list(test_scenarios)))

                metadata["leakage_safeguards"].append(
                    f"Disjoint scenario partitioning: Train scenarios={list(train_scenarios)}, Test scenarios={list(test_scenarios)}. Zero receiver-window trajectory leakage."
                )
                metadata["train_rows"] = train_df.height
                metadata["test_rows"] = test_df.height
                return train_df, test_df, metadata

        if strategy == "chronological" and "timestamp" in df.columns:
            sorted_df = df.sort("timestamp")
            split_idx = int(round(total_rows * (1.0 - test_size)))
            train_df = sorted_df.slice(0, split_idx)
            test_df = sorted_df.slice(split_idx, total_rows - split_idx)

            metadata["leakage_safeguards"].append(
                "Chronological forward-chaining partition: Test partition strictly follows train partition in time."
            )
            metadata["train_rows"] = train_df.height
            metadata["test_rows"] = test_df.height
            return train_df, test_df, metadata

        # Fallback to stratified or random split
        indices = np.arange(total_rows)
        y = df[target_col].to_numpy() if target_col in df.columns else None

        stratify = y if y is not None and len(np.unique(y)) > 1 else None
        train_idx, test_idx = train_test_split(
            indices,
            test_size=test_size,
            random_state=random_seed,
            stratify=stratify
        )

        train_df = df[train_idx]
        test_df = df[test_idx]

        metadata["leakage_safeguards"].append(
            "Stratified random split. WARNING: May contain spatiotemporal correlation across adjacent records if not grouped by session or scenario."
        )
        metadata["train_rows"] = train_df.height
        metadata["test_rows"] = test_df.height

        return train_df, test_df, metadata
