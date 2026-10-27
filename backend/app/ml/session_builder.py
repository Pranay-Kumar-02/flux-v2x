import polars as pl
import numpy as np
from typing import Dict, Any


class SessionBuilder:
    """
    Constructs Transmitter-Receiver sessions and Receiver-Window (RX-Window)
    representations as detailed in Khan et al. (2026) and Mendeley Data 2jvknhv465.1.
    """

    @classmethod
    def enrich_receiver_windows(cls, df: pl.DataFrame, window_size_sec: float = 2.0) -> pl.DataFrame:
        """
        Enriches flow records with RX-window concurrency, aggregate arrival rate,
        and receiver locality dynamics.
        """
        required_cols = ["timestamp", "dst_id"]
        if not all(col in df.columns for col in required_cols):
            # If columns are missing, return df as is with defaults
            if "packet_rate" not in df.columns:
                if "packet_count" in df.columns and "flow_duration" in df.columns:
                    df = df.with_columns(
                        (pl.col("packet_count") / (pl.col("flow_duration").clip(lower_bound=0.01))).alias("packet_rate")
                    )
                else:
                    df = df.with_columns(pl.lit(10.0).alias("packet_rate"))
            return df

        # Sort chronologically
        sorted_df = df.sort("timestamp")

        # Receiver window calculations
        # Compute time window bucket: floor(timestamp / window_size_sec)
        windowed = sorted_df.with_columns(
            (pl.col("timestamp") / window_size_sec).floor().cast(pl.Int64).alias("window_bucket")
        )

        # Aggregate stats per (dst_id, window_bucket)
        agg_exprs = [
            pl.len().alias("rx_window_flow_count"),
        ]

        if "src_id" in windowed.columns:
            agg_exprs.append(pl.col("src_id").n_unique().alias("rx_concurrent_senders"))
        else:
            agg_exprs.append(pl.lit(1).alias("rx_concurrent_senders"))

        if "packet_count" in windowed.columns:
            agg_exprs.append(pl.col("packet_count").sum().alias("rx_window_total_packets"))
        elif "packet_rate" in windowed.columns:
            agg_exprs.append(pl.col("packet_rate").sum().alias("rx_window_total_packets"))

        if "byte_count" in windowed.columns:
            agg_exprs.append(pl.col("byte_count").sum().alias("rx_window_total_bytes"))

        rx_aggs = windowed.group_by(["dst_id", "window_bucket"]).agg(agg_exprs)

        # Join back onto original records
        enriched = windowed.join(rx_aggs, on=["dst_id", "window_bucket"], how="left")

        # Calculate rx_arrival_rate = rx_window_total_packets / window_size_sec
        if "rx_window_total_packets" in enriched.columns:
            enriched = enriched.with_columns(
                (pl.col("rx_window_total_packets") / window_size_sec).alias("rx_aggregate_rate")
            )
        else:
            enriched = enriched.with_columns(
                pl.col("packet_rate").alias("rx_aggregate_rate")
            )

        return enriched.drop("window_bucket")
