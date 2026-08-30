from typing import Annotated, Any

from fastapi import APIRouter, Depends, Request, Response, status

from app.api.schemas import ApiErrorResponse

from ..application.rate_limit import LoginRateLimiter
from ..application.services import AccountServices
from ..domain.errors import AccountError, AccountErrorCode
from ..domain.models import CurrentAccountContext
from .cookies import clear_auth_cookies, set_auth_cookies
from .dependencies import (
    SettingsDependency,
    get_account_services,
    get_current_account,
    get_current_mutating_account,
    get_login_rate_limiter,
    login_rate_limit_key,
    validate_browser_origin,
)
from .schemas import AuthContextResponse, LoginRequest, RegisterRequest

router = APIRouter(prefix="/auth", tags=["auth"])

_ERROR_RESPONSES: dict[int | str, dict[str, Any]] = {
    401: {"model": ApiErrorResponse, "description": "نشست یا اطلاعات ورود معتبر نیست."},
    403: {"model": ApiErrorResponse, "description": "عملیات مجاز نیست."},
    409: {"model": ApiErrorResponse, "description": "ایمیل قبلاً ثبت شده است."},
    429: {"model": ApiErrorResponse, "description": "دفعات ورود بیش از حد مجاز است."},
}


@router.post(
    "/register",
    response_model=AuthContextResponse,
    status_code=status.HTTP_201_CREATED,
    responses=_ERROR_RESPONSES,
    summary="ایجاد حساب و سازمان اولیه",
)
async def register(
    payload: RegisterRequest,
    request: Request,
    response: Response,
    settings: SettingsDependency,
    services: Annotated[AccountServices, Depends(get_account_services)],
) -> AuthContextResponse:
    validate_browser_origin(request, settings)
    authenticated = await services.register.execute(
        email=str(payload.email),
        password=payload.password,
        organization_name=payload.organization_name,
    )
    set_auth_cookies(response, authenticated, settings)
    return AuthContextResponse.from_account(authenticated.account)


@router.post(
    "/login",
    response_model=AuthContextResponse,
    responses=_ERROR_RESPONSES,
    summary="ورود به حساب",
)
async def login(
    payload: LoginRequest,
    request: Request,
    response: Response,
    settings: SettingsDependency,
    services: Annotated[AccountServices, Depends(get_account_services)],
    limiter: Annotated[LoginRateLimiter, Depends(get_login_rate_limiter)],
) -> AuthContextResponse:
    validate_browser_origin(request, settings)
    rate_key = login_rate_limit_key(request, payload.email)
    retry_after = limiter.retry_after(rate_key)
    if retry_after is not None:
        raise AccountError(
            AccountErrorCode.AUTH_RATE_LIMITED,
            "تعداد تلاش‌های ورود بیش از حد مجاز است. کمی بعد دوباره تلاش کنید.",
            details={"retry_after_seconds": retry_after},
        )
    try:
        authenticated = await services.login.execute(
            email=payload.email,
            password=payload.password,
        )
    except AccountError as exc:
        if exc.code is AccountErrorCode.AUTH_INVALID_CREDENTIALS:
            limiter.record_failure(rate_key)
        raise
    limiter.clear(rate_key)
    set_auth_cookies(response, authenticated, settings)
    return AuthContextResponse.from_account(authenticated.account)


@router.get(
    "/me",
    response_model=AuthContextResponse,
    responses={401: _ERROR_RESPONSES[401]},
    summary="دریافت کاربر و سازمان جاری",
)
async def me(
    response: Response,
    current: Annotated[CurrentAccountContext, Depends(get_current_account)],
) -> AuthContextResponse:
    response.headers["Cache-Control"] = "no-store"
    return AuthContextResponse.from_account(current.account)


@router.post(
    "/logout",
    status_code=status.HTTP_204_NO_CONTENT,
    responses={401: _ERROR_RESPONSES[401], 403: _ERROR_RESPONSES[403]},
    summary="خروج از نشست جاری",
)
async def logout(
    response: Response,
    settings: SettingsDependency,
    services: Annotated[AccountServices, Depends(get_account_services)],
    current: Annotated[CurrentAccountContext, Depends(get_current_mutating_account)],
) -> None:
    await services.logout.execute(current.session_id)
    clear_auth_cookies(response, settings)
