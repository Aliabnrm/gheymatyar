from fastapi import APIRouter

from app.api.health import router as health_router
from app.modules.price_lists.presentation.router import router as price_lists_router

root_router = APIRouter()
root_router.include_router(health_router)

api_v1_router = APIRouter(prefix="/api/v1")
api_v1_router.include_router(price_lists_router)
root_router.include_router(api_v1_router)
