import asyncio
from uuid import UUID

import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.price_lists.domain.version_models import VersionedPriceListItem
from app.modules.price_lists.infrastructure.approval_orm import (
    AuditLogRecord,
    CurrentPriceListVersionRecord,
)
from app.modules.price_lists.infrastructure.approval_repositories import (
    SqlAlchemyCurrentPriceImpactReader,
)
from tests.integration.test_price_list_imports_api import (
    XLSX_MEDIA_TYPE,
    _create_supplier,
    _csrf_headers,
    _register,
)
from tests.integration.test_price_list_versions_api import _create_version
from tests.unit.test_column_mapping import workbook_bytes


@pytest.mark.anyio
async def test_current_impact_distinguishes_current_from_rejected_predecessor_and_pins_baseline(
    api_client: AsyncClient,
    api_app: FastAPI,
) -> None:
    await _register(api_client)
    supplier_id = await _create_supplier(api_client)

    first_import = await _upload_rows(api_client, supplier_id, "v1.xlsx", _v1_rows())
    first = (await _create_version(api_client, supplier_id, first_import["id"], None)).json()
    no_current = await api_client.get(_impact_path(supplier_id, first["id"]))
    assert no_current.status_code == 200, no_current.text
    assert no_current.json()["baseline_status"] == "NO_CURRENT"
    assert no_current.json()["baseline_version"] is None
    assert no_current.json()["summary"] is None
    assert no_current.json()["items"] == []
    assert no_current.json()["total"] == 0

    first_approval = await api_client.post(
        f"/api/v1/suppliers/{supplier_id}/price-list-versions/{first['id']}/approve",
        headers=_csrf_headers(api_client),
        json={
            "expected_current_version_id": None,
            "confirm_approval": True,
            "decision_note": "نسخه پایه بررسی شد",
        },
    )
    assert first_approval.status_code == 200, first_approval.text

    second_import = await _upload_rows(api_client, supplier_id, "v2.xlsx", _v2_rows())
    second = (
        await _create_version(api_client, supplier_id, second_import["id"], first["id"])
    ).json()
    rejected = await api_client.post(
        f"/api/v1/suppliers/{supplier_id}/price-list-versions/{second['id']}/reject",
        headers=_csrf_headers(api_client),
        json={"confirm_rejection": True, "reason": "این فایل تأیید نمی‌شود"},
    )
    assert rejected.status_code == 200, rejected.text

    third_import = await _upload_rows(api_client, supplier_id, "v3.xlsx", _v3_rows())
    third = (
        await _create_version(api_client, supplier_id, third_import["id"], second["id"])
    ).json()

    historical = await api_client.get(
        f"/api/v1/suppliers/{supplier_id}/price-list-versions/{third['id']}/changes"
    )
    impact = await api_client.get(_impact_path(supplier_id, third["id"]))
    assert historical.status_code == 200, historical.text
    assert impact.status_code == 200, impact.text
    historical_payload = historical.json()
    impact_payload = impact.json()
    assert historical_payload["baseline_version"]["id"] == second["id"]
    assert historical_payload["summary"]["price_changed"] == 0
    assert historical_payload["summary"]["metadata_only_changed"] == 1
    assert impact_payload["baseline_status"] == "CURRENT_BASELINE"
    assert impact_payload["baseline_version"]["id"] == first["id"]
    assert impact_payload["target_version"]["id"] == third["id"]
    assert impact_payload["is_latest"] is True
    assert impact_payload["supplier_is_active"] is True
    assert impact_payload["summary"]["added"] == 1
    assert impact_payload["summary"]["removed"] == 1
    assert impact_payload["summary"]["price_changed"] == 1
    assert impact_payload["summary"]["metadata_only_changed"] == 0
    assert impact_payload["summary"]["unchanged"] == 0

    filtered = await api_client.get(
        _impact_path(supplier_id, third["id"]),
        params={
            "baseline_version_id": first["id"],
            "change_type": "PACK_SIZE_CHANGED",
            "limit": 1,
            "offset": 0,
        },
    )
    assert filtered.status_code == 200, filtered.text
    filtered_payload = filtered.json()
    assert filtered_payload["summary"] == impact_payload["summary"]
    assert filtered_payload["total"] == 1
    assert filtered_payload["items"][0]["product_code"] == "0001"
    assert set(filtered_payload["items"][0]["change_types"]) >= {
        "PRICE_CHANGED",
        "PACK_SIZE_CHANGED",
    }

    invalid_pin = await api_client.get(
        _impact_path(supplier_id, third["id"]),
        params={"baseline_version_id": first["id"], "expect_no_current": "true"},
    )
    stale_no_current = await api_client.get(
        _impact_path(supplier_id, third["id"]),
        params={"expect_no_current": "true"},
    )
    foreign_pin = await api_client.get(
        _impact_path(supplier_id, third["id"]),
        params={"baseline_version_id": str(UUID(int=1))},
    )
    assert invalid_pin.status_code == 422
    assert invalid_pin.json()["error"]["code"] == "CURRENT_PRICE_IMPACT_PIN_INVALID"
    assert stale_no_current.status_code == 409
    assert stale_no_current.json()["error"]["code"] == "CURRENT_PRICE_VERSION_CHANGED"
    assert foreign_pin.status_code == 409
    assert foreign_pin.json()["error"]["code"] == "CURRENT_PRICE_VERSION_CHANGED"
    assert foreign_pin.json()["error"]["details"] == {}

    missing_target = await api_client.get(_impact_path(supplier_id, str(UUID(int=3))))
    wrong_supplier = await api_client.get(_impact_path(str(UUID(int=4)), third["id"]))
    async with AsyncClient(
        transport=ASGITransport(app=api_app), base_url="http://test"
    ) as outsider:
        await _register(outsider)
        hidden = await outsider.get(_impact_path(supplier_id, third["id"]))
    assert missing_target.status_code == 404
    assert wrong_supplier.status_code == 404
    assert hidden.status_code == 404
    assert hidden.json()["error"]["details"] == {}

    database = api_app.state.database
    async with database.session_factory() as session:
        audit_count_before = await session.scalar(select(func.count()).select_from(AuditLogRecord))
        current_before = await session.scalar(
            select(CurrentPriceListVersionRecord.version_id).where(
                CurrentPriceListVersionRecord.supplier_id == UUID(supplier_id)
            )
        )
    await api_client.get(_impact_path(supplier_id, third["id"]))
    async with database.session_factory() as session:
        audit_count_after = await session.scalar(select(func.count()).select_from(AuditLogRecord))
        current_after = await session.scalar(
            select(CurrentPriceListVersionRecord.version_id).where(
                CurrentPriceListVersionRecord.supplier_id == UUID(supplier_id)
            )
        )
    assert audit_count_after == audit_count_before
    assert current_after == current_before == UUID(first["id"])

    approved = await api_client.post(
        f"/api/v1/suppliers/{supplier_id}/price-list-versions/{third['id']}/approve",
        headers=_csrf_headers(api_client),
        json={
            "expected_current_version_id": impact_payload["baseline_version"]["id"],
            "confirm_approval": True,
            "decision_note": "اثر بر قیمت جاری بررسی شد",
        },
    )
    assert approved.status_code == 200, approved.text
    assert approved.json()["previous_current_version_id"] == first["id"]
    assert approved.json()["current_version_id"] == third["id"]

    terminal = await api_client.get(_impact_path(supplier_id, third["id"]))
    assert terminal.status_code == 409
    assert terminal.json()["error"]["code"] == "PRICE_LIST_VERSION_NOT_READY_FOR_REVIEW"


