import asyncio
from io import BytesIO
from pathlib import Path
from uuid import UUID, uuid4

import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient
from openpyxl import Workbook
from sqlalchemy import func, select, text, update

from app.modules.accounts.infrastructure.orm import OrganizationMembershipRecord
from app.modules.price_lists.infrastructure.import_orm import (
    ExtractedRowRecord,
    ImportRunRecord,
    SourceDocumentRecord,
)

XLSX_MEDIA_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"


async def _register(client: AsyncClient) -> dict[str, object]:
    response = await client.post(
        "/api/v1/auth/register",
        json={
            "email": f"import-{uuid4().hex}@example.com",
            "password": "a-secure-test-password",
            "organization_name": "سازمان Import",
        },
    )
    assert response.status_code == 201
    return response.json()


def _csrf_headers(client: AsyncClient) -> dict[str, str]:
    token = client.cookies.get("gheymatyar_csrf")
    assert token
    return {"X-CSRF-Token": token}


async def _create_supplier(client: AsyncClient, name: str = "تأمین‌کننده Import") -> str:
    response = await client.post(
        "/api/v1/suppliers",
        json={"name": name},
        headers=_csrf_headers(client),
    )
    assert response.status_code == 201
    return str(response.json()["id"])


def _invalid_data_quality_workbook() -> bytes:
    workbook = Workbook()
    sheet = workbook.active
    sheet.append(["کد کالا", "شرح کالا"])
    sheet.append(["A-1", "کابل شبکه"])
    output = BytesIO()
    workbook.save(output)
    workbook.close()
    return output.getvalue()


@pytest.mark.anyio
async def test_upload_persists_draft_document_import_and_rows_atomically(
    api_client: AsyncClient,
    api_app: FastAPI,
    new_xlsx: Path,
) -> None:
    account = await _register(api_client)
    supplier_id = await _create_supplier(api_client)

    response = await api_client.post(
        f"/api/v1/suppliers/{supplier_id}/imports",
        headers=_csrf_headers(api_client),
        files={"file": (new_xlsx.name, new_xlsx.read_bytes(), XLSX_MEDIA_TYPE)},
    )

    assert response.status_code == 201, response.text
    payload = response.json()
    assert payload["status"] == "DRAFT"
    assert payload["row_count"] == 24
    assert payload["blocking_error"] is None
    assert payload["supplier"]["id"] == supplier_id
    assert "organization_id" not in payload
    assert "object_key" not in payload["source_document"]
    database = api_app.state.database
    async with database.session_factory() as session:
        document_count = await session.scalar(
            select(func.count(SourceDocumentRecord.id)).where(
                SourceDocumentRecord.organization_id == UUID(str(account["organization"]["id"])),
                SourceDocumentRecord.supplier_id == UUID(supplier_id),
            )
        )
        row_count = await session.scalar(
            select(func.count(ExtractedRowRecord.id)).where(
                ExtractedRowRecord.import_run_id == UUID(payload["id"])
            )
        )
    assert document_count == 1
    assert row_count == 24
    stored_objects = api_app.state.document_storage.client.objects
    assert list(stored_objects.values()) == [new_xlsx.read_bytes()]

    history = await api_client.get(f"/api/v1/suppliers/{supplier_id}/imports")
    detail = await api_client.get(f"/api/v1/suppliers/{supplier_id}/imports/{payload['id']}")
    rows = await api_client.get(
        f"/api/v1/suppliers/{supplier_id}/imports/{payload['id']}/rows?limit=5"
    )
    assert history.status_code == detail.status_code == rows.status_code == 200
    assert history.json()["total"] == 1
    assert rows.json()["total"] == 24
    assert len(rows.json()["items"]) == 5


@pytest.mark.anyio
async def test_data_quality_failure_is_persisted_without_partial_rows(
    api_client: AsyncClient,
    api_app: FastAPI,
) -> None:
    await _register(api_client)
    supplier_id = await _create_supplier(api_client)

    response = await api_client.post(
        f"/api/v1/suppliers/{supplier_id}/imports",
        headers=_csrf_headers(api_client),
        files={"file": ("missing-price.xlsx", _invalid_data_quality_workbook(), XLSX_MEDIA_TYPE)},
    )

    assert response.status_code == 201
    payload = response.json()
    assert payload["status"] == "FAILED"
    assert payload["row_count"] == 0
    assert payload["blocking_error"]["code"] == "REQUIRED_COLUMN_MISSING"
    database = api_app.state.database
    async with database.session_factory() as session:
        persisted_rows = await session.scalar(
            select(func.count(ExtractedRowRecord.id)).where(
                ExtractedRowRecord.import_run_id == UUID(payload["id"])
            )
        )
    assert persisted_rows == 0


