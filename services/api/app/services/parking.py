from __future__ import annotations

import json
import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.recommendations import HeuristicRecommendationEngine, RecommendationInput
from app.schemas import (
    DataSourceStatus,
    GeoJSONFeature,
    GeoJSONFeatureCollection,
    RecommendationResponse,
    SegmentDetail,
)
from app.services.importer import SOURCE


async def nearby_zones(
    session: AsyncSession,
    latitude: float,
    longitude: float,
    radius_meters: int,
    limit: int,
) -> GeoJSONFeatureCollection:
    rows = (
        await session.execute(
            text(
                """
                WITH destination AS (
                    SELECT ST_SetSRID(ST_MakePoint(:longitude, :latitude), 4326) AS geom
                )
                SELECT z.id, z.street_name, z.parking_type, z.evidence_count, z.source,
                       z.updated_at, ST_AsGeoJSON(z.geom)::json AS geometry,
                       ST_Distance(z.geom::geography, d.geom::geography) AS distance_meters
                FROM parking_zones z CROSS JOIN destination d
                WHERE ST_DWithin(z.geom::geography, d.geom::geography, :radius)
                ORDER BY distance_meters, z.evidence_count DESC
                LIMIT :limit
                """
            ),
            {
                "latitude": latitude,
                "longitude": longitude,
                "radius": radius_meters,
                "limit": limit,
            },
        )
    ).mappings()
    features = [
        GeoJSONFeature(
            id=str(row["id"]),
            geometry=row["geometry"]
            if isinstance(row["geometry"], dict)
            else json.loads(row["geometry"]),
            properties={
                "street_name": row["street_name"] or "Calle sin nombre",
                "parking_type": row["parking_type"],
                "evidence_count": row["evidence_count"],
                "source": row["source"],
                "updated_at": row["updated_at"].isoformat(),
                "distance_meters": round(row["distance_meters"], 1),
                "availability_status": "unknown",
            },
        )
        for row in rows
    ]
    return GeoJSONFeatureCollection(
        features=features,
        meta={"radius_meters": radius_meters, "count": len(features), "detail": "zones"},
    )


async def raw_features(
    session: AsyncSession, bbox: tuple[float, float, float, float], limit: int
) -> GeoJSONFeatureCollection:
    west, south, east, north = bbox
    rows = (
        await session.execute(
            text(
                """
                SELECT id, source_id, street_name, street_type, parking_type, source,
                       ST_AsGeoJSON(geom)::json AS geometry
                FROM parking_features
                WHERE is_active AND geom && ST_MakeEnvelope(:west, :south, :east, :north, 4326)
                ORDER BY source_id
                LIMIT :limit
                """
            ),
            {"west": west, "south": south, "east": east, "north": north, "limit": limit},
        )
    ).mappings()
    features = [
        GeoJSONFeature(
            id=str(row["id"]),
            geometry=row["geometry"]
            if isinstance(row["geometry"], dict)
            else json.loads(row["geometry"]),
            properties={
                "source_id": row["source_id"],
                "street_name": row["street_name"],
                "street_type": row["street_type"],
                "parking_type": row["parking_type"],
                "source": row["source"],
                "availability_status": "unknown",
            },
        )
        for row in rows
    ]
    return GeoJSONFeatureCollection(
        features=features,
        meta={"count": len(features), "limit": limit, "truncated": len(features) == limit},
    )


async def recommendations(
    session: AsyncSession,
    latitude: float,
    longitude: float,
    radius_meters: int,
    limit: int,
) -> RecommendationResponse:
    rows = (
        await session.execute(
            text(
                """
                WITH destination AS (
                    SELECT ST_SetSRID(ST_MakePoint(:longitude, :latitude), 4326) AS geom
                )
                SELECT z.id, z.street_name, z.evidence_count, z.source, z.updated_at,
                       ST_Distance(z.geom::geography, d.geom::geography) AS distance_meters,
                       ST_Y(ST_Centroid(z.geom)) AS latitude,
                       ST_X(ST_Centroid(z.geom)) AS longitude
                FROM parking_zones z CROSS JOIN destination d
                WHERE ST_DWithin(z.geom::geography, d.geom::geography, :radius)
                ORDER BY distance_meters
                LIMIT 500
                """
            ),
            {"latitude": latitude, "longitude": longitude, "radius": radius_meters},
        )
    ).mappings()
    inputs = [RecommendationInput(**dict(row)) for row in rows]
    items = HeuristicRecommendationEngine().rank(inputs, radius_meters, limit)
    return RecommendationResponse(
        destination={"latitude": latitude, "longitude": longitude},
        radius_meters=radius_meters,
        items=items,
    )


async def segment_detail(session: AsyncSession, segment_id: uuid.UUID) -> SegmentDetail | None:
    row = (
        (
            await session.execute(
                text(
                    """
                SELECT id, street_name, parking_type, evidence_count, source, updated_at,
                       ST_AsGeoJSON(geom)::json AS geometry
                FROM parking_zones WHERE id = :id
                """
                ),
                {"id": segment_id},
            )
        )
        .mappings()
        .first()
    )
    if not row:
        return None
    payload = dict(row)
    payload["street_name"] = payload["street_name"] or "Calle sin nombre"
    if isinstance(payload["geometry"], str):
        payload["geometry"] = json.loads(payload["geometry"])
    return SegmentDetail.model_validate(payload)


async def source_status(session: AsyncSession) -> DataSourceStatus:
    row = (
        (
            await session.execute(
                text(
                    """
                SELECT
                    (SELECT max(finished_at) FROM data_import_runs
                     WHERE source = :source AND status = 'success') AS last_sync,
                    (SELECT count(*) FROM parking_features
                     WHERE source = :source AND is_active) AS records,
                    (SELECT count(*) FROM parking_zones WHERE source = :source) AS zones
                """
                ),
                {"source": SOURCE},
            )
        )
        .mappings()
        .one()
    )
    last_sync = row["last_sync"]
    stale = last_sync is None or last_sync < datetime.now(UTC) - timedelta(
        hours=settings.data_stale_after_hours
    )
    return DataSourceStatus(
        source=SOURCE,
        available=last_sync is not None and row["records"] > 0,
        last_successful_sync=last_sync,
        records=row["records"],
        zones=row["zones"],
        stale=stale,
        warning="Los datos municipales están desactualizados." if stale else None,
    )
