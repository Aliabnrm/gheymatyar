"""Add price-list approval workflow, current pointer, and audit log."""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "20260921_0010"
down_revision: str | None = "20260918_0009"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "price_list_version_reviews",
        sa.Column("version_id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("supplier_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("status", sa.String(32), nullable=False),
        sa.Column(
            "decided_by_user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="RESTRICT"),
            nullable=True,
        ),
        sa.Column("decided_by_email", sa.String(320), nullable=True),
        sa.Column("decided_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("decision_note", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["organization_id", "supplier_id", "version_id"],
            [
                "price_list_versions.organization_id",
                "price_list_versions.supplier_id",
                "price_list_versions.id",
            ],
            name="fk_price_list_version_reviews_tenant_version",
            ondelete="RESTRICT",
        ),
        sa.CheckConstraint(
            "status IN ('READY_FOR_REVIEW', 'APPROVED', 'REJECTED')",
            name="ck_price_list_version_reviews_status",
        ),
        sa.CheckConstraint(
            "(status = 'READY_FOR_REVIEW' AND decided_by_user_id IS NULL "
            "AND decided_by_email IS NULL AND decided_at IS NULL AND decision_note IS NULL) OR "
            "(status = 'APPROVED' AND decided_by_user_id IS NOT NULL "
            "AND decided_by_email IS NOT NULL AND decided_at IS NOT NULL) OR "
            "(status = 'REJECTED' AND decided_by_user_id IS NOT NULL "
            "AND decided_by_email IS NOT NULL AND decided_at IS NOT NULL "
            "AND char_length(btrim(decision_note)) BETWEEN 1 AND 500)",
            name="ck_price_list_version_reviews_decision_consistency",
        ),
        sa.CheckConstraint(
            "decision_note IS NULL OR char_length(decision_note) <= 500",
            name="ck_price_list_version_reviews_note_length",
        ),
    )
    op.create_index(
        "ix_price_list_version_reviews_tenant_supplier_status",
        "price_list_version_reviews",
        ["organization_id", "supplier_id", "status", "version_id"],
    )
    op.execute(
        sa.text(
            "INSERT INTO price_list_version_reviews "
            "(version_id, organization_id, supplier_id, status, created_at) "
            "SELECT id, organization_id, supplier_id, 'READY_FOR_REVIEW', created_at "
            "FROM price_list_versions"
        )
    )

    op.create_table(
        "current_price_list_versions",
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("supplier_id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("version_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "set_by_user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("set_by_email", sa.String(320), nullable=False),
        sa.Column("set_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["organization_id", "supplier_id"],
            ["suppliers.organization_id", "suppliers.id"],
            name="fk_current_price_list_versions_tenant_supplier",
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["organization_id", "supplier_id", "version_id"],
            [
                "price_list_versions.organization_id",
                "price_list_versions.supplier_id",
                "price_list_versions.id",
            ],
            name="fk_current_price_list_versions_tenant_version",
            ondelete="RESTRICT",
        ),
    )

    op.create_table(
        "audit_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "organization_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("organizations.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("supplier_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "actor_user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("actor_email", sa.String(320), nullable=False),
        sa.Column("action", sa.String(64), nullable=False),
        sa.Column("entity_type", sa.String(32), nullable=False),
        sa.Column("entity_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("occurred_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("details", postgresql.JSONB(), nullable=False),
        sa.ForeignKeyConstraint(
            ["organization_id", "supplier_id"],
            ["suppliers.organization_id", "suppliers.id"],
            name="fk_audit_logs_tenant_supplier",
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["organization_id", "supplier_id", "entity_id"],
            [
                "price_list_versions.organization_id",
                "price_list_versions.supplier_id",
                "price_list_versions.id",
            ],
            name="fk_audit_logs_tenant_version",
            ondelete="RESTRICT",
        ),
        sa.CheckConstraint(
            "action IN ('PRICE_LIST_VERSION_APPROVED', 'PRICE_LIST_VERSION_REJECTED')",
            name="ck_audit_logs_action",
        ),
        sa.CheckConstraint(
            "entity_type = 'PRICE_LIST_VERSION'",
            name="ck_audit_logs_entity_type",
        ),
    )
    op.create_index(
        "ix_audit_logs_tenant_entity_occurred",
        "audit_logs",
        ["organization_id", "supplier_id", "entity_id", "occurred_at", "id"],
    )


def downgrade() -> None:
    op.drop_table("audit_logs")
    op.drop_table("current_price_list_versions")
    op.drop_table("price_list_version_reviews")
