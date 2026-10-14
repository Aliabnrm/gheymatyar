import asyncio
from pathlib import Path
from uuid import UUID

import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient
from sqlalchemy import func, select, text, update

from app.modules.accounts.infrastructure.orm import OrganizationMembershipRecord
from app.modules.price_lists.infrastructure.approval_orm import (
    AuditLogRecord,
    CurrentPriceListVersionRecord,
)
from tests.integration.test_price_list_imports_api import (
    _create_supplier,
    _csrf_headers,
    _register,
)
from tests.integration.test_price_list_versions_api import _create_version, _upload


@pytest.mark.anyio
async def test_owner_approval_and_rejection_keep_auditable_current_version(
    api_client: AsyncClient,
    old_xlsx: Path,
    new_xlsx: Path,
) -> None:
    await _register(api_client)
    supplier_id = await _create_supplier(api_client)
    first_import = await _upload(api_client, supplier_id, old_xlsx)
    first_response = await _create_version(api_client, supplier_id, str(first_import["id"]), None)
    assert first_response.status_code == 201
    first = first_response.json()
    assert first["review_status"] == "READY_FOR_REVIEW"
    assert first["is_current"] is False

    empty_current = await api_client.get(
        f"/api/v1/suppliers/{supplier_id}/price-list-versions/current"
    )
    assert empty_current.status_code == 200
    assert empty_current.json() == {"current_version": None}

    unconfirmed = await api_client.post(
        f"/api/v1/suppliers/{supplier_id}/price-list-versions/{first['id']}/approve",
        headers=_csrf_headers(api_client),
        json={
            "expected_current_version_id": None,
            "confirm_approval": False,
            "decision_note": None,
        },
    )
    assert unconfirmed.status_code == 422
    assert unconfirmed.json()["error"]["code"] == "APPROVAL_NOT_CONFIRMED"

    approved = await api_client.post(
        f"/api/v1/suppliers/{supplier_id}/price-list-versions/{first['id']}/approve",
        headers=_csrf_headers(api_client),
        json={
            "expected_current_version_id": None,
            "confirm_approval": True,
            "decision_note": "بررسی کامل شد",
        },
    )
    assert approved.status_code == 200, approved.text
    assert approved.json()["review"]["status"] == "APPROVED"
    assert approved.json()["current_version_id"] == first["id"]

    detail = await api_client.get(
        f"/api/v1/suppliers/{supplier_id}/price-list-versions/{first['id']}"
    )
    assert detail.json()["review_status"] == "APPROVED"
    assert detail.json()["is_current"] is True
    assert detail.json()["decided_by_email"]

    audit = await api_client.get(
        f"/api/v1/suppliers/{supplier_id}/price-list-versions/{first['id']}/audit-events"
    )
    assert audit.status_code == 200
    assert audit.json()["total"] == 1
    assert audit.json()["items"][0]["action"] == "PRICE_LIST_VERSION_APPROVED"

    second_import = await _upload(api_client, supplier_id, new_xlsx)
    second_response = await _create_version(
        api_client, supplier_id, str(second_import["id"]), first["id"]
    )
    second = second_response.json()
    rejected = await api_client.post(
        f"/api/v1/suppliers/{supplier_id}/price-list-versions/{second['id']}/reject",
        headers=_csrf_headers(api_client),
        json={"confirm_rejection": True, "reason": "تعداد بسته نیازمند اصلاح است"},
    )
    assert rejected.status_code == 200, rejected.text
    assert rejected.json()["review"]["status"] == "REJECTED"
    assert rejected.json()["current_version_id"] == first["id"]

    current = await api_client.get(f"/api/v1/suppliers/{supplier_id}/price-list-versions/current")
    assert current.json()["current_version"]["id"] == first["id"]
    assert current.json()["current_version"]["is_current"] is True


