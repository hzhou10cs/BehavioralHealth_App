from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient

from app.main import app, auth_store, store
from app.store import InMemoryStore


@pytest.fixture(autouse=True)
def reset_store() -> Generator[None, None, None]:
    app.dependency_overrides = {}
    app_state = InMemoryStore()
    store.__dict__.update(app_state.__dict__)
    auth_store.reset()
    yield


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)
