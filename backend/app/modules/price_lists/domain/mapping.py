import re
from collections.abc import Sequence
from dataclasses import dataclass
from enum import StrEnum

from .errors import PriceListError, PriceListErrorCode
from .normalization import normalize_persian_text


class CanonicalField(StrEnum):
    PRODUCT_CODE = "product_code"
    PRODUCT_NAME = "product_name"
    BRAND = "brand"
    UNIT = "unit"
    PACK_SIZE = "pack_size"
    PRICE_IRR = "price_irr"
    AVAILABILITY = "availability"
    NOTES = "notes"


REQUIRED_FIELDS = frozenset(
    {CanonicalField.PRODUCT_CODE, CanonicalField.PRODUCT_NAME, CanonicalField.PRICE_IRR}
)
_HEADER_CLEANER = re.compile(r"[\s()\[\]{}_\-/:]+")


def normalize_header(value: object) -> str:
    return _HEADER_CLEANER.sub("", normalize_persian_text(value).casefold())


_ALIASES_RAW = {
    CanonicalField.PRODUCT_CODE: (
        "کد کالا",
        "کد محصول",
        "شناسه کالا",
        "sku",
        "item code",
        "product code",
    ),
    CanonicalField.PRODUCT_NAME: (
        "شرح کالا",
        "نام کالا",
        "شرح محصول",
        "نام محصول",
        "product",
        "product name",
    ),
    CanonicalField.BRAND: ("برند", "brand"),
    CanonicalField.UNIT: ("واحد فروش", "واحد", "unit"),
    CanonicalField.PACK_SIZE: (
        "تعداد در بسته",
        "تعداد بسته",
        "تعداد در کارتن",
        "بسته بندی",
        "pack size",
    ),
    CanonicalField.PRICE_IRR: (
        "قیمت همکار ریال",
        "قیمت ریال",
        "قیمت خرید ریال",
        "قیمت",
        "price irr",
    ),
    CanonicalField.AVAILABILITY: ("وضعیت موجودی", "موجودی", "availability", "stock"),
    CanonicalField.NOTES: ("توضیحات", "توضیح", "یادداشت", "notes"),
}
_ALIASES = {
    key: {normalize_header(alias) for alias in aliases} for key, aliases in _ALIASES_RAW.items()
}


def detect_columns(
    row: Sequence[object],
) -> tuple[dict[CanonicalField, int], dict[CanonicalField, tuple[int, ...]]]:
    candidates = {
        field: tuple(i for i, value in enumerate(row, 1) if normalize_header(value) in aliases)
        for field, aliases in _ALIASES.items()
    }
    return (
        {field: positions[0] for field, positions in candidates.items() if len(positions) == 1},
        {field: positions for field, positions in candidates.items() if len(positions) > 1},
    )


@dataclass(frozen=True, slots=True)
class ColumnMapping:
    sheet_name: str
    header_row: int
    columns: dict[CanonicalField, int]

    def validate(self, *, column_count: int) -> None:
        missing = REQUIRED_FIELDS.difference(self.columns)
        if missing:
            raise PriceListError(
                PriceListErrorCode.REQUIRED_COLUMN_MISSING,
                "ستون‌های اجباری کد کالا، نام کالا و قیمت ریالی را انتخاب کنید.",
                {"missing_columns": sorted(missing)},
            )
        positions = list(self.columns.values())
        if (
            not self.sheet_name
            or type(self.header_row) is not int
            or self.header_row < 1
            or any(type(p) is not int or p < 1 or p > column_count for p in positions)
            or len(positions) != len(set(positions))
        ):
            raise PriceListError(
                PriceListErrorCode.INVALID_COLUMN_MAPPING,
                "شماره ردیف یا ستون معتبر نیست؛ هر ستون را فقط برای یک فیلد انتخاب کنید.",
            )

    def as_dict(self) -> dict[str, object]:
        return {
            "sheet_name": self.sheet_name,
            "header_row": self.header_row,
            "columns": {field.value: index for field, index in self.columns.items()},
        }

    @classmethod
    def from_dict(cls, value: dict[str, object]) -> "ColumnMapping":
        columns = value["columns"]
        header = value["header_row"]
        sheet = value["sheet_name"]
        if (
            not isinstance(columns, dict)
            or not isinstance(header, int)
            or not isinstance(sheet, str)
        ):
            raise ValueError("Invalid stored mapping")
        return cls(sheet, header, {CanonicalField(k): int(v) for k, v in columns.items()})
