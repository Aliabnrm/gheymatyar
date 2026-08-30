from datetime import UTC, datetime
from uuid import UUID

from ..domain.errors import AccountError, AccountErrorCode
from .ports import AccountStore


class LogoutAccount:
    def __init__(self, *, store: AccountStore) -> None:
        self._store = store

    async def execute(self, session_id: UUID, *, now: datetime | None = None) -> None:
        revoked = await self._store.revoke_session(session_id, now or datetime.now(UTC))
        if not revoked:
            raise AccountError(
                AccountErrorCode.AUTH_REQUIRED,
                "برای ادامه ابتدا وارد حساب خود شوید.",
            )
