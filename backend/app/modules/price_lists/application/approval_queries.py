from uuid import UUID

from ..domain.approval_errors import PriceListApprovalError, PriceListApprovalErrorCode
from .approval_dto import AuditEventPage, CurrentPriceListVersionView
from .approval_ports import PriceListApprovalStore
from .version_ports import PriceListVersionStore


class GetCurrentPriceListVersion:
    def __init__(
        self, approval_store: PriceListApprovalStore, version_store: PriceListVersionStore
    ) -> None:
        self._approval_store = approval_store
        self._version_store = version_store

    async def execute(
        self, *, organization_id: UUID, supplier_id: UUID
    ) -> CurrentPriceListVersionView:
        supplier_exists, version_id = await self._approval_store.get_current_version_id(
            organization_id=organization_id, supplier_id=supplier_id
        )
        if not supplier_exists:
            raise _not_found()
        if version_id is None:
            return CurrentPriceListVersionView(current_version=None)
        version = await self._version_store.get(
            organization_id=organization_id,
            supplier_id=supplier_id,
            version_id=version_id,
        )
        if version is None:
            raise _not_found()
        return CurrentPriceListVersionView(current_version=version)


class ListPriceListVersionAuditEvents:
    def __init__(self, store: PriceListApprovalStore) -> None:
        self._store = store

    async def execute(
        self,
        *,
        organization_id: UUID,
        supplier_id: UUID,
        version_id: UUID,
        limit: int,
        offset: int,
    ) -> AuditEventPage:
        page = await self._store.list_audit_events(
            organization_id=organization_id,
            supplier_id=supplier_id,
            version_id=version_id,
            limit=limit,
            offset=offset,
        )
        if page is None:
            raise _not_found()
        return page


def _not_found() -> PriceListApprovalError:
    return PriceListApprovalError(
        PriceListApprovalErrorCode.PRICE_LIST_VERSION_NOT_FOUND,
        "نسخه قیمت موردنظر پیدا نشد.",
    )
