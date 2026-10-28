import os
import hashlib
import json
import logging
from typing import Tuple, Dict, List
import polars as pl
import pandas as pd

logger = logging.getLogger(__name__)


class IngestionEngine:
    SUPPORTED_EXTENSIONS = {".csv", ".tsv", ".json", ".jsonl", ".ndjson", ".parquet", ".xlsx"}

    @staticmethod
    def compute_sha256(file_path: str) -> str:
        """Calculate SHA256 checksum in chunks."""
        hasher = hashlib.sha256()
        with open(file_path, "rb") as f:
            while chunk := f.read(65536):
                hasher.update(chunk)
        return hasher.hexdigest()

    @staticmethod
    def detect_format(file_path: str, filename_hint: str = "") -> str:
        """Sniff format from extension and content headers."""
        ext = os.path.splitext(filename_hint or file_path)[1].lower()
        if ext in [".csv", ".tsv", ".json", ".jsonl", ".ndjson", ".parquet", ".xlsx"]:
            if ext in [".jsonl", ".ndjson"]:
                return "jsonl"
            return ext.lstrip(".")

        # Try sniffing content
        with open(file_path, "rb") as f:
            header = f.read(512)
            if header.startswith(b"PAR1"):
                return "parquet"
            if header.startswith(b"PK\x03\x04"):
                return "xlsx"
            try:
                decoded = header.decode("utf-8")
                stripped = decoded.strip()
                if stripped.startswith("{") or stripped.startswith("["):
                    # Check if single line json or jsonl
                    lines = stripped.split("\n")
                    if len(lines) > 1 and lines[0].startswith("{") and lines[1].startswith("{"):
                        return "jsonl"
                    return "json"
                if "\t" in decoded:
                    return "tsv"
                if "," in decoded:
                    return "csv"
            except Exception as exc:
                logger.debug("Sniffing content format encountered decode issue: %s", exc)
        return "csv"

    @classmethod
    def load_dataframe(cls, file_path: str, file_format: str, limit: int = None) -> pl.DataFrame:
        """Load dataframe using Polars or fallback."""
        fmt = file_format.lower()
        if fmt == "csv":
            if limit:
                return pl.read_csv(file_path, n_rows=limit, ignore_errors=True)
            return pl.read_csv(file_path, ignore_errors=True)
        elif fmt == "tsv":
            if limit:
                return pl.read_csv(file_path, separator="\t", n_rows=limit, ignore_errors=True)
            return pl.read_csv(file_path, separator="\t", ignore_errors=True)
        elif fmt == "parquet":
            if limit:
                return pl.read_parquet(file_path, n_rows=limit)
            return pl.read_parquet(file_path)
        elif fmt in ["jsonl", "ndjson"]:
            if limit:
                return pl.read_ndjson(file_path).slice(0, limit)
            return pl.read_ndjson(file_path)
        elif fmt == "json":
            # For standard JSON, polars or pandas can parse
            with open(file_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            if isinstance(data, list):
                if limit:
                    data = data[:limit]
                return pl.DataFrame(data)
            elif isinstance(data, dict):
                # Try records or orient
                if "data" in data and isinstance(data["data"], list):
                    rows = data["data"][:limit] if limit else data["data"]
                    return pl.DataFrame(rows)
                return pl.DataFrame([data])
            else:
                raise ValueError("Unsupported JSON root structure (must be object or array)")
        elif fmt in ["xlsx", "xls"]:
            pdf = pd.read_excel(file_path, nrows=limit)
            return pl.from_pandas(pdf)
        else:
            raise ValueError(f"Unsupported file format: {file_format}")

    @classmethod
    def ingest_and_standardize(
        cls,
        source_path: str,
        dest_parquet_path: str,
        file_format: str
    ) -> Tuple[int, int, str]:
        """
        Parses source dataset, writes high-performance standardized Parquet copy,
        and returns (row_count, column_count, sha256_hash).
        """
        df = cls.load_dataframe(source_path, file_format)
        row_count = df.height
        col_count = df.width
        os.makedirs(os.path.dirname(dest_parquet_path), exist_ok=True)
        df.write_parquet(dest_parquet_path)
        sha256 = cls.compute_sha256(dest_parquet_path)
        return row_count, col_count, sha256
