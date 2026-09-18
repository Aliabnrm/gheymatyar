from collections.abc import Iterator
from datetime import datetime
from uuid import UUID

from sqlalchemy import Select, and_, func, insert, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.modules.suppliers.domain.errors import SupplierError, SupplierErrorCode
from app.modules.suppliers.infrastructure.orm import SupplierRecord

from ..application.create_import import sanitize_error_details
from ..application.import_dto import (
    ExtractedRowPage,
    ImportPage,
    ImportStatusFilter,
    NewExtractedRow,
    NewImportRun,
    NewSourceDocument,
    SupplierImportContext,
)
from ..domain.errors import PriceListErrorCode
from ..domain.import_errors import PriceListImportError, PriceListImportErrorCode
from ..domain.import_models import (
    BlockingImportError,
    ExtractedRow,
    ImportRun,
    ImportStatus,
    PriceListImport,
    SourceDocument,
)
from ..domain.json_values import json_safe_mapping
from ..domain.models import Availability
from .import_orm import ExtractedRowRecord, ImportRunRecord, SourceDocumentRecord

_ROW_INSERT_BATCH_SIZE = 1_000


class SqlAlchemyPriceListImportStore:
    def __init__(self, session_factory: async_sessionmaker[AsyncSession]) -> None:
        self._session_factory = session_factory

    async def get_supplier(
        self, *, organization_id: UUID, supplier_id: UUID
    ) -> SupplierImportContext | None:
        async with self._session_factory() as database:
            record = await database.scalar(
                select(SupplierRecord).where(
                    SupplierRecord.organization_id == organization_id,
                    SupplierRecord.id == supplier_id,
                )
            )
            if record is None:
                return None
            return SupplierImportContext(id=record.id, name=record.name, is_active=record.is_active)

    async def find_by_file_hash(
        self,
        *,
        organization_id: UUID,
        supplier_id: UUID,
        sha256_hex: str,
    ) -> PriceListImport | None:
        query = self._import_query().where(
            SourceDocumentRecord.organization_id == organization_id,
            SourceDocumentRecord.supplier_id == supplier_id,
            SourceDocumentRecord.sha256_hex == sha256_hex,
        )
        async with self._session_factory() as database:
            row = (
                await database.execute(
                    query.order_by(ImportRunRecord.created_at, ImportRunRecord.id).limit(1)
                )
            ).one_or_none()
            return _to_import(*row) if row else None

    async def create(
        self,
        *,
        document: NewSourceDocument,
        run: NewImportRun,
        rows: tuple[NewExtractedRow, ...],
    ) -> PriceListImport:
        document_record = _new_document_record(document)
        run_record = _new_import_run_record(run)
        try:
            async with self._session_factory() as database, database.begin():
                supplier = await database.scalar(
                    select(SupplierRecord)
                    .where(
                        SupplierRecord.organization_id == document.organization_id,
                        SupplierRecord.id == document.supplier_id,
                    )
                    .with_for_update(read=True)
                )
                if supplier is None:
                    raise SupplierError(
                        SupplierErrorCode.SUPPLIER_NOT_FOUND,
                        "تأمین‌کننده موردنظر پیدا نشد.",
                    )
                if not supplier.is_active:
                    raise PriceListImportError(
                        PriceListImportErrorCode.SUPPLIER_INACTIVE,
                        "برای تأمین‌کننده غیرفعال نمی‌توان فایل قیمت جدید ثبت کرد.",
                    )
                database.add(document_record)
                await database.flush()
                database.add(run_record)
                await database.flush()
                for batch in _batched_rows(rows):
                    values = [
                        _new_extracted_row_values(
                            row,
                            organization_id=run.organization_id,
                            supplier_id=run.supplier_id,
                            import_run_id=run.id,
                            created_at=run.completed_at,
                        )
                        for row in batch
                    ]
                    await database.execute(insert(ExtractedRowRecord), values)
        except IntegrityError as exc:
            if _integrity_constraint_name(exc) == "uq_source_documents_tenant_supplier_sha256":
                existing = await self.find_by_file_hash(
                    organization_id=document.organization_id,
                    supplier_id=document.supplier_id,
                    sha256_hex=document.sha256_hex,
                )
                details: dict[str, object] = (
                    {"existing_import_id": str(existing.run.id)} if existing else {}
                )
                raise PriceListImportError(
                    PriceListImportErrorCode.IMPORT_FILE_ALREADY_EXISTS,
                    "این فایل قبلاً برای همین تأمین‌کننده ثبت شده است.",
                    details,
                ) from exc
            raise
        return _to_import(run_record, document_record, supplier.name)

    async def list(
        self,
        *,
        organization_id: UUID,
        supplier_id: UUID,
        status: ImportStatusFilter,
        limit: int,
        offset: int,
    ) -> ImportPage:
        filters = [
            ImportRunRecord.organization_id == organization_id,
            ImportRunRecord.supplier_id == supplier_id,
        ]
        if status is ImportStatusFilter.DRAFT:
            filters.append(ImportRunRecord.status == ImportStatus.DRAFT.value)
        elif status is ImportStatusFilter.FAILED:
            filters.append(ImportRunRecord.status == ImportStatus.FAILED.value)
        async with self._session_factory() as database:
            total = await database.scalar(select(func.count(ImportRunRecord.id)).where(*filters))
            result = await database.execute(
                self._import_query()
                .where(*filters)
                .order_by(ImportRunRecord.created_at.desc(), ImportRunRecord.id.desc())
                .limit(limit)
                .offset(offset)
            )
            return ImportPage(
                items=tuple(_to_import(*row) for row in result.all()),
                total=total or 0,
                limit=limit,
                offset=offset,
            )

    async def get(
        self,
        *,
        organization_id: UUID,
        supplier_id: UUID,
        import_id: UUID,
    ) -> PriceListImport | None:
        async with self._session_factory() as database:
            row = (
                await database.execute(
                    self._import_query().where(
                        ImportRunRecord.organization_id == organization_id,
                        ImportRunRecord.supplier_id == supplier_id,
                        ImportRunRecord.id == import_id,
                    )
                )
            ).one_or_none()
            return _to_import(*row) if row else None

    async def list_rows(
        self,
        *,
        organization_id: UUID,
        supplier_id: UUID,
        import_id: UUID,
        limit: int,
        offset: int,
    ) -> ExtractedRowPage | None:
        scope = (
            ImportRunRecord.organization_id == organization_id,
            ImportRunRecord.supplier_id == supplier_id,
            ImportRunRecord.id == import_id,
        )
        async with self._session_factory() as database:
            exists = await database.scalar(select(ImportRunRecord.id).where(*scope))
            if exists is None:
                return None
            row_scope = (
                ExtractedRowRecord.organization_id == organization_id,
                ExtractedRowRecord.supplier_id == supplier_id,
                ExtractedRowRecord.import_run_id == import_id,
            )
            total = await database.scalar(
                select(func.count(ExtractedRowRecord.id)).where(*row_scope)
            )
            records = await database.scalars(
                select(ExtractedRowRecord)
                .where(*row_scope)
                .order_by(ExtractedRowRecord.source_row_number, ExtractedRowRecord.id)
                .limit(limit)
                .offset(offset)
            )
            return ExtractedRowPage(
                items=tuple(_to_extracted_row(record) for record in records.all()),
                total=total or 0,
                limit=limit,
                offset=offset,
            )

    @staticmethod
    def _import_query() -> Select[tuple[ImportRunRecord, SourceDocumentRecord, str]]:
        return (
            select(ImportRunRecord, SourceDocumentRecord, SupplierRecord.name)
            .join(
                SourceDocumentRecord,
                and_(
                    SourceDocumentRecord.organization_id == ImportRunRecord.organization_id,
                    SourceDocumentRecord.supplier_id == ImportRunRecord.supplier_id,
                    SourceDocumentRecord.id == ImportRunRecord.source_document_id,
                ),
            )
            .join(
                SupplierRecord,
                and_(
                    SupplierRecord.organization_id == ImportRunRecord.organization_id,
                    SupplierRecord.id == ImportRunRecord.supplier_id,
                ),
            )
        )


