from datetime import UTC, datetime
from typing import cast
from uuid import UUID, uuid4

from sqlalchemy import Select, and_, func, select, text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.modules.accounts.infrastructure.orm import UserRecord
from app.modules.suppliers.infrastructure.orm import SupplierRecord

from ..application.approval_dto import (
    ApprovalResult,
    AuditEventPage,
    CurrentPriceImpactSnapshot,
)
from ..domain.approval_errors import PriceListApprovalError, PriceListApprovalErrorCode
from ..domain.approval_models import (
    AuditAction,
    PriceListAuditEvent,
    PriceListVersionReview,
    ReviewStatus,
    approve_version_review,
    reject_version_review,
)
from ..domain.import_models import ImportStatus
from ..domain.models import Availability
from ..domain.version_models import PriceListVersion, VersionedPriceListItem, VersionLineage
from .approval_orm import (
    AuditLogRecord,
    CurrentPriceListVersionRecord,
    PriceListVersionReviewRecord,
)
from .import_orm import ImportRunRecord
from .version_orm import PriceListVersionItemRecord, PriceListVersionRecord


class SqlAlchemyCurrentPriceImpactReader:
    def __init__(self, session_factory: async_sessionmaker[AsyncSession]) -> None:
        self._session_factory = session_factory

    async def read_snapshot(
        self, *, organization_id: UUID, supplier_id: UUID, version_id: UUID
    ) -> CurrentPriceImpactSnapshot | None:
        async with self._session_factory() as database, database.begin():
            await database.execute(
                text("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY")
            )
            supplier = await database.scalar(
                select(SupplierRecord).where(
                    SupplierRecord.organization_id == organization_id,
                    SupplierRecord.id == supplier_id,
                )
            )
            if supplier is None:
                return None
            target_row = (
                await database.execute(
                    _version_query().where(
                        PriceListVersionRecord.organization_id == organization_id,
                        PriceListVersionRecord.supplier_id == supplier_id,
                        PriceListVersionRecord.id == version_id,
                    )
                )
            ).one_or_none()
            if target_row is None:
                return None
            target = _to_version(*target_row)
            latest_id = await database.scalar(
                select(PriceListVersionRecord.id)
                .where(
                    PriceListVersionRecord.organization_id == organization_id,
                    PriceListVersionRecord.supplier_id == supplier_id,
                )
                .order_by(PriceListVersionRecord.version_number.desc())
                .limit(1)
            )
            current_id = await database.scalar(
                select(CurrentPriceListVersionRecord.version_id).where(
                    CurrentPriceListVersionRecord.organization_id == organization_id,
                    CurrentPriceListVersionRecord.supplier_id == supplier_id,
                )
            )
            target_items = await self._items(
                database,
                organization_id=organization_id,
                supplier_id=supplier_id,
                version_id=version_id,
            )
            baseline: PriceListVersion | None = None
            baseline_items: tuple[VersionedPriceListItem, ...] | None = None
            if current_id is not None:
                baseline_row = (
                    await database.execute(
                        _version_query().where(
                            PriceListVersionRecord.organization_id == organization_id,
                            PriceListVersionRecord.supplier_id == supplier_id,
                            PriceListVersionRecord.id == current_id,
                        )
                    )
                ).one_or_none()
                if baseline_row is not None:
                    baseline = _to_version(*baseline_row)
                    baseline_items = await self._items(
                        database,
                        organization_id=organization_id,
                        supplier_id=supplier_id,
                        version_id=current_id,
                    )
            return CurrentPriceImpactSnapshot(
                target_version=target,
                target_items=target_items,
                current_version_id=current_id,
                baseline_version=baseline,
                baseline_items=baseline_items,
                is_latest=latest_id == version_id,
                supplier_is_active=supplier.is_active,
            )

    @staticmethod
    async def _items(
        database: AsyncSession,
        *,
        organization_id: UUID,
        supplier_id: UUID,
        version_id: UUID,
    ) -> tuple[VersionedPriceListItem, ...]:
        records = await database.scalars(
            select(PriceListVersionItemRecord)
            .where(
                PriceListVersionItemRecord.organization_id == organization_id,
                PriceListVersionItemRecord.supplier_id == supplier_id,
                PriceListVersionItemRecord.version_id == version_id,
            )
            .order_by(
                PriceListVersionItemRecord.product_code_normalized,
                PriceListVersionItemRecord.id,
            )
        )
        return tuple(_to_version_item(record) for record in records.all())


