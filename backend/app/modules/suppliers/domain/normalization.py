import re
import unicodedata
from dataclasses import dataclass

from .errors import SupplierError, SupplierErrorCode

_WHITESPACE = re.compile(r"\s+")
_PERSIAN_CHARACTER_TRANSLATION = str.maketrans({"ي": "ی", "ك": "ک"})
MIN_SUPPLIER_NAME_LENGTH = 2
MAX_SUPPLIER_NAME_LENGTH = 120


@dataclass(frozen=True, slots=True)
class NormalizedSupplierName:
    display_name: str
    normalized_name: str


def normalize_supplier_name(value: str) -> NormalizedSupplierName:
    display_name = _WHITESPACE.sub(
        " ",
        unicodedata.normalize("NFKC", value).translate(_PERSIAN_CHARACTER_TRANSLATION),
    ).strip()
    if not MIN_SUPPLIER_NAME_LENGTH <= len(display_name) <= MAX_SUPPLIER_NAME_LENGTH:
        raise SupplierError(
            SupplierErrorCode.INVALID_SUPPLIER_NAME,
            "نام تأمین‌کننده باید بین ۲ تا ۱۲۰ نویسه باشد.",
        )
    return NormalizedSupplierName(
        display_name=display_name,
        normalized_name=display_name.casefold(),
    )
