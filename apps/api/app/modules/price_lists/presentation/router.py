from typing import Annotated

from fastapi import APIRouter, Depends, File, UploadFile
from starlette.concurrency import run_in_threadpool

from app.api.dependencies import get_request_settings
from app.api.schemas import ApiErrorResponse
from app.core.config import Settings

from ..application.compare_price_lists import ComparePriceLists
from .dependencies import get_compare_price_lists
from .schemas import ComparisonResponse
from .uploads import read_xlsx

router = APIRouter(prefix="/price-lists", tags=["price-lists"])


@router.post(
    "/compare",
    response_model=ComparisonResponse,
    summary="مقایسه دو نسخه لیست قیمت Excel",
    responses={
        413: {"model": ApiErrorResponse, "description": "حجم فایل بیشتر از حد مجاز است."},
        422: {"model": ApiErrorResponse, "description": "فایل یا محتوای درخواست معتبر نیست."},
    },
)
async def compare_price_list_files(
    old_file: Annotated[UploadFile, File(description="نسخه قدیم XLSX")],
    new_file: Annotated[UploadFile, File(description="نسخه جدید XLSX")],
    settings: Annotated[Settings, Depends(get_request_settings)],
    service: Annotated[ComparePriceLists, Depends(get_compare_price_lists)],
) -> ComparisonResponse:
    try:
        old_upload = await read_xlsx(old_file, max_bytes=settings.max_upload_bytes)
        new_upload = await read_xlsx(new_file, max_bytes=settings.max_upload_bytes)
        result = await run_in_threadpool(
            service.execute,
            old_content=old_upload.content,
            old_filename=old_upload.filename,
            new_content=new_upload.content,
            new_filename=new_upload.filename,
        )
        return ComparisonResponse.from_domain(result)
    finally:
        await old_file.close()
        await new_file.close()
