from pathlib import Path

from app.modules.price_lists.domain.comparison import compare_price_lists
from app.modules.price_lists.domain.models import ChangeType, PriceListItem
from app.modules.price_lists.infrastructure.xlsx_extractor import XlsxPriceListExtractor


def test_current_price_impact_demo_workbooks_match_documented_v1_v2_v3_scenario(
    repository_root: Path,
) -> None:
    fixtures = repository_root / "fixtures/demo/current-price-impact"
    v1 = _extract(fixtures / "current-price-impact-v1.xlsx")
    v2 = _extract(fixtures / "current-price-impact-v2.xlsx")
    v3 = _extract(fixtures / "current-price-impact-v3.xlsx")

    assert [item.product_code_normalized for item in v1] == ["0001", "SW-001"]
    assert [item.product_code_normalized for item in v3] == ["0001", "CAM-001"]

    current_impact = compare_price_lists(v1, v3)
    assert current_impact.summary.added == 1
    assert current_impact.summary.removed == 1
    assert current_impact.summary.price_changed == 1
    assert current_impact.summary.metadata_only_changed == 0
    assert current_impact.summary.unchanged == 0
    shared_current = next(item for item in current_impact.items if item.product_code == "0001")
    assert shared_current.price_change_percent is not None
    assert str(shared_current.price_change_percent) == "20.00"
    assert set(shared_current.change_types) >= {
        ChangeType.PRICE_CHANGED,
        ChangeType.PACK_SIZE_CHANGED,
    }

    historical = compare_price_lists(v2, v3)
    assert historical.summary.added == 1
    assert historical.summary.removed == 1
    assert historical.summary.price_changed == 0
    assert historical.summary.metadata_only_changed == 1
    assert historical.summary.unchanged == 0
    shared_historical = next(item for item in historical.items if item.product_code == "0001")
    assert shared_historical.change_types == (ChangeType.PACK_SIZE_CHANGED,)


def _extract(path: Path) -> list[PriceListItem]:
    return XlsxPriceListExtractor().extract(path.read_bytes(), filename=path.name)
