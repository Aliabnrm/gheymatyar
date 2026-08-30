from datetime import UTC
from uuid import uuid4

import pytest
from fastapi import FastAPI
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.modules.accounts.infrastructure.orm import (
    OrganizationMembershipRecord,
    OrganizationRecord,
    UserRecord,
)


@pytest.mark.anyio
async def test_postgresql_membership_role_check_and_foreign_keys(api_app: FastAPI) -> None:
    database = api_app.state.database
    user_id = uuid4()
    organization_id = uuid4()
    async with database.session_factory() as session:
        async with session.begin():
            session.add_all(
                [
                    UserRecord(
                        id=user_id,
                        email=f"constraint-{uuid4().hex}@example.com",
                        password_hash="not-a-real-password-hash",
                        is_active=True,
                    ),
                    OrganizationRecord(id=organization_id, name="سازمان محدودیت"),
                ]
            )
        with pytest.raises(IntegrityError):
            async with session.begin():
                session.add(
                    OrganizationMembershipRecord(
                        user_id=user_id,
                        organization_id=organization_id,
                        role="ADMIN",
                    )
                )
        await session.rollback()
        with pytest.raises(IntegrityError):
            async with session.begin():
                session.add(
                    OrganizationMembershipRecord(
                        user_id=uuid4(),
                        organization_id=organization_id,
                        role="OWNER",
                    )
                )


@pytest.mark.anyio
async def test_postgresql_timestamps_are_timezone_aware(api_app: FastAPI) -> None:
    database = api_app.state.database
    user_id = uuid4()
    async with database.session_factory() as session, session.begin():
        session.add(
            UserRecord(
                id=user_id,
                email=f"timestamp-{uuid4().hex}@example.com",
                password_hash="not-a-real-password-hash",
                is_active=True,
            )
        )
    async with database.session_factory() as session:
        stored = await session.scalar(select(UserRecord).where(UserRecord.id == user_id))

    assert stored is not None
    assert stored.created_at.tzinfo is not None
    assert stored.created_at.utcoffset() == UTC.utcoffset(stored.created_at)
