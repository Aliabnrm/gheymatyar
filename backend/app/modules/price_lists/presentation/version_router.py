from typing import Annotated, Any
from uuid import UUID

from fastapi import APIRouter, Depends, Query

from app.api.schemas import ApiErrorResponse
from app.modules.accounts.domain.enums import OrganizationRole
from app.modules.accounts.domain.models import CurrentAccountContext
from app.modules.accounts.presentation.dependencies import require_roles

from ..application.version_services import PriceListVersionServices
from ..domain.models import ChangeType
from .version_dependencies import get_price_list_version_services
from .version_schemas import (
    ApprovalResultResponse,
    ApprovePriceListVersionRequest,
    AuditEventPageResponse,
    CreatePriceListVersionRequest,
    CurrentPriceImpactResponse,
    CurrentPriceListVersionResponse,
    ImportChangeReportResponse,
    PriceListVersionItemPageResponse,
    PriceListVersionPageResponse,
    PriceListVersionResponse,
    RejectPriceListVersionRequest,
    VersionChangeReportResponse,
)

router = APIRouter(
    prefix="/suppliers/{supplier_id}",
    tags=["price-list-versions"],
    responses={
        401: {"model": ApiErrorResponse},
        403: {"model": ApiErrorResponse},
        404: {"model": ApiErrorResponse},
        409: {"model": ApiErrorResponse},
        422: {"model": ApiErrorResponse},
        503: {"model": ApiErrorResponse},
    },
)
Services = Annotated[PriceListVersionServices, Depends(get_price_list_version_services)]
ReadContext = Annotated[
    CurrentAccountContext, Depends(require_roles(OrganizationRole.OWNER, OrganizationRole.OPERATOR))
]
WriteContext = Annotated[
    CurrentAccountContext,
    Depends(require_roles(OrganizationRole.OWNER, OrganizationRole.OPERATOR, require_csrf=True)),
]
ApprovalWriteContext = Annotated[
    CurrentAccountContext,
    Depends(require_roles(OrganizationRole.OWNER, require_csrf=True)),
]

_CURRENT_IMPACT_RESPONSES: dict[int | str, dict[str, Any]] = {
    404: {
        "model": ApiErrorResponse,
        "description": "تأمین‌کننده یا نسخه در محدوده سازمان پیدا نشد.",
    },
    409: {
        "model": ApiErrorResponse,
        "description": "مبنای جاری یا وضعیت نسخه تغییر کرده یا ناسازگار است.",
        "content": {
            "application/json": {
                "examples": {
                    "current_changed": {
                        "summary": "قیمت جاری پس از مشاهده گزارش تغییر کرده است.",
                        "value": {
                            "error": {
                                "code": "CURRENT_PRICE_VERSION_CHANGED",
                                "message": (
                                    "قیمت جاری تغییر کرده است؛ گزارش تازه را دوباره بررسی کنید."
                                ),
                                "details": {},
                            },
                            "request_id": "b7f4c2d88ee54f969f647a192f398ddd",
                        },
                    }
                }
            }
        },
    },
    422: {
        "model": ApiErrorResponse,
        "description": "پارامترهای pin یا صفحه‌بندی معتبر نیستند.",
    },
}


