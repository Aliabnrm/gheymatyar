import pytest

from app.modules.price_lists.domain.errors import PriceListError
from app.modules.price_lists.domain.models import Availability
from app.modules.price_lists.domain.normalization import (
    map_availability,
    normalize_persian_text,
    normalize_product_code,
    parse_pack_size,
    parse_price_irr,
)


def test_normalizes_persian_characters_digits_and_whitespace() -> None:
    assert normalize_persian_text("  كالا\u200cی ۱۲۳  ") == "کالای 123"


def test_normalizes_product_code_without_losing_leading_zeroes() -> None:
    assert normalize_product_code(" 00-ab 12 ") == "00-AB12"


def test_parses_integer_rial_with_persian_separators() -> None:
    assert parse_price_irr("۱۲٬۵۰۰٬۰۰۰ ریال") == 12_500_000


def test_rejects_toman_explicitly() -> None:
    with pytest.raises(PriceListError) as raised:
        parse_price_irr("۱٬۲۵۰٬۰۰۰ تومان")

    assert raised.value.code == "TOMAN_NOT_SUPPORTED"


@pytest.mark.parametrize("value", [None, "", 0, -1, 12.5, "تماس بگیرید"])
def test_rejects_invalid_price(value: object) -> None:
    with pytest.raises(PriceListError) as raised:
        parse_price_irr(value)

    assert raised.value.code == "INVALID_PRICE"


def test_empty_pack_size_is_allowed() -> None:
    assert parse_pack_size(None) is None


def test_maps_out_of_stock_before_in_stock_substring() -> None:
    assert map_availability("ناموجود") is Availability.OUT_OF_STOCK
    assert map_availability("موجود") is Availability.IN_STOCK
