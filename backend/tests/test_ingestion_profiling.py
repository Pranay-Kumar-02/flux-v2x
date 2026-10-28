import os
import tempfile
import polars as pl
from app.ingestion.parser import IngestionEngine
from app.profiling.profiler import DatasetProfiler


def test_ingestion_and_sha256():
    with tempfile.TemporaryDirectory() as tmpdir:
        csv_path = os.path.join(tmpdir, "test.csv")
        parquet_path = os.path.join(tmpdir, "test.parquet")

        df = pl.DataFrame({
            "timestamp": [1.0, 2.0, 3.0, 4.0],
            "packet_rate": [12.5, 45.0, 14.0, 80.0],
            "label": [0, 0, 0, 1]
        })
        df.write_csv(csv_path)

        fmt = IngestionEngine.detect_format(csv_path, "test.csv")
        assert fmt == "csv"

        rows, cols, sha256 = IngestionEngine.ingest_and_standardize(csv_path, parquet_path, fmt)
        assert rows == 4
        assert cols == 3
        assert len(sha256) == 64
        assert os.path.exists(parquet_path)


def test_dataset_profiling():
    df = pl.DataFrame({
        "timestamp": [1.0, 2.0, 3.0, 4.0, 4.0],
        "packet_rate": [10.0, None, 30.0, 40.0, 40.0],
        "label": [0, 0, 1, 1, 1],
        "predicted_outcome": [0, 0, 1, 1, 1]  # Leakage candidate
    })

    profile = DatasetProfiler.profile_dataframe(df)
    assert profile["total_rows"] == 5
    assert profile["total_columns"] == 4
    assert profile["duplicate_rows"] == 1  # 4.0 duplicate
    assert len(profile["leakage_warnings"]) > 0
    assert profile["class_distribution"] == {"0": 2, "1": 3}

    # Verify column profile for packet_rate
    rate_col = next(c for c in profile["columns"] if c["name"] == "packet_rate")
    assert rate_col["null_count"] == 1
    assert rate_col["inferred_type"] == "numeric"
