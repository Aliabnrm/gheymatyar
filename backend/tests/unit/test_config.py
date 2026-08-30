import pytest
from pydantic import ValidationError

from app.core.config import Settings


def test_production_cors_allows_only_configured_origin() -> None:
    settings = Settings(app_env="production", web_origin="https://app.example.com/")

    assert settings.web_origin == "https://app.example.com"
    assert settings.allowed_origins == ("https://app.example.com",)


def test_rejects_web_origin_with_path() -> None:
    with pytest.raises(ValidationError):
        Settings(web_origin="https://app.example.com/dashboard")


def test_production_requires_https_and_secure_cookie() -> None:
    with pytest.raises(ValidationError):
        Settings(app_env="production", web_origin="http://app.example.com")
    with pytest.raises(ValidationError):
        Settings(
            app_env="production",
            web_origin="https://app.example.com",
            auth_cookie_secure=False,
        )


def test_rejects_non_postgresql_persistence() -> None:
    with pytest.raises(ValidationError):
        Settings(database_url="sqlite+aiosqlite:///test.db")
