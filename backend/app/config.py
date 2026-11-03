"""BrokerLens application configuration settings using Pydantic Settings."""

from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    APP_ENV: str = "development"
    PORT: int = 8000
    HOST: str = "0.0.0.0"

    # Database
    DATABASE_URL: str = "sqlite:///./broker_lens.db"

    # JWT & Security
    JWT_SECRET_KEY: str = "brokerlens-insecure-dev-secret-key-32-bytes-min-2026"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 720

    # Vision AI & Customs Model Rules
    GEMINI_API_KEY: str = ""
    AI_ZERO_DATA_RETENTION: bool = True
    AWS_REGION: str = "ap-south-1"

    # Thresholds
    CONFIDENCE_HIGH_THRESHOLD: float = 0.85
    CONFIDENCE_MIN_READABLE_THRESHOLD: float = 0.45

    # CORS
    CORS_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"

    # Static file storage
    DOCS_STORAGE_PATH: str = "./static/docs"

    # DPDP Act 2023 Default
    ENABLE_PII_MASKING_BY_DEFAULT: bool = True

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]


settings = Settings()
