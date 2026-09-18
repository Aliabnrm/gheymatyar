from dataclasses import dataclass
from datetime import datetime
from uuid import UUID

from ..domain.errors import PriceListError
from ..domain.mapping import ColumnMapping
from ..domain.models import PriceListItem


@dataclass(frozen=True, slots=True)
class ExtractionReport:
    items: list[PriceListItem]
    snapshot: dict[str, object]
    error: PriceListError | None


@dataclass(frozen=True, slots=True)
class MappingTemplate:
    id: UUID
    organization_id: UUID
    supplier_id: UUID
    source_import_id: UUID
    created_by_user_id: UUID
    created_at: datetime
    mapping: ColumnMapping
    header_signature: tuple[str, ...]
