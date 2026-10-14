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
from sqlalchemy.dialects.postgresql import UUID as PostgreSQLUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.infrastructure.database.base import Base


class PriceListVersionRecord(Base):
    __tablename__ = "price_list_versions"
    __table_args__ = (
        CheckConstraint("version_number > 0", name="ck_price_list_versions_number_positive"),
        CheckConstraint("row_count > 0", name="ck_price_list_versions_row_count_positive"),
        CheckConstraint(
            "(version_number = 1 AND previous_version_id IS NULL) OR "
            "(version_number > 1 AND previous_version_id IS NOT NULL)",
            name="ck_price_list_versions_lineage_consistency",
        ),
        ForeignKeyConstraint(
            ["organization_id", "supplier_id"],
            ["suppliers.organization_id", "suppliers.id"],
            name="fk_price_list_versions_tenant_supplier",
            ondelete="RESTRICT",
        ),
        ForeignKeyConstraint(
            ["organization_id", "supplier_id", "source_import_id"],
            ["import_runs.organization_id", "import_runs.supplier_id", "import_runs.id"],
            name="fk_price_list_versions_tenant_import",
            ondelete="RESTRICT",
        ),
        UniqueConstraint(
            "organization_id",
            "supplier_id",
            "id",
            name="uq_price_list_versions_tenant_supplier_id",
        ),
        ForeignKeyConstraint(
            ["organization_id", "supplier_id", "previous_version_id"],
            [
                "price_list_versions.organization_id",
                "price_list_versions.supplier_id",
                "price_list_versions.id",
            ],
            name="fk_price_list_versions_previous_same_supplier",
            ondelete="RESTRICT",
        ),
        UniqueConstraint(
            "organization_id",
            "supplier_id",
            "version_number",
            name="uq_price_list_versions_tenant_supplier_number",
        ),
        UniqueConstraint(
            "organization_id",
            "supplier_id",
            "source_import_id",
            name="uq_price_list_versions_tenant_supplier_import",
        ),
        UniqueConstraint(
            "organization_id",
            "supplier_id",
            "previous_version_id",
            name="uq_price_list_versions_tenant_supplier_previous",
        ),
        Index(
            "ix_price_list_versions_tenant_supplier_created",
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
    source_import_id: Mapped[UUID] = mapped_column(PostgreSQLUUID(as_uuid=True), nullable=False)
    previous_version_id: Mapped[UUID | None] = mapped_column(
        PostgreSQLUUID(as_uuid=True), nullable=True
    )
    version_number: Mapped[int] = mapped_column(Integer, nullable=False)
    created_by_user_id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )
    row_count: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )


class PriceListVersionItemRecord(Base):
    __tablename__ = "price_list_items"
    __table_args__ = (
        CheckConstraint("source_row_number > 0", name="ck_price_list_items_source_row_positive"),
        CheckConstraint("price_irr > 0", name="ck_price_list_items_price_positive"),
        CheckConstraint(
            "pack_size IS NULL OR pack_size > 0",
            name="ck_price_list_items_pack_size_positive",
        ),
        CheckConstraint(
            "availability IN ('in_stock', 'limited', 'out_of_stock', 'unknown')",
            name="ck_price_list_items_availability",
        ),
        CheckConstraint(
            "char_length(product_code_normalized) BETWEEN 1 AND 255",
            name="ck_price_list_items_product_code_length",
        ),
        ForeignKeyConstraint(
            ["organization_id", "supplier_id", "version_id"],
            [
                "price_list_versions.organization_id",
                "price_list_versions.supplier_id",
                "price_list_versions.id",
            ],
            name="fk_price_list_items_tenant_version",
            ondelete="RESTRICT",
        ),
        UniqueConstraint(
            "organization_id",
            "supplier_id",
            "version_id",
            "product_code_normalized",
            name="uq_price_list_items_tenant_version_code",
        ),
        Index(
            "ix_price_list_items_tenant_version_source_row",
            "organization_id",
            "supplier_id",
            "version_id",
            "source_row_number",
            "id",
        ),
    )

    id: Mapped[UUID] = mapped_column(PostgreSQLUUID(as_uuid=True), primary_key=True)
    organization_id: Mapped[UUID] = mapped_column(PostgreSQLUUID(as_uuid=True), nullable=False)
    supplier_id: Mapped[UUID] = mapped_column(PostgreSQLUUID(as_uuid=True), nullable=False)
    version_id: Mapped[UUID] = mapped_column(PostgreSQLUUID(as_uuid=True), nullable=False)
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
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
