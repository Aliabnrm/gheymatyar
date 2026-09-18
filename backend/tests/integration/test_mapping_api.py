from uuid import UUID

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import func, select

from app.modules.price_lists.infrastructure.mapping_orm import SupplierMappingTemplateRecord
from tests.integration.test_price_list_imports_api import (
    XLSX_MEDIA_TYPE,
    _create_supplier,
    _csrf_headers,
    _register,
)
from tests.unit.test_column_mapping import workbook_bytes


async def upload(client, supplier, rows):
    response = await client.post(
        f"/api/v1/suppliers/{supplier}/imports",
        headers=_csrf_headers(client),
        files={"file": ("prices.xlsx", workbook_bytes(rows), XLSX_MEDIA_TYPE)},
    )
    assert response.status_code == 201, response.text
    return response.json()


@pytest.mark.anyio
async def test_correction_template_reuse_replacement_and_immutable_history(api_client, api_app):
    await _register(api_client)
    supplier = await _create_supplier(api_client)
    base = f"/api/v1/suppliers/{supplier}"
    original = await upload(
        api_client, supplier, [["فهرست"], ["شناسه", "شرح", "مبلغ"], ["001", "کابل", 1000]]
    )
    assert original["status"] == "FAILED"
    mapping = {
        "sheet_name": "Sheet",
        "header_row": 2,
        "columns": {"product_code": 1, "product_name": 2, "price_irr": 3},
    }
    preview = await api_client.get(
        f"{base}/imports/{original['id']}/mapping?sheet_name=Sheet&header_row=2"
    )
    assert preview.status_code == 200
    assert preview.json()["inspection"]["preview"][0]["source_row_number"] == 3
    rerun = await api_client.post(
        f"{base}/imports/{original['id']}/rerun", json=mapping, headers=_csrf_headers(api_client)
    )
    assert rerun.status_code == 201, rerun.text
    corrected = rerun.json()
    assert corrected["status"] == "DRAFT"
    assert corrected["parent_import_id"] == original["id"]
    assert corrected["source_document"] == original["source_document"]
    assert (await api_client.get(f"{base}/imports/{original['id']}")).json() == original
    rows = (await api_client.get(f"{base}/imports/{corrected['id']}/rows")).json()["items"]
    assert rows[0]["source_row_number"] == 3
    assert rows[0]["product_code_normalized"] == "001"
    assert rows[0]["raw_row"]["column_1"] == "001"
    saved = await api_client.post(
        f"{base}/mapping-template",
        headers=_csrf_headers(api_client),
        json={"source_import_id": corrected["id"]},
    )
    assert saved.status_code == 201, saved.text
    template_id = saved.json()["id"]
    reused = await upload(
        api_client, supplier, [["فهرست"], ["شناسه", "شرح", "مبلغ"], ["002", "کابل", 2000]]
    )
    assert reused["status"] == "DRAFT"
    assert reused["mapping_snapshot"]["origin"] == "template"
    assert reused["mapping_snapshot"]["template_id"] == template_id
    assert (
        await api_client.post(
            f"{base}/mapping-template",
            headers=_csrf_headers(api_client),
            json={"source_import_id": reused["id"]},
        )
    ).status_code == 409
    replacement = await api_client.post(
        f"{base}/mapping-template",
        headers=_csrf_headers(api_client),
        json={
            "source_import_id": reused["id"],
            "expected_template_id": template_id,
            "confirm_replace": True,
        },
    )
    assert replacement.status_code == 201
    assert replacement.json()["id"] != template_id
    assert (await api_client.get(f"{base}/imports/{reused['id']}")).json() == reused
    changed = await upload(
        api_client, supplier, [["فهرست"], ["مبلغ", "شرح", "شناسه"], [2000, "کابل", "003"]]
    )
    assert changed["status"] == "FAILED"
    assert changed["blocking_error"]["code"] == "TEMPLATE_LAYOUT_MISMATCH"
    async with api_app.state.database.session_factory() as session:
        active = await session.scalar(
            select(func.count())
            .select_from(SupplierMappingTemplateRecord)
            .where(
                SupplierMappingTemplateRecord.supplier_id == UUID(supplier),
                SupplierMappingTemplateRecord.is_active.is_(True),
            )
        )
    assert active == 1


