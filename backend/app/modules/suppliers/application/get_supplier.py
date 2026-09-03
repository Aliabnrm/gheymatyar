from uuid import UUID

from ..domain.errors import SupplierError, SupplierErrorCode
from ..domain.models import Supplier
from .ports import SupplierStore


class GetSupplier:
    def __init__(self, store: SupplierStore) -> None:
        self._store = store

    async def execute(self, *, organization_id: UUID, supplier_id: UUID) -> Supplier:
        supplier = await self._store.get(
            organization_id=organization_id,
            supplier_id=supplier_id,
        )
        if supplier is None:
            raise SupplierError(
                SupplierErrorCode.SUPPLIER_NOT_FOUND,
                "تأمین‌کننده موردنظر پیدا نشد.",
            )
        return supplier
