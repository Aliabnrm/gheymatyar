import hashlib
from dataclasses import dataclass
from datetime import UTC, datetime
from uuid import UUID, uuid4

from app.modules.suppliers.domain.errors import SupplierError, SupplierErrorCode

from ..domain.import_errors import PriceListImportError, PriceListImportErrorCode
from ..domain.import_models import ImportStatus, PriceListImport
from ..domain.mapping import ColumnMapping
from .create_import import sanitize_error_details
from .get_import import GetPriceListImport
from .import_dto import NewExtractedRow, NewImportRun
from .import_ports import DocumentStorage, PriceListImportStore
from .mapping_dto import MappingTemplate
from .mapping_ports import MappingExtractor, MappingStore


@dataclass(frozen=True, slots=True)
class MappingReview:
    inspection: dict[str, object]
    saved_template: MappingTemplate | None
    can_edit: bool
    historical_snapshot: bool


class MappingServices:
    def __init__(
        self,
        *,
        imports: PriceListImportStore,
        store: MappingStore,
        storage: DocumentStorage,
        extractor: MappingExtractor,
        max_bytes: int,
    ) -> None:
        self._imports, self._store = imports, store
        self._storage, self._extractor = storage, extractor
        self._max_bytes = max_bytes

    async def _supplier(
        self, organization_id: UUID, supplier_id: UUID, *, write: bool = False
    ) -> bool:
        supplier = await self._imports.get_supplier(
            organization_id=organization_id, supplier_id=supplier_id
        )
        if supplier is None:
            raise SupplierError(
                SupplierErrorCode.SUPPLIER_NOT_FOUND, "تأمین‌کننده موردنظر پیدا نشد."
            )
        if write and not supplier.is_active:
            raise PriceListImportError(
                PriceListImportErrorCode.SUPPLIER_INACTIVE,
                "تأمین‌کننده غیرفعال است؛ ثبت اجرا یا الگوی جدید ممکن نیست.",
            )
        return supplier.is_active

    async def _content(self, imported: PriceListImport) -> bytes:
        document = imported.source_document
        content = await self._storage.get(object_key=document.object_key, max_bytes=self._max_bytes)
        if (
            len(content) != document.size_bytes
            or hashlib.sha256(content).hexdigest() != document.sha256_hex
        ):
            raise PriceListImportError(
                PriceListImportErrorCode.SOURCE_DOCUMENT_CHANGED,
                "محتوای فایل اصلی با اثر انگشت ثبت‌شده مطابقت ندارد؛ بررسی پشتیبانی لازم است.",
            )
        return content

    async def get_template(
        self, *, organization_id: UUID, supplier_id: UUID
    ) -> MappingTemplate | None:
        await self._supplier(organization_id, supplier_id)
        return await self._store.get_template(
            organization_id=organization_id, supplier_id=supplier_id
        )

    async def review(
        self,
        *,
        organization_id: UUID,
        supplier_id: UUID,
        import_id: UUID,
        sheet_name: str | None = None,
        header_row: int | None = None,
    ) -> MappingReview:
        can_edit = await self._supplier(organization_id, supplier_id)
        imported = await GetPriceListImport(self._imports).execute(
            organization_id=organization_id, supplier_id=supplier_id, import_id=import_id
        )
        historical = (
            sheet_name is None and header_row is None and imported.run.mapping_snapshot is not None
        )
        if historical:
            inspection = imported.run.mapping_snapshot or {}
        else:
            report = await self._extractor.analyze(
                await self._content(imported),
                filename=imported.source_document.original_filename,
                sheet_name=sheet_name,
                header_row=header_row,
            )
            inspection = {**report.snapshot, "used_mapping": None, "origin": "proposal"}
        template = await self._store.get_template(
            organization_id=organization_id, supplier_id=supplier_id
        )
        return MappingReview(inspection, template, can_edit, historical)

    async def rerun(
        self,
        *,
        organization_id: UUID,
        supplier_id: UUID,
        import_id: UUID,
        user_id: UUID,
        mapping: ColumnMapping,
    ) -> PriceListImport:
        await self._supplier(organization_id, supplier_id, write=True)
        imported = await GetPriceListImport(self._imports).execute(
            organization_id=organization_id, supplier_id=supplier_id, import_id=import_id
        )
        # Invalid commands cannot create successful or partial imports.
        mapping.validate(column_count=200)
        report = await self._extractor.analyze(
            await self._content(imported),
            filename=imported.source_document.original_filename,
            mapping=mapping,
        )
        now = datetime.now(UTC)
        error = report.error
        run = NewImportRun(
            id=uuid4(),
            organization_id=organization_id,
            supplier_id=supplier_id,
            source_document_id=imported.source_document.id,
            created_by_user_id=user_id,
            status=ImportStatus.FAILED.value if error else ImportStatus.DRAFT.value,
            row_count=len(report.items),
            blocking_error_code=error.code.value if error else None,
            blocking_error_message=error.message if error else None,
            blocking_error_details=sanitize_error_details(error.details) if error else {},
            created_at=now,
            completed_at=now,
            parent_import_id=import_id,
            mapping_snapshot=report.snapshot,
        )
        return await self._store.create_rerun(
            run=run, rows=tuple(NewExtractedRow(uuid4(), item) for item in report.items)
        )

    async def save_template(
        self,
        *,
        organization_id: UUID,
        supplier_id: UUID,
        source_import_id: UUID,
        user_id: UUID,
        expected_template_id: UUID | None,
        confirm_replace: bool,
    ) -> MappingTemplate:
        await self._supplier(organization_id, supplier_id, write=True)
        imported = await GetPriceListImport(self._imports).execute(
            organization_id=organization_id, supplier_id=supplier_id, import_id=source_import_id
        )
        if expected_template_id is not None and not confirm_replace:
            raise PriceListImportError(
                PriceListImportErrorCode.MAPPING_TEMPLATE_CONFLICT,
                "برای جایگزینی الگوی قبلی، تأیید صریح لازم است.",
            )
        snapshot = imported.run.mapping_snapshot or {}
        used = snapshot.get("used_mapping")
        signature = snapshot.get("header_signature")
        if (
            imported.run.status is not ImportStatus.DRAFT
            or not isinstance(used, dict)
            or not isinstance(signature, list)
        ):
            raise PriceListImportError(
                PriceListImportErrorCode.MAPPING_TEMPLATE_REQUIRES_DRAFT,
                "ابتدا نگاشت را با اجرای موفق و بدون خطا بررسی کنید؛ سپس الگو را ذخیره کنید.",
            )
        template = MappingTemplate(
            id=uuid4(),
            organization_id=organization_id,
            supplier_id=supplier_id,
            source_import_id=source_import_id,
            created_by_user_id=user_id,
            created_at=datetime.now(UTC),
            mapping=ColumnMapping.from_dict(used),
            header_signature=tuple(str(v) for v in signature),
        )
        return await self._store.save_template(
            template=template, expected_template_id=expected_template_id
        )
