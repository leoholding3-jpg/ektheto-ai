from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Ektheto API"
    app_version: str = "1.3.0"
    environment: str = "development"
    cors_origins: str = "http://localhost:8000,http://127.0.0.1:8000"
    sightengine_user: str = ""
    sightengine_secret: str = ""
    gemini_api_key: str = ""
    gemini_model: str = "gemini-3.6-flash"
    newsdata_api_key: str = ""
    gnews_api_key: str = ""
    newsapi_api_key: str = ""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def allowed_origins(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