@pytest.mark.anyio
async def test_duplicate_file_and_inactive_supplier_are_stable_conflicts(
    api_client: AsyncClient,
    new_xlsx: Path,
) -> None:
    await _register(api_client)
    supplier_id = await _create_supplier(api_client)
    files = {"file": (new_xlsx.name, new_xlsx.read_bytes(), XLSX_MEDIA_TYPE)}
    first = await api_client.post(
        f"/api/v1/suppliers/{supplier_id}/imports",
        headers=_csrf_headers(api_client),
        files=files,
    )
    second_supplier_id = await _create_supplier(api_client, "تأمین‌کننده دوم")
    same_file_other_supplier = await api_client.post(
        f"/api/v1/suppliers/{second_supplier_id}/imports",
        headers=_csrf_headers(api_client),
        files=files,
    )
    duplicate = await api_client.post(
        f"/api/v1/suppliers/{supplier_id}/imports",
        headers=_csrf_headers(api_client),
        files=files,
    )
    await api_client.patch(
        f"/api/v1/suppliers/{supplier_id}",
        headers=_csrf_headers(api_client),
        json={"is_active": False},
    )
    inactive = await api_client.post(
        f"/api/v1/suppliers/{supplier_id}/imports",
        headers=_csrf_headers(api_client),
        files={"file": ("other.xlsx", _invalid_data_quality_workbook(), XLSX_MEDIA_TYPE)},
    )

    assert first.status_code == 201
    assert same_file_other_supplier.status_code == 201
    assert duplicate.status_code == 409
    assert duplicate.json()["error"]["code"] == "IMPORT_FILE_ALREADY_EXISTS"
    assert duplicate.json()["error"]["details"]["existing_import_id"] == first.json()["id"]
    assert inactive.status_code == 409
    assert inactive.json()["error"]["code"] == "SUPPLIER_INACTIVE"
    assert (await api_client.get(f"/api/v1/suppliers/{supplier_id}/imports")).status_code == 200


@pytest.mark.anyio
async def test_imports_are_tenant_scoped_and_operator_can_upload(
    api_app: FastAPI,
    new_xlsx: Path,
) -> None:
    transport = ASGITransport(app=api_app)
    async with (
        AsyncClient(transport=transport, base_url="http://test") as owner,
        AsyncClient(transport=transport, base_url="http://test") as outsider,
    ):
        account = await _register(owner)
        await _register(outsider)
        supplier_id = await _create_supplier(owner)
        other_supplier_id = await _create_supplier(owner, "تأمین‌کننده اشتباه")
        database = api_app.state.database
        async with database.session_factory() as session, session.begin():
            await session.execute(
                update(OrganizationMembershipRecord)
                .where(
                    OrganizationMembershipRecord.user_id == UUID(str(account["user"]["id"])),
                    OrganizationMembershipRecord.organization_id
                    == UUID(str(account["organization"]["id"])),
                )
                .values(role="OPERATOR")
            )
        created = await owner.post(
            f"/api/v1/suppliers/{supplier_id}/imports",
            headers=_csrf_headers(owner),
            files={"file": (new_xlsx.name, new_xlsx.read_bytes(), XLSX_MEDIA_TYPE)},
        )
        wrong_supplier_detail = await owner.get(
            f"/api/v1/suppliers/{other_supplier_id}/imports/{created.json()['id']}"
        )
        wrong_supplier_rows = await owner.get(
            f"/api/v1/suppliers/{other_supplier_id}/imports/{created.json()['id']}/rows"
        )
        hidden_list = await outsider.get(f"/api/v1/suppliers/{supplier_id}/imports")
        hidden_detail = await outsider.get(
            f"/api/v1/suppliers/{supplier_id}/imports/{created.json()['id']}"
        )
        outsider_supplier_id = await _create_supplier(outsider, "تأمین‌کننده سازمان دوم")
        same_file_other_tenant = await outsider.post(
            f"/api/v1/suppliers/{outsider_supplier_id}/imports",
            headers=_csrf_headers(outsider),
            files={"file": (new_xlsx.name, new_xlsx.read_bytes(), XLSX_MEDIA_TYPE)},
        )

    assert created.status_code == 201
    assert hidden_list.status_code == 404
    assert hidden_list.json()["error"]["code"] == "SUPPLIER_NOT_FOUND"
    assert hidden_detail.status_code == 404
    assert hidden_detail.json()["error"]["code"] == "PRICE_LIST_IMPORT_NOT_FOUND"
    assert same_file_other_tenant.status_code == 201
    assert wrong_supplier_detail.status_code == 404
    assert wrong_supplier_detail.json()["error"]["code"] == "PRICE_LIST_IMPORT_NOT_FOUND"
    assert wrong_supplier_rows.status_code == 404
    assert wrong_supplier_rows.json()["error"]["code"] == "PRICE_LIST_IMPORT_NOT_FOUND"


