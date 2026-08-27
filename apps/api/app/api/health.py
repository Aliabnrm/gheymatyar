from fastapi import APIRouter

from app.api.schemas import HealthResponse

router = APIRouter(tags=["health"])


@router.get("/health/live", response_model=HealthResponse, summary="بررسی زنده‌بودن سرویس")
async def live() -> HealthResponse:
    return HealthResponse()


@router.get("/health/ready", response_model=HealthResponse, summary="بررسی آمادگی سرویس")
async def ready() -> HealthResponse:
    return HealthResponse()
