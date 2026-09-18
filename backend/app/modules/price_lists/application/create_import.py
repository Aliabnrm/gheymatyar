import hashlib
import logging
from collections.abc import Callable
from datetime import UTC, datetime
from uuid import UUID, uuid4

from app.modules.suppliers.domain.errors import SupplierError, SupplierErrorCode

from ..domain.errors import PriceListError, PriceListErrorCode
from ..domain.import_errors import PriceListImportError, PriceListImportErrorCode
from ..domain.import_models import ImportStatus, PriceListImport
from ..domain.json_values import json_safe_mapping
from .import_dto import NewExtractedRow, NewImportRun, NewSourceDocument
from .import_ports import AsyncPriceListExtractor, DocumentStorage, PriceListImportStore
from .mapping_ports import MappingExtractor, MappingStore

XLSX_MEDIA_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

_DATA_QUALITY_ERROR_CODES = frozenset(
    {
        PriceListErrorCode.HEADER_NOT_FOUND,
        PriceListErrorCode.AMBIGUOUS_HEADER,
        PriceListErrorCode.AMBIGUOUS_COLUMN_MAPPING,
        PriceListErrorCode.INVALID_COLUMN_MAPPING,
        PriceListErrorCode.TEMPLATE_LAYOUT_MISMATCH,
        PriceListErrorCode.REQUIRED_COLUMN_MISSING,
        PriceListErrorCode.INVALID_SOURCE_ROW,
        PriceListErrorCode.EMPTY_PRODUCT_CODE,
        PriceListErrorCode.INVALID_PRODUCT_CODE,
        PriceListErrorCode.EMPTY_PRODUCT_NAME,
        PriceListErrorCode.DUPLICATE_PRODUCT_CODE,
        PriceListErrorCode.INVALID_PRICE,
        PriceListErrorCode.INVALID_PACK_SIZE,
        PriceListErrorCode.TOMAN_NOT_SUPPORTED,
        PriceListErrorCode.NO_PRODUCT_ROWS,
    }
)

_logger = logging.getLogger(__name__)


class CreatePriceListImport:
    def __init__(
        self,
        *,
        store: PriceListImportStore,
        storage: DocumentStorage,
        extractor: AsyncPriceListExtractor,
        clock: Callable[[], datetime] | None = None,
        mapping_extractor: MappingExtractor | None = None,
        mapping_store: MappingStore | None = None,
    ) -> None:
        self._mapping_extractor = mapping_extractor
        self._mapping_store = mapping_store
        self._store = store
        self._storage = storage
        self._extractor = extractor
        self._clock = clock or (lambda: datetime.now(UTC))

    async def execute(
        self,
        *,
        organization_id: UUID,
        supplier_id: UUID,
        user_id: UUID,
        filename: str,
        content: bytes,
    ) -> PriceListImport:
        supplier = await self._store.get_supplier(
            organization_id=organization_id,
            supplier_id=supplier_id,
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

        sha256_hex = hashlib.sha256(content).hexdigest()
        existing = await self._store.find_by_file_hash(
            organization_id=organization_id,
            supplier_id=supplier_id,
            sha256_hex=sha256_hex,
        )
        if existing is not None:
            raise _duplicate_error(existing.run.id)

        snapshot: dict[str, object] | None = None
        rows: tuple[NewExtractedRow, ...]
        blocking_error: PriceListError | None = None
        try:
            if self._mapping_extractor is not None and self._mapping_store is not None:
                template = await self._mapping_store.get_template(
                    organization_id=organization_id, supplier_id=supplier_id
                )
                report = await self._mapping_extractor.analyze(
                    content,
                    filename=filename,
                    mapping=template.mapping if template else None,
                    header_signature=template.header_signature if template else None,
                )
                snapshot = report.snapshot
                if template:
                    snapshot["origin"] = "template"
                    snapshot["template_id"] = str(template.id)
                if report.error:
                    raise report.error
                items = report.items
            else:
                items = await self._extractor.extract(content, filename=filename)
            rows = tuple(NewExtractedRow(id=uuid4(), item=item) for item in items)
        except PriceListError as exc:
            if exc.code not in _DATA_QUALITY_ERROR_CODES:
                raise
            blocking_error = exc
            rows = ()

        now = self._clock()
        document_id = uuid4()
        import_id = uuid4()
        object_key = build_source_document_key(
            organization_id=organization_id,
            supplier_id=supplier_id,
            document_id=document_id,
        )
        document = NewSourceDocument(
            id=document_id,
            organization_id=organization_id,
            supplier_id=supplier_id,
            uploaded_by_user_id=user_id,
            original_filename=filename,
            object_key=object_key,
            media_type=XLSX_MEDIA_TYPE,
            size_bytes=len(content),
            sha256_hex=sha256_hex,
            created_at=now,
        )
        run = NewImportRun(
            id=import_id,
            organization_id=organization_id,
            supplier_id=supplier_id,
            source_document_id=document_id,
            created_by_user_id=user_id,
            status=(ImportStatus.FAILED.value if blocking_error else ImportStatus.DRAFT.value),
            row_count=len(rows),
            blocking_error_code=(blocking_error.code.value if blocking_error else None),
            blocking_error_message=(blocking_error.message if blocking_error else None),
            blocking_error_details=(
                sanitize_error_details(blocking_error.details) if blocking_error else {}
            ),
            created_at=now,
            completed_at=now,
            mapping_snapshot=snapshot,
        )

        await self._storage.put(
            object_key=object_key,
            content=content,
            media_type=XLSX_MEDIA_TYPE,
        )
        try:
            return await self._store.create(document=document, run=run, rows=rows)
        except Exception:
            try:
                await self._storage.delete(object_key=object_key)
            except Exception as cleanup_error:
                _logger.error(
                    "پاک‌سازی فایل Import ناقص انجام نشد.",
                    extra={"error_type": type(cleanup_error).__name__},
                )
            raise


def build_source_document_key(
    *, organization_id: UUID, supplier_id: UUID, document_id: UUID
) -> str:
    return (
        f"organizations/{organization_id}/suppliers/{supplier_id}/"
        f"source-documents/{document_id}.xlsx"
    )


def sanitize_error_details(details: dict[str, object]) -> dict[str, object]:
    return json_safe_mapping({key: value for key, value in details.items() if key != "filename"})


def _duplicate_error(import_id: UUID) -> PriceListImportError:
    return PriceListImportError(
        PriceListImportErrorCode.IMPORT_FILE_ALREADY_EXISTS,
        "این فایل قبلاً برای همین تأمین‌کننده ثبت شده است.",
        {"existing_import_id": str(import_id)},
    )
