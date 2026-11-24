from typing import Any, Literal
from pydantic import BaseModel, ConfigDict, Field, field_validator


class NewsSearchRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    tema: str = Field(min_length=2, max_length=200)
    pais: Literal["ao", "br", "pt"] = "ao"
    limite: int = Field(default=5, ge=1, le=5)


class ImageInvestigationSourcesRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    query: str = Field(min_length=2, max_length=200)
    pais: Literal["ao", "br", "pt"] = "ao"
    limite: int = Field(default=3, ge=1, le=5)

    @field_validator("query")
    @classmethod
    def normalize_query(cls, value: str) -> str:
        normalized = " ".join(value.split())
        if len(normalized) < 2:
            raise ValueError("query must contain at least two non-space characters")
        return normalized


class NewsToolInvocation(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1, max_length=100)
    arguments: dict[str, Any] = Field(default_factory=dict)
