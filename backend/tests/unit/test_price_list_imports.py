from datetime import UTC, date, datetime
from threading import get_ident
from typing import cast
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest

from app.modules.price_lists.application.create_import import (
    CreatePriceListImport,
    build_source_document_key,
    sanitize_error_details,
)
from app.modules.price_lists.application.import_dto import NewExtractedRow, SupplierImportContext
from app.modules.price_lists.domain.errors import PriceListErrorCode
from app.modules.price_lists.domain.import_errors import (
    PriceListImportError,
    PriceListImportErrorCode,
)
from app.modules.price_lists.domain.import_models import (
    BlockingImportError,
    ImportRun,
    ImportStatus,
)
from app.modules.price_lists.domain.json_values import json_safe_mapping
from app.modules.price_lists.domain.models import Availability, PriceListItem
from app.modules.price_lists.domain.normalization import normalize_product_code
from app.modules.price_lists.infrastructure.import_repositories import _batched_rows
from app.modules.price_lists.infrastructure.s3_document_storage import S3DocumentStorage
from app.modules.price_lists.infrastructure.threaded_extractor import ThreadedPriceListExtractor
from app.modules.price_lists.presentation.uploads import sanitize_filename


def test_import_status_invariants_reject_partial_or_ambiguous_state() -> None:
    now = datetime.now(UTC)
    common = {
        "id": uuid4(),
        "organization_id": uuid4(),
        "supplier_id": uuid4(),
        "source_document_id": uuid4(),
        "created_by_user_id": uuid4(),
        "created_at": now,
        "completed_at": now,
    }

    with pytest.raises(ValueError):
        ImportRun(status=ImportStatus.DRAFT, row_count=0, blocking_error=None, **common)
    with pytest.raises(ValueError):
        ImportRun(status=ImportStatus.FAILED, row_count=0, blocking_error=None, **common)

    failed = ImportRun(
        status=ImportStatus.FAILED,
        row_count=0,
        blocking_error=BlockingImportError(
            code=PriceListErrorCode.NO_PRODUCT_ROWS,
            message="ردیفی وجود ندارد.",
            details={},
        ),
        **common,
    )
    assert failed.status is ImportStatus.FAILED


def test_object_key_is_server_generated_and_independent_of_filename() -> None:
    organization_id = uuid4()
    supplier_id = uuid4()
    document_id = uuid4()

    key = build_source_document_key(
        organization_id=organization_id,
        supplier_id=supplier_id,
        document_id=document_id,
    )

    assert key == (
        f"organizations/{organization_id}/suppliers/{supplier_id}/"
        f"source-documents/{document_id}.xlsx"
    )
    assert "customer" not in key


def test_filename_is_sanitized_and_bounded_for_persistence() -> None:
    assert sanitize_filename("../../private/customer.xlsx") == "customer.xlsx"
    assert sanitize_filename("customer\x00price.xlsx") == "customer_price.xlsx"
    bounded = sanitize_filename(f"{'x' * 400}.xlsx")
    assert len(bounded) == 255
    assert bounded.endswith(".xlsx")


def test_raw_rows_and_error_details_are_json_safe() -> None:
    converted = json_safe_mapping(
        {"date": date(2026, 9, 3), "nested": {"created": datetime(2026, 9, 3, tzinfo=UTC)}}
    )
    details = sanitize_error_details({"filename": "private.xlsx", "row": 3})

    assert converted == {
        "date": "2026-09-03",
        "nested": {"created": "2026-09-03T00:00:00+00:00"},
    }
    assert details == {"row": 3}


def test_normalized_product_code_has_database_safe_length_limit() -> None:
    with pytest.raises(Exception) as raised:
        normalize_product_code("A" * 256)

    assert raised.value.code is PriceListErrorCode.INVALID_PRODUCT_CODE


def test_large_import_rows_are_split_into_bounded_database_batches() -> None:
    placeholder = cast(PriceListItem, object())
    rows = tuple(NewExtractedRow(id=uuid4(), item=placeholder) for _ in range(2_001))

    batches = list(_batched_rows(rows))

    assert [len(batch) for batch in batches] == [1_000, 1_000, 1]


