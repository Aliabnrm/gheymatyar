from collections.abc import Sequence
from dataclasses import dataclass
from datetime import datetime
from uuid import UUID

from .approval_models import ReviewStatus
from .errors import PriceListError, PriceListErrorCode
from .models import Availability, PriceListItem
from .version_errors import PriceListVersionError, PriceListVersionErrorCode


def validate_version_creation(items: Sequence[PriceListItem]) -> None:
    if not items:
        raise PriceListVersionError(
            PriceListVersionErrorCode.IMPORT_NOT_READY_FOR_VERSION,
            "Import انتخاب‌شده ردیف معتبری برای ساخت نسخه ندارد.",
        )
    codes = [item.product_code_normalized for item in items]
    if len(codes) != len(set(codes)):
        raise PriceListVersionError(
            PriceListVersionErrorCode.VERSION_ITEM_CONFLICT,
            "کد کالا در نسخه قیمت تکراری است.",
        )


@dataclass(frozen=True, slots=True)
class VersionLineage:
    version_number: int
    previous_version_id: UUID | None

    def __post_init__(self) -> None:
        if type(self.version_number) is not int or self.version_number < 1:
            raise ValueError("version number must be a positive integer")
        if (self.version_number == 1) != (self.previous_version_id is None):
            raise ValueError("only the first version may omit its predecessor")


@dataclass(frozen=True, slots=True)
class PriceListVersion:
    id: UUID
    organization_id: UUID
    supplier_id: UUID
    source_import_id: UUID
    created_by_user_id: UUID
    created_by_email: str
    lineage: VersionLineage
    row_count: int
    created_at: datetime
    review_status: ReviewStatus = ReviewStatus.READY_FOR_REVIEW
    decided_by_user_id: UUID | None = None
    decided_by_email: str | None = None
    decided_at: datetime | None = None
    decision_note: str | None = None
    is_current: bool = False

    def __post_init__(self) -> None:
        if type(self.row_count) is not int or self.row_count < 1:
            raise ValueError("price-list version must contain at least one row")


@dataclass(frozen=True, slots=True)
class VersionedPriceListItem:
    id: UUID
    organization_id: UUID
    supplier_id: UUID
    version_id: UUID
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
    created_at: datetime

    def __post_init__(self) -> None:
        if type(self.source_row_number) is not int or self.source_row_number < 1:
            raise PriceListError(
                PriceListErrorCode.INVALID_SOURCE_ROW,
                "شماره ردیف منبع باید یک عدد صحیح مثبت باشد.",
            )
        if not self.product_code_raw.strip() or not self.product_code_normalized.strip():
            raise PriceListError(PriceListErrorCode.EMPTY_PRODUCT_CODE, "کد کالا خالی است.")
        if not self.product_name_raw.strip() or not self.product_name_normalized.strip():
            raise PriceListError(PriceListErrorCode.EMPTY_PRODUCT_NAME, "شرح کالا خالی است.")
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

    def to_price_list_item(self) -> PriceListItem:
        return PriceListItem(
            source_row_number=self.source_row_number,
            product_code_raw=self.product_code_raw,
            product_code_normalized=self.product_code_normalized,
            product_name_raw=self.product_name_raw,
            product_name_normalized=self.product_name_normalized,
            brand=self.brand,
            unit=self.unit,
            pack_size=self.pack_size,
            price_irr=self.price_irr,
            availability=self.availability,
            availability_raw=self.availability_raw,
            notes=self.notes,
            raw_row={},
        )
