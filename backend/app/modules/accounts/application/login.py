from datetime import UTC, datetime, timedelta
from typing import NoReturn
from uuid import uuid4

from ..domain.errors import AccountError, AccountErrorCode
from ..domain.models import SafeAccountContext
from .dto import AuthenticatedSession
from .ports import AccountStore, PasswordHasher, SessionTokenService
from .validation import normalize_email, validate_password

_INVALID_CREDENTIALS_MESSAGE = "ایمیل یا رمز عبور صحیح نیست."


class LoginAccount:
    def __init__(
        self,
        *,
        store: AccountStore,
        password_hasher: PasswordHasher,
        token_service: SessionTokenService,
        session_ttl_seconds: int,
    ) -> None:
        self._store = store
        self._password_hasher = password_hasher
        self._token_service = token_service
        self._session_ttl = timedelta(seconds=session_ttl_seconds)

    async def execute(
        self,
        *,
        email: str,
        password: str,
        now: datetime | None = None,
    ) -> AuthenticatedSession:
        try:
            normalized_email = normalize_email(email)
            checked_password = validate_password(password)
        except AccountError:
            await self._password_hasher.verify_dummy()
            self._raise_invalid_credentials()

        candidate = await self._store.get_login_candidate(normalized_email)
        if candidate is None:
            await self._password_hasher.verify_dummy()
            self._raise_invalid_credentials()

        verification = await self._password_hasher.verify(
            candidate.password_hash,
            checked_password,
        )
        if not verification.valid or not candidate.is_active:
            self._raise_invalid_credentials()
        if len(candidate.memberships) != 1:
            raise AccountError(
                AccountErrorCode.AUTH_CONTEXT_UNAVAILABLE,
                "سازمان جاری این حساب قابل تعیین نیست.",
            )

        membership = candidate.memberships[0]
        replacement_hash = (
            await self._password_hasher.hash(checked_password)
            if verification.needs_rehash
            else None
        )
        tokens = self._token_service.issue()
        created_at = now or datetime.now(UTC)
        expires_at = created_at + self._session_ttl
        session_id = uuid4()
        created = await self._store.create_login_session(
            user_id=candidate.user_id,
            organization_id=membership.organization_id,
            session_id=session_id,
            session_token_hash=tokens.session_token_hash,
            csrf_token_hash=tokens.csrf_token_hash,
            expires_at=expires_at,
            replacement_password_hash=replacement_hash,
        )
        if not created:
            raise AccountError(
                AccountErrorCode.AUTH_CONTEXT_UNAVAILABLE,
                "سازمان جاری این حساب قابل تعیین نیست.",
            )
        account = SafeAccountContext(
            user_id=candidate.user_id,
            email=candidate.email,
            organization_id=membership.organization_id,
            organization_name=membership.organization_name,
            role=membership.role,
        )
        return AuthenticatedSession(
            session_id=session_id,
            account=account,
            tokens=tokens,
            expires_at=expires_at,
        )

    def _raise_invalid_credentials(self) -> NoReturn:
        raise AccountError(
            AccountErrorCode.AUTH_INVALID_CREDENTIALS,
            _INVALID_CREDENTIALS_MESSAGE,
        )
