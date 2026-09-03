"""Create tenant-scoped suppliers.

Revision ID: 20260902_0006
Revises: 20260828_0005
Create Date: 2026-09-02
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "20260902_0006"
down_revision: str | None = "20260828_0005"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "suppliers",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("normalized_name", sa.String(length=120), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default="true", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint("char_length(name) BETWEEN 2 AND 120", name="ck_suppliers_name_length"),
        sa.CheckConstraint(
            "char_length(normalized_name) BETWEEN 2 AND 120",
            name="ck_suppliers_normalized_name_length",
        ),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "organization_id",
            "normalized_name",
            name="uq_suppliers_organization_normalized_name",
        ),
    )
    op.create_index(
        "ix_suppliers_organization_active_name",
        "suppliers",
        ["organization_id", "is_active", "normalized_name", "id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_suppliers_organization_active_name", table_name="suppliers")
    op.drop_table("suppliers")
