from uuid import UUID

from .dto import SupplierPage, SupplierStatusFilter
from .ports import SupplierStore


class ListSuppliers:
    def __init__(self, store: SupplierStore) -> None:
        self._store = store

    async def execute(
        self,
        *,
        organization_id: UUID,
        status: SupplierStatusFilter,
        limit: int,
        offset: int,
    ) -> SupplierPage:
        return await self._store.list(
            organization_id=organization_id,
            status=status,
            limit=limit,
            offset=offset,
        )