@router.get(
    "/imports/{import_id}/comparison",
    response_model=ImportChangeReportResponse,
    summary="مقایسه Import با آخرین نسخه ثبت‌شده",
)
async def compare_import_with_latest_version(
    supplier_id: UUID,
    import_id: UUID,
    services: Services,
    current: ReadContext,
    change_type: Annotated[ChangeType | None, Query()] = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> ImportChangeReportResponse:
    return ImportChangeReportResponse.from_domain(
        await services.import_changes.execute(
            organization_id=current.account.organization_id,
            supplier_id=supplier_id,
            import_id=import_id,
            change_type=change_type,
            limit=limit,
            offset=offset,
        )
    )


@router.post(
    "/imports/{import_id}/version",
    response_model=PriceListVersionResponse,
    status_code=201,
    summary="ساخت نسخه تغییرناپذیر از Import بازبینی‌شده",
)
async def create_price_list_version(
    supplier_id: UUID,
    import_id: UUID,
    payload: CreatePriceListVersionRequest,
    services: Services,
    current: WriteContext,
) -> PriceListVersionResponse:
    version = await services.create.execute(
        organization_id=current.account.organization_id,
        supplier_id=supplier_id,
        import_id=import_id,
        actor_user_id=current.account.user_id,
        expected_previous_version_id=payload.expected_previous_version_id,
        confirm_create=payload.confirm_create,
    )
    return PriceListVersionResponse.from_domain(version)


@router.get(
    "/price-list-versions",
    response_model=PriceListVersionPageResponse,
    summary="تاریخچه نسخه‌های تغییرناپذیر قیمت",
)
async def list_price_list_versions(
    supplier_id: UUID,
    services: Services,
    current: ReadContext,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> PriceListVersionPageResponse:
    return PriceListVersionPageResponse.from_domain(
        await services.list.execute(
            organization_id=current.account.organization_id,
            supplier_id=supplier_id,
            limit=limit,
            offset=offset,
        )
    )


@router.get(
    "/price-list-versions/current",
    response_model=CurrentPriceListVersionResponse,
    summary="مشاهده نسخه جاری قیمت تأمین‌کننده",
)
async def get_current_price_list_version(
    supplier_id: UUID,
    services: Services,
    current: ReadContext,
) -> CurrentPriceListVersionResponse:
    return CurrentPriceListVersionResponse.from_domain(
        await services.current.execute(
            organization_id=current.account.organization_id,
            supplier_id=supplier_id,
        )
    )


@router.get(
    "/price-list-versions/{version_id}",
    response_model=PriceListVersionResponse,
    summary="جزئیات نسخه تغییرناپذیر قیمت",
)
async def get_price_list_version(
    supplier_id: UUID,
    version_id: UUID,
    services: Services,
    current: ReadContext,
) -> PriceListVersionResponse:
    return PriceListVersionResponse.from_domain(
        await services.get.execute(
            organization_id=current.account.organization_id,
            supplier_id=supplier_id,
            version_id=version_id,
        )
    )


@router.post(
    "/price-list-versions/{version_id}/approve",
    response_model=ApprovalResultResponse,
    summary="تأیید نسخه و انتخاب آن به‌عنوان قیمت جاری",
)
async def approve_price_list_version(
    supplier_id: UUID,
    version_id: UUID,
    payload: ApprovePriceListVersionRequest,
    services: Services,
    current: ApprovalWriteContext,
) -> ApprovalResultResponse:
    return ApprovalResultResponse.from_domain(
        await services.approve.execute(
            organization_id=current.account.organization_id,
            supplier_id=supplier_id,
            version_id=version_id,
            actor_user_id=current.account.user_id,
            expected_current_version_id=payload.expected_current_version_id,
            confirm_approval=payload.confirm_approval,
            decision_note=payload.decision_note,
        )
    )


@router.post(
    "/price-list-versions/{version_id}/reject",
    response_model=ApprovalResultResponse,
    summary="رد نسخه قیمت پس از بازبینی",
)
async def reject_price_list_version(
    supplier_id: UUID,
    version_id: UUID,
    payload: RejectPriceListVersionRequest,
    services: Services,
    current: ApprovalWriteContext,
) -> ApprovalResultResponse:
    return ApprovalResultResponse.from_domain(
        await services.reject.execute(
            organization_id=current.account.organization_id,
            supplier_id=supplier_id,
            version_id=version_id,
            actor_user_id=current.account.user_id,
            confirm_rejection=payload.confirm_rejection,
            reason=payload.reason,
        )
    )


@router.get(
    "/price-list-versions/{version_id}/audit-events",
    response_model=AuditEventPageResponse,
    summary="تاریخچه تصمیم‌های نسخه قیمت",
)
async def list_price_list_version_audit_events(
    supplier_id: UUID,
    version_id: UUID,
    services: Services,
    current: ReadContext,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> AuditEventPageResponse:
    return AuditEventPageResponse.from_domain(
        await services.audit_events.execute(
            organization_id=current.account.organization_id,
            supplier_id=supplier_id,
            version_id=version_id,
            limit=limit,
            offset=offset,
        )
    )


@router.get(
    "/price-list-versions/{version_id}/items",
    response_model=PriceListVersionItemPageResponse,
    summary="ردیف‌های نسخه تغییرناپذیر قیمت",
)
async def list_price_list_version_items(
    supplier_id: UUID,
    version_id: UUID,
    services: Services,
    current: ReadContext,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> PriceListVersionItemPageResponse:
    return PriceListVersionItemPageResponse.from_domain(
        await services.list_items.execute(
            organization_id=current.account.organization_id,
            supplier_id=supplier_id,
            version_id=version_id,
            limit=limit,
            offset=offset,
        )
    )


@router.get(
    "/price-list-versions/{version_id}/changes",
    response_model=VersionChangeReportResponse,
    summary="گزارش تغییرات نسخه نسبت به نسخه قبلی ثبت‌شده",
)
async def get_price_list_version_changes(
    supplier_id: UUID,
    version_id: UUID,
    services: Services,
    current: ReadContext,
    change_type: Annotated[ChangeType | None, Query()] = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> VersionChangeReportResponse:
    return VersionChangeReportResponse.from_domain(
        await services.version_changes.execute(
            organization_id=current.account.organization_id,
            supplier_id=supplier_id,
            version_id=version_id,
            change_type=change_type,
            limit=limit,
            offset=offset,
        )
    )


@router.get(
    "/price-list-versions/{version_id}/current-impact",
    response_model=CurrentPriceImpactResponse,
    responses=_CURRENT_IMPACT_RESPONSES,
    summary="اثر نسخه آماده بررسی بر قیمت جاری تأییدشده",
)
async def get_current_price_impact(
    supplier_id: UUID,
    version_id: UUID,
    services: Services,
    current: ReadContext,
    baseline_version_id: Annotated[UUID | None, Query()] = None,
    expect_no_current: Annotated[bool, Query()] = False,
    change_type: Annotated[ChangeType | None, Query()] = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> CurrentPriceImpactResponse:
    return CurrentPriceImpactResponse.from_domain(
        await services.current_impact.execute(
            organization_id=current.account.organization_id,
            supplier_id=supplier_id,
            version_id=version_id,
            baseline_version_id=baseline_version_id,
            expect_no_current=expect_no_current,
            change_type=change_type,
            limit=limit,
            offset=offset,
        )
    )
