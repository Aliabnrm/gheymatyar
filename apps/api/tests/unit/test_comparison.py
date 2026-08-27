from app.modules.price_lists.domain.comparison import compare_price_lists
from app.modules.price_lists.domain.models import (
    Availability,
    ChangeType,
    PriceListItem,
)


def item(
    code: str,
    *,
    price: int = 100,
    pack_size: int | None = 1,
    name: str = "کالا",
) -> PriceListItem:
    return PriceListItem(
        source_row_number=1,
        product_code_raw=code,
        product_code_normalized=code,
        product_name_raw=name,
        product_name_normalized=name,
        brand=None,
        unit="عدد",
        pack_size=pack_size,
        price_irr=price,
        availability=Availability.IN_STOCK,
        availability_raw="موجود",
        notes=None,
        raw_row={},
    )


def test_reports_price_and_pack_changes_independently() -> None:
    result = compare_price_lists(
        [item("A", price=100, pack_size=100)],
        [item("A", price=60, pack_size=50)],
    )

    row = result.items[0]
    assert row.change_types == (
        ChangeType.PRICE_CHANGED,
        ChangeType.PACK_SIZE_CHANGED,
    )
    assert row.price_delta_irr == -40
    assert str(row.price_change_percent) == "-40.00"
    assert result.summary.price_changed == 1
    assert result.summary.high_risk == 1


def test_summary_categories_are_mutually_exclusive() -> None:
    result = compare_price_lists(
        [item("SAME"), item("META"), item("REMOVED")],
        [item("SAME"), item("META", name="نام جدید"), item("ADDED")],
    )

    assert result.summary.added == 1
    assert result.summary.removed == 1
    assert result.summary.metadata_only_changed == 1
    assert result.summary.unchanged == 1
    assert result.summary.price_changed == 0
