from datetime import datetime
from typing import Any, Literal
from pydantic import BaseModel, ConfigDict, Field


class InvestigationCreate(BaseModel):
    title: str = Field(default="Verificação de imagem", max_length=200)
    image_name: str | None = Field(default=None, max_length=255)
    score: float = Field(ge=0, le=1)
    verdict: str
    deepfake_score: float | None = Field(default=None, ge=0, le=1)
    metadata: dict[str, Any] = Field(default_factory=dict)


class SettingUpdate(BaseModel):
    key: str = Field(max_length=100)
    value: dict[str, Any]


class IntegrationUpdate(BaseModel):
    provider: str = Field(max_length=100)
    enabled: bool = True
    configuration: dict[str, Any] = Field(default_factory=dict)


class NasaToolInvocation(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    arguments: dict[str, Any] = Field(default_factory=dict)


class NewsSearchRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    tema: str = Field(min_length=2, max_length=200)
    pais: Literal["ao", "br", "pt"] = "ao"
    limite: int = Field(default=5, ge=1, le=5)


class NewsToolInvocation(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1, max_length=100)
    arguments: dict[str, Any] = Field(default_factory=dict)
