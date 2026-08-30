import hashlib
from collections.abc import Awaitable, Callable
from typing import Annotated

from fastapi import Depends, Request, Security
from fastapi.security import APIKeyCookie

from app.api.dependencies import get_request_settings
from app.core.config import Settings

from ..application.rate_limit import LoginRateLimiter
from ..application.services import AccountServices
from ..domain.enums import OrganizationRole
from ..domain.errors import AccountError, AccountErrorCode
from ..domain.models import CurrentAccountContext
from .cookies import SESSION_COOKIE_NAME
from .csrf import validate_csrf

_session_cookie = APIKeyCookie(name=SESSION_COOKIE_NAME, auto_error=False)


def get_account_services(request: Request) -> AccountServices:
    services = request.app.state.account_services
    if not isinstance(services, AccountServices):
        raise RuntimeError("Account services are not configured")
    return services


def get_login_rate_limiter(request: Request) -> LoginRateLimiter:
    limiter = request.app.state.login_rate_limiter
    if not isinstance(limiter, LoginRateLimiter):
        raise RuntimeError("Login rate limiter is not configured")
    return limiter


async def get_current_account(
    session_token: Annotated[str | None, Security(_session_cookie)],
    services: Annotated[AccountServices, Depends(get_account_services)],
) -> CurrentAccountContext:
    if not session_token:
        raise AccountError(
            AccountErrorCode.AUTH_REQUIRED,
            "برای ادامه ابتدا وارد حساب خود شوید.",
        )
    return await services.current.execute(session_token)


async def get_current_mutating_account(
    request: Request,
    current: Annotated[CurrentAccountContext, Depends(get_current_account)],
    services: Annotated[AccountServices, Depends(get_account_services)],
) -> CurrentAccountContext:
    validate_csrf(request, current, services)
    return current


def require_roles(
    *roles: OrganizationRole,
    require_csrf: bool = False,
) -> Callable[..., Awaitable[CurrentAccountContext]]:
    account_dependency = get_current_mutating_account if require_csrf else get_current_account

    async def dependency(
        current: Annotated[
            CurrentAccountContext,
            Depends(account_dependency),
        ],
    ) -> CurrentAccountContext:
        if current.account.role not in roles:
            raise AccountError(
                AccountErrorCode.AUTH_FORBIDDEN,
                "نقش شما اجازه انجام این عملیات را ندارد.",
            )
        return current

    return dependency


def validate_browser_origin(request: Request, settings: Settings) -> None:
    origin = request.headers.get("Origin")
    if origin is not None and origin not in settings.allowed_origins:
        raise AccountError(
            AccountErrorCode.CSRF_VALIDATION_FAILED,
            "مبدأ درخواست مجاز نیست.",
        )


def login_rate_limit_key(request: Request, email: str) -> str:
    client_host = request.client.host if request.client else "unknown"
    material = f"{client_host}\0{email.strip().casefold()}".encode()
    return hashlib.sha256(material).hexdigest()


SettingsDependency = Annotated[Settings, Depends(get_request_settings)]