@pytest.mark.anyio
async def test_mapping_cross_tenant_supplier_and_inactive_guards(api_client, api_app):
    await _register(api_client)
    supplier = await _create_supplier(api_client)
    imported = await upload(
        api_client, supplier, [["کد کالا", "نام کالا", "قیمت ریال"], ["001", "کابل", 1000]]
    )
    base = f"/api/v1/suppliers/{supplier}"
    other_supplier = await _create_supplier(api_client, "دیگری")
    async with AsyncClient(transport=ASGITransport(app=api_app), base_url="http://test") as other:
        await _register(other)
        assert (await other.get(f"{base}/mapping-template")).status_code == 404
        assert (await other.get(f"{base}/imports/{imported['id']}/mapping")).status_code == 404
        assert (
            await other.post(
                f"{base}/mapping-template",
                headers=_csrf_headers(other),
                json={"source_import_id": imported["id"]},
            )
        ).status_code == 404
    cross = await api_client.post(
        f"/api/v1/suppliers/{other_supplier}/mapping-template",
        headers=_csrf_headers(api_client),
        json={"source_import_id": imported["id"]},
    )
    assert cross.status_code == 404
    await api_client.patch(base, headers=_csrf_headers(api_client), json={"is_active": False})
    assert (
        await api_client.post(
            f"{base}/mapping-template",
            headers=_csrf_headers(api_client),
            json={"source_import_id": imported["id"]},
        )
    ).status_code == 409
    assert (
        await api_client.post(
            f"{base}/imports/{imported['id']}/rerun",
            headers=_csrf_headers(api_client),
            json=imported["mapping_snapshot"]["used_mapping"],
        )
    ).status_code == 409


@pytest.mark.anyio
async def test_operator_csrf_validation_failed_rerun_and_no_partial_persistence(
    api_client, api_app
):
    from sqlalchemy import update

    from app.modules.accounts.infrastructure.orm import OrganizationMembershipRecord
    from app.modules.price_lists.infrastructure.import_orm import (
        ExtractedRowRecord,
        ImportRunRecord,
    )

    account = await _register(api_client)
    supplier = await _create_supplier(api_client)
    original = await upload(
        api_client,
        supplier,
        [["کد کالا", "نام کالا", "قیمت ریال", "نرخ"], ["001", "کابل", 1000, "تماس"]],
    )
    async with api_app.state.database.session_factory() as session, session.begin():
        await session.execute(
            update(OrganizationMembershipRecord)
            .where(
                OrganizationMembershipRecord.organization_id == UUID(account["organization"]["id"]),
                OrganizationMembershipRecord.user_id == UUID(account["user"]["id"]),
            )
            .values(role="OPERATOR")
        )
    base = f"/api/v1/suppliers/{supplier}"
    mapping = {
        "sheet_name": "Sheet",
        "header_row": 1,
        "columns": {"product_code": 1, "product_name": 2, "price_irr": 4},
    }
    assert (
        await api_client.post(f"{base}/imports/{original['id']}/rerun", json=mapping)
    ).status_code == 403
    failed = await api_client.post(
        f"{base}/imports/{original['id']}/rerun", json=mapping, headers=_csrf_headers(api_client)
    )
    assert failed.status_code == 201, failed.text
    assert failed.json()["status"] == "FAILED"
    assert failed.json()["mapping_snapshot"]["issues"][0]["field"] == "price_irr"
    assert (
        await api_client.post(
            f"{base}/mapping-template",
            json={"source_import_id": failed.json()["id"]},
            headers=_csrf_headers(api_client),
        )
    ).status_code == 422
    assert (
        await api_client.post(
            f"{base}/mapping-template",
            json={"source_import_id": original["id"]},
            headers=_csrf_headers(api_client),
        )
    ).status_code == 201
    mapping["columns"]["price_irr"] = 1
    assert (
        await api_client.post(
            f"{base}/imports/{original['id']}/rerun",
            json=mapping,
            headers=_csrf_headers(api_client),
        )
    ).status_code == 422
    async with api_app.state.database.session_factory() as session:
        assert (
            await session.scalar(
                select(func.count())
                .select_from(ExtractedRowRecord)
                .where(ExtractedRowRecord.import_run_id == UUID(failed.json()["id"]))
            )
            == 0
        )
        assert (
            await session.scalar(
                select(func.count())
                .select_from(ImportRunRecord)
                .where(ImportRunRecord.supplier_id == UUID(supplier))
            )
            == 2
        )


