from datetime import UTC, datetime, timedelta
from uuid import uuid4

from ..domain.errors import AccountError, AccountErrorCode
from .dto import AuthenticatedSession
from .ports import AccountStore, PasswordHasher, SessionTokenService
from .validation import normalize_email, validate_organization_name, validate_password


class RegisterAccount:
    def __init__(
        self,
        *,
        store: AccountStore,
        password_hasher: PasswordHasher,
        token_service: SessionTokenService,
        session_ttl_seconds: int,
        registration_enabled: bool,
    ) -> None:
        self._store = store
        self._password_hasher = password_hasher
        self._token_service = token_service
        self._session_ttl = timedelta(seconds=session_ttl_seconds)
        self._registration_enabled = registration_enabled

    async def execute(
        self,
        *,
        email: str,
        password: str,
        organization_name: str,
        now: datetime | None = None,
    ) -> AuthenticatedSession:
        if not self._registration_enabled:
            raise AccountError(
                AccountErrorCode.AUTH_REGISTRATION_DISABLED,
                "ثبت‌نام عمومی در این محیط فعال نیست.",
            )
        normalized_email = normalize_email(email)
        checked_password = validate_password(password)
        checked_organization_name = validate_organization_name(organization_name)
        password_hash = await self._password_hasher.hash(checked_password)
        tokens = self._token_service.issue()
        created_at = now or datetime.now(UTC)
        expires_at = created_at + self._session_ttl
        session_id = uuid4()
        account = await self._store.create_registered_account(
            user_id=uuid4(),
            email=normalized_email,
            password_hash=password_hash,
            organization_id=uuid4(),
            organization_name=checked_organization_name,
            session_id=session_id,
            session_token_hash=tokens.session_token_hash,
            csrf_token_hash=tokens.csrf_token_hash,
            expires_at=expires_at,
        )
        return AuthenticatedSession(
            session_id=session_id,
            account=account,
            tokens=tokens,
            expires_at=expires_at,
        )
