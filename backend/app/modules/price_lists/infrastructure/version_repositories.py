from collections.abc import Iterator, Sequence
from datetime import UTC, datetime
from uuid import UUID, uuid4

from sqlalchemy import Select, and_, func, insert, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.modules.accounts.infrastructure.orm import UserRecord
from app.modules.suppliers.infrastructure.orm import SupplierRecord

from ..application.version_dto import (
    PriceListVersionPage,
    VersionItemPage,
    VersionSourceImport,
)
from ..domain.approval_models import ReviewStatus
from ..domain.import_errors import PriceListImportError, PriceListImportErrorCode
from ..domain.import_models import ImportStatus
from ..domain.models import Availability, PriceListItem
from ..domain.version_errors import PriceListVersionError, PriceListVersionErrorCode
from ..domain.version_models import (
    PriceListVersion,
    VersionedPriceListItem,
    VersionLineage,
    validate_version_creation,
)
from .approval_orm import CurrentPriceListVersionRecord, PriceListVersionReviewRecord
from .import_orm import ExtractedRowRecord, ImportRunRecord
from .version_orm import PriceListVersionItemRecord, PriceListVersionRecord

_ITEM_INSERT_BATCH_SIZE = 1_000


class SqlAlchemyPriceListVersionStore:
    def __init__(self, session_factory: async_sessionmaker[AsyncSession]) -> None:
        self._session_factory = session_factory

    async def get_import_source(
        self, *, organization_id: UUID, supplier_id: UUID, import_id: UUID
    ) -> VersionSourceImport | None:
        async with self._session_factory() as database:
            run = await database.scalar(
                select(ImportRunRecord).where(
                    ImportRunRecord.organization_id == organization_id,
                    ImportRunRecord.supplier_id == supplier_id,
                    ImportRunRecord.id == import_id,
                )
            )
            if run is None:
                return None
            records = await database.scalars(
                select(ExtractedRowRecord)
                .where(
                    ExtractedRowRecord.organization_id == organization_id,
                    ExtractedRowRecord.supplier_id == supplier_id,
                    ExtractedRowRecord.import_run_id == import_id,
                )
                .order_by(ExtractedRowRecord.source_row_number, ExtractedRowRecord.id)
            )
            return VersionSourceImport(
                id=run.id,
                status=ImportStatus(run.status),
                items=tuple(_extracted_to_item(record) for record in records.all()),
            )

    async def create_from_import(
        self,
        *,
        organization_id: UUID,
        supplier_id: UUID,
        import_id: UUID,
        actor_user_id: UUID,
        expected_previous_version_id: UUID | None,
    ) -> PriceListVersion:
        created_at = datetime.now(UTC)
        version_id = uuid4()
        try:
            async with self._session_factory() as database, database.begin():
                supplier = await database.scalar(
                    select(SupplierRecord)
                    .where(
                        SupplierRecord.organization_id == organization_id,
                        SupplierRecord.id == supplier_id,
                    )
                    .with_for_update()
                )
                if supplier is None:
                    raise _import_not_found()
                if not supplier.is_active:
                    raise PriceListImportError(
                        PriceListImportErrorCode.SUPPLIER_INACTIVE,
                        "برای تأمین‌کننده غیرفعال نمی‌توان نسخه قیمت جدید ساخت.",
                    )
                run = await database.scalar(
                    select(ImportRunRecord).where(
                        ImportRunRecord.organization_id == organization_id,
                        ImportRunRecord.supplier_id == supplier_id,
                        ImportRunRecord.id == import_id,
                    )
                )
                if run is None:
                    raise _import_not_found()
                if run.status != ImportStatus.DRAFT.value:
                    raise PriceListVersionError(
                        PriceListVersionErrorCode.IMPORT_NOT_READY_FOR_VERSION,
                        "فقط Import معتبر و آماده بازبینی می‌تواند به نسخه تبدیل شود.",
                    )
                existing_id = await database.scalar(
                    select(PriceListVersionRecord.id).where(
                        PriceListVersionRecord.organization_id == organization_id,
                        PriceListVersionRecord.supplier_id == supplier_id,
                        PriceListVersionRecord.source_import_id == import_id,
                    )
                )
                if existing_id is not None:
                    raise PriceListVersionError(
                        PriceListVersionErrorCode.PRICE_LIST_VERSION_ALREADY_EXISTS,
                        "برای این Import قبلاً نسخه تغییرناپذیر ساخته شده است.",
                        {"version_id": str(existing_id)},
                    )
                latest = await database.scalar(
                    select(PriceListVersionRecord)
                    .where(
                        PriceListVersionRecord.organization_id == organization_id,
                        PriceListVersionRecord.supplier_id == supplier_id,
                    )
                    .order_by(PriceListVersionRecord.version_number.desc())
                    .limit(1)
                )
                latest_id = latest.id if latest is not None else None
                if latest_id != expected_previous_version_id:
                    raise PriceListVersionError(
                        PriceListVersionErrorCode.PRICE_LIST_BASELINE_CHANGED,
                        "نسخه مبنای مقایسه تغییر کرده است؛ تغییرات را دوباره بازبینی کنید.",
                        {"latest_version_id": str(latest_id) if latest_id else None},
                    )
                rows = (
                    await database.scalars(
                        select(ExtractedRowRecord)
                        .where(
                            ExtractedRowRecord.organization_id == organization_id,
                            ExtractedRowRecord.supplier_id == supplier_id,
                            ExtractedRowRecord.import_run_id == import_id,
                        )
                        .order_by(ExtractedRowRecord.source_row_number, ExtractedRowRecord.id)
                    )
                ).all()
                validate_version_creation(tuple(_extracted_to_item(row) for row in rows))
                actor_email = await database.scalar(
                    select(UserRecord.email).where(UserRecord.id == actor_user_id)
                )
                if actor_email is None:
                    raise _import_not_found()
                version_number = 1 if latest is None else latest.version_number + 1
                version_record = PriceListVersionRecord(
                    id=version_id,
                    organization_id=organization_id,
                    supplier_id=supplier_id,
                    source_import_id=import_id,
                    previous_version_id=latest_id,
                    version_number=version_number,
                    created_by_user_id=actor_user_id,
                    row_count=len(rows),
                    created_at=created_at,
                )
                database.add(version_record)
                await database.flush()
                database.add(
                    PriceListVersionReviewRecord(
                        version_id=version_id,
                        organization_id=organization_id,
                        supplier_id=supplier_id,
                        status=ReviewStatus.READY_FOR_REVIEW.value,
                        decided_by_user_id=None,
                        decided_by_email=None,
                        decided_at=None,
                        decision_note=None,
                        created_at=created_at,
                    )
                )
                for batch in _batched(rows, _ITEM_INSERT_BATCH_SIZE):
                    await database.execute(
                        insert(PriceListVersionItemRecord),
                        [
                            _version_item_values(
                                row,
                                organization_id=organization_id,
                                supplier_id=supplier_id,
                                version_id=version_id,
                                created_at=created_at,
                            )
                            for row in batch
                        ],
                    )
        except IntegrityError as exc:
            constraint = _integrity_constraint_name(exc)
            if constraint == "uq_price_list_versions_tenant_supplier_import":
                raise PriceListVersionError(
                    PriceListVersionErrorCode.PRICE_LIST_VERSION_ALREADY_EXISTS,
                    "برای این Import قبلاً نسخه تغییرناپذیر ساخته شده است.",
                ) from exc
            if constraint in {
                "uq_price_list_versions_tenant_supplier_number",
                "uq_price_list_versions_tenant_supplier_previous",
            }:
                raise PriceListVersionError(
                    PriceListVersionErrorCode.PRICE_LIST_BASELINE_CHANGED,
                    "نسخه مبنای مقایسه تغییر کرده است؛ تغییرات را دوباره بازبینی کنید.",
                ) from exc
            if constraint == "uq_price_list_items_tenant_version_code":
                raise PriceListVersionError(
                    PriceListVersionErrorCode.VERSION_ITEM_CONFLICT,
                    "کد کالا در نسخه قیمت تکراری است.",
                ) from exc
            raise
        return PriceListVersion(
            id=version_id,
            organization_id=organization_id,
            supplier_id=supplier_id,
            source_import_id=import_id,
            created_by_user_id=actor_user_id,
            created_by_email=actor_email,
            lineage=VersionLineage(version_number, latest_id),
            row_count=len(rows),
            created_at=created_at,
        )

    async def get_latest(
        self, *, organization_id: UUID, supplier_id: UUID
    ) -> PriceListVersion | None:
        async with self._session_factory() as database:
            row = (
                await database.execute(
                    self._version_query()
                    .where(
                        PriceListVersionRecord.organization_id == organization_id,
                        PriceListVersionRecord.supplier_id == supplier_id,
                    )
                    .order_by(PriceListVersionRecord.version_number.desc())
                    .limit(1)
                )
            ).one_or_none()
            return _to_version(*row) if row else None

    async def get_by_import(
        self, *, organization_id: UUID, supplier_id: UUID, import_id: UUID
    ) -> PriceListVersion | None:
        async with self._session_factory() as database:
            row = (
                await database.execute(
                    self._version_query().where(
                        PriceListVersionRecord.organization_id == organization_id,
                        PriceListVersionRecord.supplier_id == supplier_id,
                        PriceListVersionRecord.source_import_id == import_id,
                    )
                )
            ).one_or_none()
            return _to_version(*row) if row else None

    async def list(
        self,
        *,
        organization_id: UUID,
        supplier_id: UUID,
        limit: int,
        offset: int,
    ) -> PriceListVersionPage:
        scope = (
            PriceListVersionRecord.organization_id == organization_id,
            PriceListVersionRecord.supplier_id == supplier_id,
        )
        async with self._session_factory() as database:
            total = await database.scalar(
                select(func.count()).select_from(PriceListVersionRecord).where(*scope)
            )
            result = await database.execute(
                self._version_query()
                .where(*scope)
                .order_by(PriceListVersionRecord.version_number.desc())
                .limit(limit)
                .offset(offset)
            )
            return PriceListVersionPage(
                items=tuple(_to_version(*row) for row in result.all()),
                total=total or 0,
                limit=limit,
                offset=offset,
            )

    async def get(
        self, *, organization_id: UUID, supplier_id: UUID, version_id: UUID
    ) -> PriceListVersion | None:
        async with self._session_factory() as database:
            row = (
                await database.execute(
                    self._version_query().where(
                        PriceListVersionRecord.organization_id == organization_id,
                        PriceListVersionRecord.supplier_id == supplier_id,
                        PriceListVersionRecord.id == version_id,
                    )
                )
            ).one_or_none()
            return _to_version(*row) if row else None

    async def list_items(
        self,
        *,
        organization_id: UUID,
        supplier_id: UUID,
        version_id: UUID,
        limit: int,
        offset: int,
    ) -> VersionItemPage | None:
        scope = (
            PriceListVersionRecord.organization_id == organization_id,
            PriceListVersionRecord.supplier_id == supplier_id,
            PriceListVersionRecord.id == version_id,
        )
        item_scope = (
            PriceListVersionItemRecord.organization_id == organization_id,
            PriceListVersionItemRecord.supplier_id == supplier_id,
            PriceListVersionItemRecord.version_id == version_id,
        )
        async with self._session_factory() as database:
            if await database.scalar(select(PriceListVersionRecord.id).where(*scope)) is None:
                return None
            total = await database.scalar(
                select(func.count()).select_from(PriceListVersionItemRecord).where(*item_scope)
            )
            records = await database.scalars(
                select(PriceListVersionItemRecord)
                .where(*item_scope)
                .order_by(
                    PriceListVersionItemRecord.source_row_number,
                    PriceListVersionItemRecord.id,
                )
                .limit(limit)
                .offset(offset)
            )
            return VersionItemPage(
                items=tuple(_to_version_item(record) for record in records.all()),
                total=total or 0,
                limit=limit,
                offset=offset,
            )

    async def get_all_items(
        self, *, organization_id: UUID, supplier_id: UUID, version_id: UUID
    ) -> tuple[VersionedPriceListItem, ...] | None:
        version_scope = (
            PriceListVersionRecord.organization_id == organization_id,
            PriceListVersionRecord.supplier_id == supplier_id,
            PriceListVersionRecord.id == version_id,
        )
        item_scope = (
            PriceListVersionItemRecord.organization_id == organization_id,
            PriceListVersionItemRecord.supplier_id == supplier_id,
            PriceListVersionItemRecord.version_id == version_id,
        )
        async with self._session_factory() as database:
            if (
                await database.scalar(select(PriceListVersionRecord.id).where(*version_scope))
                is None
            ):
                return None
            records = await database.scalars(
                select(PriceListVersionItemRecord)
                .where(*item_scope)
                .order_by(
                    PriceListVersionItemRecord.source_row_number,
                    PriceListVersionItemRecord.id,
                )
            )
            return tuple(_to_version_item(record) for record in records.all())

    @staticmethod
    def _version_query() -> Select[
        tuple[
            PriceListVersionRecord,
            str,
            PriceListVersionReviewRecord,
            UUID,
        ]
    ]:
        return (
            select(
                PriceListVersionRecord,
                UserRecord.email,
                PriceListVersionReviewRecord,
                CurrentPriceListVersionRecord.version_id,
            )
            .join(UserRecord, UserRecord.id == PriceListVersionRecord.created_by_user_id)
            .join(
                PriceListVersionReviewRecord,
                and_(
                    PriceListVersionReviewRecord.organization_id
                    == PriceListVersionRecord.organization_id,
                    PriceListVersionReviewRecord.supplier_id == PriceListVersionRecord.supplier_id,
                    PriceListVersionReviewRecord.version_id == PriceListVersionRecord.id,
                ),
            )
            .outerjoin(
                CurrentPriceListVersionRecord,
                and_(
                    CurrentPriceListVersionRecord.organization_id
                    == PriceListVersionRecord.organization_id,
                    CurrentPriceListVersionRecord.supplier_id == PriceListVersionRecord.supplier_id,
                    CurrentPriceListVersionRecord.version_id == PriceListVersionRecord.id,
                ),
            )
        )


