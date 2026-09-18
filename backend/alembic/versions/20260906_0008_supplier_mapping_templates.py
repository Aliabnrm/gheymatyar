"""Add mapping snapshots, immutable rerun lineage and supplier templates."""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "20260906_0008"
down_revision: str | None = "20260903_0007"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "import_runs", sa.Column("parent_import_id", postgresql.UUID(as_uuid=True), nullable=True)
    )
    op.add_column("import_runs", sa.Column("mapping_snapshot", postgresql.JSONB(), nullable=True))
    op.create_unique_constraint(
        "uq_import_runs_tenant_document_id",
        "import_runs",
        ["organization_id", "supplier_id", "source_document_id", "id"],
    )
    op.create_foreign_key(
        "fk_import_runs_parent_same_document",
        "import_runs",
        "import_runs",
        ["organization_id", "supplier_id", "source_document_id", "parent_import_id"],
        ["organization_id", "supplier_id", "source_document_id", "id"],
        ondelete="RESTRICT",
    )
    op.create_table(
        "supplier_mapping_templates",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("supplier_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("source_import_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "created_by_user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("sheet_name", sa.String(31), nullable=False),
        sa.Column("header_row", sa.Integer(), nullable=False),
        sa.Column("columns", postgresql.JSONB(), nullable=False),
        sa.Column("header_signature", postgresql.JSONB(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.ForeignKeyConstraint(
            ["organization_id", "supplier_id"],
            ["suppliers.organization_id", "suppliers.id"],
            name="fk_mapping_templates_tenant_supplier",
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["organization_id", "supplier_id", "source_import_id"],
            ["import_runs.organization_id", "import_runs.supplier_id", "import_runs.id"],
            name="fk_mapping_templates_tenant_import",
            ondelete="RESTRICT",
        ),
        sa.CheckConstraint("header_row > 0", name="ck_mapping_templates_header_positive"),
    )
    op.create_index(
        "uq_mapping_templates_active_supplier",
        "supplier_mapping_templates",
        ["organization_id", "supplier_id"],
        unique=True,
        postgresql_where=sa.text("is_active"),
    )


def downgrade() -> None:
    op.drop_table("supplier_mapping_templates")
    op.drop_constraint("fk_import_runs_parent_same_document", "import_runs", type_="foreignkey")
    op.drop_constraint("uq_import_runs_tenant_document_id", "import_runs", type_="unique")
    op.drop_column("import_runs", "mapping_snapshot")
    op.drop_column("import_runs", "parent_import_id")
