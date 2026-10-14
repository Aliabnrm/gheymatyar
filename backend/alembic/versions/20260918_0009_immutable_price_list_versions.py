"""Add immutable price-list versions and version items."""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "20260918_0009"
down_revision: str | None = "20260906_0008"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "price_list_versions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("supplier_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("source_import_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("previous_version_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("version_number", sa.Integer(), nullable=False),
        sa.Column(
            "created_by_user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("row_count", sa.Integer(), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(
            ["organization_id", "supplier_id"],
            ["suppliers.organization_id", "suppliers.id"],
            name="fk_price_list_versions_tenant_supplier",
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["organization_id", "supplier_id", "source_import_id"],
            ["import_runs.organization_id", "import_runs.supplier_id", "import_runs.id"],
            name="fk_price_list_versions_tenant_import",
            ondelete="RESTRICT",
        ),
        sa.UniqueConstraint(
            "organization_id",
            "supplier_id",
            "id",
            name="uq_price_list_versions_tenant_supplier_id",
        ),
        sa.ForeignKeyConstraint(
            ["organization_id", "supplier_id", "previous_version_id"],
            [
                "price_list_versions.organization_id",
                "price_list_versions.supplier_id",
                "price_list_versions.id",
            ],
            name="fk_price_list_versions_previous_same_supplier",
            ondelete="RESTRICT",
        ),
        sa.UniqueConstraint(
            "organization_id",
            "supplier_id",
            "version_number",
            name="uq_price_list_versions_tenant_supplier_number",
        ),
        sa.UniqueConstraint(
            "organization_id",
            "supplier_id",
            "source_import_id",
            name="uq_price_list_versions_tenant_supplier_import",
        ),
        sa.UniqueConstraint(
            "organization_id",
            "supplier_id",
            "previous_version_id",
            name="uq_price_list_versions_tenant_supplier_previous",
        ),
        sa.CheckConstraint("version_number > 0", name="ck_price_list_versions_number_positive"),
        sa.CheckConstraint("row_count > 0", name="ck_price_list_versions_row_count_positive"),
        sa.CheckConstraint(
            "(version_number = 1 AND previous_version_id IS NULL) OR "
            "(version_number > 1 AND previous_version_id IS NOT NULL)",
            name="ck_price_list_versions_lineage_consistency",
        ),
    )
    op.create_index(
        "ix_price_list_versions_tenant_supplier_created",
        "price_list_versions",
        ["organization_id", "supplier_id", "created_at", "id"],
    )
    op.create_table(
        "price_list_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("supplier_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("version_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("source_row_number", sa.Integer(), nullable=False),
        sa.Column("product_code_raw", sa.Text(), nullable=False),
        sa.Column("product_code_normalized", sa.String(255), nullable=False),
        sa.Column("product_name_raw", sa.Text(), nullable=False),
        sa.Column("product_name_normalized", sa.Text(), nullable=False),
        sa.Column("brand", sa.Text(), nullable=True),
        sa.Column("unit", sa.Text(), nullable=True),
        sa.Column("pack_size", sa.Integer(), nullable=True),
        sa.Column("price_irr", sa.BigInteger(), nullable=False),
        sa.Column("availability", sa.String(32), nullable=False),
        sa.Column("availability_raw", sa.Text(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.ForeignKeyConstraint(
            ["organization_id", "supplier_id", "version_id"],
            [
                "price_list_versions.organization_id",
                "price_list_versions.supplier_id",
                "price_list_versions.id",
            ],
            name="fk_price_list_items_tenant_version",
            ondelete="RESTRICT",
        ),
        sa.UniqueConstraint(
            "organization_id",
            "supplier_id",
            "version_id",
            "product_code_normalized",
            name="uq_price_list_items_tenant_version_code",
        ),
        sa.CheckConstraint("source_row_number > 0", name="ck_price_list_items_source_row_positive"),
        sa.CheckConstraint("price_irr > 0", name="ck_price_list_items_price_positive"),
        sa.CheckConstraint(
            "pack_size IS NULL OR pack_size > 0",
            name="ck_price_list_items_pack_size_positive",
        ),
        sa.CheckConstraint(
            "availability IN ('in_stock', 'limited', 'out_of_stock', 'unknown')",
            name="ck_price_list_items_availability",
        ),
        sa.CheckConstraint(
            "char_length(product_code_normalized) BETWEEN 1 AND 255",
            name="ck_price_list_items_product_code_length",
        ),
    )
    op.create_index(
        "ix_price_list_items_tenant_version_source_row",
        "price_list_items",
        ["organization_id", "supplier_id", "version_id", "source_row_number", "id"],
    )


def downgrade() -> None:
    op.drop_table("price_list_items")
    op.drop_table("price_list_versions")
