import os
from typing import List, Union
from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    PROJECT_NAME: str = "FluxV2X"
    VERSION: str = "0.2.0"
    ENVIRONMENT: str = "development"
    DEBUG: bool = False
    API_V1_STR: str = "/api/v1"
    
    # Cryptographic Secret Key (must be overridden in production)
    SECRET_KEY: str = "fluxv2x-dev-local-secret-key-not-for-production-min-32-chars"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 day
    JWT_ALGORITHM: str = "HS256"

    # Database
    DATABASE_URL: str = "sqlite:///./fluxv2x.db"

    # CORS
    ALLOWED_ORIGINS: Union[str, List[str]] = "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,http://localhost:8000"

    @property
    def cors_origins(self) -> List[str]:
        if isinstance(self.ALLOWED_ORIGINS, str):
            return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",") if origin.strip()]
        return self.ALLOWED_ORIGINS

    # Storage Paths
    LOCAL_STORAGE_PATH: str = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../data/uploads"))
    DERIVED_STORAGE_PATH: str = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../data/derived"))
    ARTIFACTS_STORAGE_PATH: str = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../artifacts"))

    # Security & Ingestion Limits
    MAX_UPLOAD_SIZE_BYTES: int = 100 * 1024 * 1024  # 100 MB max upload limit
    ALLOWED_EXTENSIONS: List[str] = [".csv", ".tsv", ".json", ".jsonl", ".ndjson", ".parquet", ".xlsx"]

    # Explicit Opt-in Dev Flags (MUST be False by default and forbidden in production)
    ENABLE_DEV_BOOTSTRAP: bool = False
    AUTO_LOAD_DEMO_DATASET: bool = False

    @model_validator(mode="after")
    def validate_security_invariants(self) -> "Settings":
        env_lower = self.ENVIRONMENT.strip().lower()
        if env_lower in ("production", "prod"):
            # Enforce strong secret key in production
            insecure_markers = [
                "fluxv2x-dev",
                "secret-key",
                "replace-in-production",
                "changeme",
                "123456",
                "default",
                "insecure"
            ]
            if (
                not self.SECRET_KEY
                or len(self.SECRET_KEY) < 32
                or any(marker in self.SECRET_KEY.lower() for marker in insecure_markers)
            ):
                raise ValueError(
                    "CRITICAL SECURITY CONFIGURATION ERROR: A cryptographically random SECRET_KEY of at least 32 characters "
                    "must be supplied via environment variable in production. Startup aborted."
                )

            # Forbid dev bootstrapping in production
            if self.ENABLE_DEV_BOOTSTRAP:
                raise ValueError(
                    "CRITICAL SECURITY CONFIGURATION ERROR: ENABLE_DEV_BOOTSTRAP cannot be enabled in production environments."
                )

            # Forbid automatic synthetic demo loading in production
            if self.AUTO_LOAD_DEMO_DATASET:
                raise ValueError(
                    "CRITICAL DATA INTEGRITY ERROR: AUTO_LOAD_DEMO_DATASET cannot be enabled in production environments."
                )

            # Forbid DEBUG mode in production
            if self.DEBUG:
                raise ValueError(
                    "CRITICAL SECURITY CONFIGURATION ERROR: DEBUG mode cannot be enabled in production environments."
                )

        return self


settings = Settings()
