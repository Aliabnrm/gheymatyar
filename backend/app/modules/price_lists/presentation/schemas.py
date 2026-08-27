from typing import Literal, Self

from pydantic import BaseModel, ConfigDict

from ..domain.models import (
    ChangeType,
    ComparisonResult,
    FieldChange,
    ItemComparison,
    PriceListItem,
)


class PriceListItemResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    source_row_number: int
    product_code_raw: str
    product_code_normalized: str
    product_name_raw: str
    brand: str | None
    unit: str | None
    pack_size: int | None
    price_irr: int
    availability: str
    availability_raw: str | None
    notes: str | None
    raw_row: dict[str, object]

    @classmethod
    def from_domain(cls, item: PriceListItem) -> Self:
        return cls(
            source_row_number=item.source_row_number,
            product_code_raw=item.product_code_raw,
            product_code_normalized=item.product_code_normalized,
            product_name_raw=item.product_name_raw,
            brand=item.brand,
            unit=item.unit,
            pack_size=item.pack_size,
            price_irr=item.price_irr,
            availability=item.availability.value,
            availability_raw=item.availability_raw,
            notes=item.notes,
            raw_row=item.raw_row,
        )


class FieldChangeResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    field: str
    previous: str | int | None
    current: str | int | None

    @classmethod
    def from_domain(cls, change: FieldChange) -> Self:
        return cls(field=change.field, previous=change.previous, current=change.current)


class ItemComparisonResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    product_code: str
    change_types: list[ChangeType]
    previous: PriceListItemResponse | None
    current: PriceListItemResponse | None
    field_changes: list[FieldChangeResponse]
    price_delta_irr: int | None
    price_change_percent: str | None
    is_high_risk: bool

    @classmethod
    def from_domain(cls, item: ItemComparison) -> Self:
        high_risk = bool(
            {ChangeType.PACK_SIZE_CHANGED, ChangeType.UNIT_CHANGED}.intersection(item.change_types)
        )
        return cls(
            product_code=item.product_code,
            change_types=list(item.change_types),
            previous=(PriceListItemResponse.from_domain(item.previous) if item.previous else None),
            current=PriceListItemResponse.from_domain(item.current) if item.current else None,
            field_changes=[
                FieldChangeResponse.from_domain(change) for change in item.field_changes
            ],
            price_delta_irr=item.price_delta_irr,
            price_change_percent=(
                str(item.price_change_percent) if item.price_change_percent is not None else None
            ),
            is_high_risk=high_risk,
        )


class ComparisonSummaryResponse(BaseModel):
    model_config = ConfigDict(extra="forbid", from_attributes=True)

    old_items: int
    new_items: int
    added: int
    removed: int
    price_changed: int
    price_increased: int
    price_decreased: int
    metadata_only_changed: int
    unchanged: int
    high_risk: int


class ComparisonResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    api_version: Literal["1"] = "1"
    currency: Literal["IRR"] = "IRR"
    summary: ComparisonSummaryResponse
    items: list[ItemComparisonResponse]

    @classmethod
    def from_domain(cls, result: ComparisonResult) -> Self:
        return cls(
            currency=result.currency.value,
            summary=ComparisonSummaryResponse.model_validate(result.summary),
            items=[ItemComparisonResponse.from_domain(item) for item in result.items],
        )
