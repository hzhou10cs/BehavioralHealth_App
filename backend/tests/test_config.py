from app.config import get_settings


def test_env_based_configuration(monkeypatch):
    monkeypatch.setenv("BHA_APP_ENV", "test")
    monkeypatch.setenv("BHA_DEBUG", "false")
    monkeypatch.setenv("BHA_AUTH_TOKEN", "test-token")
    monkeypatch.setenv("BHA_API_PREFIX", "/v1")
    get_settings.cache_clear()

    settings = get_settings()

    assert settings.app_env == "test"
    assert settings.debug is False
    assert settings.auth_token == "test-token"
    assert settings.api_prefix == "/v1"

    get_settings.cache_clear()
