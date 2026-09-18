from datetime import datetime
from uuid import UUID

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    DateTime,
    ForeignKey,
    ForeignKeyConstraint,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PostgreSQLUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.infrastructure.database.base import Base


class SourceDocumentRecord(Base):
    __tablename__ = "source_documents"
    __table_args__ = (
        CheckConstraint("size_bytes > 0", name="ck_source_documents_size_positive"),
        CheckConstraint(
            "sha256_hex ~ '^[0-9a-f]{64}$'",
            name="ck_source_documents_sha256_lower_hex",
        ),
        ForeignKeyConstraint(
            ["organization_id", "supplier_id"],
            ["suppliers.organization_id", "suppliers.id"],
            name="fk_source_documents_tenant_supplier",
            ondelete="RESTRICT",
        ),
        UniqueConstraint("object_key", name="uq_source_documents_object_key"),
        UniqueConstraint(
            "organization_id",
            "supplier_id",
            "sha256_hex",
            name="uq_source_documents_tenant_supplier_sha256",
        ),
        UniqueConstraint(
            "organization_id",
            "supplier_id",
            "id",
            name="uq_source_documents_tenant_supplier_id",
        ),
        Index(
            "ix_source_documents_tenant_supplier_created",
            "organization_id",
            "supplier_id",
            "created_at",
            "id",
        ),
    )

    id: Mapped[UUID] = mapped_column(PostgreSQLUUID(as_uuid=True), primary_key=True)
    organization_id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="RESTRICT"),
        nullable=False,
    )
    supplier_id: Mapped[UUID] = mapped_column(PostgreSQLUUID(as_uuid=True), nullable=False)
    uploaded_by_user_id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )
    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    object_key: Mapped[str] = mapped_column(String(512), nullable=False)
    media_type: Mapped[str] = mapped_column(String(127), nullable=False)
    size_bytes: Mapped[int] = mapped_column(BigInteger, nullable=False)
    sha256_hex: Mapped[str] = mapped_column(String(64), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )


