from typing import Protocol
from uuid import UUID

from ..domain.models import Supplier
from .dto import SupplierPage, SupplierStatusFilter, UpdateSupplierCommand


class SupplierStore(Protocol):
    async def create(
        self,
        *,
        organization_id: UUID,
        supplier_id: UUID,
        name: str,
        normalized_name: str,
    ) -> Supplier: ...

    async def list(
        self,
        *,
        organization_id: UUID,
        status: SupplierStatusFilter,
        limit: int,
        offset: int,
    ) -> SupplierPage: ...

    async def get(self, *, organization_id: UUID, supplier_id: UUID) -> Supplier | None: ...

    async def update(
        self,
        *,
        organization_id: UUID,
        supplier_id: UUID,
        command: UpdateSupplierCommand,
    ) -> Supplier | None: ...