@pytest.mark.anyio
async def test_current_impact_reader_keeps_one_repeatable_snapshot_during_pointer_change(
    api_client: AsyncClient,
    api_app: FastAPI,
) -> None:
    account = await _register(api_client)
    supplier_id = await _create_supplier(api_client)
    first_import = await _upload_rows(api_client, supplier_id, "snapshot-v1.xlsx", _v1_rows())
    first = (await _create_version(api_client, supplier_id, first_import["id"], None)).json()
    approved = await api_client.post(
        f"/api/v1/suppliers/{supplier_id}/price-list-versions/{first['id']}/approve",
        headers=_csrf_headers(api_client),
        json={
            "expected_current_version_id": None,
            "confirm_approval": True,
            "decision_note": None,
        },
    )
    assert approved.status_code == 200
    target_import = await _upload_rows(api_client, supplier_id, "snapshot-v2.xlsx", _v2_rows())
    target = (
        await _create_version(api_client, supplier_id, target_import["id"], first["id"])
    ).json()

    paused = asyncio.Event()
    resume = asyncio.Event()

    class PausingReader(SqlAlchemyCurrentPriceImpactReader):
        async def _items(
            self,
            database: AsyncSession,
            *,
            organization_id: UUID,
            supplier_id: UUID,
            version_id: UUID,
        ) -> tuple[VersionedPriceListItem, ...]:
            if not paused.is_set():
                paused.set()
                await resume.wait()
            return await SqlAlchemyCurrentPriceImpactReader._items(
                database,
                organization_id=organization_id,
                supplier_id=supplier_id,
                version_id=version_id,
            )

    organization_id = UUID(str(account["organization"]["id"]))
    reader = PausingReader(api_app.state.database.session_factory)
    read_task = asyncio.create_task(
        reader.read_snapshot(
            organization_id=organization_id,
            supplier_id=UUID(supplier_id),
            version_id=UUID(target["id"]),
        )
    )
    await paused.wait()
    async with api_app.state.database.session_factory() as session, session.begin():
        await session.execute(
            update(CurrentPriceListVersionRecord)
            .where(
                CurrentPriceListVersionRecord.organization_id == organization_id,
                CurrentPriceListVersionRecord.supplier_id == UUID(supplier_id),
            )
            .values(version_id=UUID(target["id"]))
        )
    resume.set()
    snapshot = await read_task

    assert snapshot is not None
    assert snapshot.current_version_id == UUID(first["id"])
    assert snapshot.baseline_version is not None
    assert snapshot.baseline_version.id == UUID(first["id"])
    assert snapshot.baseline_version.review_status.value == "APPROVED"


