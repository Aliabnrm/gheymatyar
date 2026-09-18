from dataclasses import dataclass
from datetime import datetime
from enum import StrEnum
from uuid import UUID

from ..domain.import_models import ExtractedRow, PriceListImport
from ..domain.models import PriceListItem


class ImportStatusFilter(StrEnum):
    DRAFT = "draft"
    FAILED = "failed"
    ALL = "all"


@dataclass(frozen=True, slots=True)
class SupplierImportContext:
    id: UUID
    name: str
    is_active: bool


@dataclass(frozen=True, slots=True)
class NewSourceDocument:
    id: UUID
    organization_id: UUID
    supplier_id: UUID
    uploaded_by_user_id: UUID
    original_filename: str
    object_key: str
    media_type: str
    size_bytes: int
    sha256_hex: str
    created_at: datetime


@dataclass(frozen=True, slots=True)
class NewImportRun:
    id: UUID
    organization_id: UUID
    supplier_id: UUID
    source_document_id: UUID
    created_by_user_id: UUID
    status: str
    row_count: int
    blocking_error_code: str | None
    blocking_error_message: str | None
    blocking_error_details: dict[str, object]
    created_at: datetime
    completed_at: datetime
    parent_import_id: UUID | None = None
    mapping_snapshot: dict[str, object] | None = None


@dataclass(frozen=True, slots=True)
class NewExtractedRow:
    id: UUID
    item: PriceListItem


@dataclass(frozen=True, slots=True)
class ImportPage:
    items: tuple[PriceListImport, ...]
    total: int
    limit: int
    offset: int


@dataclass(frozen=True, slots=True)
class ExtractedRowPage:
    items: tuple[ExtractedRow, ...]
    total: int
    limit: int
    offset: int
