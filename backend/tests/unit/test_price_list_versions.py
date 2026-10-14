from datetime import UTC, datetime
from uuid import uuid4

import pytest

from app.modules.price_lists.application.change_reports import build_change_report
from app.modules.price_lists.domain.models import Availability, ChangeType, PriceListItem
from app.modules.price_lists.domain.version_errors import (
    PriceListVersionError,
    PriceListVersionErrorCode,
)
from app.modules.price_lists.domain.version_models import (
    PriceListVersion,
    VersionedPriceListItem,
    VersionLineage,
    validate_version_creation,
)


def test_version_lineage_requires_first_version_to_have_no_predecessor() -> None:
    assert VersionLineage(1, None).previous_version_id is None
    assert VersionLineage(2, uuid4()).version_number == 2

    with pytest.raises(ValueError):
        VersionLineage(1, uuid4())
    with pytest.raises(ValueError):
        VersionLineage(2, None)


def test_versioned_item_preserves_leading_zeroes_and_converts_for_comparison() -> None:
    item = _versioned_item(code="001-A", price=1_000, pack_size=10)

    canonical = item.to_price_list_item()

    assert canonical.product_code_raw == "001-A"
    assert canonical.product_code_normalized == "001-A"
    assert canonical.price_irr == 1_000
    assert canonical.pack_size == 10


def test_change_report_keeps_multi_label_changes_and_filters_after_summary() -> None:
    baseline = _version()
    old = _item(code="001", price=1_000, unit="عدد", pack_size=1)
    new = _item(code="001", price=1_500, unit="بسته", pack_size=10)

    report = build_change_report(
        subject_id=uuid4(),
        baseline=baseline,
        old_items=(old,),
        new_items=(new,),
        change_type=ChangeType.PACK_SIZE_CHANGED,
        limit=50,
        offset=0,
    )

    assert report.summary is not None
    assert report.summary.price_changed == 1
    assert report.summary.high_risk == 1
    assert report.total == 1
    assert set(report.items[0].change_types) >= {
        ChangeType.PRICE_CHANGED,
        ChangeType.UNIT_CHANGED,
        ChangeType.PACK_SIZE_CHANGED,
    }


def test_version_creation_rejects_empty_and_duplicate_canonical_items() -> None:
    with pytest.raises(PriceListVersionError) as empty:
        validate_version_creation(())
    assert empty.value.code is PriceListVersionErrorCode.IMPORT_NOT_READY_FOR_VERSION

    duplicate = _item(code="001", price=1_000, unit="عدد", pack_size=1)
    with pytest.raises(PriceListVersionError) as conflict:
        validate_version_creation((duplicate, duplicate))
    assert conflict.value.code is PriceListVersionErrorCode.VERSION_ITEM_CONFLICT


def _version() -> PriceListVersion:
    return PriceListVersion(
        id=uuid4(),
        organization_id=uuid4(),
        supplier_id=uuid4(),
        source_import_id=uuid4(),
        created_by_user_id=uuid4(),
        created_by_email="owner@example.com",
        lineage=VersionLineage(1, None),
        row_count=1,
        created_at=datetime.now(UTC),
    )


def _item(*, code: str, price: int, unit: str, pack_size: int) -> PriceListItem:
    return PriceListItem(
        source_row_number=2,
        product_code_raw=code,
        product_code_normalized=code,
        product_name_raw="کابل شبکه",
        product_name_normalized="کابل شبکه",
        brand=None,
        unit=unit,
        pack_size=pack_size,
        price_irr=price,
        availability=Availability.IN_STOCK,
        availability_raw="موجود",
        notes=None,
        raw_row={},
    )


def _versioned_item(*, code: str, price: int, pack_size: int) -> VersionedPriceListItem:
    now = datetime.now(UTC)
    return VersionedPriceListItem(
        id=uuid4(),
        organization_id=uuid4(),
        supplier_id=uuid4(),
        version_id=uuid4(),
        source_row_number=2,
        product_code_raw=code,
        product_code_normalized=code,
        product_name_raw="کابل شبکه",
        product_name_normalized="کابل شبکه",
        brand=None,
        unit="عدد",
        pack_size=pack_size,
        price_irr=price,
        availability=Availability.IN_STOCK,
        availability_raw="موجود",
        notes=None,
        created_at=now,
    )
