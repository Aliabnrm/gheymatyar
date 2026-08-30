import re

from email_validator import EmailNotValidError, validate_email

from ..domain.errors import AccountError, AccountErrorCode

_WHITESPACE_PATTERN = re.compile(r"\s+")
MIN_PASSWORD_LENGTH = 12
MAX_PASSWORD_LENGTH = 128
MIN_ORGANIZATION_NAME_LENGTH = 2
MAX_ORGANIZATION_NAME_LENGTH = 120


def normalize_email(value: str) -> str:
    candidate = value.strip().casefold()
    try:
        validated = validate_email(candidate, check_deliverability=False)
    except EmailNotValidError as exc:
        raise AccountError(
            AccountErrorCode.INVALID_EMAIL,
            "نشانی ایمیل معتبر نیست.",
        ) from exc
    return validated.normalized.casefold()


def validate_password(value: str) -> str:
    if not MIN_PASSWORD_LENGTH <= len(value) <= MAX_PASSWORD_LENGTH:
        raise AccountError(
            AccountErrorCode.INVALID_PASSWORD,
            "رمز عبور باید بین ۱۲ تا ۱۲۸ نویسه باشد.",
        )
    return value


def validate_organization_name(value: str) -> str:
    normalized = _WHITESPACE_PATTERN.sub(" ", value.strip())
    if not MIN_ORGANIZATION_NAME_LENGTH <= len(normalized) <= MAX_ORGANIZATION_NAME_LENGTH:
        raise AccountError(
            AccountErrorCode.INVALID_ORGANIZATION_NAME,
            "نام سازمان باید بین ۲ تا ۱۲۰ نویسه باشد.",
        )
    return normalized
