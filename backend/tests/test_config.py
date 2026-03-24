from app.config import get_settings


def test_env_based_configuration(monkeypatch):
    monkeypatch.setenv("BHA_APP_ENV", "test")
    monkeypatch.setenv("BHA_DEBUG", "false")
    monkeypatch.setenv("BHA_AUTH_TOKEN", "test-token")
    monkeypatch.setenv("BHA_API_PREFIX", "/v1")
    monkeypatch.setenv("BHA_ASSISTANT_TEST_MODE", "false")
    monkeypatch.setenv("BHA_ASSISTANT_LLM_BASE_URL", "http://localhost:9000")
    monkeypatch.setenv("BHA_ASSISTANT_MODEL_NAME", "test-model")
    monkeypatch.setenv("BHA_ASSISTANT_TIMEOUT_SECONDS", "12.5")
    monkeypatch.setenv("BHA_ASSISTANT_INCLUDE_FEWSHOT", "false")
    monkeypatch.setenv("BHA_ASSISTANT_RECENT_HISTORY_TURNS", "3")
    get_settings.cache_clear()

    settings = get_settings()

    assert settings.app_env == "test"
    assert settings.debug is False
    assert settings.auth_token == "test-token"
    assert settings.api_prefix == "/v1"
    assert settings.assistant_test_mode is False
    assert settings.assistant_llm_base_url == "http://localhost:9000"
    assert settings.assistant_model_name == "test-model"
    assert settings.assistant_timeout_seconds == 12.5
    assert settings.assistant_include_fewshot is False
    assert settings.assistant_recent_history_turns == 3

    get_settings.cache_clear()
