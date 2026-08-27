from collections.abc import AsyncIterator
from pathlib import Path

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.fixture
def anyio_backend() -> str:
    return "asyncio"


@pytest.fixture
async def api_client() -> AsyncIterator[AsyncClient]:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client


@pytest.fixture(scope="session")
def repository_root() -> Path:
    return Path(__file__).resolve().parents[3]


@pytest.fixture(scope="session")
def old_xlsx(repository_root: Path) -> Path:
    return repository_root / "fixtures/excel/supplier-price-list-v1-irr.xlsx"


@pytest.fixture(scope="session")
def new_xlsx(repository_root: Path) -> Path:
    return repository_root / "fixtures/excel/supplier-price-list-v2-irr.xlsx"


@pytest.fixture(scope="session")
def expected_changes(repository_root: Path) -> Path:
    return repository_root / "fixtures/expected/price-list-v1-v2-changes.json"
