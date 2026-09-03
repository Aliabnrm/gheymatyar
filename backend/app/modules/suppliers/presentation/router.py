from typing import Annotated, Any, Literal
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status

from app.api.schemas import ApiErrorResponse
from app.modules.accounts.domain.enums import OrganizationRole
from app.modules.accounts.domain.models import CurrentAccountContext
from app.modules.accounts.presentation.dependencies import require_roles

from ..application.dto import SupplierStatusFilter
from ..application.services import SupplierServices
from .dependencies import get_supplier_services
from .schemas import (
    CreateSupplierRequest,
    SupplierListResponse,
    SupplierResponse,
    UpdateSupplierRequest,
)

router = APIRouter(prefix="/suppliers", tags=["suppliers"])

_READ_RESPONSES: dict[int | str, dict[str, Any]] = {
    401: {"model": ApiErrorResponse, "description": "ورود به حساب لازم است."},
    404: {"model": ApiErrorResponse, "description": "تأمین‌کننده پیدا نشد."},
}
_WRITE_RESPONSES: dict[int | str, dict[str, Any]] = {
    **_READ_RESPONSES,
    403: {"model": ApiErrorResponse, "description": "نقش یا CSRF معتبر نیست."},
    409: {"model": ApiErrorResponse, "description": "نام تأمین‌کننده تکراری است."},
    422: {"model": ApiErrorResponse, "description": "داده تأمین‌کننده معتبر نیست."},
}


@router.get(
    "", response_model=SupplierListResponse, responses=_READ_RESPONSES, summary="فهرست تأمین‌کنندگان"
)
async def list_suppliers(
    services: Annotated[SupplierServices, Depends(get_supplier_services)],
    current: Annotated[
        CurrentAccountContext,
        Depends(require_roles(OrganizationRole.OWNER, OrganizationRole.OPERATOR)),
    ],
    supplier_status: Annotated[
        Literal["active", "inactive", "all"], Query(alias="status")
    ] = "active",
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> SupplierListResponse:
    page = await services.list.execute(
        organization_id=current.account.organization_id,
        status=SupplierStatusFilter(supplier_status),
        limit=limit,
        offset=offset,
    )
    return SupplierListResponse.from_page(page)


@router.post(
    "",
    response_model=SupplierResponse,
    status_code=status.HTTP_201_CREATED,
    responses=_WRITE_RESPONSES,
    summary="ایجاد تأمین‌کننده",
)
async def create_supplier(
    payload: CreateSupplierRequest,
    services: Annotated[SupplierServices, Depends(get_supplier_services)],
    current: Annotated[
        CurrentAccountContext,
        Depends(require_roles(OrganizationRole.OWNER, require_csrf=True)),
    ],
) -> SupplierResponse:
    supplier = await services.create.execute(
        organization_id=current.account.organization_id,
        name=payload.name,
    )
    return SupplierResponse.from_domain(supplier)


@router.get(
    "/{supplier_id}",
    response_model=SupplierResponse,
    responses=_READ_RESPONSES,
    summary="جزئیات تأمین‌کننده",
)
async def get_supplier(
    supplier_id: UUID,
    services: Annotated[SupplierServices, Depends(get_supplier_services)],
    current: Annotated[
        CurrentAccountContext,
        Depends(require_roles(OrganizationRole.OWNER, OrganizationRole.OPERATOR)),
    ],
) -> SupplierResponse:
    supplier = await services.get.execute(
        organization_id=current.account.organization_id,
        supplier_id=supplier_id,
    )
    return SupplierResponse.from_domain(supplier)


@router.patch(
    "/{supplier_id}",
    response_model=SupplierResponse,
    responses=_WRITE_RESPONSES,
    summary="ویرایش یا تغییر وضعیت تأمین‌کننده",
)
async def update_supplier(
    supplier_id: UUID,
    payload: UpdateSupplierRequest,
    services: Annotated[SupplierServices, Depends(get_supplier_services)],
    current: Annotated[
        CurrentAccountContext,
        Depends(require_roles(OrganizationRole.OWNER, require_csrf=True)),
    ],
) -> SupplierResponse:
    supplier = await services.update.execute(
        organization_id=current.account.organization_id,
        supplier_id=supplier_id,
        name=payload.name,
        is_active=payload.is_active,
    )
    return SupplierResponse.from_domain(supplier)
