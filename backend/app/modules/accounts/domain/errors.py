from dataclasses import dataclass, field
from enum import StrEnum


class AccountErrorCode(StrEnum):
    AUTH_REQUIRED = "AUTH_REQUIRED"
    AUTH_INVALID_CREDENTIALS = "AUTH_INVALID_CREDENTIALS"
    AUTH_SESSION_EXPIRED = "AUTH_SESSION_EXPIRED"
    AUTH_CONTEXT_UNAVAILABLE = "AUTH_CONTEXT_UNAVAILABLE"
    AUTH_REGISTRATION_DISABLED = "AUTH_REGISTRATION_DISABLED"
    EMAIL_ALREADY_REGISTERED = "EMAIL_ALREADY_REGISTERED"
    CSRF_VALIDATION_FAILED = "CSRF_VALIDATION_FAILED"
    AUTH_RATE_LIMITED = "AUTH_RATE_LIMITED"
    INVALID_EMAIL = "INVALID_EMAIL"
    INVALID_PASSWORD = "INVALID_PASSWORD"
    INVALID_ORGANIZATION_NAME = "INVALID_ORGANIZATION_NAME"
    AUTH_FORBIDDEN = "AUTH_FORBIDDEN"


@dataclass(slots=True)
class AccountError(Exception):
    code: AccountErrorCode
    message: str
    details: dict[str, object] = field(default_factory=dict)

    def __post_init__(self) -> None:
        Exception.__init__(self, self.message)

    def __str__(self) -> str:
        return self.message
