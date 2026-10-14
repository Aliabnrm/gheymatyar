from fastapi import APIRouter

from app.api.health import router as health_router
from app.modules.accounts.presentation.router import router as accounts_router
from app.modules.price_lists.presentation.import_router import router as price_list_imports_router
from app.modules.price_lists.presentation.mapping_router import router as mapping_router
from app.modules.price_lists.presentation.router import router as price_lists_router
from app.modules.price_lists.presentation.version_router import router as price_list_versions_router
from app.modules.suppliers.presentation.router import router as suppliers_router

root_router = APIRouter()
root_router.include_router(health_router)

api_v1_router = APIRouter(prefix="/api/v1")
api_v1_router.include_router(accounts_router)
api_v1_router.include_router(price_lists_router)
api_v1_router.include_router(price_list_imports_router)
api_v1_router.include_router(suppliers_router)
api_v1_router.include_router(mapping_router)
api_v1_router.include_router(price_list_versions_router)
root_router.include_router(api_v1_router)
