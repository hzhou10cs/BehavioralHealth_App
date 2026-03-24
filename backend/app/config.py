from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_env: str = "development"
    debug: bool = True
    api_prefix: str = ""
    auth_token: str = "development-token"
    assistant_test_mode: bool = True
    assistant_llm_base_url: str = "http://127.0.0.1:8001"
    assistant_llm_api_key: str | None = None
    assistant_model_name: str = "TinyLlama/TinyLlama-1.1B-Chat-v1.0"
    assistant_timeout_seconds: float = 60.0
    assistant_include_fewshot: bool = True
    assistant_recent_history_turns: int = 5

    model_config = SettingsConfigDict(
        env_prefix="BHA_",
        env_file=".env",
        extra="ignore",
    )


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
