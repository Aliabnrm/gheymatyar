import logging

from fastapi import FastAPI, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.config import Settings
from app.core.middleware import add_security_headers, get_request_id
from app.modules.price_lists.domain.errors import PriceListError, PriceListErrorCode

_logger = logging.getLogger(__name__)


def _error_response(
    request: Request,
    *,
    status_code: int,
    code: str,
    message: str,
    details: dict[str, object] | None = None,
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
        headers={"X-Request-ID": request_id},
    )
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
    _logger.exception(
        "خطای داخلی پیش‌بینی‌نشده.",
        exc_info=exc,
        extra={"request_id": request_id, "method": request.method, "path": request.url.path},
    )
    return _error_response(
        request,
        status_code=500,
        code="INTERNAL_SERVER_ERROR",
        message="خطای داخلی پیش‌بینی‌نشده‌ای رخ داد.",
    )


def register_exception_handlers(app: FastAPI) -> None:
    app.add_exception_handler(PriceListError, handle_price_list_error)
    app.add_exception_handler(RequestValidationError, handle_request_validation_error)
    app.add_exception_handler(StarletteHTTPException, handle_http_error)
    app.add_exception_handler(Exception, handle_unexpected_error)
