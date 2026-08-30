from datetime import datetime
from uuid import UUID

from sqlalchemy import and_, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from ..application.ports import LoginCandidate, MembershipChoice, SessionLookup
from ..domain.enums import OrganizationRole
from ..domain.errors import AccountError, AccountErrorCode
from ..domain.models import SafeAccountContext
from .orm import (
    OrganizationMembershipRecord,
    OrganizationRecord,
    SessionRecord,
    UserRecord,
)


class SqlAlchemyAccountStore:
    def __init__(self, session_factory: async_sessionmaker[AsyncSession]) -> None:
        self._session_factory = session_factory

    async def create_registered_account(
        self,
        *,
        user_id: UUID,
        email: str,
        password_hash: str,
        organization_id: UUID,
        organization_name: str,
        session_id: UUID,
        session_token_hash: str,
        csrf_token_hash: str,
        expires_at: datetime,
    ) -> SafeAccountContext:
        try:
            async with self._session_factory() as database, database.begin():
                database.add_all(
                    [
                        UserRecord(
                            id=user_id,
                            email=email,
                            password_hash=password_hash,
                            is_active=True,
                        ),
                        OrganizationRecord(id=organization_id, name=organization_name),
                    ]
                )
                await database.flush()
                database.add(
                    OrganizationMembershipRecord(
                        user_id=user_id,
                        organization_id=organization_id,
                        role=OrganizationRole.OWNER.value,
                    )
                )
                await database.flush()
                database.add(
                    SessionRecord(
                        id=session_id,
                        user_id=user_id,
                        organization_id=organization_id,
                        token_hash=session_token_hash,
                        csrf_token_hash=csrf_token_hash,
                        expires_at=expires_at,
                    )
                )
        except IntegrityError as exc:
            if _integrity_constraint_name(exc) == "uq_users_email":
                raise AccountError(
                    AccountErrorCode.EMAIL_ALREADY_REGISTERED,
                    "برای این ایمیل قبلاً حسابی ثبت شده است.",
                ) from exc
            raise

        return SafeAccountContext(
            user_id=user_id,
            email=email,
            organization_id=organization_id,
            organization_name=organization_name,
            role=OrganizationRole.OWNER,
        )

    async def get_login_candidate(self, email: str) -> LoginCandidate | None:
        async with self._session_factory() as database:
            user = await database.scalar(select(UserRecord).where(UserRecord.email == email))
            if user is None:
                return None
            memberships_result = await database.execute(
                select(OrganizationMembershipRecord, OrganizationRecord)
                .join(
                    OrganizationRecord,
                    OrganizationRecord.id == OrganizationMembershipRecord.organization_id,
                )
                .where(OrganizationMembershipRecord.user_id == user.id)
                .limit(2)
            )
            memberships = tuple(
                MembershipChoice(
                    organization_id=organization.id,
                    organization_name=organization.name,
                    role=OrganizationRole(membership.role),
                )
                for membership, organization in memberships_result.all()
            )
            return LoginCandidate(
                user_id=user.id,
                email=user.email,
                password_hash=user.password_hash,
                is_active=user.is_active,
                memberships=memberships,
            )

    async def create_login_session(
        self,
        *,
        user_id: UUID,
        organization_id: UUID,
        session_id: UUID,
        session_token_hash: str,
        csrf_token_hash: str,
        expires_at: datetime,
        replacement_password_hash: str | None,
    ) -> bool:
        async with self._session_factory() as database, database.begin():
            valid_membership = await database.scalar(
                select(OrganizationMembershipRecord.user_id)
                .join(UserRecord, UserRecord.id == OrganizationMembershipRecord.user_id)
                .where(
                    OrganizationMembershipRecord.user_id == user_id,
                    OrganizationMembershipRecord.organization_id == organization_id,
                    UserRecord.is_active.is_(True),
                )
            )
            if valid_membership is None:
                return False
            if replacement_password_hash is not None:
                await database.execute(
                    update(UserRecord)
                    .where(UserRecord.id == user_id)
                    .values(password_hash=replacement_password_hash)
                )
            database.add(
                SessionRecord(
                    id=session_id,
                    user_id=user_id,
                    organization_id=organization_id,
                    token_hash=session_token_hash,
                    csrf_token_hash=csrf_token_hash,
                    expires_at=expires_at,
                )
            )
        return True

    async def get_session(self, token_hash: str) -> SessionLookup | None:
        async with self._session_factory() as database:
            row = (
                await database.execute(
                    select(
                        SessionRecord,
                        UserRecord,
                        OrganizationMembershipRecord,
                        OrganizationRecord,
                    )
                    .join(UserRecord, UserRecord.id == SessionRecord.user_id)
                    .outerjoin(
                        OrganizationMembershipRecord,
                        and_(
                            OrganizationMembershipRecord.user_id == SessionRecord.user_id,
                            OrganizationMembershipRecord.organization_id
                            == SessionRecord.organization_id,
                        ),
                    )
                    .outerjoin(
                        OrganizationRecord,
                        OrganizationRecord.id == OrganizationMembershipRecord.organization_id,
                    )
                    .where(SessionRecord.token_hash == token_hash)
                )
            ).one_or_none()
            if row is None:
                return None
            session, user, membership, organization = row
            account = None
            if membership is not None and organization is not None:
                account = SafeAccountContext(
                    user_id=user.id,
                    email=user.email,
                    organization_id=organization.id,
                    organization_name=organization.name,
                    role=OrganizationRole(membership.role),
                )
            return SessionLookup(
                session_id=session.id,
                csrf_token_hash=session.csrf_token_hash,
                expires_at=session.expires_at,
                revoked_at=session.revoked_at,
                is_active=user.is_active,
                account=account,
            )

    async def revoke_session(self, session_id: UUID, revoked_at: datetime) -> bool:
        async with self._session_factory() as database, database.begin():
            result = await database.execute(
                update(SessionRecord)
                .where(SessionRecord.id == session_id, SessionRecord.revoked_at.is_(None))
                .values(revoked_at=revoked_at)
            )
            return bool(getattr(result, "rowcount", 0))


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