def _new_document_record(document: NewSourceDocument) -> SourceDocumentRecord:
    return SourceDocumentRecord(
        id=document.id,
        organization_id=document.organization_id,
        supplier_id=document.supplier_id,
        uploaded_by_user_id=document.uploaded_by_user_id,
        original_filename=document.original_filename,
        object_key=document.object_key,
        media_type=document.media_type,
        size_bytes=document.size_bytes,
        sha256_hex=document.sha256_hex,
        created_at=document.created_at,
    )


def _new_import_run_record(run: NewImportRun) -> ImportRunRecord:
    return ImportRunRecord(
        id=run.id,
        organization_id=run.organization_id,
        supplier_id=run.supplier_id,
        source_document_id=run.source_document_id,
        created_by_user_id=run.created_by_user_id,
        status=run.status,
        row_count=run.row_count,
        blocking_error_code=run.blocking_error_code,
        blocking_error_message=run.blocking_error_message,
        blocking_error_details=run.blocking_error_details,
        created_at=run.created_at,
        completed_at=run.completed_at,
        parent_import_id=run.parent_import_id,
        mapping_snapshot=json_safe_mapping(run.mapping_snapshot)
        if run.mapping_snapshot is not None
        else None,
    )


def _new_extracted_row_values(
    row: NewExtractedRow,
    *,
    organization_id: UUID,
    supplier_id: UUID,
    import_run_id: UUID,
    created_at: datetime,
) -> dict[str, object]:
    item = row.item
    return {
        "id": row.id,
        "organization_id": organization_id,
        "supplier_id": supplier_id,
        "import_run_id": import_run_id,
        "source_row_number": item.source_row_number,
        "product_code_raw": item.product_code_raw,
        "product_code_normalized": item.product_code_normalized,
        "product_name_raw": item.product_name_raw,
        "product_name_normalized": item.product_name_normalized,
        "brand": item.brand,
        "unit": item.unit,
        "pack_size": item.pack_size,
        "price_irr": item.price_irr,
        "availability": item.availability.value,
        "availability_raw": item.availability_raw,
        "notes": item.notes,
        "raw_row": json_safe_mapping(item.raw_row),
        "created_at": created_at,
    }


