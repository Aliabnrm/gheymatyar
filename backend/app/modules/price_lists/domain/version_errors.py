from dataclasses import dataclass, field
from enum import StrEnum


class PriceListVersionErrorCode(StrEnum):
    IMPORT_NOT_READY_FOR_VERSION = "IMPORT_NOT_READY_FOR_VERSION"
    PRICE_LIST_VERSION_ALREADY_EXISTS = "PRICE_LIST_VERSION_ALREADY_EXISTS"
    PRICE_LIST_VERSION_NOT_FOUND = "PRICE_LIST_VERSION_NOT_FOUND"
    PRICE_LIST_BASELINE_CHANGED = "PRICE_LIST_BASELINE_CHANGED"
    VERSION_CREATION_NOT_CONFIRMED = "VERSION_CREATION_NOT_CONFIRMED"
    VERSION_ITEM_CONFLICT = "VERSION_ITEM_CONFLICT"


@dataclass(slots=True)
class PriceListVersionError(Exception):
    code: PriceListVersionErrorCode
    message: str
    details: dict[str, object] = field(default_factory=dict)

    def __post_init__(self) -> None:
        Exception.__init__(self, self.message)

    def __str__(self) -> str:
        return self.message
