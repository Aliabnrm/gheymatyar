from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from ..application.dto import SupplierPage
from ..domain.models import Supplier


class CreateSupplierRequest(BaseModel):
    model_config = ConfigDict(
        extra="forbid", json_schema_extra={"example": {"name": "فناوران شبکه"}}
    )

    name: str = Field(min_length=1, max_length=256)


class UpdateSupplierRequest(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
        json_schema_extra={"example": {"name": "فناوران شبکه نوین", "is_active": False}},
    )

    name: str | None = Field(default=None, min_length=1, max_length=256)
    is_active: bool | None = None


class SupplierResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: UUID
    name: str
    is_active: bool
    created_at: datetime
    updated_at: datetime

    @classmethod
    def from_domain(cls, supplier: Supplier) -> "SupplierResponse":
        return cls(
            id=supplier.id,
            name=supplier.name,
            is_active=supplier.is_active,
            created_at=supplier.created_at,
            updated_at=supplier.updated_at,
        )


class SupplierListResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    items: list[SupplierResponse]
    total: int
    limit: int
    offset: int

    @classmethod
    def from_page(cls, page: SupplierPage) -> "SupplierListResponse":
        return cls(
            items=[SupplierResponse.from_domain(item) for item in page.items],
            total=page.total,
            limit=page.limit,
            offset=page.offset,
        )
