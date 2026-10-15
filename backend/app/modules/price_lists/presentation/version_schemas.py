from datetime import datetime
from typing import Self
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from ..application.approval_dto import (
    ApprovalResult,
    AuditEventPage,
    CurrentPriceImpactPage,
    CurrentPriceListVersionView,
)
from ..application.version_dto import ChangeReportPage, PriceListVersionPage, VersionItemPage
from ..domain.approval_models import (
    AuditAction,
    CurrentPriceImpactBaselineStatus,
    ReviewStatus,
)
from ..domain.version_models import PriceListVersion, VersionedPriceListItem
from .schemas import ComparisonSummaryResponse, ItemComparisonResponse


class CreatePriceListVersionRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    expected_previous_version_id: UUID | None
    confirm_create: bool


class VersionBaselineResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: UUID
    version_number: int
    created_at: datetime

    @classmethod
    def from_domain(cls, version: PriceListVersion) -> Self:
        return cls(
            id=version.id,
            version_number=version.lineage.version_number,
            created_at=version.created_at,
        )


class PriceListVersionResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: UUID
    supplier_id: UUID
    source_import_id: UUID
    previous_version_id: UUID | None
    version_number: int
    created_by_user_id: UUID
    created_by_email: str
    row_count: int
    created_at: datetime
    review_status: ReviewStatus
    decided_by_user_id: UUID | None
    decided_by_email: str | None
    decided_at: datetime | None
    decision_note: str | None
    is_current: bool

    @classmethod
    def from_domain(cls, version: PriceListVersion) -> Self:
        return cls(
            id=version.id,
            supplier_id=version.supplier_id,
            source_import_id=version.source_import_id,
            previous_version_id=version.lineage.previous_version_id,
            version_number=version.lineage.version_number,
            created_by_user_id=version.created_by_user_id,
            created_by_email=version.created_by_email,
            row_count=version.row_count,
            created_at=version.created_at,
            review_status=version.review_status.value,
            decided_by_user_id=version.decided_by_user_id,
            decided_by_email=version.decided_by_email,
            decided_at=version.decided_at,
            decision_note=version.decision_note,
            is_current=version.is_current,
        )


class ApprovePriceListVersionRequest(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
        json_schema_extra={
            "examples": [
                {
                    "expected_current_version_id": None,
                    "confirm_approval": True,
                    "decision_note": "تغییرات فایل بررسی شد.",
                }
            ]
        },
    )

    expected_current_version_id: UUID | None
    confirm_approval: bool
    decision_note: str | None = Field(default=None, max_length=500)


class RejectPriceListVersionRequest(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
        json_schema_extra={
            "examples": [
                {
                    "confirm_rejection": True,
                    "reason": "تغییر تعداد بسته با فایل اصلی مطابقت ندارد.",
                }
            ]
        },
    )

    confirm_rejection: bool
    reason: str = Field(min_length=1, max_length=500)


class PriceListVersionReviewResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    version_id: UUID
    status: ReviewStatus
    decided_by_user_id: UUID | None
    decided_by_email: str | None
    decided_at: datetime | None
    decision_note: str | None


class ApprovalResultResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    review: PriceListVersionReviewResponse
    previous_current_version_id: UUID | None
    current_version_id: UUID | None

    @classmethod
    def from_domain(cls, result: ApprovalResult) -> Self:
        review = result.review
        return cls(
            review=PriceListVersionReviewResponse(
                version_id=review.version_id,
                status=review.status.value,
                decided_by_user_id=review.decided_by_user_id,
                decided_by_email=review.decided_by_email,
                decided_at=review.decided_at,
                decision_note=review.decision_note,
            ),
            previous_current_version_id=result.previous_current_version_id,
            current_version_id=result.current_version_id,
        )


class CurrentPriceListVersionResponse(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
        json_schema_extra={"examples": [{"current_version": None}]},
    )

    current_version: PriceListVersionResponse | None

    @classmethod
    def from_domain(cls, view: CurrentPriceListVersionView) -> Self:
        return cls(
            current_version=(
                PriceListVersionResponse.from_domain(view.current_version)
                if view.current_version
                else None
            )
        )


