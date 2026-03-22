import os
import tempfile
from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient

import app.main as main
from app.sqlite_persistence import SQLiteHealthChatStore


@pytest.fixture(autouse=True)
def reset_store() -> Generator[None, None, None]:
    fd, path = tempfile.mkstemp(suffix=".sqlite3")
    app_state = SQLiteHealthChatStore(path)
    app_state.create_schema()
    original_store = main.store
    main.store = app_state
    main.app.dependency_overrides = {}
    os.close(fd)
    try:
        yield
    finally:
        main.store.close()
        main.store = original_store
        os.remove(path)


@pytest.fixture
def client() -> TestClient:
    return TestClient(main.app)
