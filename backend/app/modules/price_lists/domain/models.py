from dataclasses import dataclass
from decimal import Decimal
from enum import StrEnum

from .errors import PriceListError, PriceListErrorCode


class Currency(StrEnum):
    IRR = "IRR"


class Availability(StrEnum):
    IN_STOCK = "in_stock"
    LIMITED = "limited"
    OUT_OF_STOCK = "out_of_stock"
    UNKNOWN = "unknown"


class ChangeType(StrEnum):
    ADDED = "ADDED"
    REMOVED = "REMOVED"
    PRICE_CHANGED = "PRICE_CHANGED"
    PACK_SIZE_CHANGED = "PACK_SIZE_CHANGED"
    UNIT_CHANGED = "UNIT_CHANGED"
    NAME_CHANGED = "NAME_CHANGED"
    BRAND_CHANGED = "BRAND_CHANGED"
    AVAILABILITY_CHANGED = "AVAILABILITY_CHANGED"
    NOTES_CHANGED = "NOTES_CHANGED"
    UNCHANGED = "UNCHANGED"


ScalarValue = str | int | None


@dataclass(frozen=True, slots=True)
class PriceListItem:
    source_row_number: int
    product_code_raw: str
    product_code_normalized: str
    product_name_raw: str
    product_name_normalized: str
    brand: str | None
    unit: str | None
    pack_size: int | None
    price_irr: int
    availability: Availability
    availability_raw: str | None
    notes: str | None
    raw_row: dict[str, object]

    def __post_init__(self) -> None:
        if type(self.source_row_number) is not int or self.source_row_number < 1:
            raise PriceListError(
                PriceListErrorCode.INVALID_SOURCE_ROW,
                "شماره ردیف منبع باید یک عدد صحیح مثبت باشد.",
            )
        if not self.product_code_raw.strip() or not self.product_code_normalized.strip():
            raise PriceListError(
                PriceListErrorCode.EMPTY_PRODUCT_CODE,
                "کد کالا خالی است.",
            )
        if not self.product_name_raw.strip() or not self.product_name_normalized.strip():
            raise PriceListError(
                PriceListErrorCode.EMPTY_PRODUCT_NAME,
                "شرح کالا خالی است.",
            )
        if type(self.price_irr) is not int or self.price_irr <= 0:
            raise PriceListError(
                PriceListErrorCode.INVALID_PRICE,
                "قیمت باید یک عدد صحیح مثبت به ریال باشد.",
            )
        if self.pack_size is not None and (type(self.pack_size) is not int or self.pack_size <= 0):
            raise PriceListError(
                PriceListErrorCode.INVALID_PACK_SIZE,
                "تعداد داخل بسته باید یک عدد صحیح مثبت باشد.",
            )


@dataclass(frozen=True, slots=True)
class FieldChange:
    field: str
    previous: ScalarValue
    current: ScalarValue


@dataclass(frozen=True, slots=True)
class ItemComparison:
    product_code: str
    change_types: tuple[ChangeType, ...]
    previous: PriceListItem | None
    current: PriceListItem | None
    field_changes: tuple[FieldChange, ...]
    price_delta_irr: int | None
    price_change_percent: Decimal | None


@dataclass(frozen=True, slots=True)
class ComparisonSummary:
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


@dataclass(frozen=True, slots=True)
class ComparisonResult:
    currency: Currency
    summary: ComparisonSummary
    items: tuple[ItemComparison, ...]
