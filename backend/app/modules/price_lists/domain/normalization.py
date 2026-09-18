import math
import re
from typing import Literal, overload

from .errors import PriceListError, PriceListErrorCode
from .models import Availability

_DIGIT_TRANSLATION = str.maketrans(
    "۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩",
    "01234567890123456789",
)
_CHAR_TRANSLATION = str.maketrans({"ي": "ی", "ك": "ک", "\u200c": "", "\u200f": ""})
_WHITESPACE = re.compile(r"\s+")
_INTEGER_TEXT = re.compile(r"^\+?\d+$")
MAX_PRODUCT_CODE_LENGTH = 255


def normalize_persian_text(value: object) -> str:
    if value is None:
        return ""
    text = str(value).translate(_DIGIT_TRANSLATION).translate(_CHAR_TRANSLATION)
    return _WHITESPACE.sub(" ", text).strip()


def normalize_product_code(value: object) -> str:
    raw = _identifier_to_text(value)
    normalized = normalize_persian_text(raw).upper()
    normalized = _WHITESPACE.sub("", normalized)
    if not normalized:
        raise PriceListError(PriceListErrorCode.EMPTY_PRODUCT_CODE, "کد کالا خالی است.")
    if len(normalized) > MAX_PRODUCT_CODE_LENGTH:
        raise PriceListError(
            PriceListErrorCode.INVALID_PRODUCT_CODE,
            "کد کالا نباید بیشتر از ۲۵۵ نویسه باشد.",
        )
    return normalized


def normalize_product_name(value: object) -> str:
    normalized = normalize_persian_text(value)
    if not normalized:
        raise PriceListError(PriceListErrorCode.EMPTY_PRODUCT_NAME, "شرح کالا خالی است.")
    return normalized.casefold()


@overload
def parse_positive_integer(
    value: object,
    *,
    code: PriceListErrorCode,
    message: str,
    allow_none: Literal[False] = False,
) -> int: ...


@overload
def parse_positive_integer(
    value: object,
    *,
    code: PriceListErrorCode,
    message: str,
    allow_none: Literal[True],
) -> int | None: ...


def parse_positive_integer(
    value: object,
    *,
    code: PriceListErrorCode,
    message: str,
    allow_none: bool = False,
) -> int | None:
    if value is None or (isinstance(value, str) and not value.strip()):
        if allow_none:
            return None
        raise PriceListError(code, message)

    if isinstance(value, bool):
        raise PriceListError(code, message)

    if isinstance(value, int):
        parsed = value
    elif isinstance(value, float):
        raise PriceListError(code, message)
    else:
        text = normalize_persian_text(value)
        if "تومان" in text:
            raise PriceListError(
                PriceListErrorCode.TOMAN_NOT_SUPPORTED,
                "واحد تومان در این نسخه پشتیبانی نمی‌شود؛ مبلغ باید ریال باشد.",
            )
        text = text.removesuffix("ریال").strip()
        if not _INTEGER_TEXT.fullmatch(text):
            if not re.fullmatch(r"\+?\d{1,3}([,٬، ])\d{3}(?:\1\d{3})*", text):
                raise PriceListError(code, message)
            text = re.sub(r"[,٬، ]", "", text)
        if not _INTEGER_TEXT.fullmatch(text):
            raise PriceListError(code, message)
        parsed = int(text)

    maximum = 2**31 - 1 if code is PriceListErrorCode.INVALID_PACK_SIZE else 2**63 - 1
    if parsed <= 0 or parsed > maximum:
        raise PriceListError(code, message)
    return parsed


def parse_price_irr(value: object) -> int:
    return parse_positive_integer(
        value,
        code=PriceListErrorCode.INVALID_PRICE,
        message="قیمت باید یک عدد صحیح مثبت به ریال باشد.",
    )


def parse_pack_size(value: object) -> int | None:
    return parse_positive_integer(
        value,
        code=PriceListErrorCode.INVALID_PACK_SIZE,
        message="تعداد داخل بسته باید یک عدد صحیح مثبت باشد.",
        allow_none=True,
    )


def map_availability(value: object) -> Availability:
    text = normalize_persian_text(value).casefold()
    if not text:
        return Availability.UNKNOWN
    if "ناموجود" in text or "اتمام" in text:
        return Availability.OUT_OF_STOCK
    if "محدود" in text or text == "کم":
        return Availability.LIMITED
    if "موجود" in text:
        return Availability.IN_STOCK
    return Availability.UNKNOWN


def _identifier_to_text(value: object) -> str:
    if value is None or isinstance(value, bool):
        return ""
    if isinstance(value, int):
        return str(value)
    if isinstance(value, float):
        if not math.isfinite(value) or not value.is_integer():
            raise PriceListError(
                PriceListErrorCode.INVALID_PRODUCT_CODE,
                "کد عددی کالا معتبر نیست.",
            )
        return str(int(value))
    return str(value)
