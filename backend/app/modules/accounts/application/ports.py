from dataclasses import dataclass
from datetime import datetime
from typing import Protocol
from uuid import UUID

from ..domain.enums import OrganizationRole
from ..domain.models import IssuedSessionTokens, SafeAccountContext


@dataclass(frozen=True, slots=True)
class MembershipChoice:
    organization_id: UUID
    organization_name: str
    role: OrganizationRole


@dataclass(frozen=True, slots=True)
class LoginCandidate:
    user_id: UUID
    email: str
    password_hash: str
    is_active: bool
    memberships: tuple[MembershipChoice, ...]


@dataclass(frozen=True, slots=True)
class SessionLookup:
    session_id: UUID
    csrf_token_hash: str
    expires_at: datetime
    revoked_at: datetime | None
    is_active: bool
    account: SafeAccountContext | None


@dataclass(frozen=True, slots=True)
class PasswordVerification:
    valid: bool
    needs_rehash: bool = False


class PasswordHasher(Protocol):
    async def hash(self, password: str) -> str: ...

    async def verify(self, password_hash: str, password: str) -> PasswordVerification: ...

    async def verify_dummy(self) -> None: ...


class SessionTokenService(Protocol):
    def issue(self) -> IssuedSessionTokens: ...

    def hash_token(self, token: str) -> str: ...


class AccountStore(Protocol):
    async def create_registered_account(
        self,
        *,
        user_id: UUID,
        email: str,
        password_hash: str,
        organization_id: UUID,
        organization_name: str,
        session_id: UUID,
        session_token_hash: str,
        csrf_token_hash: str,
        expires_at: datetime,
    ) -> SafeAccountContext: ...

    async def get_login_candidate(self, email: str) -> LoginCandidate | None: ...

    async def create_login_session(
        self,
        *,
        user_id: UUID,
        organization_id: UUID,
        session_id: UUID,
        session_token_hash: str,
        csrf_token_hash: str,
        expires_at: datetime,
        replacement_password_hash: str | None,
    ) -> bool: ...

    async def get_session(self, token_hash: str) -> SessionLookup | None: ...

    async def revoke_session(self, session_id: UUID, revoked_at: datetime) -> bool: ...
