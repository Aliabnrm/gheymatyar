from typing import Annotated, Any, Literal
from uuid import UUID

from fastapi import APIRouter, Depends, File, Query, UploadFile, status

from app.api.dependencies import get_request_settings
from app.api.schemas import ApiErrorResponse
from app.core.config import Settings
from app.modules.accounts.domain.enums import OrganizationRole
from app.modules.accounts.domain.models import CurrentAccountContext
from app.modules.accounts.presentation.dependencies import require_roles

from ..application.import_dto import ImportStatusFilter
from ..application.import_services import PriceListImportServices
from .import_dependencies import get_price_list_import_services
from .import_schemas import (
    ExtractedRowPageResponse,
    PriceListImportPageResponse,
    PriceListImportResponse,
)
from .uploads import read_xlsx

router = APIRouter(prefix="/suppliers/{supplier_id}/imports", tags=["price-list-imports"])

_READ_RESPONSES: dict[int | str, dict[str, Any]] = {
    401: {"model": ApiErrorResponse, "description": "ورود به حساب لازم است."},
    404: {"model": ApiErrorResponse, "description": "تأمین‌کننده یا Import پیدا نشد."},
}
_UPLOAD_RESPONSES: dict[int | str, dict[str, Any]] = {
    **_READ_RESPONSES,
    403: {"model": ApiErrorResponse, "description": "اعتبار CSRF یا نقش معتبر نیست."},
    409: {"model": ApiErrorResponse, "description": "فایل تکراری یا تأمین‌کننده غیرفعال است."},
    413: {"model": ApiErrorResponse, "description": "حجم فایل بیشتر از حد مجاز است."},
    422: {"model": ApiErrorResponse, "description": "فایل یا محتوای درخواست معتبر نیست."},
    503: {"model": ApiErrorResponse, "description": "فضای نگهداری فایل در دسترس نیست."},
}


@router.post(
    "",
    response_model=PriceListImportResponse,
    status_code=status.HTTP_201_CREATED,
    responses=_UPLOAD_RESPONSES,
    summary="آپلود فایل قیمت و ایجاد Import Draft",
)
async def create_price_list_import(
    supplier_id: UUID,
    file: Annotated[UploadFile, File(description="فایل اصلی XLSX تأمین‌کننده")],
    settings: Annotated[Settings, Depends(get_request_settings)],
    services: Annotated[PriceListImportServices, Depends(get_price_list_import_services)],
    current: Annotated[
        CurrentAccountContext,
        Depends(
            require_roles(
                OrganizationRole.OWNER,
                OrganizationRole.OPERATOR,
                require_csrf=True,
            )
        ),
    ],
) -> PriceListImportResponse:
    try:
        upload = await read_xlsx(file, max_bytes=settings.max_upload_bytes)
        imported = await services.create.execute(
            organization_id=current.account.organization_id,
            supplier_id=supplier_id,
            user_id=current.account.user_id,
            filename=upload.filename,
            content=upload.content,
        )
        return PriceListImportResponse.from_domain(imported)
    finally:
        await file.close()


@router.get(
    "",
    response_model=PriceListImportPageResponse,
    responses=_READ_RESPONSES,
    summary="تاریخچه فایل‌های قیمت تأمین‌کننده",
)
async def list_price_list_imports(
    supplier_id: UUID,
    services: Annotated[PriceListImportServices, Depends(get_price_list_import_services)],
    current: Annotated[
        CurrentAccountContext,
        Depends(require_roles(OrganizationRole.OWNER, OrganizationRole.OPERATOR)),
    ],
    import_status: Annotated[Literal["draft", "failed", "all"], Query(alias="status")] = "all",
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> PriceListImportPageResponse:
    page = await services.list.execute(
        organization_id=current.account.organization_id,
        supplier_id=supplier_id,
        status=ImportStatusFilter(import_status),
        limit=limit,
        offset=offset,
    )
    return PriceListImportPageResponse.from_page(page)


@router.get(
    "/{import_id}",
    response_model=PriceListImportResponse,
    responses=_READ_RESPONSES,
    summary="جزئیات Import فایل قیمت",
)
async def get_price_list_import(
    supplier_id: UUID,
    import_id: UUID,
    services: Annotated[PriceListImportServices, Depends(get_price_list_import_services)],
    current: Annotated[
        CurrentAccountContext,
        Depends(require_roles(OrganizationRole.OWNER, OrganizationRole.OPERATOR)),
    ],
) -> PriceListImportResponse:
    imported = await services.get.execute(
        organization_id=current.account.organization_id,
        supplier_id=supplier_id,
        import_id=import_id,
    )
    return PriceListImportResponse.from_domain(imported)


@router.get(
    "/{import_id}/rows",
    response_model=ExtractedRowPageResponse,
    responses=_READ_RESPONSES,
    summary="ردیف‌های استخراج‌شده Import",
)
async def list_price_list_import_rows(
    supplier_id: UUID,
    import_id: UUID,
    services: Annotated[PriceListImportServices, Depends(get_price_list_import_services)],
    current: Annotated[
        CurrentAccountContext,
        Depends(require_roles(OrganizationRole.OWNER, OrganizationRole.OPERATOR)),
    ],
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> ExtractedRowPageResponse:
    page = await services.list_rows.execute(
        organization_id=current.account.organization_id,
        supplier_id=supplier_id,
        import_id=import_id,
        limit=limit,
        offset=offset,
    )
    return ExtractedRowPageResponse.from_page(page)