class CurrentPriceImpactResponse(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
        json_schema_extra={
            "examples": [
                {
                    "target_version": {
                        "id": "00000000-0000-4000-8000-000000000003",
                        "version_number": 3,
                        "created_at": "2026-10-14T08:00:00Z",
                    },
                    "baseline_status": "CURRENT_BASELINE",
                    "baseline_version": {
                        "id": "00000000-0000-4000-8000-000000000001",
                        "version_number": 1,
                        "created_at": "2026-10-12T08:00:00Z",
                    },
                    "is_latest": True,
                    "supplier_is_active": True,
                    "summary": {
                        "old_items": 2,
                        "new_items": 2,
                        "added": 1,
                        "removed": 1,
                        "price_changed": 1,
                        "price_increased": 1,
                        "price_decreased": 0,
                        "metadata_only_changed": 0,
                        "unchanged": 0,
                        "high_risk": 1,
                    },
                    "items": [],
                    "total": 3,
                    "limit": 50,
                    "offset": 0,
                },
                {
                    "target_version": {
                        "id": "00000000-0000-4000-8000-000000000001",
                        "version_number": 1,
                        "created_at": "2026-10-12T08:00:00Z",
                    },
                    "baseline_status": "NO_CURRENT",
                    "baseline_version": None,
                    "is_latest": True,
                    "supplier_is_active": True,
                    "summary": None,
                    "items": [],
                    "total": 0,
                    "limit": 50,
                    "offset": 0,
                },
            ]
        },
    )

    target_version: VersionBaselineResponse
    baseline_status: CurrentPriceImpactBaselineStatus
    baseline_version: VersionBaselineResponse | None
    is_latest: bool
    supplier_is_active: bool
    summary: ComparisonSummaryResponse | None
    items: list[ItemComparisonResponse]
    total: int
    limit: int
    offset: int

    @classmethod
    def from_domain(cls, report: CurrentPriceImpactPage) -> Self:
        return cls(
            target_version=VersionBaselineResponse.from_domain(report.target_version),
            baseline_status=report.baseline_status,
            baseline_version=(
                VersionBaselineResponse.from_domain(report.baseline_version)
                if report.baseline_version
                else None
            ),
            is_latest=report.is_latest,
            supplier_is_active=report.supplier_is_active,
            summary=(
                ComparisonSummaryResponse.model_validate(report.summary) if report.summary else None
            ),
            items=[ItemComparisonResponse.from_domain(item) for item in report.items],
            total=report.total,
            limit=report.limit,
            offset=report.offset,
        )


class AuditEventResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: UUID
    actor_user_id: UUID
    actor_email: str
    action: AuditAction
    entity_type: str
    entity_id: UUID
    occurred_at: datetime
    details: dict[str, object]


class AuditEventPageResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    items: list[AuditEventResponse]
    total: int
    limit: int
    offset: int

    @classmethod
    def from_domain(cls, page: AuditEventPage) -> Self:
        return cls(
            items=[
                AuditEventResponse(
                    id=item.id,
                    actor_user_id=item.actor_user_id,
                    actor_email=item.actor_email,
                    action=item.action.value,
                    entity_type=item.entity_type,
                    entity_id=item.entity_id,
                    occurred_at=item.occurred_at,
                    details=item.details,
                )
                for item in page.items
            ],
            total=page.total,
            limit=page.limit,
            offset=page.offset,
        )


class PriceListVersionPageResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    items: list[PriceListVersionResponse]
    total: int
    limit: int
    offset: int

    @classmethod
    def from_domain(cls, page: PriceListVersionPage) -> Self:
        return cls(
            items=[PriceListVersionResponse.from_domain(item) for item in page.items],
            total=page.total,
            limit=page.limit,
            offset=page.offset,
        )


class PriceListVersionItemResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: UUID
    source_row_number: int
    product_code_raw: str
    product_code_normalized: str
    product_name_raw: str
    product_name_normalized: str
    brand: str | None
    unit: str | None
    pack_size: int | None
    price_irr: int
    availability: str
    availability_raw: str | None
    notes: str | None
    created_at: datetime

    @classmethod
    def from_domain(cls, item: VersionedPriceListItem) -> Self:
        return cls(
            id=item.id,
            source_row_number=item.source_row_number,
            product_code_raw=item.product_code_raw,
            product_code_normalized=item.product_code_normalized,
            product_name_raw=item.product_name_raw,
            product_name_normalized=item.product_name_normalized,
            brand=item.brand,
            unit=item.unit,
            pack_size=item.pack_size,
            price_irr=item.price_irr,
            availability=item.availability.value,
            availability_raw=item.availability_raw,
            notes=item.notes,
            created_at=item.created_at,
        )


class PriceListVersionItemPageResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    items: list[PriceListVersionItemResponse]
    total: int
    limit: int
    offset: int

    @classmethod
    def from_domain(cls, page: VersionItemPage) -> Self:
        return cls(
            items=[PriceListVersionItemResponse.from_domain(item) for item in page.items],
            total=page.total,
            limit=page.limit,
            offset=page.offset,
        )


class _ChangeReportPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")

    created_version: PriceListVersionResponse | None
    baseline_version: VersionBaselineResponse | None
    summary: ComparisonSummaryResponse | None
    items: list[ItemComparisonResponse]
    total: int
    limit: int
    offset: int

    @classmethod
    def _payload(cls, report: ChangeReportPage) -> dict[str, object]:
        return {
            "created_version": (
                PriceListVersionResponse.from_domain(report.created_version)
                if report.created_version
                else None
            ),
            "baseline_version": (
                VersionBaselineResponse.from_domain(report.baseline_version)
                if report.baseline_version
                else None
            ),
            "summary": (
                ComparisonSummaryResponse.model_validate(report.summary) if report.summary else None
            ),
            "items": [ItemComparisonResponse.from_domain(item) for item in report.items],
            "total": report.total,
            "limit": report.limit,
            "offset": report.offset,
        }


class ImportChangeReportResponse(_ChangeReportPayload):
    import_id: UUID

    @classmethod
    def from_domain(cls, report: ChangeReportPage) -> Self:
        return cls(import_id=report.subject_id, **cls._payload(report))


class VersionChangeReportResponse(_ChangeReportPayload):
    version_id: UUID

    @classmethod
    def from_domain(cls, report: ChangeReportPage) -> Self:
        return cls(version_id=report.subject_id, **cls._payload(report))
