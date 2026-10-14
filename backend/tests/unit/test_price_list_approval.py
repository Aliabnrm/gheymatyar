from datetime import UTC, datetime
from uuid import uuid4

import pytest

from app.modules.price_lists.domain.approval_errors import (
    PriceListApprovalError,
    PriceListApprovalErrorCode,
)
from app.modules.price_lists.domain.approval_models import (
    PriceListVersionReview,
    ReviewStatus,
    approve_version_review,
    reject_version_review,
    validate_decision_note,
)


def _review(status: ReviewStatus = ReviewStatus.READY_FOR_REVIEW) -> PriceListVersionReview:
    now = datetime.now(UTC)
    decided = status is not ReviewStatus.READY_FOR_REVIEW
    return PriceListVersionReview(
        version_id=uuid4(),
        organization_id=uuid4(),
        supplier_id=uuid4(),
        status=status,
        decided_by_user_id=uuid4() if decided else None,
        decided_by_email="owner@example.com" if decided else None,
        decided_at=now if decided else None,
        decision_note="دلیل" if status is ReviewStatus.REJECTED else None,
        created_at=now,
    )


def test_ready_review_can_be_approved_with_actor_and_trimmed_note() -> None:
    actor_id = uuid4()
    now = datetime.now(UTC)

    result = approve_version_review(
        _review(),
        actor_user_id=actor_id,
        actor_email="owner@example.com",
        decided_at=now,
        decision_note="  بررسی شد  ",
    )

    assert result.status is ReviewStatus.APPROVED
    assert result.decided_by_user_id == actor_id
    assert result.decided_at == now
    assert result.decision_note == "بررسی شد"


def test_ready_review_can_be_rejected_only_with_reason() -> None:
    actor_id = uuid4()
    now = datetime.now(UTC)
    result = reject_version_review(
        _review(),
        actor_user_id=actor_id,
        actor_email="owner@example.com",
        decided_at=now,
        reason="  تعداد بسته نادرست است  ",
    )
    assert result.status is ReviewStatus.REJECTED
    assert result.decision_note == "تعداد بسته نادرست است"

    with pytest.raises(PriceListApprovalError) as error:
        reject_version_review(
            _review(),
            actor_user_id=actor_id,
            actor_email="owner@example.com",
            decided_at=now,
            reason="   ",
        )
    assert error.value.code is PriceListApprovalErrorCode.REJECTION_REASON_REQUIRED


@pytest.mark.parametrize("status", [ReviewStatus.APPROVED, ReviewStatus.REJECTED])
@pytest.mark.parametrize("action", ["approve", "reject"])
def test_terminal_reviews_cannot_transition(status: ReviewStatus, action: str) -> None:
    review = _review(status)
    now = datetime.now(UTC)
    with pytest.raises(PriceListApprovalError) as error:
        if action == "approve":
            approve_version_review(
                review,
                actor_user_id=uuid4(),
                actor_email="owner@example.com",
                decided_at=now,
                decision_note=None,
            )
        else:
            reject_version_review(
                review,
                actor_user_id=uuid4(),
                actor_email="owner@example.com",
                decided_at=now,
                reason="دلیل",
            )
    expected = (
        PriceListApprovalErrorCode.PRICE_LIST_VERSION_ALREADY_APPROVED
        if status is ReviewStatus.APPROVED
        else PriceListApprovalErrorCode.PRICE_LIST_VERSION_ALREADY_REJECTED
    )
    assert error.value.code is expected


def test_decision_note_has_a_bounded_length() -> None:
    assert validate_decision_note("x" * 500, required=False) == "x" * 500
    with pytest.raises(PriceListApprovalError) as error:
        validate_decision_note("x" * 501, required=False)
    assert error.value.code is PriceListApprovalErrorCode.DECISION_NOTE_TOO_LONG
