from anyio.to_thread import run_sync
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError
from argon2.low_level import Type

from ..application.ports import PasswordVerification


class Argon2PasswordHasher:
    def __init__(self) -> None:
        self._hasher = PasswordHasher(type=Type.ID)
        self._dummy_hash = self._hasher.hash("gheymatyar-dummy-password")

    async def hash(self, password: str) -> str:
        return await run_sync(self._hasher.hash, password)

    async def verify(self, password_hash: str, password: str) -> PasswordVerification:
        return await run_sync(self._verify_sync, password_hash, password)

    async def verify_dummy(self) -> None:
        await self.verify(self._dummy_hash, "gheymatyar-invalid-login")

    def _verify_sync(self, password_hash: str, password: str) -> PasswordVerification:
        try:
            valid = self._hasher.verify(password_hash, password)
        except (InvalidHashError, VerificationError):
            return PasswordVerification(valid=False)
        return PasswordVerification(
            valid=valid,
            needs_rehash=valid and self._hasher.check_needs_rehash(password_hash),
        )
