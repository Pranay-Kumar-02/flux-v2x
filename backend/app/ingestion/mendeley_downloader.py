import os
import datetime
import logging
from typing import Dict, Any, Optional, Tuple
import httpx
from app.core.config import settings
from app.ingestion.parser import IngestionEngine

logger = logging.getLogger(__name__)

MENDELEY_DOI = "10.17632/2jvknhv465.1"
MENDELEY_URL = "https://doi.org/10.17632/2jvknhv465.1"
EXPECTED_COLUMNS = [
    "timestamp", "src_id", "dst_id", "rx_x", "rx_y", 
    "rx_speed", "packet_count", "byte_count", "packet_rate", "scenario", "label"
]


class MendeleyDatasetImporter:
    """
    Independent service for retrieving, verifying, and importing the published research dataset:
    Khan et al. (2026), "A spatiotemporal, congestion-context-aware vehicular communication dataset
    for malicious flooding attack analysis," Mendeley Data, v1. DOI: 10.17632/2jvknhv465.1
    """

    @staticmethod
    def get_provenance_info() -> Dict[str, Any]:
        return {
            "doi": MENDELEY_DOI,
            "url": MENDELEY_URL,
            "license": "CC BY 4.0",
            "citation": "Khan, M. D., Nnamoko, N., Rafiq, H., & Abubahia, A. (2026). Mendeley Data, V1.",
            "is_synthetic": False,
            "expected_schema": EXPECTED_COLUMNS
        }

    @classmethod
    def verify_and_import_local_file(
        cls,
        source_filepath: str,
        target_parquet_path: str
    ) -> Tuple[int, int, str, Dict[str, Any]]:
        """
        Validates and ingests a locally supplied copy of the real Mendeley dataset.
        Enforces schema verification, computes SHA-256 fingerprint, and standardizes to Parquet.
        """
        if not os.path.exists(source_filepath):
            raise FileNotFoundError(f"Source file not found at: {source_filepath}")

        sha256 = IngestionEngine.compute_sha256(source_filepath)
        file_size = os.path.getsize(source_filepath)

        # Parse and inspect schema
        df = IngestionEngine.parse_to_polars(source_filepath)
        missing_cols = [c for c in ["packet_rate", "label"] if c not in df.columns]
        if missing_cols:
            raise ValueError(f"Supplied dataset is missing critical research columns: {missing_cols}")

        os.makedirs(os.path.dirname(target_parquet_path), exist_ok=True)
        df.write_parquet(target_parquet_path)

        metadata = {
            "retrieval_method": "manual_verified_import",
            "source_doi": MENDELEY_DOI,
            "source_url": MENDELEY_URL,
            "sha256_hash": sha256,
            "file_size_bytes": file_size,
            "imported_at": datetime.datetime.utcnow().isoformat(),
            "license": "CC BY 4.0",
            "verified_schema": df.columns,
            "is_synthetic": False
        }
        return df.height, df.width, sha256, metadata

    @classmethod
    def attempt_download_and_verify(
        cls,
        target_parquet_path: str,
        timeout_seconds: float = 15.0
    ) -> Optional[Tuple[int, int, str, Dict[str, Any]]]:
        """
        Attempts to retrieve the dataset from authoritative repository endpoints.
        If the network is unavailable or blocked, safely returns None and logs the blocker
        without falsifying provenance or substituting synthetic data.
        """
        endpoints = [
            f"https://data.mendeley.com/public-files/datasets/2jvknhv465/files/",
            f"https://api.mendeley.com/datasets/2jvknhv465"
        ]

        try:
            with httpx.Client(timeout=timeout_seconds, follow_redirects=True) as client:
                for ep in endpoints:
                    try:
                        resp = client.get(ep)
                        if resp.status_code == 200 and len(resp.content) > 1024:
                            temp_path = target_parquet_path + ".tmp"
                            with open(temp_path, "wb") as f:
                                f.write(resp.content)
                            try:
                                result = cls.verify_and_import_local_file(temp_path, target_parquet_path)
                                if os.path.exists(temp_path):
                                    os.remove(temp_path)
                                return result
                            except Exception:
                                if os.path.exists(temp_path):
                                    os.remove(temp_path)
                    except Exception:
                        continue
        except Exception as exc:
            logger.debug("Mendeley repository automatic download unavailable: %s", exc)

        return None
