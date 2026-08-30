from dataclasses import dataclass
from datetime import datetime
from uuid import UUID

from ..domain.models import IssuedSessionTokens, SafeAccountContext


@dataclass(frozen=True, slots=True)
class AuthenticatedSession:
    session_id: UUID
    account: SafeAccountContext
    tokens: IssuedSessionTokens
    expires_at: datetime
