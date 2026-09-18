"""Create persisted price-list import drafts.

Revision ID: 20260903_0007
Revises: 20260902_0006
Create Date: 2026-09-03
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "20260903_0007"
down_revision: str | None = "20260902_0006"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_unique_constraint(
        "uq_suppliers_organization_id_id",
        "suppliers",
        ["organization_id", "id"],
    )
    op.create_table(
        "source_documents",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("supplier_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("uploaded_by_user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("original_filename", sa.String(length=255), nullable=False),
        sa.Column("object_key", sa.String(length=512), nullable=False),
        sa.Column("media_type", sa.String(length=127), nullable=False),
        sa.Column("size_bytes", sa.BigInteger(), nullable=False),
        sa.Column("sha256_hex", sa.String(length=64), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint("size_bytes > 0", name="ck_source_documents_size_positive"),
        sa.CheckConstraint(
            "sha256_hex ~ '^[0-9a-f]{64}$'",
            name="ck_source_documents_sha256_lower_hex",
        ),
        sa.ForeignKeyConstraint(
            ["organization_id"],
            ["organizations.id"],
            name="fk_source_documents_organization",
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["organization_id", "supplier_id"],
            ["suppliers.organization_id", "suppliers.id"],
            name="fk_source_documents_tenant_supplier",
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["uploaded_by_user_id"],
            ["users.id"],
            name="fk_source_documents_uploaded_by_user",
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("object_key", name="uq_source_documents_object_key"),
        sa.UniqueConstraint(
            "organization_id",
            "supplier_id",
            "sha256_hex",
            name="uq_source_documents_tenant_supplier_sha256",
        ),
        sa.UniqueConstraint(
            "organization_id",
            "supplier_id",
            "id",
            name="uq_source_documents_tenant_supplier_id",
        ),
    )
    op.create_index(
        "ix_source_documents_tenant_supplier_created",
        "source_documents",
        ["organization_id", "supplier_id", "created_at", "id"],
    )
    op.create_table(
        "import_runs",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("supplier_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("source_document_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_by_user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("status", sa.String(length=16), nullable=False),
        sa.Column("row_count", sa.Integer(), nullable=False),
        sa.Column("blocking_error_code", sa.String(length=64), nullable=True),
        sa.Column("blocking_error_message", sa.Text(), nullable=True),
        sa.Column(
            "blocking_error_details",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'{}'::jsonb"),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("status IN ('DRAFT', 'FAILED')", name="ck_import_runs_status"),
        sa.CheckConstraint("row_count >= 0", name="ck_import_runs_row_count_nonnegative"),
        sa.CheckConstraint(
            "(status = 'DRAFT' AND row_count > 0 AND blocking_error_code IS NULL "
            "AND blocking_error_message IS NULL) OR "
            "(status = 'FAILED' AND row_count = 0 AND blocking_error_code IS NOT NULL "
            "AND blocking_error_message IS NOT NULL)",
            name="ck_import_runs_status_consistency",
        ),
        sa.ForeignKeyConstraint(
            ["organization_id"],
            ["organizations.id"],
            name="fk_import_runs_organization",
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["organization_id", "supplier_id"],
            ["suppliers.organization_id", "suppliers.id"],
            name="fk_import_runs_tenant_supplier",
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["organization_id", "supplier_id", "source_document_id"],
            [
                "source_documents.organization_id",
                "source_documents.supplier_id",
                "source_documents.id",
            ],
            name="fk_import_runs_tenant_source_document",
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["created_by_user_id"],
            ["users.id"],
            name="fk_import_runs_created_by_user",
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "organization_id",
            "supplier_id",
            "id",
            name="uq_import_runs_tenant_supplier_id",
        ),
    )
    op.create_index(
        "ix_import_runs_tenant_supplier_created",
        "import_runs",
        ["organization_id", "supplier_id", "created_at", "id"],
    )
    op.create_table(
        "extracted_rows",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("supplier_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("import_run_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("source_row_number", sa.Integer(), nullable=False),
        sa.Column("product_code_raw", sa.Text(), nullable=False),
        sa.Column("product_code_normalized", sa.String(length=255), nullable=False),
        sa.Column("product_name_raw", sa.Text(), nullable=False),
        sa.Column("product_name_normalized", sa.Text(), nullable=False),
        sa.Column("brand", sa.Text(), nullable=True),
        sa.Column("unit", sa.Text(), nullable=True),
        sa.Column("pack_size", sa.Integer(), nullable=True),
        sa.Column("price_irr", sa.BigInteger(), nullable=False),
        sa.Column("availability", sa.String(length=32), nullable=False),
        sa.Column("availability_raw", sa.Text(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("raw_row", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint("source_row_number > 0", name="ck_extracted_rows_source_row_positive"),
        sa.CheckConstraint("price_irr > 0", name="ck_extracted_rows_price_positive"),
        sa.CheckConstraint(
            "pack_size IS NULL OR pack_size > 0",
            name="ck_extracted_rows_pack_size_positive",
        ),
        sa.CheckConstraint(
            "availability IN ('in_stock', 'limited', 'out_of_stock', 'unknown')",
            name="ck_extracted_rows_availability",
        ),
        sa.CheckConstraint(
            "char_length(product_code_normalized) BETWEEN 1 AND 255",
            name="ck_extracted_rows_product_code_length",
        ),
        sa.ForeignKeyConstraint(
            ["organization_id", "supplier_id", "import_run_id"],
            ["import_runs.organization_id", "import_runs.supplier_id", "import_runs.id"],
            name="fk_extracted_rows_tenant_import_run",
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "import_run_id",
            "product_code_normalized",
            name="uq_extracted_rows_import_product_code",
        ),
    )
    op.create_index(
        "ix_extracted_rows_tenant_import_source_row",
        "extracted_rows",
        ["organization_id", "import_run_id", "source_row_number", "id"],
    )


def downgrade() -> None:
    op.drop_index("ix_extracted_rows_tenant_import_source_row", table_name="extracted_rows")
    op.drop_table("extracted_rows")
    op.drop_index("ix_import_runs_tenant_supplier_created", table_name="import_runs")
    op.drop_table("import_runs")
    op.drop_index("ix_source_documents_tenant_supplier_created", table_name="source_documents")
    op.drop_table("source_documents")
    op.drop_constraint("uq_suppliers_organization_id_id", "suppliers", type_="unique")
