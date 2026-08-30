from enum import StrEnum
from functools import lru_cache
from typing import Literal
from urllib.parse import urlsplit

from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class AppEnvironment(StrEnum):
    DEVELOPMENT = "development"
    TEST = "test"
    PRODUCTION = "production"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "Gheymatyar API"
    app_env: AppEnvironment = AppEnvironment.DEVELOPMENT
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"] = "INFO"
    api_host: str = "0.0.0.0"
    api_port: int = Field(default=8000, ge=1, le=65_535)
    web_origin: str = "http://localhost:3000"
    database_url: str = (
        "postgresql+asyncpg://gheymatyar:local-development-only@localhost:5432/gheymatyar"
    )
    database_pool_size: int = Field(default=5, ge=1, le=50)
    database_max_overflow: int = Field(default=5, ge=0, le=100)
    database_pool_timeout_seconds: int = Field(default=10, ge=1, le=60)
    auth_public_registration_enabled: bool | None = None
    auth_cookie_secure: bool | None = None
    auth_session_ttl_seconds: int = Field(
        default=7 * 24 * 60 * 60,
        ge=15 * 60,
        le=30 * 24 * 60 * 60,
    )
    auth_login_max_failures: int = Field(default=5, ge=1, le=20)
    auth_login_window_seconds: int = Field(default=15 * 60, ge=60, le=24 * 60 * 60)
    auth_login_limiter_max_entries: int = Field(default=10_000, ge=100, le=100_000)
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

    @field_validator("database_url")
    @classmethod
    def validate_database_url(cls, value: str) -> str:
        if not value.startswith("postgresql+asyncpg://"):
            raise ValueError("DATABASE_URL must use postgresql+asyncpg")
        return value

    @model_validator(mode="after")
    def validate_production_auth_transport(self) -> "Settings":
        if self.app_env is AppEnvironment.PRODUCTION:
            if not self.web_origin.startswith("https://"):
                raise ValueError("production WEB_ORIGIN must use HTTPS")
            if self.auth_cookie_secure is False:
                raise ValueError("AUTH_COOKIE_SECURE cannot be false in production")
        return self

    @property
    def allowed_origins(self) -> tuple[str, ...]:
        origins = {self.web_origin}
        if self.app_env is AppEnvironment.DEVELOPMENT:
            origins.update({"http://localhost:3000", "http://127.0.0.1:3000"})
        return tuple(sorted(origins))

    @property
    def registration_enabled(self) -> bool:
        if self.auth_public_registration_enabled is not None:
            return self.auth_public_registration_enabled
        return self.app_env is not AppEnvironment.PRODUCTION

    @property
    def secure_auth_cookies(self) -> bool:
        if self.auth_cookie_secure is not None:
            return self.auth_cookie_secure
        return self.app_env is AppEnvironment.PRODUCTION


@lru_cache
def get_settings() -> Settings:
    return Settings()