@pytest.mark.anyio
async def test_current_impact_requires_authentication_and_is_in_openapi(
    api_client: AsyncClient,
    api_app: FastAPI,
) -> None:
    response = await api_client.get(
        f"/api/v1/suppliers/{UUID(int=1)}/price-list-versions/{UUID(int=2)}/current-impact"
    )
    assert response.status_code == 401
    path = "/api/v1/suppliers/{supplier_id}/price-list-versions/{version_id}/current-impact"
    operation = api_app.openapi()["paths"][path]["get"]
    assert operation["responses"]["200"]
    assert operation["parameters"]
    conflict_examples = operation["responses"]["409"]["content"]["application/json"]["examples"]
    assert (
        conflict_examples["current_changed"]["value"]["error"]["code"]
        == "CURRENT_PRICE_VERSION_CHANGED"
    )


async def _upload_rows(
    client: AsyncClient,
    supplier_id: str,
    filename: str,
    rows: list[list[object]],
) -> dict[str, str]:
    response = await client.post(
        f"/api/v1/suppliers/{supplier_id}/imports",
        headers=_csrf_headers(client),
        files={"file": (filename, workbook_bytes(rows), XLSX_MEDIA_TYPE)},
    )
    assert response.status_code == 201, response.text
    return response.json()


def _impact_path(supplier_id: str, version_id: str) -> str:
    return f"/api/v1/suppliers/{supplier_id}/price-list-versions/{version_id}/current-impact"


def _v1_rows() -> list[list[object]]:
    return _rows(
        [
            ["0001", "سوکت شبکه بسته‌ای", "آزمایشی", "بسته", 100, 100_000, "موجود"],
            ["SW-001", "سوئیچ آزمایشی", "آزمایشی", "عدد", 1, 200_000, "موجود"],
        ]
    )


def _v2_rows() -> list[list[object]]:
    return _rows(
        [
            ["0001", "سوکت شبکه بسته‌ای", "آزمایشی", "بسته", 100, 120_000, "موجود"],
            ["SW-001", "سوئیچ آزمایشی", "آزمایشی", "عدد", 1, 200_000, "موجود"],
        ]
    )


def _v3_rows() -> list[list[object]]:
    return _rows(
        [
            ["0001", "سوکت شبکه بسته‌ای", "آزمایشی", "بسته", 50, 120_000, "موجود"],
            ["CAM-001", "دوربین آزمایشی", "آزمایشی", "عدد", 1, 300_000, "موجود"],
        ]
    )


def _rows(items: list[list[object]]) -> list[list[object]]:
    return [
        [
            "کد کالا",
            "نام کالا",
            "برند",
            "واحد فروش",
            "تعداد در بسته",
            "قیمت ریال",
            "وضعیت موجودی",
        ],
        *items,
    ]
