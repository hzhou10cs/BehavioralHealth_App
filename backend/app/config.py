from functools import lru_cache
from pathlib import Path

from pydantic import AliasChoices, Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_ENV_PATH = Path(__file__).resolve().parent.parent / ".env"


class Settings(BaseSettings):
    app_env: str = "development"
    debug: bool = True
    api_prefix: str = ""
    auth_secret_key: str = Field(
        default="development-secret-key",
        validation_alias=AliasChoices("BHA_AUTH_SECRET_KEY", "BHA_AUTH_TOKEN"),
    )
    auth_token_expiration_seconds: int = 3600
    auth_max_failed_login_attempts: int = 5
    auth_lockout_duration_seconds: int = 300
    sqlite_db_path: str = "data/behavioral_health.sqlite3"
    assistant_test_mode: bool = True
    assistant_llm_base_url: str = "http://127.0.0.1:8001"
    assistant_llm_api_key: str | None = Field(
        default=None,
        validation_alias=AliasChoices(
            "BHA_ASSISTANT_LLM_API_KEY",
            "OPENAI_API_KEY",
        ),
    )
    assistant_model_name: str = "TinyLlama/TinyLlama-1.1B-Chat-v1.0"
    assistant_timeout_seconds: float = 60.0
    assistant_include_fewshot: bool = True
    assistant_recent_history_turns: int = 5

    model_config = SettingsConfigDict(
        env_prefix="BHA_",
        env_file=str(BACKEND_ENV_PATH),
        extra="ignore",
    )

    @model_validator(mode="after")
    def apply_openai_defaults(self) -> "Settings":
        default_stub_base_url = "http://127.0.0.1:8001"
        default_stub_model = "TinyLlama/TinyLlama-1.1B-Chat-v1.0"
        normalized_base_url = self.assistant_llm_base_url.strip()

        if not normalized_base_url:
            self.assistant_llm_base_url = default_stub_base_url
        else:
            self.assistant_llm_base_url = normalized_base_url

        if (
            not self.assistant_test_mode
            and self.assistant_llm_api_key
            and self.assistant_llm_base_url == default_stub_base_url
        ):
            self.assistant_llm_base_url = "https://api.openai.com"

        if (
            not self.assistant_test_mode
            and self.assistant_llm_api_key
            and self.assistant_llm_base_url.rstrip("/") == "https://api.openai.com"
            and self.assistant_model_name == default_stub_model
        ):
            self.assistant_model_name = "gpt-4.1-mini"

        return self


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