def _version_query() -> Select[
    tuple[PriceListVersionRecord, str, PriceListVersionReviewRecord, UUID]
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


class SqlAlchemyPriceListApprovalStore:
    def __init__(self, session_factory: async_sessionmaker[AsyncSession]) -> None:
        self._session_factory = session_factory

    async def approve(
        self,
        *,
        organization_id: UUID,
        supplier_id: UUID,
        version_id: UUID,
        actor_user_id: UUID,
        expected_current_version_id: UUID | None,
        decision_note: str | None,
    ) -> ApprovalResult:
        decided_at = datetime.now(UTC)
        async with self._session_factory() as database, database.begin():
            supplier = await self._lock_supplier(
                database, organization_id=organization_id, supplier_id=supplier_id
            )
            if supplier is None:
                raise _not_found()
            if not supplier.is_active:
                raise PriceListApprovalError(
                    PriceListApprovalErrorCode.PRICE_LIST_VERSION_NOT_READY_FOR_REVIEW,
                    "برای تأمین‌کننده غیرفعال نمی‌توان قیمت جاری تعیین کرد.",
                )
            version = await self._lock_version(
                database,
                organization_id=organization_id,
                supplier_id=supplier_id,
                version_id=version_id,
            )
            if version is None:
                raise _not_found()
            latest_id = await database.scalar(
                select(PriceListVersionRecord.id)
                .where(
                    PriceListVersionRecord.organization_id == organization_id,
                    PriceListVersionRecord.supplier_id == supplier_id,
                )
                .order_by(PriceListVersionRecord.version_number.desc())
                .limit(1)
            )
            if latest_id != version_id:
                raise PriceListApprovalError(
                    PriceListApprovalErrorCode.PRICE_LIST_VERSION_NOT_LATEST,
                    "فقط آخرین نسخه ثبت‌شده تأمین‌کننده قابل تأیید است.",
                    {"latest_version_id": str(latest_id) if latest_id else None},
                )
            import_status = await database.scalar(
                select(ImportRunRecord.status).where(
                    ImportRunRecord.organization_id == organization_id,
                    ImportRunRecord.supplier_id == supplier_id,
                    ImportRunRecord.id == version.source_import_id,
                )
            )
            if import_status != ImportStatus.DRAFT.value:
                raise PriceListApprovalError(
                    PriceListApprovalErrorCode.PRICE_LIST_VERSION_NOT_READY_FOR_REVIEW,
                    "Import منبع این نسخه برای تأیید معتبر نیست.",
                )
            review_record = await self._lock_review(
                database,
                organization_id=organization_id,
                supplier_id=supplier_id,
                version_id=version_id,
            )
            if review_record is None:
                raise _not_found()
            current_record = await database.scalar(
                select(CurrentPriceListVersionRecord)
                .where(
                    CurrentPriceListVersionRecord.organization_id == organization_id,
                    CurrentPriceListVersionRecord.supplier_id == supplier_id,
                )
                .with_for_update()
            )
            current_id = current_record.version_id if current_record else None
            if current_id != expected_current_version_id:
                raise PriceListApprovalError(
                    PriceListApprovalErrorCode.CURRENT_PRICE_VERSION_CHANGED,
                    "قیمت جاری تغییر کرده است؛ اطلاعات تازه را بررسی کنید.",
                    {"current_version_id": str(current_id) if current_id else None},
                )
            actor_email = await self._actor_email(database, actor_user_id)
            approved = approve_version_review(
                _to_review(review_record),
                actor_user_id=actor_user_id,
                actor_email=actor_email,
                decided_at=decided_at,
                decision_note=decision_note,
            )
            _apply_review(review_record, approved)
            if current_record is None:
                database.add(
                    CurrentPriceListVersionRecord(
                        organization_id=organization_id,
                        supplier_id=supplier_id,
                        version_id=version_id,
                        set_by_user_id=actor_user_id,
                        set_by_email=actor_email,
                        set_at=decided_at,
                    )
                )
            else:
                current_record.version_id = version_id
                current_record.set_by_user_id = actor_user_id
                current_record.set_by_email = actor_email
                current_record.set_at = decided_at
            database.add(
                _audit_record(
                    organization_id=organization_id,
                    supplier_id=supplier_id,
                    actor_user_id=actor_user_id,
                    actor_email=actor_email,
                    action=AuditAction.PRICE_LIST_VERSION_APPROVED,
                    version_id=version_id,
                    occurred_at=decided_at,
                    decision_note=approved.decision_note,
                    previous_current_version_id=current_id,
                    new_current_version_id=version_id,
                )
            )
        return ApprovalResult(approved, current_id, version_id)

    async def reject(
        self,
        *,
        organization_id: UUID,
        supplier_id: UUID,
        version_id: UUID,
        actor_user_id: UUID,
        reason: str,
    ) -> ApprovalResult:
        decided_at = datetime.now(UTC)
        async with self._session_factory() as database, database.begin():
            if (
                await self._lock_supplier(
                    database, organization_id=organization_id, supplier_id=supplier_id
                )
                is None
            ):
                raise _not_found()
            if (
                await self._lock_version(
                    database,
                    organization_id=organization_id,
                    supplier_id=supplier_id,
                    version_id=version_id,
                )
                is None
            ):
                raise _not_found()
            review_record = await self._lock_review(
                database,
                organization_id=organization_id,
                supplier_id=supplier_id,
                version_id=version_id,
            )
            if review_record is None:
                raise _not_found()
            current_id = await database.scalar(
                select(CurrentPriceListVersionRecord.version_id).where(
                    CurrentPriceListVersionRecord.organization_id == organization_id,
                    CurrentPriceListVersionRecord.supplier_id == supplier_id,
                )
            )
            actor_email = await self._actor_email(database, actor_user_id)
            rejected = reject_version_review(
                _to_review(review_record),
                actor_user_id=actor_user_id,
                actor_email=actor_email,
                decided_at=decided_at,
                reason=reason,
            )
            _apply_review(review_record, rejected)
            database.add(
                _audit_record(
                    organization_id=organization_id,
                    supplier_id=supplier_id,
                    actor_user_id=actor_user_id,
                    actor_email=actor_email,
                    action=AuditAction.PRICE_LIST_VERSION_REJECTED,
                    version_id=version_id,
                    occurred_at=decided_at,
                    decision_note=rejected.decision_note,
                    previous_current_version_id=current_id,
                    new_current_version_id=current_id,
                )
            )
        return ApprovalResult(rejected, current_id, current_id)

    async def get_current_version_id(
        self, *, organization_id: UUID, supplier_id: UUID
    ) -> tuple[bool, UUID | None]:
        async with self._session_factory() as database:
            supplier_exists = await database.scalar(
                select(SupplierRecord.id).where(
                    SupplierRecord.organization_id == organization_id,
                    SupplierRecord.id == supplier_id,
                )
            )
            if supplier_exists is None:
                return False, None
            version_id = await database.scalar(
                select(CurrentPriceListVersionRecord.version_id).where(
                    CurrentPriceListVersionRecord.organization_id == organization_id,
                    CurrentPriceListVersionRecord.supplier_id == supplier_id,
                )
            )
            return True, version_id

    async def list_audit_events(
        self,
        *,
        organization_id: UUID,
        supplier_id: UUID,
        version_id: UUID,
        limit: int,
        offset: int,
    ) -> AuditEventPage | None:
        version_scope = (
            PriceListVersionRecord.organization_id == organization_id,
            PriceListVersionRecord.supplier_id == supplier_id,
            PriceListVersionRecord.id == version_id,
        )
        audit_scope = (
            AuditLogRecord.organization_id == organization_id,
            AuditLogRecord.supplier_id == supplier_id,
            AuditLogRecord.entity_id == version_id,
        )
        async with self._session_factory() as database:
            if (
                await database.scalar(select(PriceListVersionRecord.id).where(*version_scope))
                is None
            ):
                return None
            total = await database.scalar(
                select(func.count()).select_from(AuditLogRecord).where(*audit_scope)
            )
            records = await database.scalars(
                select(AuditLogRecord)
                .where(*audit_scope)
                .order_by(AuditLogRecord.occurred_at.desc(), AuditLogRecord.id.desc())
                .limit(limit)
                .offset(offset)
            )
            return AuditEventPage(
                items=tuple(_to_audit_event(record) for record in records.all()),
                total=total or 0,
                limit=limit,
                offset=offset,
            )

    @staticmethod
    async def _lock_supplier(
        database: AsyncSession, *, organization_id: UUID, supplier_id: UUID
    ) -> SupplierRecord | None:
        return cast(
            SupplierRecord | None,
            await database.scalar(
                select(SupplierRecord)
                .where(
                    SupplierRecord.organization_id == organization_id,
                    SupplierRecord.id == supplier_id,
                )
                .with_for_update()
            ),
        )

    @staticmethod
    async def _lock_version(
        database: AsyncSession,
        *,
        organization_id: UUID,
        supplier_id: UUID,
        version_id: UUID,
    ) -> PriceListVersionRecord | None:
        return cast(
            PriceListVersionRecord | None,
            await database.scalar(
                select(PriceListVersionRecord)
                .where(
                    PriceListVersionRecord.organization_id == organization_id,
                    PriceListVersionRecord.supplier_id == supplier_id,
                    PriceListVersionRecord.id == version_id,
                )
                .with_for_update()
            ),
        )

    @staticmethod
    async def _lock_review(
        database: AsyncSession,
        *,
        organization_id: UUID,
        supplier_id: UUID,
        version_id: UUID,
    ) -> PriceListVersionReviewRecord | None:
        return cast(
            PriceListVersionReviewRecord | None,
            await database.scalar(
                select(PriceListVersionReviewRecord)
                .where(
                    PriceListVersionReviewRecord.organization_id == organization_id,
                    PriceListVersionReviewRecord.supplier_id == supplier_id,
                    PriceListVersionReviewRecord.version_id == version_id,
                )
                .with_for_update()
            ),
        )

    @staticmethod
    async def _actor_email(database: AsyncSession, actor_user_id: UUID) -> str:
        actor_email = await database.scalar(
            select(UserRecord.email).where(UserRecord.id == actor_user_id)
        )
        if actor_email is None:
            raise _not_found()
        return actor_email


def _to_review(record: PriceListVersionReviewRecord) -> PriceListVersionReview:
    return PriceListVersionReview(
        version_id=record.version_id,
        organization_id=record.organization_id,
        supplier_id=record.supplier_id,
        status=ReviewStatus(record.status),
        decided_by_user_id=record.decided_by_user_id,
        decided_by_email=record.decided_by_email,
        decided_at=record.decided_at,
        decision_note=record.decision_note,
        created_at=record.created_at,
    )


def _apply_review(record: PriceListVersionReviewRecord, review: PriceListVersionReview) -> None:
    record.status = review.status.value
    record.decided_by_user_id = review.decided_by_user_id
    record.decided_by_email = review.decided_by_email
    record.decided_at = review.decided_at
    record.decision_note = review.decision_note


def _audit_record(
    *,
    organization_id: UUID,
    supplier_id: UUID,
    actor_user_id: UUID,
    actor_email: str,
    action: AuditAction,
    version_id: UUID,
    occurred_at: datetime,
    decision_note: str | None,
    previous_current_version_id: UUID | None,
    new_current_version_id: UUID | None,
) -> AuditLogRecord:
    return AuditLogRecord(
        id=uuid4(),
        organization_id=organization_id,
        supplier_id=supplier_id,
        actor_user_id=actor_user_id,
        actor_email=actor_email,
        action=action.value,
        entity_type="PRICE_LIST_VERSION",
        entity_id=version_id,
        occurred_at=occurred_at,
        details={
            "previous_status": ReviewStatus.READY_FOR_REVIEW.value,
            "new_status": (
                ReviewStatus.APPROVED.value
                if action is AuditAction.PRICE_LIST_VERSION_APPROVED
                else ReviewStatus.REJECTED.value
            ),
            "previous_current_version_id": (
                str(previous_current_version_id) if previous_current_version_id else None
            ),
            "new_current_version_id": (
                str(new_current_version_id) if new_current_version_id else None
            ),
            "decision_note": decision_note,
        },
    )


def _to_audit_event(record: AuditLogRecord) -> PriceListAuditEvent:
    return PriceListAuditEvent(
        id=record.id,
        organization_id=record.organization_id,
        supplier_id=record.supplier_id,
        actor_user_id=record.actor_user_id,
        actor_email=record.actor_email,
        action=AuditAction(record.action),
        entity_type=record.entity_type,
        entity_id=record.entity_id,
        occurred_at=record.occurred_at,
        details=record.details,
    )


def _not_found() -> PriceListApprovalError:
    return PriceListApprovalError(
        PriceListApprovalErrorCode.PRICE_LIST_VERSION_NOT_FOUND,
        "نسخه قیمت موردنظر پیدا نشد.",
    )
