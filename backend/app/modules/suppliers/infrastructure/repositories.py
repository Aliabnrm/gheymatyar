from uuid import UUID

from sqlalchemy import Select, func, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from ..application.dto import SupplierPage, SupplierStatusFilter, UpdateSupplierCommand
from ..domain.errors import SupplierError, SupplierErrorCode
from ..domain.models import Supplier
from .orm import SupplierRecord


class SqlAlchemySupplierStore:
    def __init__(self, session_factory: async_sessionmaker[AsyncSession]) -> None:
        self._session_factory = session_factory

    async def create(
        self,
        *,
        organization_id: UUID,
        supplier_id: UUID,
        name: str,
        normalized_name: str,
    ) -> Supplier:
        record = SupplierRecord(
            id=supplier_id,
            organization_id=organization_id,
            name=name,
            normalized_name=normalized_name,
            is_active=True,
        )
        try:
            async with self._session_factory() as database, database.begin():
                database.add(record)
                await database.flush()
                await database.refresh(record)
        except IntegrityError as exc:
            self._raise_known_integrity_error(exc)
            raise
        return _to_domain(record)

    async def list(
        self,
        *,
        organization_id: UUID,
        status: SupplierStatusFilter,
        limit: int,
        offset: int,
    ) -> SupplierPage:
        filters = [SupplierRecord.organization_id == organization_id]
        if status is SupplierStatusFilter.ACTIVE:
            filters.append(SupplierRecord.is_active.is_(True))
        elif status is SupplierStatusFilter.INACTIVE:
            filters.append(SupplierRecord.is_active.is_(False))
        async with self._session_factory() as database:
            total = await database.scalar(select(func.count(SupplierRecord.id)).where(*filters))
            rows = await database.scalars(
                select(SupplierRecord)
                .where(*filters)
                .order_by(SupplierRecord.normalized_name, SupplierRecord.id)
                .limit(limit)
                .offset(offset)
            )
            return SupplierPage(
                items=tuple(_to_domain(record) for record in rows.all()),
                total=total or 0,
                limit=limit,
                offset=offset,
            )

    async def get(self, *, organization_id: UUID, supplier_id: UUID) -> Supplier | None:
        async with self._session_factory() as database:
            record = await database.scalar(self._scoped_query(organization_id, supplier_id))
            return _to_domain(record) if record else None

    async def update(
        self,
        *,
        organization_id: UUID,
        supplier_id: UUID,
        command: UpdateSupplierCommand,
    ) -> Supplier | None:
        values: dict[str, object] = {"updated_at": func.now()}
        if command.name is not None:
            values.update(name=command.name, normalized_name=command.normalized_name)
        if command.is_active is not None:
            values["is_active"] = command.is_active
        try:
            async with self._session_factory() as database, database.begin():
                record = await database.scalar(
                    update(SupplierRecord)
                    .where(
                        SupplierRecord.organization_id == organization_id,
                        SupplierRecord.id == supplier_id,
                    )
                    .values(**values)
                    .returning(SupplierRecord)
                )
        except IntegrityError as exc:
            self._raise_known_integrity_error(exc)
            raise
        return _to_domain(record) if record else None

    @staticmethod
    def _scoped_query(organization_id: UUID, supplier_id: UUID) -> Select[tuple[SupplierRecord]]:
        return select(SupplierRecord).where(
            SupplierRecord.organization_id == organization_id,
            SupplierRecord.id == supplier_id,
        )

    @staticmethod
    def _raise_known_integrity_error(error: IntegrityError) -> None:
        if _integrity_constraint_name(error) == "uq_suppliers_organization_normalized_name":
            raise SupplierError(
                SupplierErrorCode.SUPPLIER_NAME_ALREADY_EXISTS,
                "تأمین‌کننده‌ای با این نام در سازمان شما وجود دارد.",
            ) from error


def _to_domain(record: SupplierRecord) -> Supplier:
    return Supplier(
        id=record.id,
        organization_id=record.organization_id,
        name=record.name,
        normalized_name=record.normalized_name,
        is_active=record.is_active,
        created_at=record.created_at,
        updated_at=record.updated_at,
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
