from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.errors import register_exception_handlers
from app.api.router import root_router
from app.core.config import Settings, get_settings
from app.core.logging import configure_logging
from app.core.middleware import RequestContextMiddleware
from app.infrastructure.database import create_database_runtime
from app.modules.accounts.application.get_current_account import GetCurrentAccount
from app.modules.accounts.application.login import LoginAccount
from app.modules.accounts.application.logout import LogoutAccount
from app.modules.accounts.application.rate_limit import LoginRateLimiter
from app.modules.accounts.application.register import RegisterAccount
from app.modules.accounts.application.services import AccountServices
from app.modules.accounts.application.validate_csrf import ValidateCsrf
from app.modules.accounts.infrastructure.passwords import Argon2PasswordHasher
from app.modules.accounts.infrastructure.repositories import SqlAlchemyAccountStore
from app.modules.accounts.infrastructure.tokens import SecureTokenService


def create_app(settings: Settings | None = None) -> FastAPI:
    resolved_settings = settings or get_settings()
    configure_logging(resolved_settings.log_level)
    database = create_database_runtime(resolved_settings)
    store = SqlAlchemyAccountStore(database.session_factory)
    password_hasher = Argon2PasswordHasher()
    token_service = SecureTokenService()

    @asynccontextmanager
    async def lifespan(_: FastAPI) -> AsyncIterator[None]:
        try:
            yield
        finally:
            await database.dispose()

    application = FastAPI(
        title=resolved_settings.app_name,
        version="0.1.0",
        description="API مقایسه قابل اعتماد لیست قیمت عمده‌فروشی",
        lifespan=lifespan,
    )
    application.state.settings = resolved_settings
    application.state.database = database
    application.state.account_services = AccountServices(
        register=RegisterAccount(
            store=store,
            password_hasher=password_hasher,
            token_service=token_service,
            session_ttl_seconds=resolved_settings.auth_session_ttl_seconds,
            registration_enabled=resolved_settings.registration_enabled,
        ),
        login=LoginAccount(
            store=store,
            password_hasher=password_hasher,
            token_service=token_service,
            session_ttl_seconds=resolved_settings.auth_session_ttl_seconds,
        ),
        current=GetCurrentAccount(store=store, token_service=token_service),
        logout=LogoutAccount(store=store),
        csrf=ValidateCsrf(token_service=token_service),
    )
    application.state.login_rate_limiter = LoginRateLimiter(
        max_failures=resolved_settings.auth_login_max_failures,
        window_seconds=resolved_settings.auth_login_window_seconds,
        max_entries=resolved_settings.auth_login_limiter_max_entries,
    )
    application.add_middleware(
        CORSMiddleware,
        allow_origins=list(resolved_settings.allowed_origins),
        allow_credentials=True,
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["Content-Type", "Accept", "X-Request-ID", "X-CSRF-Token"],
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
