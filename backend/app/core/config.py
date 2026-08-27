from enum import StrEnum
from functools import lru_cache
from typing import Literal
from urllib.parse import urlsplit

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class AppEnvironment(StrEnum):
    DEVELOPMENT = "development"
    TEST = "test"
    PRODUCTION = "production"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", "../../.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "Gheymatyar API"
    app_env: AppEnvironment = AppEnvironment.DEVELOPMENT
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"] = "INFO"
    api_host: str = "0.0.0.0"
    api_port: int = Field(default=8000, ge=1, le=65_535)
    web_origin: str = "http://localhost:3000"
    max_upload_bytes: int = Field(default=10 * 1024 * 1024, ge=1024, le=100 * 1024 * 1024)
    max_workbook_header_scan_rows: int = Field(default=20, ge=1, le=100)
    max_workbook_rows: int = Field(default=50_000, ge=1, le=500_000)
    max_workbook_columns: int = Field(default=200, ge=3, le=10_000)
    max_workbook_sheets: int = Field(default=20, ge=1, le=100)
    max_xlsx_archive_entries: int = Field(default=10_000, ge=10, le=100_000)
    max_xlsx_uncompressed_bytes: int = Field(
        default=100 * 1024 * 1024,
        ge=1024,
        le=1024 * 1024 * 1024,
    )
    max_xlsx_compression_ratio: float = Field(default=250.0, ge=1, le=10_000)

    @field_validator("web_origin")
    @classmethod
    def validate_web_origin(cls, value: str) -> str:
        origin = value.strip().rstrip("/")
        parsed = urlsplit(origin)
        if (
            parsed.scheme not in {"http", "https"}
            or not parsed.hostname
            or parsed.username
            or parsed.password
            or parsed.query
            or parsed.fragment
            or parsed.path not in {"", "/"}
        ):
            raise ValueError("WEB_ORIGIN must be an HTTP(S) origin without a path")
        return origin

    @property
    def allowed_origins(self) -> tuple[str, ...]:
        origins = {self.web_origin}
        if self.app_env is AppEnvironment.DEVELOPMENT:
            origins.update({"http://localhost:3000", "http://127.0.0.1:3000"})
        return tuple(sorted(origins))


@lru_cache
def get_settings() -> Settings:
    return Settings()
