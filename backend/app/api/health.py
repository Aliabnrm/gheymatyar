from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException

from app.api.dependencies import get_database_runtime, get_document_storage
from app.api.schemas import HealthResponse
from app.infrastructure.database import DatabaseRuntime
from app.modules.price_lists.application.import_ports import DocumentStorageRuntime

router = APIRouter(tags=["health"])


@router.get("/health/live", response_model=HealthResponse, summary="بررسی زنده‌بودن سرویس")
async def live() -> HealthResponse:
    return HealthResponse()


@router.get("/health/ready", response_model=HealthResponse, summary="بررسی آمادگی سرویس")
async def ready(
    database: Annotated[DatabaseRuntime, Depends(get_database_runtime)],
    storage: Annotated[DocumentStorageRuntime, Depends(get_document_storage)],
) -> HealthResponse:
    try:
        await database.ping()
        await storage.ping()
    except Exception as exc:
        raise HTTPException(status_code=503) from exc
    return HealthResponse()
