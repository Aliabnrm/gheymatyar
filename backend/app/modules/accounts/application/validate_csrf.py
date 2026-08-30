import hmac

from ..domain.errors import AccountError, AccountErrorCode
from ..domain.models import CurrentAccountContext
from .ports import SessionTokenService


class ValidateCsrf:
    def __init__(self, *, token_service: SessionTokenService) -> None:
        self._token_service = token_service

    def execute(
        self,
        *,
        header_token: str,
        cookie_token: str,
        current: CurrentAccountContext,
    ) -> None:
        valid = (
            bool(header_token)
            and bool(cookie_token)
            and hmac.compare_digest(header_token, cookie_token)
            and hmac.compare_digest(
                self._token_service.hash_token(header_token),
                current.csrf_token_hash,
            )
        )
        if not valid:
            raise AccountError(
                AccountErrorCode.CSRF_VALIDATION_FAILED,
                "اعتبار امنیتی درخواست صحیح نیست. صفحه را تازه‌سازی و دوباره تلاش کنید.",
            )
