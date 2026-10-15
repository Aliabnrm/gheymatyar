from datetime import UTC, datetime
from uuid import UUID, uuid4

import pytest

from app.modules.price_lists.application.approval_dto import CurrentPriceImpactSnapshot
from app.modules.price_lists.application.current_price_impact import GetCurrentPriceImpact
from app.modules.price_lists.domain.approval_errors import (
    PriceListApprovalError,
    PriceListApprovalErrorCode,
)
from app.modules.price_lists.domain.approval_models import (
    CurrentPriceImpactBaselineStatus,
    ReviewStatus,
)
from app.modules.price_lists.domain.models import Availability, ChangeType
from app.modules.price_lists.domain.version_models import (
    PriceListVersion,
    VersionedPriceListItem,
    VersionLineage,
)


class StubCurrentPriceImpactReader:
    def __init__(self, snapshot: CurrentPriceImpactSnapshot | None) -> None:
        self.snapshot = snapshot

    async def read_snapshot(
        self, *, organization_id: UUID, supplier_id: UUID, version_id: UUID
    ) -> CurrentPriceImpactSnapshot | None:
        return self.snapshot


@pytest.mark.anyio
async def test_current_impact_uses_approved_current_and_keeps_summary_before_filter() -> None:
    organization_id = uuid4()
    supplier_id = uuid4()
    baseline = _version(
        organization_id=organization_id,
        supplier_id=supplier_id,
        number=1,
        status=ReviewStatus.APPROVED,
    )
    target = _version(
        organization_id=organization_id,
        supplier_id=supplier_id,
        number=3,
        previous_id=uuid4(),
    )
    snapshot = CurrentPriceImpactSnapshot(
        target_version=target,
        target_items=(
            _item(target, code="0001", price=120_000, pack_size=50),
            _item(target, code="CAM-001", price=300_000),
        ),
        current_version_id=baseline.id,
        baseline_version=baseline,
        baseline_items=(
            _item(baseline, code="0001", price=100_000, pack_size=100),
            _item(baseline, code="SW-001", price=200_000),
        ),
        is_latest=True,
        supplier_is_active=True,
    )

    report = await GetCurrentPriceImpact(StubCurrentPriceImpactReader(snapshot)).execute(
        organization_id=organization_id,
        supplier_id=supplier_id,
        version_id=target.id,
        baseline_version_id=baseline.id,
        expect_no_current=False,
        change_type=ChangeType.PACK_SIZE_CHANGED,
        limit=50,
        offset=0,
    )

    assert report.baseline_status is CurrentPriceImpactBaselineStatus.CURRENT_BASELINE
    assert report.baseline_version == baseline
    assert report.summary is not None
    assert report.summary.added == 1
    assert report.summary.removed == 1
    assert report.summary.price_changed == 1
    assert report.total == 1
    assert report.items[0].product_code == "0001"
    assert set(report.items[0].change_types) >= {
        ChangeType.PRICE_CHANGED,
        ChangeType.PACK_SIZE_CHANGED,
    }


@pytest.mark.anyio
async def test_current_impact_reports_no_current_without_fabricated_added_rows() -> None:
    organization_id = uuid4()
    supplier_id = uuid4()
    target = _version(organization_id=organization_id, supplier_id=supplier_id, number=1)
    snapshot = CurrentPriceImpactSnapshot(
        target_version=target,
        target_items=(_item(target, code="0001", price=100_000),),
        current_version_id=None,
        baseline_version=None,
        baseline_items=None,
        is_latest=True,
        supplier_is_active=True,
    )

    report = await GetCurrentPriceImpact(StubCurrentPriceImpactReader(snapshot)).execute(
        organization_id=organization_id,
        supplier_id=supplier_id,
        version_id=target.id,
        baseline_version_id=None,
        expect_no_current=True,
        change_type=None,
        limit=50,
        offset=0,
    )

    assert report.baseline_status is CurrentPriceImpactBaselineStatus.NO_CURRENT
    assert report.baseline_version is None
    assert report.summary is None
    assert report.items == ()
    assert report.total == 0


@pytest.mark.anyio
@pytest.mark.parametrize(
    ("baseline_pin", "expect_no_current", "expected_code"),
    [
        (uuid4(), False, PriceListApprovalErrorCode.CURRENT_PRICE_VERSION_CHANGED),
        (None, True, PriceListApprovalErrorCode.CURRENT_PRICE_VERSION_CHANGED),
    ],
)
async def test_current_impact_rejects_stale_baseline_pins(
    baseline_pin: UUID | None,
    expect_no_current: bool,
    expected_code: PriceListApprovalErrorCode,
) -> None:
    organization_id = uuid4()
    supplier_id = uuid4()
    baseline = _version(
        organization_id=organization_id,
        supplier_id=supplier_id,
        number=1,
        status=ReviewStatus.APPROVED,
    )
    target = _version(
        organization_id=organization_id,
        supplier_id=supplier_id,
        number=2,
        previous_id=baseline.id,
    )
    snapshot = CurrentPriceImpactSnapshot(
        target_version=target,
        target_items=(_item(target, code="0001", price=120_000),),
        current_version_id=baseline.id,
        baseline_version=baseline,
        baseline_items=(_item(baseline, code="0001", price=100_000),),
        is_latest=True,
        supplier_is_active=True,
    )

    with pytest.raises(PriceListApprovalError) as error:
        await GetCurrentPriceImpact(StubCurrentPriceImpactReader(snapshot)).execute(
            organization_id=organization_id,
            supplier_id=supplier_id,
            version_id=target.id,
            baseline_version_id=baseline_pin,
            expect_no_current=expect_no_current,
            change_type=None,
            limit=50,
            offset=0,
        )
    assert error.value.code is expected_code