@pytest.mark.anyio
async def test_concurrent_template_creation_and_replacement_have_one_winner(api_client, api_app):
    import asyncio

    await _register(api_client)
    supplier = await _create_supplier(api_client)
    imported = await upload(
        api_client, supplier, [["کد کالا", "نام کالا", "قیمت ریال"], ["001", "کابل", 1000]]
    )
    path = f"/api/v1/suppliers/{supplier}/mapping-template"
    body = {"source_import_id": imported["id"]}
    responses = await asyncio.gather(
        *[api_client.post(path, json=body, headers=_csrf_headers(api_client)) for _ in range(2)]
    )
    assert sorted(r.status_code for r in responses) == [201, 409]
    template = next(r.json() for r in responses if r.status_code == 201)
    body.update(expected_template_id=template["id"], confirm_replace=True)
    responses = await asyncio.gather(
        *[api_client.post(path, json=body, headers=_csrf_headers(api_client)) for _ in range(2)]
    )
    assert sorted(r.status_code for r in responses) == [201, 409]


@pytest.mark.anyio
async def test_storage_integrity_and_repository_failure_leave_history_unchanged(
    api_client, api_app, monkeypatch
):
    from app.modules.price_lists.infrastructure.mapping_repositories import SqlAlchemyMappingStore

    await _register(api_client)
    supplier = await _create_supplier(api_client)
    imported = await upload(
        api_client, supplier, [["کد کالا", "نام کالا", "قیمت ریال"], ["001", "کابل", 1000]]
    )
    path = f"/api/v1/suppliers/{supplier}/imports/{imported['id']}"
    objects = api_app.state.document_storage.client.objects
    key = next(iter(objects))
    original = objects[key]
    objects[key] = b"corrupted"
    response = await api_client.post(
        f"{path}/rerun",
        json=imported["mapping_snapshot"]["used_mapping"],
        headers=_csrf_headers(api_client),
    )
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "SOURCE_DOCUMENT_CHANGED"
    objects[key] = original

    async def fail(*args, **kwargs):
        raise RuntimeError("database unavailable")

    monkeypatch.setattr(SqlAlchemyMappingStore, "create_rerun", fail)
    async with AsyncClient(
        transport=ASGITransport(app=api_app, raise_app_exceptions=False),
        base_url="http://test",
        cookies=api_client.cookies,
    ) as client:
        response = await client.post(
            f"{path}/rerun",
            json=imported["mapping_snapshot"]["used_mapping"],
            headers=_csrf_headers(client),
        )
        assert response.status_code == 500
    assert (await api_client.get(path)).json() == imported
    assert objects[key] == original


