from typing import Protocol, runtime_checkable
from uuid import UUID

from ..domain.import_models import PriceListImport
from ..domain.models import PriceListItem
from .import_dto import (
    ExtractedRowPage,
    ImportPage,
    ImportStatusFilter,
    NewExtractedRow,
    NewImportRun,
    NewSourceDocument,
    SupplierImportContext,
)


class AsyncPriceListExtractor(Protocol):
    async def extract(self, content: bytes, *, filename: str) -> list[PriceListItem]: ...


class DocumentStorage(Protocol):
    async def get(self, *, object_key: str, max_bytes: int) -> bytes: ...

    async def put(self, *, object_key: str, content: bytes, media_type: str) -> None: ...

    async def delete(self, *, object_key: str) -> None: ...


@runtime_checkable
class DocumentStorageRuntime(DocumentStorage, Protocol):
    async def ping(self) -> None: ...

    async def close(self) -> None: ...


class PriceListImportStore(Protocol):
    async def get_supplier(
        self, *, organization_id: UUID, supplier_id: UUID
    ) -> SupplierImportContext | None: ...

    async def find_by_file_hash(
        self,
        *,
        organization_id: UUID,
        supplier_id: UUID,
        sha256_hex: str,
    ) -> PriceListImport | None: ...

    async def create(
        self,
        *,
        document: NewSourceDocument,
        run: NewImportRun,
        rows: tuple[NewExtractedRow, ...],
    ) -> PriceListImport: ...

    async def list(
        self,
        *,
        organization_id: UUID,
        supplier_id: UUID,
        status: ImportStatusFilter,
        limit: int,
        offset: int,
    ) -> ImportPage: ...

    async def get(
        self,
        *,
        organization_id: UUID,
        supplier_id: UUID,
        import_id: UUID,
    ) -> PriceListImport | None: ...

    async def list_rows(
        self,
        *,
        organization_id: UUID,
        supplier_id: UUID,
        import_id: UUID,
        limit: int,
        offset: int,
    ) -> ExtractedRowPage | None: ...
