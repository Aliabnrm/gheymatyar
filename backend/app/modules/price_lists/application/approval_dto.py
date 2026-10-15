from dataclasses import dataclass
from uuid import UUID

from ..domain.approval_models import (
    CurrentPriceImpactBaselineStatus,
    PriceListAuditEvent,
    PriceListVersionReview,
)
from ..domain.models import ComparisonSummary, ItemComparison
from ..domain.version_models import PriceListVersion, VersionedPriceListItem


@dataclass(frozen=True, slots=True)
class ApprovalResult:
    review: PriceListVersionReview
    previous_current_version_id: UUID | None
    current_version_id: UUID | None


@dataclass(frozen=True, slots=True)
class CurrentPriceListVersionView:
    current_version: PriceListVersion | None


@dataclass(frozen=True, slots=True)
class CurrentPriceImpactSnapshot:
    target_version: PriceListVersion
    target_items: tuple[VersionedPriceListItem, ...]
    current_version_id: UUID | None
    baseline_version: PriceListVersion | None
    baseline_items: tuple[VersionedPriceListItem, ...] | None
    is_latest: bool
    supplier_is_active: bool


@dataclass(frozen=True, slots=True)
class CurrentPriceImpactPage:
    target_version: PriceListVersion
    baseline_status: CurrentPriceImpactBaselineStatus
    baseline_version: PriceListVersion | None
    is_latest: bool
    supplier_is_active: bool
    summary: ComparisonSummary | None
    items: tuple[ItemComparison, ...]
    total: int
    limit: int
    offset: int


@dataclass(frozen=True, slots=True)
class AuditEventPage:
    items: tuple[PriceListAuditEvent, ...]
    total: int
    limit: int
    offset: int