def _to_version(
    record: PriceListVersionRecord,
    creator_email: str,
    review: PriceListVersionReviewRecord,
    current_version_id: UUID | None,
) -> PriceListVersion:
    return PriceListVersion(
        id=record.id,
        organization_id=record.organization_id,
        supplier_id=record.supplier_id,
        source_import_id=record.source_import_id,
        created_by_user_id=record.created_by_user_id,
        created_by_email=creator_email,
        lineage=VersionLineage(record.version_number, record.previous_version_id),
        row_count=record.row_count,
        created_at=record.created_at,
        review_status=ReviewStatus(review.status),
        decided_by_user_id=review.decided_by_user_id,
        decided_by_email=review.decided_by_email,
        decided_at=review.decided_at,
        decision_note=review.decision_note,
        is_current=current_version_id == record.id,
    )


def _to_version_item(record: PriceListVersionItemRecord) -> VersionedPriceListItem:
    return VersionedPriceListItem(
        id=record.id,
        organization_id=record.organization_id,
        supplier_id=record.supplier_id,
        version_id=record.version_id,
        source_row_number=record.source_row_number,
        product_code_raw=record.product_code_raw,
        product_code_normalized=record.product_code_normalized,
        product_name_raw=record.product_name_raw,
        product_name_normalized=record.product_name_normalized,
        brand=record.brand,
        unit=record.unit,
        pack_size=record.pack_size,
        price_irr=record.price_irr,
        availability=Availability(record.availability),
        availability_raw=record.availability_raw,
        notes=record.notes,
        created_at=record.created_at,
    )