class ImportRunRecord(Base):
    __tablename__ = "import_runs"
    __table_args__ = (
        CheckConstraint("status IN ('DRAFT', 'FAILED')", name="ck_import_runs_status"),
        CheckConstraint("row_count >= 0", name="ck_import_runs_row_count_nonnegative"),
        CheckConstraint(
            "(status = 'DRAFT' AND row_count > 0 AND blocking_error_code IS NULL "
            "AND blocking_error_message IS NULL) OR "
            "(status = 'FAILED' AND row_count = 0 AND blocking_error_code IS NOT NULL "
            "AND blocking_error_message IS NOT NULL)",
            name="ck_import_runs_status_consistency",
        ),
        ForeignKeyConstraint(
            ["organization_id", "supplier_id"],
            ["suppliers.organization_id", "suppliers.id"],
            name="fk_import_runs_tenant_supplier",
            ondelete="RESTRICT",
        ),
        ForeignKeyConstraint(
            ["organization_id", "supplier_id", "source_document_id"],
            [
                "source_documents.organization_id",
                "source_documents.supplier_id",
                "source_documents.id",
            ],
            name="fk_import_runs_tenant_source_document",
            ondelete="RESTRICT",
        ),
        UniqueConstraint(
            "organization_id",
            "supplier_id",
            "id",
            name="uq_import_runs_tenant_supplier_id",
        ),
        UniqueConstraint(
            "organization_id",
            "supplier_id",
            "source_document_id",
            "id",
            name="uq_import_runs_tenant_document_id",
        ),
        ForeignKeyConstraint(
            ["organization_id", "supplier_id", "source_document_id", "parent_import_id"],
            [
                "import_runs.organization_id",
                "import_runs.supplier_id",
                "import_runs.source_document_id",
                "import_runs.id",
            ],
            name="fk_import_runs_parent_same_document",
            ondelete="RESTRICT",
        ),
        Index(
            "ix_import_runs_tenant_supplier_created",
            "organization_id",
            "supplier_id",
            "created_at",
            "id",
        ),
    )

    id: Mapped[UUID] = mapped_column(PostgreSQLUUID(as_uuid=True), primary_key=True)
    organization_id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="RESTRICT"),
        nullable=False,
    )
    supplier_id: Mapped[UUID] = mapped_column(PostgreSQLUUID(as_uuid=True), nullable=False)
    source_document_id: Mapped[UUID] = mapped_column(PostgreSQLUUID(as_uuid=True), nullable=False)
    created_by_user_id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )
    status: Mapped[str] = mapped_column(String(16), nullable=False)
    row_count: Mapped[int] = mapped_column(Integer, nullable=False)
    blocking_error_code: Mapped[str | None] = mapped_column(String(64), nullable=True)
    blocking_error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    blocking_error_details: Mapped[dict[str, object]] = mapped_column(
        JSONB, nullable=False, server_default="{}"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    completed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    parent_import_id: Mapped[UUID | None] = mapped_column(
        PostgreSQLUUID(as_uuid=True), nullable=True
    )
    mapping_snapshot: Mapped[dict[str, object] | None] = mapped_column(JSONB, nullable=True)


class ExtractedRowRecord(Base):
    __tablename__ = "extracted_rows"
    __table_args__ = (
        CheckConstraint("source_row_number > 0", name="ck_extracted_rows_source_row_positive"),
        CheckConstraint("price_irr > 0", name="ck_extracted_rows_price_positive"),
        CheckConstraint(
            "pack_size IS NULL OR pack_size > 0",
            name="ck_extracted_rows_pack_size_positive",
        ),
        CheckConstraint(
            "availability IN ('in_stock', 'limited', 'out_of_stock', 'unknown')",
            name="ck_extracted_rows_availability",
        ),
        CheckConstraint(
            "char_length(product_code_normalized) BETWEEN 1 AND 255",
            name="ck_extracted_rows_product_code_length",
        ),
        ForeignKeyConstraint(
            ["organization_id", "supplier_id", "import_run_id"],
            ["import_runs.organization_id", "import_runs.supplier_id", "import_runs.id"],
            name="fk_extracted_rows_tenant_import_run",
            ondelete="RESTRICT",
        ),
        UniqueConstraint(
            "import_run_id",
            "product_code_normalized",
            name="uq_extracted_rows_import_product_code",
        ),
        Index(
            "ix_extracted_rows_tenant_import_source_row",
            "organization_id",
            "import_run_id",
            "source_row_number",
            "id",
        ),
    )

    id: Mapped[UUID] = mapped_column(PostgreSQLUUID(as_uuid=True), primary_key=True)
    organization_id: Mapped[UUID] = mapped_column(PostgreSQLUUID(as_uuid=True), nullable=False)
    supplier_id: Mapped[UUID] = mapped_column(PostgreSQLUUID(as_uuid=True), nullable=False)
    import_run_id: Mapped[UUID] = mapped_column(PostgreSQLUUID(as_uuid=True), nullable=False)
    source_row_number: Mapped[int] = mapped_column(Integer, nullable=False)
    product_code_raw: Mapped[str] = mapped_column(Text, nullable=False)
    product_code_normalized: Mapped[str] = mapped_column(String(255), nullable=False)
    product_name_raw: Mapped[str] = mapped_column(Text, nullable=False)
    product_name_normalized: Mapped[str] = mapped_column(Text, nullable=False)
    brand: Mapped[str | None] = mapped_column(Text, nullable=True)
    unit: Mapped[str | None] = mapped_column(Text, nullable=True)
    pack_size: Mapped[int | None] = mapped_column(Integer, nullable=True)
    price_irr: Mapped[int] = mapped_column(BigInteger, nullable=False)
    availability: Mapped[str] = mapped_column(String(32), nullable=False)
    availability_raw: Mapped[str | None] = mapped_column(Text, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    raw_row: Mapped[dict[str, object]] = mapped_column(JSONB, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
