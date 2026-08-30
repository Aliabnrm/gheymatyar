from fastapi import Request

from ..application.services import AccountServices
from ..domain.models import CurrentAccountContext
from .cookies import CSRF_COOKIE_NAME


def validate_csrf(
    request: Request,
    current: CurrentAccountContext,
    services: AccountServices,
) -> None:
    services.csrf.execute(
        header_token=request.headers.get("X-CSRF-Token", ""),
        cookie_token=request.cookies.get(CSRF_COOKIE_NAME, ""),
        current=current,
    )
