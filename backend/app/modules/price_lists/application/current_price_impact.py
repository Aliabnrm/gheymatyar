from uuid import UUID

from ..domain.approval_errors import PriceListApprovalError, PriceListApprovalErrorCode
from ..domain.approval_models import CurrentPriceImpactBaselineStatus, ReviewStatus
from ..domain.models import ChangeType
from .approval_dto import CurrentPriceImpactPage
from .approval_ports import CurrentPriceImpactReader
from .change_reports import build_change_report


class GetCurrentPriceImpact:
    def __init__(self, reader: CurrentPriceImpactReader) -> None:
        self._reader = reader

    async def execute(
        self,
        *,
        organization_id: UUID,
        supplier_id: UUID,
        version_id: UUID,
        baseline_version_id: UUID | None,
        expect_no_current: bool,
        change_type: ChangeType | None,
        limit: int,
        offset: int,
    ) -> CurrentPriceImpactPage:
        if baseline_version_id is not None and expect_no_current:
            raise PriceListApprovalError(
                PriceListApprovalErrorCode.CURRENT_PRICE_IMPACT_PIN_INVALID,
                "شناسه مبنا و انتظار نبود قیمت جاری را نمی‌توان هم‌زمان ارسال کرد.",
            )
        snapshot = await self._reader.read_snapshot(
            organization_id=organization_id,
            supplier_id=supplier_id,
            version_id=version_id,
        )
        if snapshot is None:
            raise PriceListApprovalError(
                PriceListApprovalErrorCode.PRICE_LIST_VERSION_NOT_FOUND,
                "نسخه قیمت موردنظر پیدا نشد.",
            )
        if snapshot.target_version.review_status is not ReviewStatus.READY_FOR_REVIEW:
            raise PriceListApprovalError(
                PriceListApprovalErrorCode.PRICE_LIST_VERSION_NOT_READY_FOR_REVIEW,
                "گزارش اثر بر قیمت جاری فقط برای نسخه آماده بررسی در دسترس است.",
            )
        current_id = snapshot.current_version_id
        if (baseline_version_id is not None and baseline_version_id != current_id) or (
            expect_no_current and current_id is not None
        ):
            raise PriceListApprovalError(
                PriceListApprovalErrorCode.CURRENT_PRICE_VERSION_CHANGED,
                "قیمت جاری تغییر کرده است؛ گزارش تازه را دوباره بررسی کنید.",
            )
        if current_id is None:
            return CurrentPriceImpactPage(
                target_version=snapshot.target_version,
                baseline_status=CurrentPriceImpactBaselineStatus.NO_CURRENT,
                baseline_version=None,
                is_latest=snapshot.is_latest,
                supplier_is_active=snapshot.supplier_is_active,
                summary=None,
                items=(),
                total=0,
                limit=limit,
                offset=offset,
            )
        baseline = snapshot.baseline_version
        baseline_items = snapshot.baseline_items
        if (
            baseline is None
            or baseline.id != current_id
            or baseline.review_status is not ReviewStatus.APPROVED
            or baseline_items is None
        ):
            raise PriceListApprovalError(
                PriceListApprovalErrorCode.CURRENT_PRICE_VERSION_INVALID,
                "قیمت جاری با نسخه تأییدشده معتبر سازگار نیست؛ تأیید نسخه متوقف شد.",
            )
        report = build_change_report(
            subject_id=version_id,
            baseline=baseline,
            old_items=tuple(item.to_price_list_item() for item in baseline_items),
            new_items=tuple(item.to_price_list_item() for item in snapshot.target_items),
            change_type=change_type,
            limit=limit,
            offset=offset,
        )
        return CurrentPriceImpactPage(
            target_version=snapshot.target_version,
            baseline_status=CurrentPriceImpactBaselineStatus.CURRENT_BASELINE,
            baseline_version=baseline,
            is_latest=snapshot.is_latest,
            supplier_is_active=snapshot.supplier_is_active,
            summary=report.summary,
            items=report.items,
            total=report.total,
            limit=report.limit,
            offset=report.offset,
        )
