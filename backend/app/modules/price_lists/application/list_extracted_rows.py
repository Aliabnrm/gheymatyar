from uuid import UUID

from ..domain.import_errors import PriceListImportError, PriceListImportErrorCode
from .import_dto import ExtractedRowPage
from .import_ports import PriceListImportStore


class ListExtractedRows:
    def __init__(self, store: PriceListImportStore) -> None:
        self._store = store

    async def execute(
        self,
        *,
        organization_id: UUID,
        supplier_id: UUID,
        import_id: UUID,
        limit: int,
        offset: int,
    ) -> ExtractedRowPage:
        page = await self._store.list_rows(
            organization_id=organization_id,
            supplier_id=supplier_id,
            import_id=import_id,
            limit=limit,
            offset=offset,
        )
        if page is None:
            raise PriceListImportError(
                PriceListImportErrorCode.PRICE_LIST_IMPORT_NOT_FOUND,
                "فایل قیمت موردنظر پیدا نشد.",
            )
        return page
