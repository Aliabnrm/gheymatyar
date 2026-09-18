from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from ..application.import_dto import ExtractedRowPage, ImportPage
from ..domain.import_models import ExtractedRow, PriceListImport
from .mapping_schemas import MappingSnapshotResponse


class ImportSupplierResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: UUID
    name: str


class SourceDocumentResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: UUID
    original_filename: str
    media_type: str
    size_bytes: int
    sha256_hex: str
    created_at: datetime


class BlockingImportErrorResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    code: str
    message: str
    details: dict[str, object]


class PriceListImportResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: UUID
    supplier: ImportSupplierResponse
    source_document: SourceDocumentResponse
    status: str
    row_count: int
    blocking_error: BlockingImportErrorResponse | None
    created_at: datetime
    completed_at: datetime
    parent_import_id: UUID | None
    mapping_snapshot: MappingSnapshotResponse | None

    @classmethod
    def from_domain(cls, imported: PriceListImport) -> "PriceListImportResponse":
        document = imported.source_document
        run = imported.run
        error = run.blocking_error
        return cls(
            id=run.id,
            supplier=ImportSupplierResponse(id=run.supplier_id, name=imported.supplier_name),
            source_document=SourceDocumentResponse(
                id=document.id,
                original_filename=document.original_filename,
                media_type=document.media_type,
                size_bytes=document.size_bytes,
                sha256_hex=document.sha256_hex,
                created_at=document.created_at,
            ),
            status=run.status.value,
            row_count=run.row_count,
            blocking_error=(
                BlockingImportErrorResponse(
                    code=error.code.value,
                    message=error.message,
                    details=error.details,
                )
                if error
                else None
            ),
            created_at=run.created_at,
            completed_at=run.completed_at,
            parent_import_id=run.parent_import_id,
            mapping_snapshot=MappingSnapshotResponse.model_validate(run.mapping_snapshot)
            if run.mapping_snapshot is not None
            else None,
        )


class PriceListImportPageResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    items: list[PriceListImportResponse]
    total: int
    limit: int
    offset: int

    @classmethod
    def from_page(cls, page: ImportPage) -> "PriceListImportPageResponse":
        return cls(
            items=[PriceListImportResponse.from_domain(item) for item in page.items],
            total=page.total,
            limit=page.limit,
            offset=page.offset,
        )


class ExtractedRowResponse(BaseModel):
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
    raw_row: dict[str, object]
    created_at: datetime

    @classmethod
    def from_domain(cls, row: ExtractedRow) -> "ExtractedRowResponse":
        return cls(
            id=row.id,
            source_row_number=row.source_row_number,
            product_code_raw=row.product_code_raw,
            product_code_normalized=row.product_code_normalized,
            product_name_raw=row.product_name_raw,
            product_name_normalized=row.product_name_normalized,
            brand=row.brand,
            unit=row.unit,
            pack_size=row.pack_size,
            price_irr=row.price_irr,
            availability=row.availability.value,
            availability_raw=row.availability_raw,
            notes=row.notes,
            raw_row=row.raw_row,
            created_at=row.created_at,
        )


class ExtractedRowPageResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    items: list[ExtractedRowResponse]
    total: int
    limit: int
    offset: int

    @classmethod
    def from_page(cls, page: ExtractedRowPage) -> "ExtractedRowPageResponse":
        return cls(
            items=[ExtractedRowResponse.from_domain(item) for item in page.items],
            total=page.total,
            limit=page.limit,
            offset=page.offset,
        )
