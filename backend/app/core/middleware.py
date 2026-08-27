import logging
import re
from time import perf_counter
from uuid import uuid4

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response
from starlette.types import ASGIApp

from app.core.config import AppEnvironment
from app.core.logging import bind_request_id, reset_request_id

_REQUEST_ID_PATTERN = re.compile(r"^[A-Za-z0-9._:-]{1,64}$")
_logger = logging.getLogger(__name__)


def get_request_id(request: Request) -> str:
    request_id = getattr(request.state, "request_id", None)
    return request_id if isinstance(request_id, str) else uuid4().hex


def add_security_headers(response: Response, *, environment: AppEnvironment) -> None:
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "no-referrer"
    if environment is AppEnvironment.PRODUCTION:
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"


class RequestContextMiddleware(BaseHTTPMiddleware):
    def __init__(self, app: ASGIApp, *, environment: AppEnvironment) -> None:
        super().__init__(app)
        self._environment = environment

    async def dispatch(
        self,
        request: Request,
        call_next: RequestResponseEndpoint,
    ) -> Response:
        incoming_request_id = request.headers.get("X-Request-ID", "")
        request_id = (
            incoming_request_id
            if _REQUEST_ID_PATTERN.fullmatch(incoming_request_id)
            else uuid4().hex
        )
        request.state.request_id = request_id
        token = bind_request_id(request_id)
        started_at = perf_counter()
        try:
            response = await call_next(request)
            response.headers["X-Request-ID"] = request_id
            add_security_headers(response, environment=self._environment)
            _logger.info(
                "درخواست HTTP تکمیل شد.",
                extra={
                    "method": request.method,
                    "path": request.url.path,
                    "status_code": response.status_code,
                    "duration_ms": round((perf_counter() - started_at) * 1000, 2),
                },
            )
            return response
        finally:
            reset_request_id(token)
