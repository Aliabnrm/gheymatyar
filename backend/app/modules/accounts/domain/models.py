from dataclasses import dataclass
from datetime import datetime
from uuid import UUID

from .enums import OrganizationRole


@dataclass(frozen=True, slots=True)
class IssuedSessionTokens:
    session_token: str
    csrf_token: str
    session_token_hash: str
    csrf_token_hash: str


@dataclass(frozen=True, slots=True)
class SafeAccountContext:
    user_id: UUID
    email: str
    organization_id: UUID
    organization_name: str
    role: OrganizationRole


@dataclass(frozen=True, slots=True)
class CurrentAccountContext:
    session_id: UUID
    csrf_token_hash: str
    expires_at: datetime
    account: SafeAccountContext
