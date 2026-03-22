from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_env: str = "development"
    debug: bool = True
    api_prefix: str = ""
    auth_token: str = "demo-token"
    db_path: str = "backend_local_tmp/app_demo.sqlite3"
    cors_allow_origins: str = "*"

    model_config = SettingsConfigDict(
        env_prefix="BHA_",
        env_file=".env",
        extra="ignore",
    )


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
