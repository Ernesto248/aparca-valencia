from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


class HealthResponse(BaseModel):
    status: Literal["ok"] = "ok"
    service: str = "aparca-valencia-api"


class ReadyResponse(BaseModel):
    status: Literal["ready"] = "ready"
    database: Literal["ok"] = "ok"


class ProblemDetail(BaseModel):
    type: str = "about:blank"
    title: str
    status: int
    detail: str
    instance: str | None = None
    code: str | None = None


class GeocodeCandidate(BaseModel):
    display_name: str
    latitude: float
    longitude: float
    type: str | None = None
    importance: float | None = None


class GeoJSONFeature(BaseModel):
    type: Literal["Feature"] = "Feature"
    id: str | None = None
    geometry: dict[str, Any]
    properties: dict[str, Any]


class GeoJSONFeatureCollection(BaseModel):
    type: Literal["FeatureCollection"] = "FeatureCollection"
    features: list[GeoJSONFeature]
    meta: dict[str, Any] = Field(default_factory=dict)


class Recommendation(BaseModel):
    id: uuid.UUID
    street_name: str
    latitude: float
    longitude: float
    distance_meters: float
    evidence_count: int
    strategy: Literal["heuristic_v0"] = "heuristic_v0"
    ranking_score: float
    availability_probability: None = None
    availability_status: Literal["unknown"] = "unknown"
    confidence: Literal["unvalidated"] = "unvalidated"
    explanation: str
    data_source: str
    imported_at: datetime | None = None


class RecommendationResponse(BaseModel):
    destination: dict[str, float]
    radius_meters: int
    items: list[Recommendation]
    warning: str = (
        "La puntuación ordena zonas documentadas; no indica plazas libres ni probabilidad real."
    )


class DataSourceStatus(BaseModel):
    source: str
    available: bool
    last_successful_sync: datetime | None
    records: int
    zones: int
    stale: bool
    warning: str | None = None


class SegmentDetail(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    street_name: str
    parking_type: str
    evidence_count: int
    source: str
    geometry: dict[str, Any]
    updated_at: datetime
