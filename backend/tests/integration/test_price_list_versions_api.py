from pathlib import Path
from uuid import UUID

import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient
from sqlalchemy import func, select, text, update

from app.modules.accounts.infrastructure.orm import OrganizationMembershipRecord
from app.modules.price_lists.infrastructure.version_orm import (
    PriceListVersionItemRecord,
    PriceListVersionRecord,
)
from tests.integration.test_price_list_imports_api import (
    XLSX_MEDIA_TYPE,
    _create_supplier,
    _csrf_headers,
    _invalid_data_quality_workbook,
    _register,
)
from tests.unit.test_column_mapping import workbook_bytes


async def _upload(client: AsyncClient, supplier_id: str, path: Path) -> dict[str, object]:
    response = await client.post(
        f"/api/v1/suppliers/{supplier_id}/imports",
        headers=_csrf_headers(client),
        files={"file": (path.name, path.read_bytes(), XLSX_MEDIA_TYPE)},
    )
    assert response.status_code == 201, response.text
    return response.json()


async def _create_version(
    client: AsyncClient,
    supplier_id: str,
    import_id: str,
    previous_id: str | None,
) -> object:
    return await client.post(
        f"/api/v1/suppliers/{supplier_id}/imports/{import_id}/version",
        headers=_csrf_headers(client),
        json={"expected_previous_version_id": previous_id, "confirm_create": True},
    )


@pytest.mark.anyio
async def test_immutable_version_flow_matches_reference_fixture(
    api_client: AsyncClient,
    api_app: FastAPI,
    old_xlsx: Path,
    new_xlsx: Path,
) -> None:
    account = await _register(api_client)
    supplier_id = await _create_supplier(api_client)
    old_import = await _upload(api_client, supplier_id, old_xlsx)
    first_comparison = await api_client.get(
        f"/api/v1/suppliers/{supplier_id}/imports/{old_import['id']}/comparison"
    )
    assert first_comparison.status_code == 200
    assert first_comparison.json()["baseline_version"] is None
    assert first_comparison.json()["summary"] is None

    missing_csrf = await api_client.post(
        f"/api/v1/suppliers/{supplier_id}/imports/{old_import['id']}/version",
        json={"expected_previous_version_id": None, "confirm_create": True},
    )
    unconfirmed = await api_client.post(
        f"/api/v1/suppliers/{supplier_id}/imports/{old_import['id']}/version",
        headers=_csrf_headers(api_client),
        json={"expected_previous_version_id": None, "confirm_create": False},
    )
    assert missing_csrf.status_code == 403
    assert unconfirmed.status_code == 422
    assert unconfirmed.json()["error"]["code"] == "VERSION_CREATION_NOT_CONFIRMED"

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

    first = await _create_version(api_client, supplier_id, str(old_import["id"]), None)
    assert first.status_code == 201, first.text
    first_version = first.json()
    assert first_version["version_number"] == 1
    assert first_version["previous_version_id"] is None
    assert first_version["row_count"] == 24
    first_registered_report = await api_client.get(
        f"/api/v1/suppliers/{supplier_id}/imports/{old_import['id']}/comparison"
    )
    assert first_registered_report.json()["created_version"]["id"] == first_version["id"]
    assert first_registered_report.json()["baseline_version"] is None

    new_import = await _upload(api_client, supplier_id, new_xlsx)
    comparison = await api_client.get(
        f"/api/v1/suppliers/{supplier_id}/imports/{new_import['id']}/comparison"
    )
    assert comparison.status_code == 200, comparison.text
    payload = comparison.json()
    assert payload["baseline_version"]["id"] == first_version["id"]
    expected_summary = {
        "old_items": 24,
        "new_items": 24,
        "added": 2,
        "removed": 2,
        "price_changed": 18,
        "metadata_only_changed": 2,
        "unchanged": 2,
    }
    assert {key: payload["summary"][key] for key in expected_summary} == expected_summary
    risky = await api_client.get(
        f"/api/v1/suppliers/{supplier_id}/imports/{new_import['id']}/comparison"
        "?change_type=PACK_SIZE_CHANGED"
    )
    assert risky.status_code == 200
    assert risky.json()["total"] == 1
    assert risky.json()["items"][0]["product_code"] == "ACC-RJ45-CAT6-100"
    assert risky.json()["items"][0]["is_high_risk"] is True

    second = await _create_version(
        api_client, supplier_id, str(new_import["id"]), first_version["id"]
    )
    assert second.status_code == 201, second.text
    second_version = second.json()
    assert second_version["version_number"] == 2
    assert second_version["previous_version_id"] == first_version["id"]

    registered_report = await api_client.get(
        f"/api/v1/suppliers/{supplier_id}/imports/{new_import['id']}/comparison"
    )
    assert registered_report.json()["created_version"]["id"] == second_version["id"]
    assert registered_report.json()["baseline_version"]["id"] == first_version["id"]
    assert registered_report.json()["summary"]["price_changed"] == 18

    duplicate = await _create_version(
        api_client, supplier_id, str(new_import["id"]), second_version["id"]
    )
    history = await api_client.get(f"/api/v1/suppliers/{supplier_id}/price-list-versions")
    changes = await api_client.get(
        f"/api/v1/suppliers/{supplier_id}/price-list-versions/{second_version['id']}/changes"
    )
    items = await api_client.get(
        f"/api/v1/suppliers/{supplier_id}/price-list-versions/{first_version['id']}/items"
    )
    assert duplicate.status_code == 409
    assert duplicate.json()["error"]["code"] == "PRICE_LIST_VERSION_ALREADY_EXISTS"
    assert [item["version_number"] for item in history.json()["items"]] == [2, 1]
    assert changes.json()["summary"]["price_changed"] == 18
    assert items.json()["total"] == 24

    async with database.session_factory() as session:
        version_count = await session.scalar(
            select(func.count())
            .select_from(PriceListVersionRecord)
            .where(
                PriceListVersionRecord.organization_id == UUID(str(account["organization"]["id"]))
            )
        )
        item_count = await session.scalar(
            select(func.count()).select_from(PriceListVersionItemRecord)
        )
    assert version_count == 2
    assert item_count >= 48


