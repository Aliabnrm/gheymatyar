from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.errors import register_exception_handlers
from app.api.router import root_router
from app.core.config import Settings, get_settings
from app.core.logging import configure_logging
from app.core.middleware import RequestContextMiddleware
from app.infrastructure.database import create_database_runtime
from app.modules.accounts.application.get_current_account import GetCurrentAccount
from app.modules.accounts.application.login import LoginAccount
from app.modules.accounts.application.logout import LogoutAccount
from app.modules.accounts.application.rate_limit import LoginRateLimiter
from app.modules.accounts.application.register import RegisterAccount
from app.modules.accounts.application.services import AccountServices
from app.modules.accounts.application.validate_csrf import ValidateCsrf
from app.modules.accounts.infrastructure.passwords import Argon2PasswordHasher
from app.modules.accounts.infrastructure.repositories import SqlAlchemyAccountStore
from app.modules.accounts.infrastructure.tokens import SecureTokenService
from app.modules.price_lists.application.approval_queries import (
    GetCurrentPriceListVersion,
    ListPriceListVersionAuditEvents,
)
from app.modules.price_lists.application.approve_price_list_version import (
    ApprovePriceListVersion,
)
from app.modules.price_lists.application.create_import import CreatePriceListImport
from app.modules.price_lists.application.create_price_list_version import CreatePriceListVersion
from app.modules.price_lists.application.current_price_impact import GetCurrentPriceImpact
from app.modules.price_lists.application.get_import import GetPriceListImport
from app.modules.price_lists.application.import_ports import DocumentStorageRuntime
from app.modules.price_lists.application.import_services import PriceListImportServices
from app.modules.price_lists.application.list_extracted_rows import ListExtractedRows
from app.modules.price_lists.application.list_imports import ListPriceListImports
from app.modules.price_lists.application.mapping_services import MappingServices
from app.modules.price_lists.application.reject_price_list_version import RejectPriceListVersion
from app.modules.price_lists.application.version_queries import (
    GetImportChangeReport,
    GetPriceListVersion,
    GetVersionChangeReport,
    ListPriceListVersionItems,
    ListPriceListVersions,
)
from app.modules.price_lists.application.version_services import PriceListVersionServices
from app.modules.price_lists.infrastructure.approval_repositories import (
    SqlAlchemyCurrentPriceImpactReader,
    SqlAlchemyPriceListApprovalStore,
)
from app.modules.price_lists.infrastructure.import_repositories import (
    SqlAlchemyPriceListImportStore,
)
from app.modules.price_lists.infrastructure.mapping_repositories import SqlAlchemyMappingStore
from app.modules.price_lists.infrastructure.s3_document_storage import (
    create_s3_document_storage,
)
from app.modules.price_lists.infrastructure.threaded_extractor import ThreadedPriceListExtractor
from app.modules.price_lists.infrastructure.threaded_mapping_extractor import (
    ThreadedMappingExtractor,
)
from app.modules.price_lists.infrastructure.version_repositories import (
    SqlAlchemyPriceListVersionStore,
)
from app.modules.price_lists.infrastructure.xlsx_extractor import (
    XlsxExtractionLimits,
    XlsxPriceListExtractor,
)
from app.modules.suppliers.application.create_supplier import CreateSupplier
from app.modules.suppliers.application.get_supplier import GetSupplier
from app.modules.suppliers.application.list_suppliers import ListSuppliers
from app.modules.suppliers.application.services import SupplierServices
from app.modules.suppliers.application.update_supplier import UpdateSupplier
from app.modules.suppliers.infrastructure.repositories import SqlAlchemySupplierStore


