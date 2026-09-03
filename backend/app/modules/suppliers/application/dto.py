from dataclasses import dataclass
from enum import StrEnum

from ..domain.errors import SupplierError, SupplierErrorCode
from ..domain.models import Supplier
from ..domain.normalization import normalize_supplier_name


class SupplierStatusFilter(StrEnum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    ALL = "all"


@dataclass(frozen=True, slots=True)
class SupplierPage:
    items: tuple[Supplier, ...]
    total: int
    limit: int
    offset: int


@dataclass(frozen=True, slots=True)
class UpdateSupplierCommand:
    name: str | None
    normalized_name: str | None
    is_active: bool | None

    @classmethod
    def create(cls, *, name: str | None, is_active: bool | None) -> "UpdateSupplierCommand":
        if name is None and is_active is None:
            raise SupplierError(
                SupplierErrorCode.SUPPLIER_UPDATE_EMPTY,
                "حداقل یک تغییر برای تأمین‌کننده ارسال کنید.",
            )
        normalized = normalize_supplier_name(name) if name is not None else None
        return cls(
            name=normalized.display_name if normalized else None,
            normalized_name=normalized.normalized_name if normalized else None,
            is_active=is_active,
        )
