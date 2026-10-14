from uuid import UUID

from ..domain.comparison import compare_price_lists
from ..domain.models import ChangeType, PriceListItem
from ..domain.version_models import PriceListVersion
from .version_dto import ChangeReportPage


def build_change_report(
    *,
    subject_id: UUID,
    created_version: PriceListVersion | None = None,
    baseline: PriceListVersion,
    old_items: tuple[PriceListItem, ...],
    new_items: tuple[PriceListItem, ...],
    change_type: ChangeType | None,
    limit: int,
    offset: int,
) -> ChangeReportPage:
    result = compare_price_lists(list(old_items), list(new_items))
    filtered = (
        result.items
        if change_type is None
        else tuple(item for item in result.items if change_type in item.change_types)
    )
    return ChangeReportPage(
        subject_id=subject_id,
        created_version=created_version,
        baseline_version=baseline,
        summary=result.summary,
        items=filtered[offset : offset + limit],
        total=len(filtered),
        limit=limit,
        offset=offset,
    )
