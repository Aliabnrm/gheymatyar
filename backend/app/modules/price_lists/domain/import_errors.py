from dataclasses import dataclass, field
from enum import StrEnum


class PriceListImportErrorCode(StrEnum):
    PRICE_LIST_IMPORT_NOT_FOUND = "PRICE_LIST_IMPORT_NOT_FOUND"
    IMPORT_FILE_ALREADY_EXISTS = "IMPORT_FILE_ALREADY_EXISTS"
    MAPPING_TEMPLATE_CONFLICT = "MAPPING_TEMPLATE_CONFLICT"
    MAPPING_TEMPLATE_REQUIRES_DRAFT = "MAPPING_TEMPLATE_REQUIRES_DRAFT"
    SOURCE_DOCUMENT_CHANGED = "SOURCE_DOCUMENT_CHANGED"
    SUPPLIER_INACTIVE = "SUPPLIER_INACTIVE"
    OBJECT_STORAGE_UNAVAILABLE = "OBJECT_STORAGE_UNAVAILABLE"


@dataclass(slots=True)
class PriceListImportError(Exception):
    code: PriceListImportErrorCode
    message: str
    details: dict[str, object] = field(default_factory=dict)

    def __post_init__(self) -> None:
        Exception.__init__(self, self.message)

    def __str__(self) -> str:
        return self.message
