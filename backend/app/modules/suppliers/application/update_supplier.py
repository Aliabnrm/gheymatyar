from uuid import UUID

from ..domain.errors import SupplierError, SupplierErrorCode
from ..domain.models import Supplier
from .dto import UpdateSupplierCommand
from .ports import SupplierStore


class UpdateSupplier:
    def __init__(self, store: SupplierStore) -> None:
        self._store = store

    async def execute(
        self,
        *,
        organization_id: UUID,
        supplier_id: UUID,
        name: str | None,
        is_active: bool | None,
    ) -> Supplier:
        command = UpdateSupplierCommand.create(name=name, is_active=is_active)
        supplier = await self._store.update(
            organization_id=organization_id,
            supplier_id=supplier_id,
            command=command,
        )
        if supplier is None:
            raise SupplierError(
                SupplierErrorCode.SUPPLIER_NOT_FOUND,
                "تأمین‌کننده موردنظر پیدا نشد.",
            )
        return supplier
