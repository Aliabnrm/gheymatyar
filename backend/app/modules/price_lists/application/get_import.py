from uuid import UUID

from ..domain.import_errors import PriceListImportError, PriceListImportErrorCode
from ..domain.import_models import PriceListImport
from .import_ports import PriceListImportStore


class GetPriceListImport:
    def __init__(self, store: PriceListImportStore) -> None:
        self._store = store

    async def execute(
        self, *, organization_id: UUID, supplier_id: UUID, import_id: UUID
    ) -> PriceListImport:
        imported = await self._store.get(
            organization_id=organization_id,
            supplier_id=supplier_id,
            import_id=import_id,
        )
        if imported is None:
            raise PriceListImportError(
                PriceListImportErrorCode.PRICE_LIST_IMPORT_NOT_FOUND,
                "فایل قیمت موردنظر پیدا نشد.",
            )
        return imported
