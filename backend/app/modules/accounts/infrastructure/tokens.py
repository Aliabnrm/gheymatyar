import hashlib
import secrets

from ..domain.models import IssuedSessionTokens


class SecureTokenService:
    def issue(self) -> IssuedSessionTokens:
        session_token = secrets.token_urlsafe(32)
        csrf_token = secrets.token_urlsafe(32)
        return IssuedSessionTokens(
            session_token=session_token,
            csrf_token=csrf_token,
            session_token_hash=self.hash_token(session_token),
            csrf_token_hash=self.hash_token(csrf_token),
        )

    def hash_token(self, token: str) -> str:
        return hashlib.sha256(token.encode("utf-8")).hexdigest()