@pytest.mark.anyio
async def test_upload_requires_csrf_and_rejects_safety_invalid_file(
    api_client: AsyncClient,
    api_app: FastAPI,
) -> None:
    account = await _register(api_client)
    supplier_id = await _create_supplier(api_client)
    missing_csrf = await api_client.post(
        f"/api/v1/suppliers/{supplier_id}/imports",
        files={"file": ("bad.xlsx", b"not-a-zip", XLSX_MEDIA_TYPE)},
    )
    unsafe = await api_client.post(
        f"/api/v1/suppliers/{supplier_id}/imports",
        headers=_csrf_headers(api_client),
        files={"file": ("bad.xlsx", b"not-a-zip", XLSX_MEDIA_TYPE)},
    )

    assert missing_csrf.status_code == 403
    assert missing_csrf.json()["error"]["code"] == "CSRF_VALIDATION_FAILED"
    assert unsafe.status_code == 422
    assert unsafe.json()["error"]["code"] == "INVALID_XLSX_SIGNATURE"
    database = api_app.state.database
    async with database.session_factory() as session:
        import_count = await session.scalar(
            select(func.count(ImportRunRecord.id)).where(
                ImportRunRecord.organization_id == UUID(str(account["organization"]["id"]))
            )
        )
    assert import_count == 0


@pytest.mark.anyio
async def test_storage_failure_returns_safe_503_without_persisting_import(
    api_client: AsyncClient,
    api_app: FastAPI,
    new_xlsx: Path,
) -> None:
    account = await _register(api_client)
    supplier_id = await _create_supplier(api_client)

    def unavailable_put(**kwargs: object) -> object:
        del kwargs
        raise OSError("secret-storage-endpoint")

    api_app.state.document_storage.client.put_object = unavailable_put
    response = await api_client.post(
        f"/api/v1/suppliers/{supplier_id}/imports",
        headers=_csrf_headers(api_client),
        files={"file": (new_xlsx.name, new_xlsx.read_bytes(), XLSX_MEDIA_TYPE)},
    )

    assert response.status_code == 503
    assert response.json()["error"]["code"] == "OBJECT_STORAGE_UNAVAILABLE"
    assert "secret-storage-endpoint" not in response.text
    database = api_app.state.database
    async with database.session_factory() as session:
        import_count = await session.scalar(
            select(func.count(ImportRunRecord.id)).where(
                ImportRunRecord.organization_id == UUID(str(account["organization"]["id"]))
            )
        )
    assert import_count == 0


@pytest.mark.anyio
async def test_concurrent_duplicate_upload_returns_one_created_and_one_conflict(
    api_client: AsyncClient,
    new_xlsx: Path,
) -> None:
    await _register(api_client)
    supplier_id = await _create_supplier(api_client)
    headers = _csrf_headers(api_client)

    async def upload() -> tuple[int, str | None]:
        response = await api_client.post(
            f"/api/v1/suppliers/{supplier_id}/imports",
            headers=headers,
            files={"file": (new_xlsx.name, new_xlsx.read_bytes(), XLSX_MEDIA_TYPE)},
        )
        code = response.json().get("error", {}).get("code")
        return response.status_code, code

    outcomes = await asyncio.gather(upload(), upload())

    assert sorted(status for status, _ in outcomes) == [201, 409]
    assert any(code == "IMPORT_FILE_ALREADY_EXISTS" for _, code in outcomes)


