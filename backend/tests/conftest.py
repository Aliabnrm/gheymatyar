import os
from collections.abc import AsyncIterator
from pathlib import Path

import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient

from app.core.config import Settings
from app.main import create_app

TEST_DATABASE_URL = os.environ.get("TEST_DATABASE_URL", Settings().database_url)


@pytest.fixture
def anyio_backend() -> str:
    return "asyncio"


@pytest.fixture
def api_app() -> FastAPI:
    return create_app(Settings(app_env="test", database_url=TEST_DATABASE_URL))


@pytest.fixture
async def api_client(api_app: FastAPI) -> AsyncIterator[AsyncClient]:
    transport = ASGITransport(app=api_app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client


@pytest.fixture(scope="session")
def repository_root() -> Path:
    return Path(__file__).resolve().parents[2]


@pytest.fixture(scope="session")
def old_xlsx(repository_root: Path) -> Path:
    return repository_root / "fixtures/excel/supplier-price-list-v1-irr.xlsx"


@pytest.fixture(scope="session")
def new_xlsx(repository_root: Path) -> Path:
    return repository_root / "fixtures/excel/supplier-price-list-v2-irr.xlsx"


@pytest.fixture(scope="session")
def expected_changes(repository_root: Path) -> Path:
    return repository_root / "fixtures/expected/price-list-v1-v2-changes.json"
