from uuid import UUID

from ..domain.approval_errors import PriceListApprovalError, PriceListApprovalErrorCode
from ..domain.approval_models import validate_decision_note
from .approval_dto import ApprovalResult
from .approval_ports import PriceListApprovalStore


class RejectPriceListVersion:
    def __init__(self, store: PriceListApprovalStore) -> None:
        self._store = store

    async def execute(
        self,
        *,
        organization_id: UUID,
        supplier_id: UUID,
        version_id: UUID,
        actor_user_id: UUID,
        confirm_rejection: bool,
        reason: str,
    ) -> ApprovalResult:
        if not confirm_rejection:
            raise PriceListApprovalError(
                PriceListApprovalErrorCode.REJECTION_NOT_CONFIRMED,
                "برای رد نسخه، تأیید صریح لازم است.",
            )
        normalized_reason = validate_decision_note(reason, required=True)
        assert normalized_reason is not None
        return await self._store.reject(
            organization_id=organization_id,
            supplier_id=supplier_id,
            version_id=version_id,
            actor_user_id=actor_user_id,
            reason=normalized_reason,
        )
