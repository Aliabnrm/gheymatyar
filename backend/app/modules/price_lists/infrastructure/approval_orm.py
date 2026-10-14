from datetime import datetime
from uuid import UUID

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    ForeignKeyConstraint,
    Index,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PostgreSQLUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.infrastructure.database.base import Base


class PriceListVersionReviewRecord(Base):
    __tablename__ = "price_list_version_reviews"
    __table_args__ = (
        CheckConstraint(
            "status IN ('READY_FOR_REVIEW', 'APPROVED', 'REJECTED')",
            name="ck_price_list_version_reviews_status",
        ),
        CheckConstraint(
            "(status = 'READY_FOR_REVIEW' AND decided_by_user_id IS NULL "
            "AND decided_by_email IS NULL AND decided_at IS NULL AND decision_note IS NULL) OR "
            "(status = 'APPROVED' AND decided_by_user_id IS NOT NULL "
            "AND decided_by_email IS NOT NULL AND decided_at IS NOT NULL) OR "
            "(status = 'REJECTED' AND decided_by_user_id IS NOT NULL "
            "AND decided_by_email IS NOT NULL AND decided_at IS NOT NULL "
            "AND char_length(btrim(decision_note)) BETWEEN 1 AND 500)",
            name="ck_price_list_version_reviews_decision_consistency",
        ),
        CheckConstraint(
            "decision_note IS NULL OR char_length(decision_note) <= 500",
            name="ck_price_list_version_reviews_note_length",
        ),
        ForeignKeyConstraint(
            ["organization_id", "supplier_id", "version_id"],
            [
                "price_list_versions.organization_id",
                "price_list_versions.supplier_id",
                "price_list_versions.id",
            ],
            name="fk_price_list_version_reviews_tenant_version",
            ondelete="RESTRICT",
        ),
        Index(
            "ix_price_list_version_reviews_tenant_supplier_status",
            "organization_id",
            "supplier_id",
            "status",
            "version_id",
        ),
    )

    version_id: Mapped[UUID] = mapped_column(PostgreSQLUUID(as_uuid=True), primary_key=True)
    organization_id: Mapped[UUID] = mapped_column(PostgreSQLUUID(as_uuid=True), nullable=False)
    supplier_id: Mapped[UUID] = mapped_column(PostgreSQLUUID(as_uuid=True), nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False)
    decided_by_user_id: Mapped[UUID | None] = mapped_column(
        PostgreSQLUUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=True
    )
    decided_by_email: Mapped[str | None] = mapped_column(String(320), nullable=True)
    decided_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    decision_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )


class CurrentPriceListVersionRecord(Base):
    __tablename__ = "current_price_list_versions"
    __table_args__ = (
        ForeignKeyConstraint(
            ["organization_id", "supplier_id"],
            ["suppliers.organization_id", "suppliers.id"],
            name="fk_current_price_list_versions_tenant_supplier",
            ondelete="RESTRICT",
        ),
        ForeignKeyConstraint(
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

    organization_id: Mapped[UUID] = mapped_column(PostgreSQLUUID(as_uuid=True), primary_key=True)
    supplier_id: Mapped[UUID] = mapped_column(PostgreSQLUUID(as_uuid=True), primary_key=True)
    version_id: Mapped[UUID] = mapped_column(PostgreSQLUUID(as_uuid=True), nullable=False)
    set_by_user_id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    set_by_email: Mapped[str] = mapped_column(String(320), nullable=False)
    set_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class AuditLogRecord(Base):
    __tablename__ = "audit_logs"
    __table_args__ = (
        CheckConstraint(
            "action IN ('PRICE_LIST_VERSION_APPROVED', 'PRICE_LIST_VERSION_REJECTED')",
            name="ck_audit_logs_action",
        ),
        CheckConstraint(
            "entity_type = 'PRICE_LIST_VERSION'",
            name="ck_audit_logs_entity_type",
        ),
        ForeignKeyConstraint(
            ["organization_id", "supplier_id"],
            ["suppliers.organization_id", "suppliers.id"],
            name="fk_audit_logs_tenant_supplier",
            ondelete="RESTRICT",
        ),
        ForeignKeyConstraint(
            ["organization_id", "supplier_id", "entity_id"],
            [
                "price_list_versions.organization_id",
                "price_list_versions.supplier_id",
                "price_list_versions.id",
            ],
            name="fk_audit_logs_tenant_version",
            ondelete="RESTRICT",
        ),
        Index(
            "ix_audit_logs_tenant_entity_occurred",
            "organization_id",
            "supplier_id",
            "entity_id",
            "occurred_at",
            "id",
        ),
    )

    id: Mapped[UUID] = mapped_column(PostgreSQLUUID(as_uuid=True), primary_key=True)
    organization_id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True), ForeignKey("organizations.id", ondelete="RESTRICT")
    )
    supplier_id: Mapped[UUID] = mapped_column(PostgreSQLUUID(as_uuid=True), nullable=False)
    actor_user_id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    actor_email: Mapped[str] = mapped_column(String(320), nullable=False)
    action: Mapped[str] = mapped_column(String(64), nullable=False)
    entity_type: Mapped[str] = mapped_column(String(32), nullable=False)
    entity_id: Mapped[UUID] = mapped_column(PostgreSQLUUID(as_uuid=True), nullable=False)
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    details: Mapped[dict[str, object]] = mapped_column(JSONB, nullable=False)
