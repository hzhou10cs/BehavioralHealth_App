from app.config import get_settings


def test_env_based_configuration(monkeypatch):
    monkeypatch.setenv("BHA_APP_ENV", "test")
    monkeypatch.setenv("BHA_DEBUG", "false")
    monkeypatch.setenv("BHA_AUTH_SECRET_KEY", "test-secret")
    monkeypatch.setenv("BHA_API_PREFIX", "/v1")
    monkeypatch.setenv("BHA_SQLITE_DB_PATH", "data/test.sqlite3")
    monkeypatch.setenv("BHA_ASSISTANT_TEST_MODE", "false")
    monkeypatch.setenv("BHA_ASSISTANT_LLM_BASE_URL", "http://localhost:9000")
    monkeypatch.setenv("BHA_ASSISTANT_MODEL_NAME", "test-model")
    monkeypatch.setenv("BHA_ASSISTANT_TIMEOUT_SECONDS", "12.5")
    monkeypatch.setenv("BHA_ASSISTANT_INCLUDE_FEWSHOT", "false")
    monkeypatch.setenv("BHA_ASSISTANT_RECENT_HISTORY_TURNS", "3")
    monkeypatch.setenv("BHA_AUTH_TOKEN_EXPIRATION_SECONDS", "1800")
    monkeypatch.setenv("BHA_AUTH_MAX_FAILED_LOGIN_ATTEMPTS", "4")
    monkeypatch.setenv("BHA_AUTH_LOCKOUT_DURATION_SECONDS", "600")
    get_settings.cache_clear()

    settings = get_settings()

    assert settings.app_env == "test"
    assert settings.debug is False
    assert settings.auth_secret_key == "test-secret"
    assert settings.auth_token_expiration_seconds == 1800
    assert settings.auth_max_failed_login_attempts == 4
    assert settings.auth_lockout_duration_seconds == 600
    assert settings.api_prefix == "/v1"
    assert settings.sqlite_db_path == "data/test.sqlite3"
    assert settings.assistant_test_mode is False
    assert settings.assistant_llm_base_url == "http://localhost:9000"
    assert settings.assistant_model_name == "test-model"
    assert settings.assistant_timeout_seconds == 12.5
    assert settings.assistant_include_fewshot is False
    assert settings.assistant_recent_history_turns == 3

    get_settings.cache_clear()


def test_legacy_auth_token_env_alias_still_works(monkeypatch):
    monkeypatch.setenv("BHA_AUTH_TOKEN", "legacy-secret")
    get_settings.cache_clear()

    settings = get_settings()

    assert settings.auth_secret_key == "legacy-secret"

    get_settings.cache_clear()


def test_blank_base_url_switches_to_openai_when_test_mode_disabled(monkeypatch):
    monkeypatch.setenv("BHA_ASSISTANT_TEST_MODE", "false")
    monkeypatch.setenv("BHA_ASSISTANT_LLM_API_KEY", "test-key")
    monkeypatch.setenv("BHA_ASSISTANT_LLM_BASE_URL", "")
    get_settings.cache_clear()

    settings = get_settings()

    assert settings.assistant_llm_base_url == "https://api.openai.com"

    get_settings.cache_clear()
