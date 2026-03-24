from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient

from app.config import get_settings
from app.main import app, store
from app.store import InMemoryStore


@pytest.fixture(autouse=True)
def reset_store() -> Generator[None, None, None]:
    app.dependency_overrides = {}
    get_settings.cache_clear()
    app_state = InMemoryStore()
    store.__dict__.update(app_state.__dict__)
    yield
    get_settings.cache_clear()


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)
