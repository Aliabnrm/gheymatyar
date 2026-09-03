from datetime import datetime
from uuid import UUID

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import UUID as PostgreSQLUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.infrastructure.database.base import Base


class SupplierRecord(Base):
    __tablename__ = "suppliers"
    __table_args__ = (
        CheckConstraint("char_length(name) BETWEEN 2 AND 120", name="ck_suppliers_name_length"),
        CheckConstraint(
            "char_length(normalized_name) BETWEEN 2 AND 120",
            name="ck_suppliers_normalized_name_length",
        ),
        UniqueConstraint(
            "organization_id",
            "normalized_name",
            name="uq_suppliers_organization_normalized_name",
        ),
        Index(
            "ix_suppliers_organization_active_name",
            "organization_id",
            "is_active",
            "normalized_name",
            "id",
        ),
    )

    id: Mapped[UUID] = mapped_column(PostgreSQLUUID(as_uuid=True), primary_key=True)
    organization_id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="RESTRICT"),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    normalized_name: Mapped[str] = mapped_column(String(120), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="true")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