@pytest.mark.anyio
async def test_approval_requires_owner_and_serializes_concurrent_decisions(
    api_client: AsyncClient,
    api_app: FastAPI,
    old_xlsx: Path,
) -> None:
    account = await _register(api_client)
    supplier_id = await _create_supplier(api_client)
    imported = await _upload(api_client, supplier_id, old_xlsx)
    response = await _create_version(api_client, supplier_id, str(imported["id"]), None)
    version_id = response.json()["id"]
    path = f"/api/v1/suppliers/{supplier_id}/price-list-versions/{version_id}/approve"
    payload = {
        "expected_current_version_id": None,
        "confirm_approval": True,
        "decision_note": None,
    }

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
    forbidden = await api_client.post(path, headers=_csrf_headers(api_client), json=payload)
    assert forbidden.status_code == 403

    async with database.session_factory() as session, session.begin():
        await session.execute(
            update(OrganizationMembershipRecord)
            .where(
                OrganizationMembershipRecord.user_id == UUID(str(account["user"]["id"])),
                OrganizationMembershipRecord.organization_id
                == UUID(str(account["organization"]["id"])),
            )
            .values(role="OWNER")
        )

    first, second = await asyncio.gather(
        api_client.post(path, headers=_csrf_headers(api_client), json=payload),
        api_client.post(path, headers=_csrf_headers(api_client), json=payload),
    )
    assert sorted([first.status_code, second.status_code]) == [200, 409]

    async with database.session_factory() as session:
        audit_count = await session.scalar(
            select(func.count())
            .select_from(AuditLogRecord)
            .where(AuditLogRecord.entity_id == UUID(version_id))
        )
        current_count = await session.scalar(
            select(func.count())
            .select_from(CurrentPriceListVersionRecord)
            .where(CurrentPriceListVersionRecord.supplier_id == UUID(supplier_id))
        )
    assert audit_count == 1
    assert current_count == 1


@pytest.mark.anyio
async def test_only_latest_version_can_replace_current_with_fresh_cas(
    api_client: AsyncClient,
    old_xlsx: Path,
    new_xlsx: Path,
) -> None:
    await _register(api_client)
    supplier_id = await _create_supplier(api_client)
    first_import = await _upload(api_client, supplier_id, old_xlsx)
    first = (await _create_version(api_client, supplier_id, str(first_import["id"]), None)).json()
    approve_first = await api_client.post(
        f"/api/v1/suppliers/{supplier_id}/price-list-versions/{first['id']}/approve",
        headers=_csrf_headers(api_client),
        json={
            "expected_current_version_id": None,
            "confirm_approval": True,
            "decision_note": None,
        },
    )
    assert approve_first.status_code == 200

    second_import = await _upload(api_client, supplier_id, new_xlsx)
    second = (
        await _create_version(api_client, supplier_id, str(second_import["id"]), first["id"])
    ).json()

    old_version = await api_client.post(
        f"/api/v1/suppliers/{supplier_id}/price-list-versions/{first['id']}/approve",
        headers=_csrf_headers(api_client),
        json={
            "expected_current_version_id": first["id"],
            "confirm_approval": True,
            "decision_note": None,
        },
    )
    assert old_version.status_code == 409
    assert old_version.json()["error"]["code"] == "PRICE_LIST_VERSION_NOT_LATEST"

    stale = await api_client.post(
        f"/api/v1/suppliers/{supplier_id}/price-list-versions/{second['id']}/approve",
        headers=_csrf_headers(api_client),
        json={
            "expected_current_version_id": None,
            "confirm_approval": True,
            "decision_note": None,
        },
    )
    assert stale.status_code == 409
    assert stale.json()["error"]["code"] == "CURRENT_PRICE_VERSION_CHANGED"

    approved_second = await api_client.post(
        f"/api/v1/suppliers/{supplier_id}/price-list-versions/{second['id']}/approve",
        headers=_csrf_headers(api_client),
        json={
            "expected_current_version_id": first["id"],
            "confirm_approval": True,
            "decision_note": "نسخه تازه بررسی شد",
        },
    )
    assert approved_second.status_code == 200
    assert approved_second.json()["previous_current_version_id"] == first["id"]
    assert approved_second.json()["current_version_id"] == second["id"]

    first_detail = await api_client.get(
        f"/api/v1/suppliers/{supplier_id}/price-list-versions/{first['id']}"
    )
    assert first_detail.json()["review_status"] == "APPROVED"
    assert first_detail.json()["is_current"] is False
    current = await api_client.get(f"/api/v1/suppliers/{supplier_id}/price-list-versions/current")
    assert current.json()["current_version"]["id"] == second["id"]