def create_app(
    settings: Settings | None = None,
    *,
    document_storage: DocumentStorageRuntime | None = None,
) -> FastAPI:
    resolved_settings = settings or get_settings()
    configure_logging(resolved_settings.log_level)
    database = create_database_runtime(resolved_settings)
    store = SqlAlchemyAccountStore(database.session_factory)
    password_hasher = Argon2PasswordHasher()
    token_service = SecureTokenService()
    supplier_store = SqlAlchemySupplierStore(database.session_factory)
    import_store = SqlAlchemyPriceListImportStore(database.session_factory)
    storage = document_storage or create_s3_document_storage(resolved_settings)
    xlsx_extractor = XlsxPriceListExtractor(
        XlsxExtractionLimits(
            max_header_scan_rows=resolved_settings.max_workbook_header_scan_rows,
            max_rows=resolved_settings.max_workbook_rows,
            max_columns=resolved_settings.max_workbook_columns,
            max_sheets=resolved_settings.max_workbook_sheets,
            max_archive_entries=resolved_settings.max_xlsx_archive_entries,
            max_uncompressed_bytes=resolved_settings.max_xlsx_uncompressed_bytes,
            max_compression_ratio=resolved_settings.max_xlsx_compression_ratio,
        )
    )
    extractor = ThreadedPriceListExtractor(xlsx_extractor)
    mapping_extractor = ThreadedMappingExtractor(xlsx_extractor)
    mapping_store = SqlAlchemyMappingStore(database.session_factory)
    version_store = SqlAlchemyPriceListVersionStore(database.session_factory)
    approval_store = SqlAlchemyPriceListApprovalStore(database.session_factory)
    current_impact_reader = SqlAlchemyCurrentPriceImpactReader(database.session_factory)

    @asynccontextmanager
    async def lifespan(_: FastAPI) -> AsyncIterator[None]:
        try:
            yield
        finally:
            await storage.close()
            await database.dispose()

    application = FastAPI(
        title=resolved_settings.app_name,
        version="0.1.0",
        description="API مقایسه قابل اعتماد لیست قیمت عمده‌فروشی",
        lifespan=lifespan,
    )
    application.state.settings = resolved_settings
    application.state.database = database
    application.state.document_storage = storage
    application.state.account_services = AccountServices(
        register=RegisterAccount(
            store=store,
            password_hasher=password_hasher,
            token_service=token_service,
            session_ttl_seconds=resolved_settings.auth_session_ttl_seconds,
            registration_enabled=resolved_settings.registration_enabled,
        ),
        login=LoginAccount(
            store=store,
            password_hasher=password_hasher,
            token_service=token_service,
            session_ttl_seconds=resolved_settings.auth_session_ttl_seconds,
        ),
        current=GetCurrentAccount(store=store, token_service=token_service),
        logout=LogoutAccount(store=store),
        csrf=ValidateCsrf(token_service=token_service),
    )
    application.state.login_rate_limiter = LoginRateLimiter(
        max_failures=resolved_settings.auth_login_max_failures,
        window_seconds=resolved_settings.auth_login_window_seconds,
        max_entries=resolved_settings.auth_login_limiter_max_entries,
    )
    application.state.supplier_services = SupplierServices(
        create=CreateSupplier(supplier_store),
        list=ListSuppliers(supplier_store),
        get=GetSupplier(supplier_store),
        update=UpdateSupplier(supplier_store),
    )
    application.state.mapping_services = MappingServices(
        imports=import_store,
        store=mapping_store,
        storage=storage,
        extractor=mapping_extractor,
        max_bytes=resolved_settings.max_upload_bytes,
    )
    application.state.price_list_import_services = PriceListImportServices(
        create=CreatePriceListImport(
            store=import_store,
            storage=storage,
            extractor=extractor,
            mapping_extractor=mapping_extractor,
            mapping_store=mapping_store,
        ),
        list=ListPriceListImports(import_store),
        get=GetPriceListImport(import_store),
        list_rows=ListExtractedRows(import_store),
    )
    application.state.price_list_version_services = PriceListVersionServices(
        create=CreatePriceListVersion(version_store),
        list=ListPriceListVersions(version_store),
        get=GetPriceListVersion(version_store),
        list_items=ListPriceListVersionItems(version_store),
        import_changes=GetImportChangeReport(version_store),
        version_changes=GetVersionChangeReport(version_store),
        approve=ApprovePriceListVersion(approval_store),
        reject=RejectPriceListVersion(approval_store),
        current=GetCurrentPriceListVersion(approval_store, version_store),
        audit_events=ListPriceListVersionAuditEvents(approval_store),
        current_impact=GetCurrentPriceImpact(current_impact_reader),
    )
    application.add_middleware(
        CORSMiddleware,
        allow_origins=list(resolved_settings.allowed_origins),
        allow_credentials=True,
        allow_methods=["GET", "POST", "PATCH", "OPTIONS"],
        allow_headers=["Content-Type", "Accept", "X-Request-ID", "X-CSRF-Token"],
        expose_headers=["X-Request-ID"],
    )
    application.add_middleware(
        RequestContextMiddleware,
        environment=resolved_settings.app_env,
    )
    register_exception_handlers(application)
    application.include_router(root_router)
    return application


app = create_app()
