from dataclasses import dataclass
from uuid import UUID

from ..domain.approval_models import PriceListAuditEvent, PriceListVersionReview
from ..domain.version_models import PriceListVersion


@dataclass(frozen=True, slots=True)
class ApprovalResult:
    review: PriceListVersionReview
    previous_current_version_id: UUID | None
    current_version_id: UUID | None


@dataclass(frozen=True, slots=True)
class CurrentPriceListVersionView:
    current_version: PriceListVersion | None


@dataclass(frozen=True, slots=True)
class AuditEventPage:
    items: tuple[PriceListAuditEvent, ...]
    total: int
    limit: int
    offset: int
