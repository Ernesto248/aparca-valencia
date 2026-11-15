from functools import lru_cache
from typing import Annotated

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore", case_sensitive=False)

    app_env: str = "development"
    log_level: str = "INFO"
    database_url: str = "postgresql+asyncpg://aparca:change-me@db:5432/aparca"
    cors_origins: Annotated[list[str], NoDecode] = ["http://localhost:3000"]
    rate_limit_per_minute: int = Field(default=60, ge=1, le=10_000)
    parking_cluster_distance_meters: float = Field(default=12, ge=1, le=100)
    data_stale_after_hours: int = Field(default=48, ge=1)

    arcgis_base_url: str = (
        "https://geoportal.valencia.es/server/rest/services/OPENDATA/Trafico/MapServer"
    )
    arcgis_unregulated_layer_id: int = 197
    enable_regulated_predictions: bool = False

    nominatim_url: str = "http://nominatim:8080"
    nominatim_user_agent: str = "AparcaValencia/0.1 (contact@example.invalid)"
    geocoder_cache_days: int = Field(default=30, ge=1, le=365)
    geocoder_bbox: Annotated[tuple[float, float, float, float], NoDecode] = (
        -0.60,
        39.25,
        -0.15,
        39.70,
    )

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_origins(cls, value: object) -> object:
        if isinstance(value, str):
            return [item.strip() for item in value.split(",") if item.strip()]
        return value

    @field_validator("geocoder_bbox", mode="before")
    @classmethod
    def parse_bbox(cls, value: object) -> object:
        if isinstance(value, str):
            return tuple(float(item) for item in value.split(","))
        return value


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
