import asyncio
import hashlib
from datetime import UTC, datetime
from uuid import UUID, uuid4

import pytest
from argon2 import PasswordHasher
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient
from sqlalchemy import delete, func, select, update

from app.core.config import Settings
from app.main import create_app
from app.modules.accounts.infrastructure.orm import (
    OrganizationMembershipRecord,
    OrganizationRecord,
    SessionRecord,
    UserRecord,
)
from app.modules.accounts.infrastructure.passwords import Argon2PasswordHasher
from tests.conftest import TEST_DATABASE_URL


def account_payload(*, email: str | None = None) -> dict[str, str]:
    return {
        "email": email or f"owner-{uuid4().hex}@example.com",
        "password": "a-secure-test-password",
        "organization_name": " شرکت  نمونه ",
    }


@pytest.mark.anyio
async def test_register_creates_session_and_returns_only_safe_context(
    api_client: AsyncClient,
    api_app: FastAPI,
) -> None:
    payload = account_payload()

    response = await api_client.post("/api/v1/auth/register", json=payload)

    assert response.status_code == 201
    assert response.headers["Cache-Control"] == "no-store"
    assert response.json() == {
        "user": {"id": response.json()["user"]["id"], "email": payload["email"]},
        "organization": {
            "id": response.json()["organization"]["id"],
            "name": "شرکت نمونه",
        },
        "membership": {"role": "OWNER"},
    }
    set_cookie_headers = response.headers.get_list("set-cookie")
    session_cookie = next(value for value in set_cookie_headers if "gheymatyar_session=" in value)
    csrf_cookie = next(value for value in set_cookie_headers if "gheymatyar_csrf=" in value)
    assert "HttpOnly" in session_cookie
    assert "HttpOnly" not in csrf_cookie
    assert "SameSite=lax" in session_cookie
    assert "Path=/" in session_cookie
    assert "Secure" not in session_cookie
    assert "Max-Age=604800" in session_cookie
    assert "expires=" in session_cookie.casefold()
    assert "password" not in response.text.casefold()
    assert (await api_client.get("/api/v1/auth/me")).status_code == 200

    raw_token = api_client.cookies.get("gheymatyar_session")
    assert raw_token
    database = api_app.state.database
    async with database.session_factory() as session:
        stored = await session.scalar(
            select(SessionRecord).where(SessionRecord.user_id == response.json()["user"]["id"])
        )
    assert stored is not None
    assert stored.token_hash == hashlib.sha256(raw_token.encode()).hexdigest()
    assert raw_token not in stored.token_hash
    assert stored.created_at.tzinfo is not None


@pytest.mark.anyio
async def test_duplicate_email_is_a_stable_conflict_and_leaves_no_orphans(
    api_client: AsyncClient,
    api_app: FastAPI,
) -> None:
    payload = account_payload()
    assert (await api_client.post("/api/v1/auth/register", json=payload)).status_code == 201
    database = api_app.state.database
    async with database.session_factory() as session:
        organizations_before = await session.scalar(select(func.count(OrganizationRecord.id)))
        sessions_before = await session.scalar(select(func.count(SessionRecord.id)))

    response = await api_client.post("/api/v1/auth/register", json=payload)

    assert response.status_code == 409
    assert response.json()["error"]["code"] == "EMAIL_ALREADY_REGISTERED"
    async with database.session_factory() as session:
        assert (
            await session.scalar(select(func.count(OrganizationRecord.id))) == organizations_before
        )
        assert await session.scalar(select(func.count(SessionRecord.id))) == sessions_before


@pytest.mark.anyio
async def test_concurrent_registration_relies_on_database_uniqueness(
    api_app: FastAPI,
) -> None:
    payload = account_payload()
    transport = ASGITransport(app=api_app)
    async with (
        AsyncClient(transport=transport, base_url="http://test") as first,
        AsyncClient(transport=transport, base_url="http://test") as second,
    ):
        responses = await asyncio.gather(
            first.post("/api/v1/auth/register", json=payload),
            second.post("/api/v1/auth/register", json=payload),
        )

    assert sorted(response.status_code for response in responses) == [201, 409]
    conflict = next(response for response in responses if response.status_code == 409)
    assert conflict.json()["error"]["code"] == "EMAIL_ALREADY_REGISTERED"


