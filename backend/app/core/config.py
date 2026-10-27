import os
from typing import List, Union
from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    PROJECT_NAME: str = "FluxV2X"
    VERSION: str = "0.1.0"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = "fluxv2x-insecure-dev-secret-key-replace-in-production-123456789"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 day

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

    # Demo Dataset
    AUTO_LOAD_DEMO_DATASET: bool = True


settings = Settings()
