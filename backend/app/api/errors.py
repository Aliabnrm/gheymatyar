import logging

from fastapi import FastAPI, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.config import Settings
from app.core.middleware import add_security_headers, get_request_id
from app.modules.accounts.domain.errors import AccountError, AccountErrorCode
from app.modules.price_lists.domain.errors import PriceListError, PriceListErrorCode
from app.modules.suppliers.domain.errors import SupplierError, SupplierErrorCode

_logger = logging.getLogger(__name__)


def _error_response(
    request: Request,
    *,
    status_code: int,
    code: str,
    message: str,
    details: dict[str, object] | None = None,
    headers: dict[str, str] | None = None,
) -> JSONResponse:
    request_id = get_request_id(request)
    response = JSONResponse(
        status_code=status_code,
        content=jsonable_encoder(
            {
                "error": {
                    "code": code,
                    "message": message,
                    "details": details or {},
                },
                "request_id": request_id,
            }
        ),
        headers={"X-Request-ID": request_id, **(headers or {})},
    )
    if request.url.path.startswith("/api/v1/auth/"):
        response.headers["Cache-Control"] = "no-store"
    settings = request.app.state.settings
    if not isinstance(settings, Settings):
        raise RuntimeError("Application settings are not configured")
    add_security_headers(response, environment=settings.app_env)
    return response


async def handle_price_list_error(request: Request, exc: Exception) -> JSONResponse:
    if not isinstance(exc, PriceListError):
        raise exc
    status_code = 413 if exc.code is PriceListErrorCode.FILE_TOO_LARGE else 422
    return _error_response(
        request,
        status_code=status_code,
        code=exc.code.value,
        message=exc.message,
        details=exc.details,
    )


async def handle_account_error(request: Request, exc: Exception) -> JSONResponse:
    if not isinstance(exc, AccountError):
        raise exc
    status_codes = {
        AccountErrorCode.AUTH_REQUIRED: 401,
        AccountErrorCode.AUTH_INVALID_CREDENTIALS: 401,
        AccountErrorCode.AUTH_SESSION_EXPIRED: 401,
        AccountErrorCode.AUTH_CONTEXT_UNAVAILABLE: 401,
        AccountErrorCode.AUTH_REGISTRATION_DISABLED: 403,
        AccountErrorCode.CSRF_VALIDATION_FAILED: 403,
        AccountErrorCode.AUTH_FORBIDDEN: 403,
        AccountErrorCode.EMAIL_ALREADY_REGISTERED: 409,
        AccountErrorCode.AUTH_RATE_LIMITED: 429,
        AccountErrorCode.INVALID_EMAIL: 422,
        AccountErrorCode.INVALID_PASSWORD: 422,
        AccountErrorCode.INVALID_ORGANIZATION_NAME: 422,
    }
    retry_after = exc.details.get("retry_after_seconds")
    headers = {"Retry-After": str(retry_after)} if isinstance(retry_after, int) else None
    return _error_response(
        request,
        status_code=status_codes[exc.code],
        code=exc.code.value,
        message=exc.message,
        details=exc.details,
        headers=headers,
    )


async def handle_supplier_error(request: Request, exc: Exception) -> JSONResponse:
    if not isinstance(exc, SupplierError):
        raise exc
    status_codes = {
        SupplierErrorCode.SUPPLIER_NOT_FOUND: 404,
        SupplierErrorCode.SUPPLIER_NAME_ALREADY_EXISTS: 409,
        SupplierErrorCode.INVALID_SUPPLIER_NAME: 422,
        SupplierErrorCode.SUPPLIER_UPDATE_EMPTY: 422,
    }
    return _error_response(
        request,
        status_code=status_codes[exc.code],
        code=exc.code.value,
        message=exc.message,
        details=exc.details,
    )


async def handle_request_validation_error(
    request: Request,
    exc: Exception,
) -> JSONResponse:
    if not isinstance(exc, RequestValidationError):
        raise exc
    issues = [
        {
            "location": [str(part) for part in issue["loc"]],
            "code": issue["type"],
            "message": issue["msg"],
        }
        for issue in exc.errors()
    ]
    return _error_response(
        request,
        status_code=422,
        code="REQUEST_VALIDATION_ERROR",
        message="داده‌های درخواست معتبر نیستند.",
        details={"issues": issues},
    )


async def handle_http_error(request: Request, exc: Exception) -> JSONResponse:
    if not isinstance(exc, StarletteHTTPException):
        raise exc
    messages = {
        404: ("NOT_FOUND", "مسیر درخواستی پیدا نشد."),
        405: ("METHOD_NOT_ALLOWED", "روش HTTP برای این مسیر مجاز نیست."),
        503: ("SERVICE_NOT_READY", "سرویس هنوز برای دریافت درخواست آماده نیست."),
    }
    code, message = messages.get(exc.status_code, ("HTTP_ERROR", "درخواست قابل پردازش نیست."))
    return _error_response(
        request,
        status_code=exc.status_code,
        code=code,
        message=message,
    )


async def handle_unexpected_error(request: Request, exc: Exception) -> JSONResponse:
    request_id = get_request_id(request)
    _logger.error(
        "خطای داخلی پیش‌بینی‌نشده.",
        extra={
            "request_id": request_id,
            "method": request.method,
            "path": request.url.path,
            "error_type": type(exc).__name__,
        },
    )
    return _error_response(
        request,
        status_code=500,
        code="INTERNAL_SERVER_ERROR",
        message="خطای داخلی پیش‌بینی‌نشده‌ای رخ داد.",
    )


def register_exception_handlers(app: FastAPI) -> None:
    app.add_exception_handler(PriceListError, handle_price_list_error)
    app.add_exception_handler(AccountError, handle_account_error)
    app.add_exception_handler(SupplierError, handle_supplier_error)
    app.add_exception_handler(RequestValidationError, handle_request_validation_error)
    app.add_exception_handler(StarletteHTTPException, handle_http_error)
    app.add_exception_handler(Exception, handle_unexpected_error)