@pytest.mark.anyio
async def test_approval_inputs_csrf_and_tenant_boundaries_are_enforced(
    api_app: FastAPI,
    old_xlsx: Path,
) -> None:
    transport = ASGITransport(app=api_app)
    async with (
        AsyncClient(transport=transport, base_url="http://test") as owner,
        AsyncClient(transport=transport, base_url="http://test") as outsider,
    ):
        await _register(owner)
        await _register(outsider)
        supplier_id = await _create_supplier(owner)
        imported = await _upload(owner, supplier_id, old_xlsx)
        version = (await _create_version(owner, supplier_id, str(imported["id"]), None)).json()
        approve_path = (
            f"/api/v1/suppliers/{supplier_id}/price-list-versions/{version['id']}/approve"
        )
        reject_path = f"/api/v1/suppliers/{supplier_id}/price-list-versions/{version['id']}/reject"

        missing_csrf = await owner.post(
            approve_path,
            json={
                "expected_current_version_id": None,
                "confirm_approval": True,
                "decision_note": None,
            },
        )
        blank_reason = await owner.post(
            reject_path,
            headers=_csrf_headers(owner),
            json={"confirm_rejection": True, "reason": "   "},
        )
        hidden_approval = await outsider.post(
            approve_path,
            headers=_csrf_headers(outsider),
            json={
                "expected_current_version_id": None,
                "confirm_approval": True,
                "decision_note": None,
            },
        )
        hidden_current = await outsider.get(
            f"/api/v1/suppliers/{supplier_id}/price-list-versions/current"
        )
        hidden_audit = await outsider.get(
            f"/api/v1/suppliers/{supplier_id}/price-list-versions/{version['id']}/audit-events"
        )

    assert missing_csrf.status_code == 403
    assert missing_csrf.json()["error"]["code"] == "CSRF_VALIDATION_FAILED"
    assert blank_reason.status_code == 422
    assert blank_reason.json()["error"]["code"] == "REJECTION_REASON_REQUIRED"
    assert hidden_approval.status_code == 404
    assert hidden_current.status_code == 404
    assert hidden_audit.status_code == 404


@pytest.mark.anyio
async def test_approval_constraints_and_openapi_contract_are_present(
    api_app: FastAPI,
) -> None:
    expected = {
        "price_list_version_reviews": {
            "fk_price_list_version_reviews_tenant_version",
            "ck_price_list_version_reviews_status",
            "ck_price_list_version_reviews_decision_consistency",
            "ck_price_list_version_reviews_note_length",
        },
        "current_price_list_versions": {
            "fk_current_price_list_versions_tenant_supplier",
            "fk_current_price_list_versions_tenant_version",
        },
        "audit_logs": {
            "fk_audit_logs_tenant_supplier",
            "fk_audit_logs_tenant_version",
            "ck_audit_logs_action",
            "ck_audit_logs_entity_type",
        },
    }
    async with api_app.state.database.session_factory() as session:
        for table_name, expected_names in expected.items():
            result = await session.execute(
                text(
                    "SELECT conname FROM pg_constraint "
                    "WHERE conrelid = CAST(:table_name AS regclass)"
                ),
                {"table_name": table_name},
            )
            assert expected_names.issubset(set(result.scalars()))

    paths = api_app.openapi()["paths"]
    base = "/api/v1/suppliers/{supplier_id}/price-list-versions"
    assert f"{base}/current" in paths
    assert f"{base}/{{version_id}}/approve" in paths
    assert f"{base}/{{version_id}}/reject" in paths
    audit_path = f"{base}/{{version_id}}/audit-events"
    assert audit_path in paths
    assert set(paths[audit_path]) == {"get"}
