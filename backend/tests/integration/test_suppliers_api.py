from uuid import UUID, uuid4

import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient
from sqlalchemy import func, select, update

from app.modules.accounts.infrastructure.orm import OrganizationMembershipRecord
from app.modules.suppliers.infrastructure.orm import SupplierRecord


def registration_payload() -> dict[str, str]:
    return {
        "email": f"supplier-owner-{uuid4().hex}@example.com",
        "password": "a-secure-test-password",
        "organization_name": "سازمان تأمین‌کنندگان",
    }


async def register(client: AsyncClient) -> dict[str, object]:
    response = await client.post("/api/v1/auth/register", json=registration_payload())
    assert response.status_code == 201
    return response.json()


def csrf_headers(client: AsyncClient) -> dict[str, str]:
    token = client.cookies.get("gheymatyar_csrf")
    assert token
    return {"X-CSRF-Token": token}


@pytest.mark.anyio
async def test_owner_can_create_list_get_update_and_reactivate_supplier(
    api_client: AsyncClient,
) -> None:
    await register(api_client)
    created = await api_client.post(
        "/api/v1/suppliers",
        json={"name": "  تامين  كننده ACME  "},
        headers=csrf_headers(api_client),
    )

    assert created.status_code == 201
    assert created.json()["name"] == "تامین کننده ACME"
    supplier_id = created.json()["id"]
    listed = await api_client.get("/api/v1/suppliers")
    assert listed.status_code == 200
    assert [item["id"] for item in listed.json()["items"]] == [supplier_id]
    assert listed.json()["total"] == 1
    assert (await api_client.get(f"/api/v1/suppliers/{supplier_id}")).status_code == 200

    deactivated = await api_client.patch(
        f"/api/v1/suppliers/{supplier_id}",
        json={"is_active": False},
        headers=csrf_headers(api_client),
    )
    assert deactivated.status_code == 200
    assert deactivated.json()["is_active"] is False
    assert (await api_client.get("/api/v1/suppliers")).json()["items"] == []
    assert len((await api_client.get("/api/v1/suppliers?status=inactive")).json()["items"]) == 1

    reactivated = await api_client.patch(
        f"/api/v1/suppliers/{supplier_id}",
        json={"name": "ACME جدید", "is_active": True},
        headers=csrf_headers(api_client),
    )
    assert reactivated.status_code == 200
    assert reactivated.json()["name"] == "ACME جدید"
    assert reactivated.json()["is_active"] is True


@pytest.mark.anyio
async def test_supplier_name_is_unique_per_organization_and_race_safe(
    api_client: AsyncClient,
) -> None:
    await register(api_client)
    headers = csrf_headers(api_client)
    first = await api_client.post("/api/v1/suppliers", json={"name": "شركت ACME"}, headers=headers)
    duplicate = await api_client.post(
        "/api/v1/suppliers", json={"name": "  شرکت  acme "}, headers=headers
    )

    assert first.status_code == 201
    assert duplicate.status_code == 409
    assert duplicate.json()["error"]["code"] == "SUPPLIER_NAME_ALREADY_EXISTS"


@pytest.mark.anyio
async def test_supplier_mutations_require_csrf_and_non_empty_payload(
    api_client: AsyncClient,
) -> None:
    await register(api_client)
    missing_csrf = await api_client.post("/api/v1/suppliers", json={"name": "نمونه"})
    created = await api_client.post(
        "/api/v1/suppliers",
        json={"name": "نمونه"},
        headers=csrf_headers(api_client),
    )
    empty = await api_client.patch(
        f"/api/v1/suppliers/{created.json()['id']}",
        json={},
        headers=csrf_headers(api_client),
    )

    assert missing_csrf.status_code == 403
    assert missing_csrf.json()["error"]["code"] == "CSRF_VALIDATION_FAILED"
    assert empty.status_code == 422
    assert empty.json()["error"]["code"] == "SUPPLIER_UPDATE_EMPTY"


