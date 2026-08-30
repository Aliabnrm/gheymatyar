from datetime import UTC, datetime

from ..domain.errors import AccountError, AccountErrorCode
from ..domain.models import CurrentAccountContext
from .ports import AccountStore, SessionTokenService


class GetCurrentAccount:
    def __init__(self, *, store: AccountStore, token_service: SessionTokenService) -> None:
        self._store = store
        self._token_service = token_service

    async def execute(
        self,
        session_token: str,
        *,
        now: datetime | None = None,
    ) -> CurrentAccountContext:
        lookup = await self._store.get_session(self._token_service.hash_token(session_token))
        if lookup is None or lookup.revoked_at is not None or not lookup.is_active:
            raise AccountError(
                AccountErrorCode.AUTH_REQUIRED,
                "برای ادامه ابتدا وارد حساب خود شوید.",
            )
        checked_at = now or datetime.now(UTC)
        if lookup.expires_at <= checked_at:
            raise AccountError(
                AccountErrorCode.AUTH_SESSION_EXPIRED,
                "نشست شما منقضی شده است. دوباره وارد شوید.",
            )
        if lookup.account is None:
            raise AccountError(
                AccountErrorCode.AUTH_CONTEXT_UNAVAILABLE,
                "عضویت سازمانی این نشست معتبر نیست.",
            )
        return CurrentAccountContext(
            session_id=lookup.session_id,
            csrf_token_hash=lookup.csrf_token_hash,
            expires_at=lookup.expires_at,
            account=lookup.account,
        )