@pytest.mark.anyio
async def test_login_uses_generic_invalid_credentials_and_can_create_a_new_session(
    api_client: AsyncClient,
) -> None:
    payload = account_payload()
    assert (await api_client.post("/api/v1/auth/register", json=payload)).status_code == 201
    api_client.cookies.clear()

    invalid = await api_client.post(
        "/api/v1/auth/login",
        json={"email": payload["email"], "password": "wrong-password"},
    )
    valid = await api_client.post(
        "/api/v1/auth/login",
        json={"email": payload["email"], "password": payload["password"]},
    )

    assert invalid.status_code == 401
    assert invalid.json()["error"]["code"] == "AUTH_INVALID_CREDENTIALS"
    assert invalid.headers["Cache-Control"] == "no-store"
    assert valid.status_code == 200
    assert api_client.cookies.get("gheymatyar_session")


@pytest.mark.anyio
async def test_successful_login_rehashes_outdated_argon2_parameters(
    api_client: AsyncClient,
    api_app: FastAPI,
) -> None:
    payload = account_payload()
    registered = await api_client.post("/api/v1/auth/register", json=payload)
    user_id = UUID(registered.json()["user"]["id"])
    outdated_hash = PasswordHasher(time_cost=1, memory_cost=8192).hash(payload["password"])
    database = api_app.state.database
    async with database.session_factory() as session, session.begin():
        await session.execute(
            update(UserRecord).where(UserRecord.id == user_id).values(password_hash=outdated_hash)
        )
    api_client.cookies.clear()

    response = await api_client.post(
        "/api/v1/auth/login",
        json={"email": payload["email"], "password": payload["password"]},
    )
    async with database.session_factory() as session:
        replacement = await session.scalar(
            select(UserRecord.password_hash).where(UserRecord.id == user_id)
        )

    assert response.status_code == 200
    assert replacement is not None and replacement != outdated_hash
    assert (
        await Argon2PasswordHasher().verify(replacement, payload["password"])
    ).needs_rehash is False


@pytest.mark.anyio
async def test_logout_requires_csrf_and_revokes_current_session(api_client: AsyncClient) -> None:
    assert (
        await api_client.post("/api/v1/auth/register", json=account_payload())
    ).status_code == 201

    missing_csrf = await api_client.post("/api/v1/auth/logout")
    csrf_token = api_client.cookies.get("gheymatyar_csrf")
    logout = await api_client.post(
        "/api/v1/auth/logout",
        headers={"X-CSRF-Token": csrf_token or ""},
    )

    assert missing_csrf.status_code == 403
    assert missing_csrf.json()["error"]["code"] == "CSRF_VALIDATION_FAILED"
    assert logout.status_code == 204
    cleared = logout.headers.get_list("set-cookie")
    assert len(cleared) == 2
    assert all("Max-Age=0" in value for value in cleared)
    assert (await api_client.get("/api/v1/auth/me")).status_code == 401


@pytest.mark.anyio
async def test_logout_rejects_a_mismatched_csrf_token(api_client: AsyncClient) -> None:
    assert (
        await api_client.post("/api/v1/auth/register", json=account_payload())
    ).status_code == 201

    response = await api_client.post(
        "/api/v1/auth/logout",
        headers={"X-CSRF-Token": "different-token"},
    )

    assert response.status_code == 403
    assert response.json()["error"]["code"] == "CSRF_VALIDATION_FAILED"
    assert (await api_client.get("/api/v1/auth/me")).status_code == 200