def _batched_rows(
    rows: tuple[NewExtractedRow, ...],
) -> Iterator[tuple[NewExtractedRow, ...]]:
    for start in range(0, len(rows), _ROW_INSERT_BATCH_SIZE):
        yield rows[start : start + _ROW_INSERT_BATCH_SIZE]


def _to_import(
    run_record: ImportRunRecord,
    document_record: SourceDocumentRecord,
    supplier_name: str,
) -> PriceListImport:
    blocking_error = None
    if run_record.blocking_error_code is not None and run_record.blocking_error_message is not None:
        blocking_error = BlockingImportError(
            code=PriceListErrorCode(run_record.blocking_error_code),
            message=run_record.blocking_error_message,
            details=sanitize_error_details(run_record.blocking_error_details),
        )
    return PriceListImport(
        supplier_name=supplier_name,
        source_document=SourceDocument(
            id=document_record.id,
            organization_id=document_record.organization_id,
            supplier_id=document_record.supplier_id,
            uploaded_by_user_id=document_record.uploaded_by_user_id,
            original_filename=document_record.original_filename,
            object_key=document_record.object_key,
            media_type=document_record.media_type,
            size_bytes=document_record.size_bytes,
            sha256_hex=document_record.sha256_hex,
            created_at=document_record.created_at,
        ),
        run=ImportRun(
            id=run_record.id,
            organization_id=run_record.organization_id,
            supplier_id=run_record.supplier_id,
            source_document_id=run_record.source_document_id,
            created_by_user_id=run_record.created_by_user_id,
            status=ImportStatus(run_record.status),
            row_count=run_record.row_count,
            blocking_error=blocking_error,
            created_at=run_record.created_at,
            completed_at=run_record.completed_at,
            parent_import_id=run_record.parent_import_id,
            mapping_snapshot=run_record.mapping_snapshot,
        ),
    )


def _to_extracted_row(record: ExtractedRowRecord) -> ExtractedRow:
    return ExtractedRow(
        id=record.id,
        organization_id=record.organization_id,
        supplier_id=record.supplier_id,
        import_run_id=record.import_run_id,
        source_row_number=record.source_row_number,
        product_code_raw=record.product_code_raw,
        product_code_normalized=record.product_code_normalized,
        product_name_raw=record.product_name_raw,
        product_name_normalized=record.product_name_normalized,
        brand=record.brand,
        unit=record.unit,
        pack_size=record.pack_size,
        price_irr=record.price_irr,
        availability=Availability(record.availability),
        availability_raw=record.availability_raw,
        notes=record.notes,
        raw_row=record.raw_row,
        created_at=record.created_at,
    )


def _integrity_constraint_name(error: IntegrityError) -> str | None:
    current: BaseException | None = error.orig
    visited: set[int] = set()
    while current is not None and id(current) not in visited:
        visited.add(id(current))
        name = getattr(current, "constraint_name", None)
        if isinstance(name, str):
            return name
        current = current.__cause__ or current.__context__
    return None