@pytest.mark.anyio
async def test_version_creation_is_tenant_scoped_read_only_for_inactive_and_cas_safe(
    api_client: AsyncClient,
    api_app: FastAPI,
    old_xlsx: Path,
    new_xlsx: Path,
) -> None:
    await _register(api_client)
    supplier_id = await _create_supplier(api_client)
    old_import = await _upload(api_client, supplier_id, old_xlsx)
    first = await _create_version(api_client, supplier_id, str(old_import["id"]), None)
    first_id = first.json()["id"]
    new_import = await _upload(api_client, supplier_id, new_xlsx)
    third = await api_client.post(
        f"/api/v1/suppliers/{supplier_id}/imports",
        headers=_csrf_headers(api_client),
        files={
            "file": (
                "third.xlsx",
                workbook_bytes([["کد کالا", "نام کالا", "قیمت ریال"], ["003", "کابل", 3000]]),
                XLSX_MEDIA_TYPE,
            )
        },
    )
    assert third.status_code == 201
    assert (
        await _create_version(api_client, supplier_id, str(new_import["id"]), first_id)
    ).status_code == 201
    stale = await _create_version(api_client, supplier_id, third.json()["id"], first_id)
    assert stale.status_code == 409
    assert stale.json()["error"]["code"] == "PRICE_LIST_BASELINE_CHANGED"

    async with AsyncClient(transport=ASGITransport(app=api_app), base_url="http://test") as other:
        await _register(other)
        hidden = await other.get(f"/api/v1/suppliers/{supplier_id}/price-list-versions/{first_id}")
        hidden_create = await other.post(
            f"/api/v1/suppliers/{supplier_id}/imports/{third.json()['id']}/version",
            headers=_csrf_headers(other),
            json={"expected_previous_version_id": first_id, "confirm_create": True},
        )
    assert hidden.status_code == 404
    assert hidden_create.status_code == 404

    await api_client.patch(
        f"/api/v1/suppliers/{supplier_id}",
        headers=_csrf_headers(api_client),
        json={"is_active": False},
    )
    inactive = await _create_version(api_client, supplier_id, third.json()["id"], first_id)
    assert inactive.status_code == 409
    assert inactive.json()["error"]["code"] == "SUPPLIER_INACTIVE"
    assert (
        await api_client.get(f"/api/v1/suppliers/{supplier_id}/price-list-versions")
    ).status_code == 200


@pytest.mark.anyio
async def test_failed_import_cannot_create_version(api_client: AsyncClient) -> None:
    await _register(api_client)
    supplier_id = await _create_supplier(api_client)
    failed = await api_client.post(
        f"/api/v1/suppliers/{supplier_id}/imports",
        headers=_csrf_headers(api_client),
        files={"file": ("failed.xlsx", _invalid_data_quality_workbook(), XLSX_MEDIA_TYPE)},
    )
    response = await _create_version(api_client, supplier_id, failed.json()["id"], None)
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "IMPORT_NOT_READY_FOR_VERSION"


@pytest.mark.anyio
async def test_version_constraints_and_openapi_are_present(api_app: FastAPI) -> None:
    expected = {
        "price_list_versions": {
            "fk_price_list_versions_tenant_supplier",
            "fk_price_list_versions_previous_same_supplier",
            "uq_price_list_versions_tenant_supplier_number",
            "uq_price_list_versions_tenant_supplier_import",
        },
        "price_list_items": {
            "fk_price_list_items_tenant_version",
            "uq_price_list_items_tenant_version_code",
            "ck_price_list_items_price_positive",
        },
    }
    async with api_app.state.database.session_factory() as session:
        for table_name, names in expected.items():
            result = await session.execute(
                text(
                    "SELECT conname FROM pg_constraint "
                    "WHERE conrelid = CAST(:table_name AS regclass)"
                ),
                {"table_name": table_name},
            )
            assert names.issubset(set(result.scalars()))
    paths = api_app.openapi()["paths"]
    base = "/api/v1/suppliers/{supplier_id}"
    assert f"{base}/imports/{{import_id}}/comparison" in paths
    assert f"{base}/imports/{{import_id}}/version" in paths
    assert f"{base}/price-list-versions/{{version_id}}/changes" in paths
