from fastapi import Request

from app.core.config import Settings


def get_request_settings(request: Request) -> Settings:
    settings = request.app.state.settings
    if not isinstance(settings, Settings):
        raise RuntimeError("Application settings are not configured")
    return settings
