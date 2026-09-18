from uuid import UUID

from sqlalchemy import insert, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.modules.suppliers.domain.errors import SupplierError, SupplierErrorCode
from app.modules.suppliers.infrastructure.orm import SupplierRecord

from ..application.import_dto import NewExtractedRow, NewImportRun
from ..application.mapping_dto import MappingTemplate
from ..domain.import_errors import PriceListImportError, PriceListImportErrorCode
from ..domain.import_models import PriceListImport
from ..domain.mapping import CanonicalField, ColumnMapping
from .import_orm import ExtractedRowRecord, SourceDocumentRecord
from .import_repositories import (
    _batched_rows,
    _new_extracted_row_values,
    _new_import_run_record,
    _to_import,
)
from .mapping_orm import SupplierMappingTemplateRecord


def template_conflict() -> PriceListImportError:
    return PriceListImportError(
        PriceListImportErrorCode.MAPPING_TEMPLATE_CONFLICT,
        "الگوی فعال تغییر کرده است؛ الگوی فعلی را دوباره مشاهده و جایگزینی را تأیید کنید.",
    )


async def _lock_active_supplier(
    database: AsyncSession, *, organization_id: UUID, supplier_id: UUID
) -> SupplierRecord:
    supplier = await database.scalar(
        select(SupplierRecord)
        .where(SupplierRecord.organization_id == organization_id, SupplierRecord.id == supplier_id)
        .with_for_update()
    )
    if supplier is None:
        raise SupplierError(SupplierErrorCode.SUPPLIER_NOT_FOUND, "تأمین‌کننده موردنظر پیدا نشد.")
    if not supplier.is_active:
        raise PriceListImportError(
            PriceListImportErrorCode.SUPPLIER_INACTIVE,
            "تأمین‌کننده غیرفعال است؛ ثبت اجرا یا الگوی جدید ممکن نیست.",
        )
    return supplier


class SqlAlchemyMappingStore:
    def __init__(self, session_factory: async_sessionmaker[AsyncSession]) -> None:
        self._session_factory = session_factory

    async def get_template(
        self, *, organization_id: UUID, supplier_id: UUID
    ) -> MappingTemplate | None:
        async with self._session_factory() as database:
            record = await database.scalar(
                select(SupplierMappingTemplateRecord).where(
                    SupplierMappingTemplateRecord.organization_id == organization_id,
                    SupplierMappingTemplateRecord.supplier_id == supplier_id,
                    SupplierMappingTemplateRecord.is_active.is_(True),
                )
            )
            return _to_template(record) if record else None

    async def save_template(
        self, *, template: MappingTemplate, expected_template_id: UUID | None
    ) -> MappingTemplate:
        async with self._session_factory() as database, database.begin():
            await _lock_active_supplier(
                database, organization_id=template.organization_id, supplier_id=template.supplier_id
            )
            current = await database.scalar(
                select(SupplierMappingTemplateRecord).where(
                    SupplierMappingTemplateRecord.organization_id == template.organization_id,
                    SupplierMappingTemplateRecord.supplier_id == template.supplier_id,
                    SupplierMappingTemplateRecord.is_active.is_(True),
                )
            )
            if (current.id if current else None) != expected_template_id:
                raise template_conflict()
            if current:
                current.is_active = False
                await database.flush()
            database.add(
                SupplierMappingTemplateRecord(
                    id=template.id,
                    organization_id=template.organization_id,
                    supplier_id=template.supplier_id,
                    source_import_id=template.source_import_id,
                    created_by_user_id=template.created_by_user_id,
                    created_at=template.created_at,
                    sheet_name=template.mapping.sheet_name,
                    header_row=template.mapping.header_row,
                    columns={key.value: value for key, value in template.mapping.columns.items()},
                    header_signature=list(template.header_signature),
                    is_active=True,
                )
            )
        return template

    async def create_rerun(
        self, *, run: NewImportRun, rows: tuple[NewExtractedRow, ...]
    ) -> PriceListImport:
        async with self._session_factory() as database, database.begin():
            supplier = await _lock_active_supplier(
                database, organization_id=run.organization_id, supplier_id=run.supplier_id
            )
            document = await database.scalar(
                select(SourceDocumentRecord).where(
                    SourceDocumentRecord.organization_id == run.organization_id,
                    SourceDocumentRecord.supplier_id == run.supplier_id,
                    SourceDocumentRecord.id == run.source_document_id,
                )
            )
            if document is None:
                raise PriceListImportError(
                    PriceListImportErrorCode.PRICE_LIST_IMPORT_NOT_FOUND, "فایل Import پیدا نشد."
                )
            record = _new_import_run_record(run)
            database.add(record)
            await database.flush()
            for batch in _batched_rows(rows):
                await database.execute(
                    insert(ExtractedRowRecord),
                    [
                        _new_extracted_row_values(
                            row,
                            organization_id=run.organization_id,
                            supplier_id=run.supplier_id,
                            import_run_id=run.id,
                            created_at=run.completed_at,
                        )
                        for row in batch
                    ],
                )
        return _to_import(record, document, supplier.name)


def _to_template(record: SupplierMappingTemplateRecord) -> MappingTemplate:
    return MappingTemplate(
        id=record.id,
        organization_id=record.organization_id,
        supplier_id=record.supplier_id,
        source_import_id=record.source_import_id,
        created_by_user_id=record.created_by_user_id,
        created_at=record.created_at,
        mapping=ColumnMapping(
            record.sheet_name,
            record.header_row,
            {CanonicalField(k): v for k, v in record.columns.items()},
        ),
        header_signature=tuple(record.header_signature),
    )