@pytest.mark.anyio
async def test_unknown_client_fields_and_cross_tenant_rerun_are_rejected(api_client, api_app):
    await _register(api_client)
    supplier = await _create_supplier(api_client)
    imported = await upload(
        api_client, supplier, [["کد کالا", "نام کالا", "قیمت ریال"], ["001", "کابل", 1000]]
    )
    path = f"/api/v1/suppliers/{supplier}/imports/{imported['id']}/rerun"
    mapping = imported["mapping_snapshot"]["used_mapping"]
    async with AsyncClient(transport=ASGITransport(app=api_app), base_url="http://test") as other:
        await _register(other)
        assert (
            await other.post(path, json=mapping, headers=_csrf_headers(other))
        ).status_code == 404
    response = await api_client.post(
        path,
        json={**mapping, "organization_id": str(UUID(int=0))},
        headers=_csrf_headers(api_client),
    )
    assert response.status_code == 422


@pytest.mark.anyio
async def test_database_rerun_rolls_back_flushed_run_and_all_rows(api_client, api_app, monkeypatch):
    from app.modules.price_lists.infrastructure import mapping_repositories
    from app.modules.price_lists.infrastructure.import_orm import ImportRunRecord

    await _register(api_client)
    supplier = await _create_supplier(api_client)
    imported = await upload(
        api_client,
        supplier,
        [["کد کالا", "نام کالا", "قیمت ریال"], ["001", "کابل", 1000], ["002", "کابل", 2000]],
    )
    convert = mapping_repositories._new_extracted_row_values

    def fail_second(row, **kwargs):
        if row.item.source_row_number == 3:
            raise RuntimeError("synthetic failure during batch construction")
        return convert(row, **kwargs)

    monkeypatch.setattr(mapping_repositories, "_new_extracted_row_values", fail_second)
    async with AsyncClient(
        transport=ASGITransport(app=api_app, raise_app_exceptions=False),
        base_url="http://test",
        cookies=api_client.cookies,
    ) as client:
        response = await client.post(
            f"/api/v1/suppliers/{supplier}/imports/{imported['id']}/rerun",
            json=imported["mapping_snapshot"]["used_mapping"],
            headers=_csrf_headers(client),
        )
        assert response.status_code == 500
    async with api_app.state.database.session_factory() as session:
        assert (
            await session.scalar(
                select(func.count())
                .select_from(ImportRunRecord)
                .where(ImportRunRecord.supplier_id == UUID(supplier))
            )
            == 1
        )


@pytest.mark.anyio
async def test_database_constraints_reject_cross_document_parent_and_cross_supplier_template(
    api_client, api_app
):
    from sqlalchemy import update
    from sqlalchemy.exc import IntegrityError

    from app.modules.price_lists.infrastructure.import_orm import ImportRunRecord

    account = await _register(api_client)
    supplier = await _create_supplier(api_client)
    other_supplier = await _create_supplier(api_client, "قید تأمین‌کننده دوم")
    first = await upload(
        api_client, supplier, [["کد کالا", "نام کالا", "قیمت ریال"], ["001", "کابل", 1000]]
    )
    second = await upload(
        api_client, supplier, [["کد کالا", "نام کالا", "قیمت ریال"], ["001", "کابل", 2000]]
    )
    async with api_app.state.database.session_factory() as session:
        with pytest.raises(IntegrityError):
            async with session.begin():
                await session.execute(
                    update(ImportRunRecord)
                    .where(
                        ImportRunRecord.organization_id == UUID(account["organization"]["id"]),
                        ImportRunRecord.supplier_id == UUID(supplier),
                        ImportRunRecord.id == UUID(second["id"]),
                    )
                    .values(parent_import_id=UUID(first["id"]))
                )
        with pytest.raises(IntegrityError):
            async with session.begin():
                from uuid import uuid4

                session.add(
                    SupplierMappingTemplateRecord(
                        id=uuid4(),
                        organization_id=UUID(account["organization"]["id"]),
                        supplier_id=UUID(other_supplier),
                        source_import_id=UUID(first["id"]),
                        created_by_user_id=UUID(account["user"]["id"]),
                        sheet_name="Sheet",
                        header_row=1,
                        columns={},
                        header_signature=[],
                        is_active=True,
                    )
                )
                await session.flush()
