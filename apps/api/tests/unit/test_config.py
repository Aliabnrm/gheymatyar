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
