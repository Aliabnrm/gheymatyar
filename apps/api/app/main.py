from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.errors import register_exception_handlers
from app.api.router import root_router
from app.core.config import Settings, get_settings
from app.core.logging import configure_logging
from app.core.middleware import RequestContextMiddleware


def create_app(settings: Settings | None = None) -> FastAPI:
    resolved_settings = settings or get_settings()
    configure_logging(resolved_settings.log_level)

    application = FastAPI(
        title=resolved_settings.app_name,
        version="0.1.0",
        description="API مقایسه قابل اعتماد لیست قیمت عمده‌فروشی",
    )
    application.state.settings = resolved_settings
    application.add_middleware(
        CORSMiddleware,
        allow_origins=list(resolved_settings.allowed_origins),
        allow_credentials=False,
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["Content-Type", "Accept", "X-Request-ID"],
        expose_headers=["X-Request-ID"],
    )
    application.add_middleware(
        RequestContextMiddleware,
        environment=resolved_settings.app_env,
    )
    register_exception_handlers(application)
    application.include_router(root_router)
    return application


app = create_app()