@pytest.mark.anyio
@pytest.mark.parametrize(
    ("field", "value", "expected_code"),
    [
        ("expires_at", datetime(2020, 1, 1, tzinfo=UTC), "AUTH_SESSION_EXPIRED"),
        ("revoked_at", datetime(2020, 1, 1, tzinfo=UTC), "AUTH_REQUIRED"),
    ],
)
async def test_expired_and_revoked_sessions_are_rejected(
    api_client: AsyncClient,
    api_app: FastAPI,
    field: str,
    value: datetime,
    expected_code: str,
) -> None:
    payload = account_payload()
    registered = await api_client.post("/api/v1/auth/register", json=payload)
    user_id = UUID(registered.json()["user"]["id"])
    database = api_app.state.database
    async with database.session_factory() as session, session.begin():
        await session.execute(
            update(SessionRecord).where(SessionRecord.user_id == user_id).values({field: value})
        )

    response = await api_client.get("/api/v1/auth/me")

    assert response.status_code == 401
    assert response.json()["error"]["code"] == expected_code


@pytest.mark.anyio
async def test_removed_membership_invalidates_server_side_organization_context(
    api_client: AsyncClient,
    api_app: FastAPI,
) -> None:
    payload = account_payload()
    registered = await api_client.post("/api/v1/auth/register", json=payload)
    membership = registered.json()
    database = api_app.state.database
    async with database.session_factory() as session, session.begin():
        await session.execute(
            delete(OrganizationMembershipRecord).where(
                OrganizationMembershipRecord.user_id == membership["user"]["id"],
                OrganizationMembershipRecord.organization_id == membership["organization"]["id"],
            )
        )

    response = await api_client.get("/api/v1/auth/me")

    assert response.status_code == 401
    assert response.json()["error"]["code"] == "AUTH_CONTEXT_UNAVAILABLE"
    api_client.cookies.clear()
    login = await api_client.post(
        "/api/v1/auth/login",
        json={"email": payload["email"], "password": payload["password"]},
    )
    assert login.status_code == 401
    assert login.json()["error"]["code"] == "AUTH_CONTEXT_UNAVAILABLE"


@pytest.mark.anyio
async def test_login_never_selects_an_ambiguous_membership(
    api_client: AsyncClient,
    api_app: FastAPI,
) -> None:
    payload = account_payload()
    registered = await api_client.post("/api/v1/auth/register", json=payload)
    user_id = UUID(registered.json()["user"]["id"])
    database = api_app.state.database
    async with database.session_factory() as session, session.begin():
        second_organization_id = uuid4()
        session.add(OrganizationRecord(id=second_organization_id, name="سازمان دوم"))
        await session.flush()
        session.add(
            OrganizationMembershipRecord(
                user_id=user_id,
                organization_id=second_organization_id,
                role="OPERATOR",
            )
        )
    api_client.cookies.clear()

    response = await api_client.post(
        "/api/v1/auth/login",
        json={"email": payload["email"], "password": payload["password"]},
    )

    assert response.status_code == 401
    assert response.json()["error"]["code"] == "AUTH_CONTEXT_UNAVAILABLE"


@pytest.mark.anyio
async def test_inactive_user_uses_the_same_generic_login_error(
    api_client: AsyncClient,
    api_app: FastAPI,
) -> None:
    payload = account_payload()
    registered = await api_client.post("/api/v1/auth/register", json=payload)
    database = api_app.state.database
    async with database.session_factory() as session, session.begin():
        await session.execute(
            update(UserRecord)
            .where(UserRecord.id == registered.json()["user"]["id"])
            .values(is_active=False)
        )
    api_client.cookies.clear()

    response = await api_client.post(
        "/api/v1/auth/login",
        json={"email": payload["email"], "password": payload["password"]},
    )

    assert response.status_code == 401
    assert response.json()["error"] == {
        "code": "AUTH_INVALID_CREDENTIALS",
        "message": "ایمیل یا رمز عبور صحیح نیست.",
        "details": {},
    }