@pytest.mark.anyio
async def test_supplier_queries_do_not_cross_tenant_boundaries(api_app: FastAPI) -> None:
    transport = ASGITransport(app=api_app)
    async with (
        AsyncClient(transport=transport, base_url="http://test") as first,
        AsyncClient(transport=transport, base_url="http://test") as second,
    ):
        await register(first)
        await register(second)
        created = await first.post(
            "/api/v1/suppliers",
            json={"name": "تأمین‌کننده خصوصی"},
            headers=csrf_headers(first),
        )
        same_name_other_tenant = await second.post(
            "/api/v1/suppliers",
            json={"name": "تأمین‌کننده خصوصی"},
            headers=csrf_headers(second),
        )
        supplier_id = created.json()["id"]

        assert same_name_other_tenant.status_code == 201
        assert [item["id"] for item in (await second.get("/api/v1/suppliers")).json()["items"]] == [
            same_name_other_tenant.json()["id"]
        ]
        hidden = await second.get(f"/api/v1/suppliers/{supplier_id}")
        hidden_update = await second.patch(
            f"/api/v1/suppliers/{supplier_id}",
            json={"name": "سرقت نام"},
            headers=csrf_headers(second),
        )

    assert hidden.status_code == 404
    assert hidden.json()["error"]["code"] == "SUPPLIER_NOT_FOUND"
    assert hidden_update.status_code == 404
    assert hidden_update.json()["error"]["code"] == "SUPPLIER_NOT_FOUND"


@pytest.mark.anyio
async def test_operator_has_read_only_supplier_access(
    api_client: AsyncClient,
    api_app: FastAPI,
) -> None:
    account = await register(api_client)
    created = await api_client.post(
        "/api/v1/suppliers",
        json={"name": "تأمین‌کننده خواندنی"},
        headers=csrf_headers(api_client),
    )
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

    assert (await api_client.get("/api/v1/suppliers")).status_code == 200
    forbidden = await api_client.patch(
        f"/api/v1/suppliers/{created.json()['id']}",
        json={"is_active": False},
        headers=csrf_headers(api_client),
    )
    assert forbidden.status_code == 403
    assert forbidden.json()["error"]["code"] == "AUTH_FORBIDDEN"


@pytest.mark.anyio
async def test_deactivation_keeps_supplier_record(
    api_client: AsyncClient, api_app: FastAPI
) -> None:
    account = await register(api_client)
    created = await api_client.post(
        "/api/v1/suppliers",
        json={"name": "تأمین‌کننده ماندگار"},
        headers=csrf_headers(api_client),
    )
    supplier_id = UUID(created.json()["id"])
    await api_client.patch(
        f"/api/v1/suppliers/{supplier_id}",
        json={"is_active": False},
        headers=csrf_headers(api_client),
    )
    database = api_app.state.database
    async with database.session_factory() as session:
        count = await session.scalar(
            select(func.count(SupplierRecord.id)).where(
                SupplierRecord.id == supplier_id,
                SupplierRecord.organization_id == UUID(str(account["organization"]["id"])),
            )
        )

    assert count == 1


def test_openapi_documents_supplier_contract(api_app: FastAPI) -> None:
    schema = api_app.openapi()

    assert "/api/v1/suppliers" in schema["paths"]
    assert "/api/v1/suppliers/{supplier_id}" in schema["paths"]


@pytest.mark.anyio
async def test_cors_allows_supplier_patch_only_from_configured_origin(
    api_app: FastAPI,
) -> None:
    transport = ASGITransport(app=api_app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        allowed = await client.options(
            "/api/v1/suppliers/00000000-0000-4000-8000-000000000000",
            headers={
                "Origin": "http://localhost:3000",
                "Access-Control-Request-Method": "PATCH",
                "Access-Control-Request-Headers": "content-type,x-csrf-token",
            },
        )
        rejected = await client.options(
            "/api/v1/suppliers/00000000-0000-4000-8000-000000000000",
            headers={
                "Origin": "https://attacker.example",
                "Access-Control-Request-Method": "PATCH",
            },
        )

    assert allowed.status_code == 200
    assert allowed.headers["Access-Control-Allow-Origin"] == "http://localhost:3000"
    assert rejected.status_code == 400
    assert "Access-Control-Allow-Origin" not in rejected.headers