@pytest.mark.anyio
async def test_current_impact_rejects_terminal_targets_and_invalid_pin_combination() -> None:
    organization_id = uuid4()
    supplier_id = uuid4()
    target = _version(
        organization_id=organization_id,
        supplier_id=supplier_id,
        number=1,
        status=ReviewStatus.REJECTED,
    )
    reader = StubCurrentPriceImpactReader(
        CurrentPriceImpactSnapshot(
            target_version=target,
            target_items=(_item(target, code="0001", price=100_000),),
            current_version_id=None,
            baseline_version=None,
            baseline_items=None,
            is_latest=True,
            supplier_is_active=True,
        )
    )
    use_case = GetCurrentPriceImpact(reader)

    with pytest.raises(PriceListApprovalError) as terminal:
        await use_case.execute(
            organization_id=organization_id,
            supplier_id=supplier_id,
            version_id=target.id,
            baseline_version_id=None,
            expect_no_current=False,
            change_type=None,
            limit=50,
            offset=0,
        )
    assert terminal.value.code is PriceListApprovalErrorCode.PRICE_LIST_VERSION_NOT_READY_FOR_REVIEW

    with pytest.raises(PriceListApprovalError) as invalid_pin:
        await use_case.execute(
            organization_id=organization_id,
            supplier_id=supplier_id,
            version_id=target.id,
            baseline_version_id=uuid4(),
            expect_no_current=True,
            change_type=None,
            limit=50,
            offset=0,
        )
    assert invalid_pin.value.code is PriceListApprovalErrorCode.CURRENT_PRICE_IMPACT_PIN_INVALID


@pytest.mark.anyio
async def test_current_impact_rejects_a_pointer_to_a_non_approved_baseline() -> None:
    organization_id = uuid4()
    supplier_id = uuid4()
    baseline = _version(
        organization_id=organization_id,
        supplier_id=supplier_id,
        number=1,
    )
    target = _version(
        organization_id=organization_id,
        supplier_id=supplier_id,
        number=2,
        previous_id=baseline.id,
    )
    snapshot = CurrentPriceImpactSnapshot(
        target_version=target,
        target_items=(_item(target, code="0001", price=120_000),),
        current_version_id=baseline.id,
        baseline_version=baseline,
        baseline_items=(_item(baseline, code="0001", price=100_000),),
        is_latest=True,
        supplier_is_active=True,
    )

    with pytest.raises(PriceListApprovalError) as error:
        await GetCurrentPriceImpact(StubCurrentPriceImpactReader(snapshot)).execute(
            organization_id=organization_id,
            supplier_id=supplier_id,
            version_id=target.id,
            baseline_version_id=baseline.id,
            expect_no_current=False,
            change_type=None,
            limit=50,
            offset=0,
        )
    assert error.value.code is PriceListApprovalErrorCode.CURRENT_PRICE_VERSION_INVALID


def _version(
    *,
    organization_id: UUID,
    supplier_id: UUID,
    number: int,
    previous_id: UUID | None = None,
    status: ReviewStatus = ReviewStatus.READY_FOR_REVIEW,
) -> PriceListVersion:
    decided = status is not ReviewStatus.READY_FOR_REVIEW
    return PriceListVersion(
        id=uuid4(),
        organization_id=organization_id,
        supplier_id=supplier_id,
        source_import_id=uuid4(),
        created_by_user_id=uuid4(),
        created_by_email="owner@example.com",
        lineage=VersionLineage(number, previous_id),
        row_count=2,
        created_at=datetime.now(UTC),
        review_status=status,
        decided_by_user_id=uuid4() if decided else None,
        decided_by_email="owner@example.com" if decided else None,
        decided_at=datetime.now(UTC) if decided else None,
        decision_note="رد شد" if status is ReviewStatus.REJECTED else None,
        is_current=status is ReviewStatus.APPROVED,
    )


def _item(
    version: PriceListVersion,
    *,
    code: str,
    price: int,
    pack_size: int = 1,
) -> VersionedPriceListItem:
    return VersionedPriceListItem(
        id=uuid4(),
        organization_id=version.organization_id,
        supplier_id=version.supplier_id,
        version_id=version.id,
        source_row_number=2,
        product_code_raw=code,
        product_code_normalized=code,
        product_name_raw=f"کالای {code}",
        product_name_normalized=f"کالای {code}",
        brand="آزمایشی",
        unit="بسته" if code == "0001" else "عدد",
        pack_size=pack_size,
        price_irr=price,
        availability=Availability.IN_STOCK,
        availability_raw="موجود",
        notes=None,
        created_at=datetime.now(UTC),
    )
