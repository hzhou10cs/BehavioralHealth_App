from collections.abc import Generator
from pathlib import Path
import shutil
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

import app.main as main_module
from app.config import get_settings
from app.main import app
from app.store import SQLiteAppStore


@pytest.fixture
def test_workdir() -> Generator[Path, None, None]:
    base = Path("backend_local_tmp")
    created = base / f"backend-test-{uuid4().hex}"
    created.mkdir(parents=True, exist_ok=True)
    try:
        yield created
    finally:
        shutil.rmtree(created, ignore_errors=True)


@pytest.fixture(autouse=True)
def reset_store(
    test_workdir: Path, monkeypatch: pytest.MonkeyPatch
) -> Generator[None, None, None]:
    app.dependency_overrides = {}
    monkeypatch.setenv("BHA_ASSISTANT_TEST_MODE", "true")
    monkeypatch.setenv("BHA_ASSISTANT_LLM_BASE_URL", "http://127.0.0.1:8001")
    monkeypatch.setenv("BHA_ASSISTANT_MODEL_NAME", "TinyLlama/TinyLlama-1.1B-Chat-v1.0")
    monkeypatch.delenv("BHA_ASSISTANT_LLM_API_KEY", raising=False)
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    get_settings.cache_clear()
    original_store = main_module.store
    test_store = SQLiteAppStore(
        str(test_workdir / "test-backend.sqlite3"),
        user_key="test-user",
    )
    main_module.store = test_store
    yield
    try:
        main_module.store.close()
    except Exception:
        pass
    main_module.store = original_store
    get_settings.cache_clear()


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)
