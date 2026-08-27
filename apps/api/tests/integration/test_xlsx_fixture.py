import json
from pathlib import Path

from app.modules.price_lists.domain.comparison import compare_price_lists
from app.modules.price_lists.domain.models import ChangeType
from app.modules.price_lists.infrastructure.xlsx_extractor import XlsxPriceListExtractor


def test_extracts_mock_workbook(old_xlsx: Path) -> None:
    items = XlsxPriceListExtractor().extract(
        old_xlsx.read_bytes(),
        filename=old_xlsx.name,
    )

    assert len(items) == 24
    assert items[0].product_code_normalized == "NET-TP-SG1005D"
    assert items[0].price_irr == 12_500_000
    assert items[0].source_row_number == 6


def test_fixture_comparison_matches_ground_truth(
    old_xlsx: Path,
    new_xlsx: Path,
    expected_changes: Path,
) -> None:
    extractor = XlsxPriceListExtractor()
    old_items = extractor.extract(old_xlsx.read_bytes(), filename=old_xlsx.name)
    new_items = extractor.extract(new_xlsx.read_bytes(), filename=new_xlsx.name)
    result = compare_price_lists(old_items, new_items)
    expected = json.loads(expected_changes.read_text(encoding="utf-8"))

    for field, expected_value in expected["expected_counts"].items():
        assert getattr(result.summary, field) == expected_value

    added = {row.product_code for row in result.items if ChangeType.ADDED in row.change_types}
    removed = {row.product_code for row in result.items if ChangeType.REMOVED in row.change_types}
    high_risk = {
        row.product_code for row in result.items if ChangeType.PACK_SIZE_CHANGED in row.change_types
    }

    assert added == set(expected["added_codes"])
    assert removed == set(expected["removed_codes"])
    assert high_risk == {"ACC-RJ45-CAT6-100"}
