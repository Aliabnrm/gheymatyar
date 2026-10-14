from dataclasses import dataclass
from uuid import UUID

from ..domain.import_models import ImportStatus
from ..domain.models import ComparisonSummary, ItemComparison, PriceListItem
from ..domain.version_models import PriceListVersion, VersionedPriceListItem


@dataclass(frozen=True, slots=True)
class VersionSourceImport:
    id: UUID
    status: ImportStatus
    items: tuple[PriceListItem, ...]


@dataclass(frozen=True, slots=True)
class PriceListVersionPage:
    items: tuple[PriceListVersion, ...]
    total: int
    limit: int
    offset: int


@dataclass(frozen=True, slots=True)
class VersionItemPage:
    items: tuple[VersionedPriceListItem, ...]
    total: int
    limit: int
    offset: int


@dataclass(frozen=True, slots=True)
class ChangeReportPage:
    subject_id: UUID
    created_version: PriceListVersion | None
    baseline_version: PriceListVersion | None
    summary: ComparisonSummary | None
    items: tuple[ItemComparison, ...]
    total: int
    limit: int
    offset: int
