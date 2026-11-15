from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.integrations.geocoder import NominatimGeocoder
from app.schemas import (
    DataSourceStatus,
    GeocodeCandidate,
    GeoJSONFeatureCollection,
    HealthResponse,
    ReadyResponse,
    RecommendationResponse,
    SegmentDetail,
)
from app.services.parking import (
    nearby_zones,
    raw_features,
    recommendations,
    segment_detail,
    source_status,
)

router = APIRouter(prefix="/api/v1")


@router.get("/health", response_model=HealthResponse, tags=["system"])
async def health() -> HealthResponse:
    return HealthResponse()


@router.get("/ready", response_model=ReadyResponse, tags=["system"])
async def ready(session: AsyncSession = Depends(get_session)) -> ReadyResponse:
    await session.execute(text("SELECT 1"))
    return ReadyResponse()


@router.get("/geocode", response_model=list[GeocodeCandidate], tags=["geocoding"])
async def geocode(
    q: str = Query(min_length=2, max_length=120),
    limit: int = Query(default=5, ge=1, le=10),
    session: AsyncSession = Depends(get_session),
) -> list[GeocodeCandidate]:
    return await NominatimGeocoder().search(session, q, limit)


@router.get("/parking/nearby", response_model=GeoJSONFeatureCollection, tags=["parking"])
async def parking_nearby(
    latitude: float = Query(ge=-90, le=90),
    longitude: float = Query(ge=-180, le=180),
    radius_meters: int = Query(default=500, ge=100, le=2000),
    limit: int = Query(default=250, ge=1, le=500),
    session: AsyncSession = Depends(get_session),
) -> GeoJSONFeatureCollection:
    return await nearby_zones(session, latitude, longitude, radius_meters, limit)


@router.get("/parking/features", response_model=GeoJSONFeatureCollection, tags=["parking"])
async def parking_features(
    bbox: str = Query(description="west,south,east,north"),
    limit: int = Query(default=2500, ge=1, le=5000),
    session: AsyncSession = Depends(get_session),
) -> GeoJSONFeatureCollection:
    try:
        parsed = tuple(float(value) for value in bbox.split(","))
    except ValueError as exc:
        raise HTTPException(status_code=422, detail="bbox contiene valores inválidos") from exc
    if len(parsed) != 4:
        raise HTTPException(status_code=422, detail="bbox debe contener cuatro valores")
    west, south, east, north = parsed
    if not (-180 <= west < east <= 180 and -90 <= south < north <= 90):
        raise HTTPException(status_code=422, detail="bbox fuera de rango")
    if east - west > 0.1 or north - south > 0.1:
        raise HTTPException(status_code=422, detail="bbox demasiado amplio para el detalle")
    return await raw_features(session, parsed, limit)


@router.get("/parking/recommendations", response_model=RecommendationResponse, tags=["parking"])
async def parking_recommendations(
    latitude: float = Query(ge=-90, le=90),
    longitude: float = Query(ge=-180, le=180),
    radius_meters: int = Query(default=500, ge=100, le=2000),
    limit: int = Query(default=10, ge=1, le=50),
    session: AsyncSession = Depends(get_session),
) -> RecommendationResponse:
    return await recommendations(session, latitude, longitude, radius_meters, limit)


@router.get("/parking/segments/{segment_id}", response_model=SegmentDetail, tags=["parking"])
async def parking_segment(
    segment_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
) -> SegmentDetail:
    result = await segment_detail(session, segment_id)
    if result is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Zona no encontrada")
    return result


@router.get("/data/status", response_model=DataSourceStatus, tags=["data"])
async def data_status(session: AsyncSession = Depends(get_session)) -> DataSourceStatus:
    return await source_status(session)
