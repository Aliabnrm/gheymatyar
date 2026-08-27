from decimal import ROUND_HALF_UP, Decimal

from .errors import PriceListError, PriceListErrorCode
from .models import (
    ChangeType,
    ComparisonResult,
    ComparisonSummary,
    Currency,
    FieldChange,
    ItemComparison,
    PriceListItem,
)

_METADATA_FIELDS: tuple[tuple[str, ChangeType], ...] = (
    ("product_name_normalized", ChangeType.NAME_CHANGED),
    ("brand", ChangeType.BRAND_CHANGED),
    ("unit", ChangeType.UNIT_CHANGED),
    ("pack_size", ChangeType.PACK_SIZE_CHANGED),
    ("availability", ChangeType.AVAILABILITY_CHANGED),
    ("notes", ChangeType.NOTES_CHANGED),
)
_HIGH_RISK_TYPES = {ChangeType.PACK_SIZE_CHANGED, ChangeType.UNIT_CHANGED}


def compare_price_lists(
    old_items: list[PriceListItem],
    new_items: list[PriceListItem],
) -> ComparisonResult:
    old_by_code = _unique_by_code(old_items)
    new_by_code = _unique_by_code(new_items)

    rows: list[ItemComparison] = []
    added = removed = price_changed = price_increased = price_decreased = 0
    metadata_only_changed = unchanged = high_risk = 0

    for current in new_items:
        code = current.product_code_normalized
        previous = old_by_code.get(code)
        if previous is None:
            added += 1
            rows.append(
                ItemComparison(
                    product_code=code,
                    change_types=(ChangeType.ADDED,),
                    previous=None,
                    current=current,
                    field_changes=(),
                    price_delta_irr=None,
                    price_change_percent=None,
                )
            )
            continue

        comparison = _compare_common_item(previous, current)
        rows.append(comparison)
        types = set(comparison.change_types)
        if ChangeType.PRICE_CHANGED in types:
            price_changed += 1
            if current.price_irr > previous.price_irr:
                price_increased += 1
            else:
                price_decreased += 1
        elif ChangeType.UNCHANGED in types:
            unchanged += 1
        else:
            metadata_only_changed += 1
        if types.intersection(_HIGH_RISK_TYPES):
            high_risk += 1

    for previous in old_items:
        code = previous.product_code_normalized
        if code in new_by_code:
            continue
        removed += 1
        rows.append(
            ItemComparison(
                product_code=code,
                change_types=(ChangeType.REMOVED,),
                previous=previous,
                current=None,
                field_changes=(),
                price_delta_irr=None,
                price_change_percent=None,
            )
        )

    return ComparisonResult(
        currency=Currency.IRR,
        summary=ComparisonSummary(
            old_items=len(old_items),
            new_items=len(new_items),
            added=added,
            removed=removed,
            price_changed=price_changed,
            price_increased=price_increased,
            price_decreased=price_decreased,
            metadata_only_changed=metadata_only_changed,
            unchanged=unchanged,
            high_risk=high_risk,
        ),
        items=tuple(rows),
    )


def _unique_by_code(items: list[PriceListItem]) -> dict[str, PriceListItem]:
    result: dict[str, PriceListItem] = {}
    for item in items:
        code = item.product_code_normalized
        if code in result:
            raise PriceListError(
                PriceListErrorCode.DUPLICATE_PRODUCT_CODE,
                f"کد کالا در یک نسخه تکرار شده است: {code}",
                {"product_code": code},
            )
        result[code] = item
    return result


def _compare_common_item(
    previous: PriceListItem,
    current: PriceListItem,
) -> ItemComparison:
    change_types: list[ChangeType] = []
    field_changes: list[FieldChange] = []

    price_delta: int | None = None
    percent: Decimal | None = None
    if previous.price_irr != current.price_irr:
        change_types.append(ChangeType.PRICE_CHANGED)
        price_delta = current.price_irr - previous.price_irr
        percent = ((Decimal(price_delta) / Decimal(previous.price_irr)) * Decimal(100)).quantize(
            Decimal("0.01"), rounding=ROUND_HALF_UP
        )
        field_changes.append(FieldChange("price_irr", previous.price_irr, current.price_irr))

    for field_name, change_type in _METADATA_FIELDS:
        previous_value = getattr(previous, field_name)
        current_value = getattr(current, field_name)
        if previous_value == current_value:
            continue
        change_types.append(change_type)
        if hasattr(previous_value, "value"):
            previous_value = previous_value.value
        if hasattr(current_value, "value"):
            current_value = current_value.value
        field_changes.append(FieldChange(field_name, previous_value, current_value))

    if not change_types:
        change_types.append(ChangeType.UNCHANGED)

    return ItemComparison(
        product_code=current.product_code_normalized,
        change_types=tuple(change_types),
        previous=previous,
        current=current,
        field_changes=tuple(field_changes),
        price_delta_irr=price_delta,
        price_change_percent=percent,
    )
