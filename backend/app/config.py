from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Ektheto API"
    app_version: str = "1.3.0"
    environment: str = "development"
    cors_origins: str = "http://localhost:8000,http://127.0.0.1:8000"
    database_url: str = ""
    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_jwt_secret: str = ""
    sightengine_user: str = ""
    sightengine_secret: str = ""
    nasa_api_key: str = "DEMO_KEY"
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
