from uuid import UUID

from app.modules.suppliers.domain.errors import SupplierError, SupplierErrorCode

from .import_dto import ImportPage, ImportStatusFilter
from .import_ports import PriceListImportStore


class ListPriceListImports:
    def __init__(self, store: PriceListImportStore) -> None:
        self._store = store

    async def execute(
        self,
        *,
        organization_id: UUID,
        supplier_id: UUID,
        status: ImportStatusFilter,
        limit: int,
        offset: int,
    ) -> ImportPage:
        supplier = await self._store.get_supplier(
            organization_id=organization_id,
            supplier_id=supplier_id,
        )
        if supplier is None:
            raise SupplierError(
                SupplierErrorCode.SUPPLIER_NOT_FOUND,
                "تأمین‌کننده موردنظر پیدا نشد.",
            )
        return await self._store.list(
            organization_id=organization_id,
            supplier_id=supplier_id,
            status=status,
            limit=limit,
            offset=offset,
        )
