from dataclasses import replace

import pytest

from app.modules.price_lists.domain.errors import PriceListError, PriceListErrorCode
from app.modules.price_lists.domain.models import Availability, PriceListItem


def make_item(**overrides: object) -> PriceListItem:
    base = PriceListItem(
        source_row_number=1,
        product_code_raw="A",
        product_code_normalized="A",
        product_name_raw="کالا",
        product_name_normalized="کالا",
        brand=None,
        unit="عدد",
        pack_size=1,
        price_irr=100,
        availability=Availability.IN_STOCK,
        availability_raw="موجود",
        notes=None,
        raw_row={},
    )
    return replace(base, **overrides)


@pytest.mark.parametrize(
    ("overrides", "code"),
    [
        ({"source_row_number": 0}, PriceListErrorCode.INVALID_SOURCE_ROW),
        ({"product_code_normalized": ""}, PriceListErrorCode.EMPTY_PRODUCT_CODE),
        ({"product_name_normalized": ""}, PriceListErrorCode.EMPTY_PRODUCT_NAME),
        ({"price_irr": 0}, PriceListErrorCode.INVALID_PRICE),
        ({"pack_size": 0}, PriceListErrorCode.INVALID_PACK_SIZE),
    ],
)
def test_price_list_item_protects_domain_invariants(
    overrides: dict[str, object],
    code: PriceListErrorCode,
) -> None:
    with pytest.raises(PriceListError) as raised:
        make_item(**overrides)

    assert raised.value.code is code
