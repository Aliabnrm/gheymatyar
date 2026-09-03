from dataclasses import dataclass, field
from enum import StrEnum


class SupplierErrorCode(StrEnum):
    SUPPLIER_NOT_FOUND = "SUPPLIER_NOT_FOUND"
    SUPPLIER_NAME_ALREADY_EXISTS = "SUPPLIER_NAME_ALREADY_EXISTS"
    INVALID_SUPPLIER_NAME = "INVALID_SUPPLIER_NAME"
    SUPPLIER_UPDATE_EMPTY = "SUPPLIER_UPDATE_EMPTY"


@dataclass(slots=True)
class SupplierError(Exception):
    code: SupplierErrorCode
    message: str
    details: dict[str, object] = field(default_factory=dict)

    def __post_init__(self) -> None:
        Exception.__init__(self, self.message)

    def __str__(self) -> str:
        return self.message
