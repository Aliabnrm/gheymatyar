from dataclasses import dataclass
from datetime import datetime
from enum import StrEnum
from uuid import UUID

from .errors import PriceListErrorCode
from .models import Availability


class ImportStatus(StrEnum):
    DRAFT = "DRAFT"
    FAILED = "FAILED"


@dataclass(frozen=True, slots=True)
class SourceDocument:
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
class BlockingImportError:
    code: PriceListErrorCode
    message: str
    details: dict[str, object]


@dataclass(frozen=True, slots=True)
class ImportRun:
    id: UUID
    organization_id: UUID
    supplier_id: UUID
    source_document_id: UUID
    created_by_user_id: UUID
    status: ImportStatus
    row_count: int
    blocking_error: BlockingImportError | None
    created_at: datetime
    completed_at: datetime
    parent_import_id: UUID | None = None
    mapping_snapshot: dict[str, object] | None = None

    def __post_init__(self) -> None:
        if self.status is ImportStatus.DRAFT:
            if self.row_count < 1 or self.blocking_error is not None:
                raise ValueError("DRAFT import must contain rows and no blocking error")
        elif self.row_count != 0 or self.blocking_error is None:
            raise ValueError("FAILED import must contain a blocking error and no rows")


@dataclass(frozen=True, slots=True)
class ExtractedRow:
    id: UUID
    organization_id: UUID
    supplier_id: UUID
    import_run_id: UUID
    source_row_number: int
    product_code_raw: str
    product_code_normalized: str
    product_name_raw: str
    product_name_normalized: str
    brand: str | None
    unit: str | None
    pack_size: int | None
    price_irr: int
    availability: Availability
    availability_raw: str | None
    notes: str | None
    raw_row: dict[str, object]
    created_at: datetime


@dataclass(frozen=True, slots=True)
class PriceListImport:
    supplier_name: str
    source_document: SourceDocument
    run: ImportRun
