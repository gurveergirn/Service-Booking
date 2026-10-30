from functools import lru_cache
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    database_url: str
    jwt_secret: str
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 14
    password_reset_expire_minutes: int = 60

    resend_api_key: str = ""
    email_from: str = "BookWell <onboarding@resend.dev>"

    frontend_url: str = "http://localhost:3000"
    cors_origins: str = "http://localhost:3000"

    app_timezone: str = "UTC"
    slot_interval_minutes: int = 30
    booking_horizon_days: int = 60

    enable_scheduler: bool = True
    scheduler_interval_seconds: int = 900
    cron_secret: str = ""

    @property
    def cors_origin_list(self) -> List[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
