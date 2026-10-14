from uuid import UUID

from ..domain.import_models import ImportStatus
from ..domain.models import ChangeType
from ..domain.version_errors import PriceListVersionError, PriceListVersionErrorCode
from ..domain.version_models import PriceListVersion
from .change_reports import build_change_report
from .version_dto import ChangeReportPage, PriceListVersionPage, VersionItemPage
from .version_ports import PriceListVersionStore


class ListPriceListVersions:
    def __init__(self, store: PriceListVersionStore) -> None:
        self._store = store

    async def execute(
        self, *, organization_id: UUID, supplier_id: UUID, limit: int, offset: int
    ) -> PriceListVersionPage:
        return await self._store.list(
            organization_id=organization_id,
            supplier_id=supplier_id,
            limit=limit,
            offset=offset,
        )


class GetPriceListVersion:
    def __init__(self, store: PriceListVersionStore) -> None:
        self._store = store

    async def execute(
        self, *, organization_id: UUID, supplier_id: UUID, version_id: UUID
    ) -> PriceListVersion:
        version = await self._store.get(
            organization_id=organization_id,
            supplier_id=supplier_id,
            version_id=version_id,
        )
        if version is None:
            raise _not_found()
        return version


class ListPriceListVersionItems:
    def __init__(self, store: PriceListVersionStore) -> None:
        self._store = store

    async def execute(
        self,
        *,
        organization_id: UUID,
        supplier_id: UUID,
        version_id: UUID,
        limit: int,
        offset: int,
    ) -> VersionItemPage:
        page = await self._store.list_items(
            organization_id=organization_id,
            supplier_id=supplier_id,
            version_id=version_id,
            limit=limit,
            offset=offset,
        )
        if page is None:
            raise _not_found()
        return page


class GetImportChangeReport:
    def __init__(self, store: PriceListVersionStore) -> None:
        self._store = store

    async def execute(
        self,
        *,
        organization_id: UUID,
        supplier_id: UUID,
        import_id: UUID,
        change_type: ChangeType | None,
        limit: int,
        offset: int,
    ) -> ChangeReportPage:
        source = await self._store.get_import_source(
            organization_id=organization_id,
            supplier_id=supplier_id,
            import_id=import_id,
        )
        if source is None:
            raise PriceListVersionError(
                PriceListVersionErrorCode.IMPORT_NOT_READY_FOR_VERSION,
                "Import معتبر برای مقایسه پیدا نشد.",
            )
        if source.status is not ImportStatus.DRAFT:
            raise PriceListVersionError(
                PriceListVersionErrorCode.IMPORT_NOT_READY_FOR_VERSION,
                "فقط Import معتبر و آماده بازبینی قابل مقایسه است.",
            )
        created_version = await self._store.get_by_import(
            organization_id=organization_id, supplier_id=supplier_id, import_id=import_id
        )
        if created_version is None:
            baseline = await self._store.get_latest(
                organization_id=organization_id,
                supplier_id=supplier_id,
            )
        elif created_version.lineage.previous_version_id is None:
            baseline = None
        else:
            baseline = await self._store.get(
                organization_id=organization_id,
                supplier_id=supplier_id,
                version_id=created_version.lineage.previous_version_id,
            )
        if baseline is None:
            return ChangeReportPage(import_id, created_version, None, None, (), 0, limit, offset)
        baseline_items = await self._store.get_all_items(
            organization_id=organization_id,
            supplier_id=supplier_id,
            version_id=baseline.id,
        )
        if baseline_items is None:
            raise _not_found()
        return build_change_report(
            subject_id=import_id,
            created_version=created_version,
            baseline=baseline,
            old_items=tuple(item.to_price_list_item() for item in baseline_items),
            new_items=source.items,
            change_type=change_type,
            limit=limit,
            offset=offset,
        )


class GetVersionChangeReport:
    def __init__(self, store: PriceListVersionStore) -> None:
        self._store = store

    async def execute(
        self,
        *,
        organization_id: UUID,
        supplier_id: UUID,
        version_id: UUID,
        change_type: ChangeType | None,
        limit: int,
        offset: int,
    ) -> ChangeReportPage:
        version = await self._store.get(
            organization_id=organization_id,
            supplier_id=supplier_id,
            version_id=version_id,
        )
        if version is None:
            raise _not_found()
        previous_id = version.lineage.previous_version_id
        if previous_id is None:
            return ChangeReportPage(version_id, None, None, None, (), 0, limit, offset)
        baseline = await self._store.get(
            organization_id=organization_id,
            supplier_id=supplier_id,
            version_id=previous_id,
        )
        old_items = await self._store.get_all_items(
            organization_id=organization_id,
            supplier_id=supplier_id,
            version_id=previous_id,
        )
        new_items = await self._store.get_all_items(
            organization_id=organization_id,
            supplier_id=supplier_id,
            version_id=version_id,
        )
        if baseline is None or old_items is None or new_items is None:
            raise _not_found()
        return build_change_report(
            subject_id=version_id,
            created_version=None,
            baseline=baseline,
            old_items=tuple(item.to_price_list_item() for item in old_items),
            new_items=tuple(item.to_price_list_item() for item in new_items),
            change_type=change_type,
            limit=limit,
            offset=offset,
        )


def _not_found() -> PriceListVersionError:
    return PriceListVersionError(
        PriceListVersionErrorCode.PRICE_LIST_VERSION_NOT_FOUND,
        "نسخه قیمت موردنظر پیدا نشد.",
    )
