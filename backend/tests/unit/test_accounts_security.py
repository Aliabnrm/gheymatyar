from datetime import UTC, datetime, timedelta
from uuid import uuid4

import pytest
from argon2 import PasswordHasher

from app.core.config import Settings
from app.modules.accounts.application.dto import AuthenticatedSession
from app.modules.accounts.application.ports import PasswordVerification
from app.modules.accounts.application.rate_limit import LoginRateLimiter
from app.modules.accounts.application.register import RegisterAccount
from app.modules.accounts.application.validate_csrf import ValidateCsrf
from app.modules.accounts.application.validation import (
    normalize_email,
    validate_organization_name,
    validate_password,
)
from app.modules.accounts.domain.enums import OrganizationRole
from app.modules.accounts.domain.errors import AccountError, AccountErrorCode
from app.modules.accounts.domain.models import (
    CurrentAccountContext,
    IssuedSessionTokens,
    SafeAccountContext,
)
from app.modules.accounts.infrastructure.passwords import Argon2PasswordHasher
from app.modules.accounts.infrastructure.tokens import SecureTokenService
from app.modules.accounts.presentation.dependencies import require_roles


def test_normalizes_email_without_preserving_case_or_outer_whitespace() -> None:
    assert normalize_email("  Owner@Example.COM  ") == "owner@example.com"


@pytest.mark.parametrize("password", ["short", "x" * 129])
def test_rejects_password_outside_bounded_length(password: str) -> None:
    with pytest.raises(AccountError) as raised:
        validate_password(password)

    assert raised.value.code is AccountErrorCode.INVALID_PASSWORD


def test_normalizes_organization_name_and_rejects_blank_input() -> None:
    assert validate_organization_name("  شرکت   نمونه  ") == "شرکت نمونه"

    with pytest.raises(AccountError) as raised:
        validate_organization_name("   ")

    assert raised.value.code is AccountErrorCode.INVALID_ORGANIZATION_NAME


def test_organization_roles_are_intentionally_minimal() -> None:
    assert {role.value for role in OrganizationRole} == {"OWNER", "OPERATOR"}


def test_issues_independent_tokens_and_persists_only_sha256_hashes() -> None:
    service = SecureTokenService()

    tokens = service.issue()

    assert tokens.session_token != tokens.csrf_token
    assert len(tokens.session_token) >= 43
    assert len(tokens.csrf_token) >= 43
    assert tokens.session_token not in tokens.session_token_hash
    assert tokens.csrf_token not in tokens.csrf_token_hash
    assert len(tokens.session_token_hash) == 64
    assert len(tokens.csrf_token_hash) == 64
    assert service.hash_token(tokens.session_token) == tokens.session_token_hash


def test_login_rate_limiter_blocks_after_configured_failures_and_expires() -> None:
    limiter = LoginRateLimiter(max_failures=2, window_seconds=60, max_entries=10)
    started = datetime(2026, 8, 28, 8, 0, tzinfo=UTC)

    assert limiter.retry_after("client", now=started) is None
    limiter.record_failure("client", now=started)
    limiter.record_failure("client", now=started + timedelta(seconds=1))

    assert limiter.retry_after("client", now=started + timedelta(seconds=2)) == 59
    assert limiter.retry_after("client", now=started + timedelta(seconds=61)) is None
    limiter.record_failure("client", now=started + timedelta(seconds=62))
    limiter.clear("client")
    assert limiter.entry_count == 0


def test_login_rate_limiter_keeps_memory_bounded() -> None:
    limiter = LoginRateLimiter(max_failures=1, window_seconds=60, max_entries=2)
    now = datetime(2026, 8, 28, 8, 0, tzinfo=UTC)

    limiter.record_failure("one", now=now)
    limiter.record_failure("two", now=now)
    limiter.record_failure("three", now=now)

    assert limiter.entry_count == 2
    assert limiter.retry_after("one", now=now) is None


def test_auth_defaults_are_environment_aware() -> None:
    production = Settings(app_env="production", web_origin="https://app.example.com")
    development = Settings(app_env="development")

    assert production.registration_enabled is False
    assert production.secure_auth_cookies is True
    assert development.registration_enabled is True
    assert development.secure_auth_cookies is False