def _extracted_to_item(record: ExtractedRowRecord) -> PriceListItem:
    return PriceListItem(
        source_row_number=record.source_row_number,
        product_code_raw=record.product_code_raw,
        product_code_normalized=record.product_code_normalized,
        product_name_raw=record.product_name_raw,
        product_name_normalized=record.product_name_normalized,
        brand=record.brand,
        unit=record.unit,
        pack_size=record.pack_size,
        price_irr=record.price_irr,
        availability=Availability(record.availability),
        availability_raw=record.availability_raw,
        notes=record.notes,
        raw_row=record.raw_row,
    )


def _version_item_values(
    row: ExtractedRowRecord,
    *,
    organization_id: UUID,
    supplier_id: UUID,
    version_id: UUID,
    created_at: datetime,
) -> dict[str, object]:
    return {
        "id": uuid4(),
        "organization_id": organization_id,
        "supplier_id": supplier_id,
        "version_id": version_id,
        "source_row_number": row.source_row_number,
        "product_code_raw": row.product_code_raw,
        "product_code_normalized": row.product_code_normalized,
        "product_name_raw": row.product_name_raw,
        "product_name_normalized": row.product_name_normalized,
        "brand": row.brand,
        "unit": row.unit,
        "pack_size": row.pack_size,
        "price_irr": row.price_irr,
        "availability": row.availability,
        "availability_raw": row.availability_raw,
        "notes": row.notes,
        "created_at": created_at,
    }


def _batched[T](items: Sequence[T], size: int) -> Iterator[Sequence[T]]:
    for start in range(0, len(items), size):
        yield items[start : start + size]


def _import_not_found() -> PriceListImportError:
    return PriceListImportError(
        PriceListImportErrorCode.PRICE_LIST_IMPORT_NOT_FOUND,
        "فایل قیمت موردنظر پیدا نشد.",
    )


def _integrity_constraint_name(error: IntegrityError) -> str | None:
    current: BaseException | None = error.orig
    visited: set[int] = set()
    while current is not None and id(current) not in visited:
        visited.add(id(current))
        name = getattr(current, "constraint_name", None)
        if isinstance(name, str):
            return name
        current = current.__cause__ or current.__context__
    return None