@pytest.mark.anyio
async def test_history_filters_paginates_and_sorts_newest_first(
    api_client: AsyncClient,
    new_xlsx: Path,
) -> None:
    await _register(api_client)
    supplier_id = await _create_supplier(api_client)
    draft = await api_client.post(
        f"/api/v1/suppliers/{supplier_id}/imports",
        headers=_csrf_headers(api_client),
        files={"file": (new_xlsx.name, new_xlsx.read_bytes(), XLSX_MEDIA_TYPE)},
    )
    failed = await api_client.post(
        f"/api/v1/suppliers/{supplier_id}/imports",
        headers=_csrf_headers(api_client),
        files={"file": ("failed.xlsx", _invalid_data_quality_workbook(), XLSX_MEDIA_TYPE)},
    )

    all_imports = await api_client.get(
        f"/api/v1/suppliers/{supplier_id}/imports?status=all&limit=1&offset=0"
    )
    second_page = await api_client.get(
        f"/api/v1/suppliers/{supplier_id}/imports?status=all&limit=1&offset=1"
    )
    drafts = await api_client.get(f"/api/v1/suppliers/{supplier_id}/imports?status=draft")
    failures = await api_client.get(f"/api/v1/suppliers/{supplier_id}/imports?status=failed")

    assert all_imports.json()["total"] == 2
    assert all_imports.json()["items"][0]["id"] == failed.json()["id"]
    assert second_page.json()["items"][0]["id"] == draft.json()["id"]
    assert [item["id"] for item in drafts.json()["items"]] == [draft.json()["id"]]
    assert [item["id"] for item in failures.json()["items"]] == [failed.json()["id"]]


@pytest.mark.anyio
async def test_import_migration_exposes_tenant_and_data_integrity_constraints(
    api_app: FastAPI,
) -> None:
    expected = {
        "source_documents": {
            "uq_source_documents_tenant_supplier_sha256",
            "fk_source_documents_tenant_supplier",
            "ck_source_documents_sha256_lower_hex",
        },
        "import_runs": {
            "fk_import_runs_tenant_source_document",
            "ck_import_runs_status",
            "ck_import_runs_status_consistency",
        },
        "extracted_rows": {
            "fk_extracted_rows_tenant_import_run",
            "uq_extracted_rows_import_product_code",
            "ck_extracted_rows_price_positive",
            "ck_extracted_rows_product_code_length",
        },
    }
    database = api_app.state.database
    async with database.session_factory() as session:
        for table_name, expected_names in expected.items():
            result = await session.execute(
                text(
                    "SELECT conname FROM pg_constraint "
                    "WHERE conrelid = CAST(:table_name AS regclass)"
                ),
                {"table_name": table_name},
            )
            assert expected_names.issubset(set(result.scalars()))


def test_openapi_documents_price_list_import_contract(api_app: FastAPI) -> None:
    schema = api_app.openapi()
    base = "/api/v1/suppliers/{supplier_id}/imports"

    assert base in schema["paths"]
    assert f"{base}/{{import_id}}" in schema["paths"]
    assert f"{base}/{{import_id}}/rows" in schema["paths"]
    assert "201" in schema["paths"][base]["post"]["responses"]
    assert "503" in schema["paths"][base]["post"]["responses"]


@pytest.mark.anyio
async def test_readiness_fails_safely_when_object_storage_is_unavailable(
    api_client: AsyncClient,
    api_app: FastAPI,
) -> None:
    def unavailable_head(**kwargs: object) -> object:
        del kwargs
        raise OSError("secret-object-storage-url")

    api_app.state.document_storage.client.head_bucket = unavailable_head
    ready = await api_client.get("/health/ready", headers={"X-Request-ID": "storage-down"})
    live = await api_client.get("/health/live")

    assert ready.status_code == 503
    assert ready.json()["error"]["code"] == "SERVICE_NOT_READY"
    assert "secret-object-storage-url" not in ready.text
    assert live.status_code == 200
