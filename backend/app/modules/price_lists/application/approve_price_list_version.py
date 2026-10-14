from uuid import UUID

from ..domain.approval_errors import PriceListApprovalError, PriceListApprovalErrorCode
from .approval_dto import ApprovalResult
from .approval_ports import PriceListApprovalStore


class ApprovePriceListVersion:
    def __init__(self, store: PriceListApprovalStore) -> None:
        self._store = store

    async def execute(
        self,
        *,
        organization_id: UUID,
        supplier_id: UUID,
        version_id: UUID,
        actor_user_id: UUID,
        expected_current_version_id: UUID | None,
        confirm_approval: bool,
        decision_note: str | None,
    ) -> ApprovalResult:
        if not confirm_approval:
            raise PriceListApprovalError(
                PriceListApprovalErrorCode.APPROVAL_NOT_CONFIRMED,
                "برای تأیید نسخه و انتخاب قیمت جاری، تأیید صریح لازم است.",
            )
        return await self._store.approve(
            organization_id=organization_id,
            supplier_id=supplier_id,
            version_id=version_id,
            actor_user_id=actor_user_id,
            expected_current_version_id=expected_current_version_id,
            decision_note=decision_note,
        )