@pytest.mark.anyio
async def test_logout_revokes_only_the_cookie_session(api_client: AsyncClient) -> None:
    payload = account_payload()
    assert (await api_client.post("/api/v1/auth/register", json=payload)).status_code == 201
    first_session = api_client.cookies.get("gheymatyar_session")
    assert first_session
    api_client.cookies.clear()
    assert (
        await api_client.post(
            "/api/v1/auth/login",
            json={"email": payload["email"], "password": payload["password"]},
        )
    ).status_code == 200
    csrf_token = api_client.cookies.get("gheymatyar_csrf")
    assert csrf_token

    assert (
        await api_client.post(
            "/api/v1/auth/logout",
            headers={"X-CSRF-Token": csrf_token},
        )
    ).status_code == 204
    api_client.cookies.set("gheymatyar_session", first_session)

    assert (await api_client.get("/api/v1/auth/me")).status_code == 200


@pytest.mark.anyio
async def test_login_rate_limit_returns_retry_after() -> None:
    app = create_app(
        Settings(
            app_env="test",
            database_url=TEST_DATABASE_URL,
            auth_login_max_failures=2,
            auth_login_window_seconds=60,
        )
    )
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        credentials = {"email": "missing@example.com", "password": "wrong-password"}
        assert (await client.post("/api/v1/auth/login", json=credentials)).status_code == 401
        assert (await client.post("/api/v1/auth/login", json=credentials)).status_code == 401
        limited = await client.post("/api/v1/auth/login", json=credentials)

    assert limited.status_code == 429
    assert limited.json()["error"]["code"] == "AUTH_RATE_LIMITED"
    assert int(limited.headers["Retry-After"]) > 0


@pytest.mark.anyio
async def test_production_registration_is_disabled_by_default() -> None:
    app = create_app(Settings(app_env="production", web_origin="https://app.example.com"))
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="https://test") as client:
        response = await client.post("/api/v1/auth/register", json=account_payload())

    assert response.status_code == 403
    assert response.json()["error"]["code"] == "AUTH_REGISTRATION_DISABLED"


@pytest.mark.anyio
async def test_production_auth_cookies_are_secure() -> None:
    app = create_app(
        Settings(
            app_env="production",
            web_origin="https://app.example.com",
            database_url=TEST_DATABASE_URL,
            auth_public_registration_enabled=True,
        )
    )
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="https://test") as client:
        response = await client.post("/api/v1/auth/register", json=account_payload())

    assert response.status_code == 201
    assert all("Secure" in value for value in response.headers.get_list("set-cookie"))


@pytest.mark.anyio
async def test_cors_allows_credentials_only_for_the_configured_origin(api_app: FastAPI) -> None:
    transport = ASGITransport(app=api_app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        allowed = await client.options(
            "/api/v1/auth/login",
            headers={
                "Origin": "http://localhost:3000",
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "content-type,x-csrf-token",
            },
        )
        rejected = await client.options(
            "/api/v1/auth/login",
            headers={
                "Origin": "https://attacker.example",
                "Access-Control-Request-Method": "POST",
            },
        )
        origin_rejected = await client.post(
            "/api/v1/auth/login",
            headers={"Origin": "https://attacker.example"},
            json={"email": "owner@example.com", "password": "a-secure-password"},
        )

    assert allowed.status_code == 200
    assert allowed.headers["Access-Control-Allow-Origin"] == "http://localhost:3000"
    assert allowed.headers["Access-Control-Allow-Credentials"] == "true"
    assert rejected.status_code == 400
    assert "Access-Control-Allow-Origin" not in rejected.headers
    assert origin_rejected.status_code == 403
    assert origin_rejected.json()["error"]["code"] == "CSRF_VALIDATION_FAILED"


def test_openapi_documents_account_contract() -> None:
    schema = create_app(Settings(app_env="test")).openapi()

    assert "/api/v1/auth/register" in schema["paths"]
    assert "/api/v1/auth/login" in schema["paths"]
    assert "/api/v1/auth/logout" in schema["paths"]
    assert "/api/v1/auth/me" in schema["paths"]
    assert "APIKeyCookie" in str(schema["components"]["securitySchemes"])
