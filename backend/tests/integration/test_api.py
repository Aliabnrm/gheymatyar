from pathlib import Path
from threading import get_ident

import pytest
from httpx import ASGITransport, AsyncClient

from app.core.config import Settings
from app.main import create_app
from app.modules.price_lists.application.compare_price_lists import ComparePriceLists
from app.modules.price_lists.infrastructure.xlsx_extractor import XlsxPriceListExtractor
from app.modules.price_lists.presentation.dependencies import get_compare_price_lists


@pytest.mark.anyio
async def test_health_endpoints(api_client: AsyncClient) -> None:
    live_response = await api_client.get(
        "/health/live",
        headers={"X-Request-ID": "test-request-123"},
    )
    assert live_response.json() == {"status": "ok"}
    assert live_response.headers["X-Request-ID"] == "test-request-123"
    assert (await api_client.get("/health/ready")).json() == {"status": "ok"}


@pytest.mark.anyio
async def test_invalid_request_id_is_replaced_and_security_headers_are_added(
    api_client: AsyncClient,
) -> None:
    response = await api_client.get(
        "/health/live",
        headers={"X-Request-ID": "unsafe request id\n"},
    )

    request_id = response.headers["X-Request-ID"]
    assert len(request_id) == 32
    assert request_id.isalnum()
    assert response.headers["X-Content-Type-Options"] == "nosniff"
    assert response.headers["Referrer-Policy"] == "no-referrer"


@pytest.mark.anyio
async def test_compare_endpoint(
    api_client: AsyncClient,
    old_xlsx: Path,
    new_xlsx: Path,
) -> None:
    response = await api_client.post(
        "/api/v1/price-lists/compare",
        files={
            "old_file": (
                old_xlsx.name,
                old_xlsx.read_bytes(),
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            ),
            "new_file": (
                new_xlsx.name,
                new_xlsx.read_bytes(),
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            ),
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["currency"] == "IRR"
    assert payload["summary"]["added"] == 2
    assert payload["summary"]["removed"] == 2
    assert payload["summary"]["price_changed"] == 18
    assert payload["summary"]["high_risk"] == 1
    pack_row = next(
        item for item in payload["items"] if item["product_code"] == "ACC-RJ45-CAT6-100"
    )
    assert pack_row["is_high_risk"] is True
    assert "PACK_SIZE_CHANGED" in pack_row["change_types"]


@pytest.mark.anyio
async def test_rejects_wrong_extension(api_client: AsyncClient) -> None:
    response = await api_client.post(
        "/api/v1/price-lists/compare",
        files={
            "old_file": ("old.csv", b"a,b", "text/csv"),
            "new_file": ("new.xlsx", b"PK\x03\x04bad", "application/octet-stream"),
        },
    )

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "INVALID_FILE_TYPE"


@pytest.mark.anyio
async def test_rejects_renamed_non_xlsx_content(api_client: AsyncClient) -> None:
    response = await api_client.post(
        "/api/v1/price-lists/compare",
        files={
            "old_file": ("old.xlsx", b"not-an-xlsx", "application/octet-stream"),
            "new_file": ("new.xlsx", b"not-an-xlsx", "application/octet-stream"),
        },
    )

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "INVALID_XLSX_SIGNATURE"


@pytest.mark.anyio
async def test_file_size_limit_uses_app_settings_and_stable_error_contract() -> None:
    test_app = create_app(Settings(app_env="test", max_upload_bytes=1024))
    transport = ASGITransport(app=test_app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/api/v1/price-lists/compare",
            headers={"X-Request-ID": "large-upload"},
            files={
                "old_file": ("../supplier.xlsx", b"x" * 1025, "application/octet-stream"),
                "new_file": ("new.xlsx", b"PK\x03\x04bad", "application/octet-stream"),
            },
        )

    assert response.status_code == 413
    assert response.json() == {
        "error": {
            "code": "FILE_TOO_LARGE",
            "message": "حجم فایل بیشتر از محدودیت مجاز است.",
            "details": {"max_bytes": 1024, "filename": "supplier.xlsx"},
        },
        "request_id": "large-upload",
    }


@pytest.mark.anyio
async def test_request_validation_uses_stable_error_contract(api_client: AsyncClient) -> None:
    response = await api_client.post(
        "/api/v1/price-lists/compare",
        headers={"X-Request-ID": "validation-request"},
    )

    assert response.status_code == 422
    assert response.json() == {
        "error": {
            "code": "REQUEST_VALIDATION_ERROR",
            "message": "داده‌های درخواست معتبر نیستند.",
            "details": {
                "issues": [
                    {
                        "location": ["body", "old_file"],
                        "code": "missing",
                        "message": "Field required",
                    },
                    {
                        "location": ["body", "new_file"],
                        "code": "missing",
                        "message": "Field required",
                    },
                ]
            },
        },
        "request_id": "validation-request",
    }


@pytest.mark.anyio
async def test_unexpected_errors_are_safe_and_correlated() -> None:
    test_app = create_app(Settings(app_env="test"))

    @test_app.get("/test-only/boom", include_in_schema=False)
    async def boom() -> None:
        raise RuntimeError("sensitive internal failure")

    transport = ASGITransport(app=test_app, raise_app_exceptions=False)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get(
            "/test-only/boom",
            headers={"X-Request-ID": "unexpected-request"},
        )

    assert response.status_code == 500
    assert response.json() == {
        "error": {
            "code": "INTERNAL_SERVER_ERROR",
            "message": "خطای داخلی پیش‌بینی‌نشده‌ای رخ داد.",
            "details": {},
        },
        "request_id": "unexpected-request",
    }
    assert "sensitive internal failure" not in response.text
    assert response.headers["X-Content-Type-Options"] == "nosniff"
    assert response.headers["Referrer-Policy"] == "no-referrer"


@pytest.mark.anyio
async def test_not_found_uses_stable_error_contract(api_client: AsyncClient) -> None:
    response = await api_client.get(
        "/missing",
        headers={"X-Request-ID": "missing-route"},
    )

    assert response.status_code == 404
    assert response.json() == {
        "error": {
            "code": "NOT_FOUND",
            "message": "مسیر درخواستی پیدا نشد.",
            "details": {},
        },
        "request_id": "missing-route",
    }


@pytest.mark.anyio
async def test_xlsx_processing_runs_outside_event_loop_thread(
    old_xlsx: Path,
    new_xlsx: Path,
) -> None:
    request_thread_id = get_ident()
    extraction_thread_ids: list[int] = []

    class RecordingExtractor(XlsxPriceListExtractor):
        def extract(self, content: bytes, *, filename: str):
            extraction_thread_ids.append(get_ident())
            return super().extract(content, filename=filename)

    test_app = create_app(Settings(app_env="test"))
    service = ComparePriceLists(extractor=RecordingExtractor())
    test_app.dependency_overrides[get_compare_price_lists] = lambda: service
    transport = ASGITransport(app=test_app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/api/v1/price-lists/compare",
            files={
                "old_file": ("old.xlsx", old_xlsx.read_bytes(), "application/octet-stream"),
                "new_file": ("new.xlsx", new_xlsx.read_bytes(), "application/octet-stream"),
            },
        )

    assert response.status_code == 200
    assert len(extraction_thread_ids) == 2
    assert all(thread_id != request_thread_id for thread_id in extraction_thread_ids)


def test_openapi_documents_stable_error_responses() -> None:
    schema = create_app(Settings(app_env="test")).openapi()
    responses = schema["paths"]["/api/v1/price-lists/compare"]["post"]["responses"]

    assert "413" in responses
    assert "422" in responses
