from dataclasses import dataclass, field
from enum import StrEnum
from typing import Self


class PriceListErrorCode(StrEnum):
    INVALID_FILE_TYPE = "INVALID_FILE_TYPE"
    FILE_TOO_LARGE = "FILE_TOO_LARGE"
    EMPTY_FILE = "EMPTY_FILE"
    INVALID_XLSX_SIGNATURE = "INVALID_XLSX_SIGNATURE"
    XLSX_ARCHIVE_LIMIT_EXCEEDED = "XLSX_ARCHIVE_LIMIT_EXCEEDED"
    ENCRYPTED_XLSX_NOT_SUPPORTED = "ENCRYPTED_XLSX_NOT_SUPPORTED"
    WORKBOOK_UNREADABLE = "WORKBOOK_UNREADABLE"
    WORKBOOK_SHEET_LIMIT_EXCEEDED = "WORKBOOK_SHEET_LIMIT_EXCEEDED"
    WORKBOOK_ROW_LIMIT_EXCEEDED = "WORKBOOK_ROW_LIMIT_EXCEEDED"
    WORKBOOK_COLUMN_LIMIT_EXCEEDED = "WORKBOOK_COLUMN_LIMIT_EXCEEDED"
    HEADER_NOT_FOUND = "HEADER_NOT_FOUND"
    REQUIRED_COLUMN_MISSING = "REQUIRED_COLUMN_MISSING"
    INVALID_SOURCE_ROW = "INVALID_SOURCE_ROW"
    EMPTY_PRODUCT_CODE = "EMPTY_PRODUCT_CODE"
    INVALID_PRODUCT_CODE = "INVALID_PRODUCT_CODE"
    EMPTY_PRODUCT_NAME = "EMPTY_PRODUCT_NAME"
    DUPLICATE_PRODUCT_CODE = "DUPLICATE_PRODUCT_CODE"
    INVALID_PRICE = "INVALID_PRICE"
    INVALID_PACK_SIZE = "INVALID_PACK_SIZE"
    TOMAN_NOT_SUPPORTED = "TOMAN_NOT_SUPPORTED"
    NO_PRODUCT_ROWS = "NO_PRODUCT_ROWS"


@dataclass(slots=True)
class PriceListError(Exception):
    code: PriceListErrorCode
    message: str
    details: dict[str, object] = field(default_factory=dict)

    def __post_init__(self) -> None:
        Exception.__init__(self, self.message)

    def with_details(self, **details: object) -> Self:
        self.details = {**self.details, **details}
        return self

    def __str__(self) -> str:
        return self.message