@pytest.mark.anyio
async def test_argon2id_verification_and_rehash_detection() -> None:
    password = "a-secure-test-password"
    adapter = Argon2PasswordHasher()
    current_hash = await adapter.hash(password)
    outdated_hash = PasswordHasher(time_cost=1, memory_cost=8192).hash(password)

    assert current_hash.startswith("$argon2id$")
    assert await adapter.verify(current_hash, password) == PasswordVerification(valid=True)
    assert (await adapter.verify(outdated_hash, password)).needs_rehash is True
    assert (await adapter.verify(current_hash, "wrong-password")).valid is False


def test_csrf_is_bound_to_both_cookie_and_session_hash() -> None:
    tokens = SecureTokenService().issue()
    current = CurrentAccountContext(
        session_id=uuid4(),
        csrf_token_hash=tokens.csrf_token_hash,
        expires_at=datetime.now(UTC) + timedelta(days=7),
        account=SafeAccountContext(
            user_id=uuid4(),
            email="owner@example.com",
            organization_id=uuid4(),
            organization_name="سازمان",
            role=OrganizationRole.OWNER,
        ),
    )
    validator = ValidateCsrf(token_service=SecureTokenService())

    validator.execute(
        header_token=tokens.csrf_token,
        cookie_token=tokens.csrf_token,
        current=current,
    )
    with pytest.raises(AccountError) as raised:
        validator.execute(
            header_token=tokens.csrf_token,
            cookie_token="different",
            current=current,
        )

    assert raised.value.code is AccountErrorCode.CSRF_VALIDATION_FAILED


@pytest.mark.anyio
async def test_role_guard_accepts_only_explicitly_allowed_roles() -> None:
    current = CurrentAccountContext(
        session_id=uuid4(),
        csrf_token_hash="hash",
        expires_at=datetime.now(UTC) + timedelta(days=7),
        account=SafeAccountContext(
            user_id=uuid4(),
            email="operator@example.com",
            organization_id=uuid4(),
            organization_name="سازمان",
            role=OrganizationRole.OPERATOR,
        ),
    )

    assert await require_roles(OrganizationRole.OPERATOR)(current=current) == current
    with pytest.raises(AccountError) as raised:
        await require_roles(OrganizationRole.OWNER)(current=current)

    assert raised.value.code is AccountErrorCode.AUTH_FORBIDDEN


@pytest.mark.anyio
async def test_registration_uses_a_fixed_non_sliding_expiration() -> None:
    started = datetime(2026, 8, 28, 8, 0, tzinfo=UTC)
    store = RecordingRegistrationStore()
    use_case = RegisterAccount(
        store=store,
        password_hasher=StubPasswordHasher(),
        token_service=StubTokenService(),
        session_ttl_seconds=3600,
        registration_enabled=True,
    )

    registered = await use_case.execute(
        email="owner@example.com",
        password="a-secure-test-password",
        organization_name="سازمان نمونه",
        now=started,
    )

    assert isinstance(registered, AuthenticatedSession)
    assert registered.expires_at == started + timedelta(hours=1)
    assert store.expires_at == registered.expires_at


class StubPasswordHasher:
    async def hash(self, password: str) -> str:
        return f"hash:{len(password)}"

    async def verify(self, password_hash: str, password: str) -> PasswordVerification:
        return PasswordVerification(valid=False)

    async def verify_dummy(self) -> None:
        return None


class StubTokenService:
    def issue(self) -> IssuedSessionTokens:
        return IssuedSessionTokens(
            session_token="session",
            csrf_token="csrf",
            session_token_hash="session-hash",
            csrf_token_hash="csrf-hash",
        )

    def hash_token(self, token: str) -> str:
        return f"hash:{token}"


class RecordingRegistrationStore:
    expires_at: datetime | None = None

    async def create_registered_account(self, **values: object) -> SafeAccountContext:
        expires_at = values["expires_at"]
        assert isinstance(expires_at, datetime)
        self.expires_at = expires_at
        return SafeAccountContext(
            user_id=uuid4(),
            email=str(values["email"]),
            organization_id=uuid4(),
            organization_name=str(values["organization_name"]),
            role=OrganizationRole.OWNER,
        )

    async def get_login_candidate(self, email: str) -> None:
        return None

    async def create_login_session(self, **values: object) -> bool:
        return False

    async def get_session(self, token_hash: str) -> None:
        return None

    async def revoke_session(self, session_id: object, revoked_at: datetime) -> bool:
        return False
