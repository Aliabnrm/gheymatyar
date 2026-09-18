from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request

from app.api.schemas import ApiErrorResponse
from app.modules.accounts.domain.enums import OrganizationRole
from app.modules.accounts.domain.models import CurrentAccountContext
from app.modules.accounts.presentation.dependencies import require_roles

from ..application.mapping_services import MappingServices
from .import_schemas import PriceListImportResponse
from .mapping_schemas import (
    ColumnMappingSchema,
    MappingReviewResponse,
    MappingTemplateResponse,
    SaveMappingTemplateRequest,
)

router = APIRouter(
    prefix="/suppliers/{supplier_id}",
    tags=["column-mapping"],
    responses={
        401: {"model": ApiErrorResponse},
        403: {"model": ApiErrorResponse},
        404: {"model": ApiErrorResponse},
        409: {"model": ApiErrorResponse},
        422: {"model": ApiErrorResponse},
        503: {"model": ApiErrorResponse},
    },
)
ReadContext = Annotated[
    CurrentAccountContext, Depends(require_roles(OrganizationRole.OWNER, OrganizationRole.OPERATOR))
]
WriteContext = Annotated[
    CurrentAccountContext,
    Depends(require_roles(OrganizationRole.OWNER, OrganizationRole.OPERATOR, require_csrf=True)),
]


def get_mapping_services(request: Request) -> MappingServices:
    services = request.app.state.mapping_services
    if not isinstance(services, MappingServices):
        raise RuntimeError("Mapping services are not configured")
    return services


Services = Annotated[MappingServices, Depends(get_mapping_services)]


@router.get(
    "/imports/{import_id}/mapping",
    response_model=MappingReviewResponse,
    summary="بازبینی نگاشت و پیش‌نمایش محدود فایل",
)
async def review_mapping(
    supplier_id: UUID,
    import_id: UUID,
    services: Services,
    current: ReadContext,
    sheet_name: Annotated[str | None, Query(min_length=1, max_length=31)] = None,
    header_row: Annotated[int | None, Query(ge=1, le=50020)] = None,
) -> MappingReviewResponse:
    return MappingReviewResponse.from_domain(
        await services.review(
            organization_id=current.account.organization_id,
            supplier_id=supplier_id,
            import_id=import_id,
            sheet_name=sheet_name,
            header_row=header_row,
        )
    )


@router.post(
    "/imports/{import_id}/rerun",
    response_model=PriceListImportResponse,
    status_code=201,
    summary="اجرای جدید با نگاشت اصلاح‌شده بدون تغییر تاریخچه",
)
async def rerun_import(
    supplier_id: UUID,
    import_id: UUID,
    payload: ColumnMappingSchema,
    services: Services,
    current: WriteContext,
) -> PriceListImportResponse:
    return PriceListImportResponse.from_domain(
        await services.rerun(
            organization_id=current.account.organization_id,
            supplier_id=supplier_id,
            import_id=import_id,
            user_id=current.account.user_id,
            mapping=payload.to_domain(),
        )
    )


@router.get(
    "/mapping-template",
    response_model=MappingTemplateResponse | None,
    summary="الگوی فعال تأمین‌کننده",
)
async def get_template(
    supplier_id: UUID, services: Services, current: ReadContext
) -> MappingTemplateResponse | None:
    template = await services.get_template(
        organization_id=current.account.organization_id, supplier_id=supplier_id
    )
    return MappingTemplateResponse.from_domain(template) if template else None


@router.post(
    "/mapping-template",
    response_model=MappingTemplateResponse,
    status_code=201,
    summary="ذخیره یا جایگزینی صریح الگوی تأمین‌کننده",
)
async def save_template(
    supplier_id: UUID,
    payload: SaveMappingTemplateRequest,
    services: Services,
    current: WriteContext,
) -> MappingTemplateResponse:
    return MappingTemplateResponse.from_domain(
        await services.save_template(
            organization_id=current.account.organization_id,
            supplier_id=supplier_id,
            user_id=current.account.user_id,
            source_import_id=payload.source_import_id,
            expected_template_id=payload.expected_template_id,
            confirm_replace=payload.confirm_replace,
        )
    )