@pytest.mark.anyio
async def test_s3_adapter_stores_checks_and_deletes_objects() -> None:
    class RecordingClient:
        def __init__(self) -> None:
            self.objects: dict[str, bytes] = {}
            self.checked_bucket: str | None = None

        def put_object(self, *, Bucket: str, Key: str, Body: bytes, ContentType: str) -> object:
            assert Bucket == "private-bucket"
            assert ContentType.endswith("sheetml.sheet")
            self.objects[Key] = Body
            return {}

        def delete_object(self, *, Bucket: str, Key: str) -> object:
            assert Bucket == "private-bucket"
            self.objects.pop(Key)
            return {}

        def head_bucket(self, *, Bucket: str) -> object:
            self.checked_bucket = Bucket
            return {}

        def close(self) -> None:
            return None

    client = RecordingClient()
    storage = S3DocumentStorage(client=client, bucket="private-bucket")

    await storage.put(
        object_key="organizations/o/suppliers/s/source-documents/d.xlsx",
        content=b"PK content",
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )
    await storage.ping()
    assert client.objects == {"organizations/o/suppliers/s/source-documents/d.xlsx": b"PK content"}
    assert client.checked_bucket == "private-bucket"

    await storage.delete(object_key="organizations/o/suppliers/s/source-documents/d.xlsx")
    assert client.objects == {}


@pytest.mark.anyio
async def test_create_import_compensates_object_when_database_write_fails() -> None:
    store = AsyncMock()
    store.get_supplier.return_value = SupplierImportContext(
        id=uuid4(), name="نمونه", is_active=True
    )
    store.find_by_file_hash.return_value = None
    store.create.side_effect = RuntimeError("database unavailable")
    storage = AsyncMock()
    extractor = AsyncMock()
    extractor.extract.return_value = [_price_list_item()]
    service = CreatePriceListImport(store=store, storage=storage, extractor=extractor)

    with pytest.raises(RuntimeError):
        await service.execute(
            organization_id=uuid4(),
            supplier_id=uuid4(),
            user_id=uuid4(),
            filename="prices.xlsx",
            content=b"PK content",
        )

    storage.put.assert_awaited_once()
    storage.delete.assert_awaited_once()


@pytest.mark.anyio
async def test_storage_failure_does_not_attempt_database_persistence() -> None:
    store = AsyncMock()
    store.get_supplier.return_value = SupplierImportContext(
        id=uuid4(), name="نمونه", is_active=True
    )
    store.find_by_file_hash.return_value = None
    storage = AsyncMock()
    storage.put.side_effect = PriceListImportError(
        PriceListImportErrorCode.OBJECT_STORAGE_UNAVAILABLE,
        "فضای نگهداری در دسترس نیست.",
    )
    extractor = AsyncMock()
    extractor.extract.return_value = [_price_list_item()]
    service = CreatePriceListImport(store=store, storage=storage, extractor=extractor)

    with pytest.raises(PriceListImportError) as raised:
        await service.execute(
            organization_id=uuid4(),
            supplier_id=uuid4(),
            user_id=uuid4(),
            filename="prices.xlsx",
            content=b"PK content",
        )

    assert raised.value.code is PriceListImportErrorCode.OBJECT_STORAGE_UNAVAILABLE
    store.create.assert_not_awaited()
    storage.delete.assert_not_awaited()


@pytest.mark.anyio
async def test_import_extractor_runs_blocking_openpyxl_adapter_off_event_loop() -> None:
    request_thread = get_ident()
    extraction_threads: list[int] = []

    class RecordingExtractor:
        def extract(self, content: bytes, *, filename: str) -> list[PriceListItem]:
            del content, filename
            extraction_threads.append(get_ident())
            return [_price_list_item()]

    threaded = ThreadedPriceListExtractor(RecordingExtractor())
    await threaded.extract(b"PK content", filename="prices.xlsx")

    assert extraction_threads and extraction_threads[0] != request_thread


def _price_list_item() -> PriceListItem:
    return PriceListItem(
        source_row_number=2,
        product_code_raw="001-A",
        product_code_normalized="001-A",
        product_name_raw="کابل شبکه",
        product_name_normalized="کابل شبکه",
        brand=None,
        unit="عدد",
        pack_size=1,
        price_irr=1_000,
        availability=Availability.IN_STOCK,
        availability_raw="موجود",
        notes=None,
        raw_row={},
    )
