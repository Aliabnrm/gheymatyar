from typing import Protocol
from uuid import UUID

from .approval_dto import ApprovalResult, AuditEventPage, CurrentPriceImpactSnapshot


class PriceListApprovalStore(Protocol):
    async def approve(
        self,
        *,
        organization_id: UUID,
        supplier_id: UUID,
        version_id: UUID,
        actor_user_id: UUID,
        expected_current_version_id: UUID | None,
        decision_note: str | None,
    ) -> ApprovalResult: ...

    async def reject(
        self,
        *,
        organization_id: UUID,
        supplier_id: UUID,
        version_id: UUID,
        actor_user_id: UUID,
        reason: str,
    ) -> ApprovalResult: ...

    async def get_current_version_id(
        self, *, organization_id: UUID, supplier_id: UUID
    ) -> tuple[bool, UUID | None]: ...

    async def list_audit_events(
        self,
        *,
        organization_id: UUID,
        supplier_id: UUID,
        version_id: UUID,
        limit: int,
        offset: int,
    ) -> AuditEventPage | None: ...


class CurrentPriceImpactReader(Protocol):
    async def read_snapshot(
        self, *, organization_id: UUID, supplier_id: UUID, version_id: UUID
    ) -> CurrentPriceImpactSnapshot | None: ...
