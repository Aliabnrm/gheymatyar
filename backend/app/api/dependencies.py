from fastapi import Request

from app.core.config import Settings
from app.infrastructure.database import DatabaseRuntime


def get_request_settings(request: Request) -> Settings:
    settings = request.app.state.settings
    if not isinstance(settings, Settings):
        raise RuntimeError("Application settings are not configured")
    return settings


def get_database_runtime(request: Request) -> DatabaseRuntime:
    database = request.app.state.database
    if not isinstance(database, DatabaseRuntime):
        raise RuntimeError("Database runtime is not configured")
    return database
