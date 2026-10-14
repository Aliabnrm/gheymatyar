from dataclasses import dataclass
from datetime import datetime
from enum import StrEnum
from uuid import UUID

from .approval_errors import PriceListApprovalError, PriceListApprovalErrorCode

MAX_DECISION_NOTE_LENGTH = 500


class ReviewStatus(StrEnum):
    READY_FOR_REVIEW = "READY_FOR_REVIEW"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


class AuditAction(StrEnum):
    PRICE_LIST_VERSION_APPROVED = "PRICE_LIST_VERSION_APPROVED"
    PRICE_LIST_VERSION_REJECTED = "PRICE_LIST_VERSION_REJECTED"


@dataclass(frozen=True, slots=True)
class PriceListVersionReview:
    version_id: UUID
    organization_id: UUID
    supplier_id: UUID
    status: ReviewStatus
    decided_by_user_id: UUID | None
    decided_by_email: str | None
    decided_at: datetime | None
    decision_note: str | None
    created_at: datetime


@dataclass(frozen=True, slots=True)
class CurrentPriceListVersion:
    organization_id: UUID
    supplier_id: UUID
    version_id: UUID
    set_by_user_id: UUID
    set_by_email: str
    set_at: datetime


@dataclass(frozen=True, slots=True)
class PriceListAuditEvent:
    id: UUID
    organization_id: UUID
    supplier_id: UUID
    actor_user_id: UUID
    actor_email: str
    action: AuditAction
    entity_type: str
    entity_id: UUID
    occurred_at: datetime
    details: dict[str, object]


def approve_version_review(
    review: PriceListVersionReview,
    *,
    actor_user_id: UUID,
    actor_email: str,
    decided_at: datetime,
    decision_note: str | None,
) -> PriceListVersionReview:
    _ensure_ready(review)
    note = validate_decision_note(decision_note, required=False)
    return PriceListVersionReview(
        version_id=review.version_id,
        organization_id=review.organization_id,
        supplier_id=review.supplier_id,
        status=ReviewStatus.APPROVED,
        decided_by_user_id=actor_user_id,
        decided_by_email=actor_email,
        decided_at=decided_at,
        decision_note=note,
        created_at=review.created_at,
    )


def reject_version_review(
    review: PriceListVersionReview,
    *,
    actor_user_id: UUID,
    actor_email: str,
    decided_at: datetime,
    reason: str,
) -> PriceListVersionReview:
    _ensure_ready(review)
    note = validate_decision_note(reason, required=True)
    return PriceListVersionReview(
        version_id=review.version_id,
        organization_id=review.organization_id,
        supplier_id=review.supplier_id,
        status=ReviewStatus.REJECTED,
        decided_by_user_id=actor_user_id,
        decided_by_email=actor_email,
        decided_at=decided_at,
        decision_note=note,
        created_at=review.created_at,
    )


def validate_decision_note(value: str | None, *, required: bool) -> str | None:
    normalized = value.strip() if value is not None else ""
    if required and not normalized:
        raise PriceListApprovalError(
            PriceListApprovalErrorCode.REJECTION_REASON_REQUIRED,
            "برای رد نسخه، دلیل را وارد کنید.",
        )
    if len(normalized) > MAX_DECISION_NOTE_LENGTH:
        raise PriceListApprovalError(
            PriceListApprovalErrorCode.DECISION_NOTE_TOO_LONG,
            "متن تصمیم نباید بیشتر از 500 نویسه باشد.",
        )
    return normalized or None


def _ensure_ready(review: PriceListVersionReview) -> None:
    if review.status is ReviewStatus.APPROVED:
        raise PriceListApprovalError(
            PriceListApprovalErrorCode.PRICE_LIST_VERSION_ALREADY_APPROVED,
            "این نسخه قبلاً تأیید شده است.",
        )
    if review.status is ReviewStatus.REJECTED:
        raise PriceListApprovalError(
            PriceListApprovalErrorCode.PRICE_LIST_VERSION_ALREADY_REJECTED,
            "این نسخه قبلاً رد شده است.",
        )
    if review.status is not ReviewStatus.READY_FOR_REVIEW:
        raise PriceListApprovalError(
            PriceListApprovalErrorCode.PRICE_LIST_VERSION_NOT_READY_FOR_REVIEW,
            "این نسخه برای تصمیم‌گیری آماده نیست.",
        )
