from uuid import UUID, uuid4

from ..domain.models import Supplier
from ..domain.normalization import normalize_supplier_name
from .ports import SupplierStore


class CreateSupplier:
    def __init__(self, store: SupplierStore) -> None:
        self._store = store

    async def execute(self, *, organization_id: UUID, name: str) -> Supplier:
        normalized = normalize_supplier_name(name)
        return await self._store.create(
            organization_id=organization_id,
            supplier_id=uuid4(),
            name=normalized.display_name,
            normalized_name=normalized.normalized_name,
        )
