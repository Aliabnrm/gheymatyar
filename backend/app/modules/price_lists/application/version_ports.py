from typing import Protocol
from uuid import UUID

from ..domain.version_models import PriceListVersion, VersionedPriceListItem
from .version_dto import PriceListVersionPage, VersionItemPage, VersionSourceImport


class PriceListVersionStore(Protocol):
    async def get_import_source(
        self, *, organization_id: UUID, supplier_id: UUID, import_id: UUID
    ) -> VersionSourceImport | None: ...

    async def create_from_import(
        self,
        *,
        organization_id: UUID,
        supplier_id: UUID,
        import_id: UUID,
        actor_user_id: UUID,
        expected_previous_version_id: UUID | None,
    ) -> PriceListVersion: ...

    async def get_latest(
        self, *, organization_id: UUID, supplier_id: UUID
    ) -> PriceListVersion | None: ...

    async def get_by_import(
        self, *, organization_id: UUID, supplier_id: UUID, import_id: UUID
    ) -> PriceListVersion | None: ...

    async def list(
        self,
        *,
        organization_id: UUID,
        supplier_id: UUID,
        limit: int,
        offset: int,
    ) -> PriceListVersionPage: ...

    async def get(
        self, *, organization_id: UUID, supplier_id: UUID, version_id: UUID
    ) -> PriceListVersion | None: ...

    async def list_items(
        self,
        *,
        organization_id: UUID,
        supplier_id: UUID,
        version_id: UUID,
        limit: int,
        offset: int,
    ) -> VersionItemPage | None: ...

    async def get_all_items(
        self, *, organization_id: UUID, supplier_id: UUID, version_id: UUID
    ) -> tuple[VersionedPriceListItem, ...] | None: ...
