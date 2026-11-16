import asyncio
import os

import httpx
import pytest
from sqlalchemy import text

from app.core.config import settings
from app.db.session import SessionLocal
from app.integrations.geocoder import NominatimGeocoder
from app.services.parking import recommendations, regulated_predictions


@pytest.mark.integration
@pytest.mark.skipif(not os.getenv("RUN_POSTGIS_TESTS"), reason="RUN_POSTGIS_TESTS no definido")
@pytest.mark.asyncio
async def test_postgis_distance_query() -> None:
    async with SessionLocal() as session:
        distance = await session.scalar(
            text(
                """
                SELECT ST_Distance(
                    ST_SetSRID(ST_MakePoint(-0.3763, 39.4699), 4326)::geography,
                    ST_SetSRID(ST_MakePoint(-0.3763, 39.4709), 4326)::geography
                )
                """
            )
        )
    assert 100 < distance < 120


@pytest.mark.integration
@pytest.mark.skipif(not os.getenv("RUN_POSTGIS_TESTS"), reason="RUN_POSTGIS_TESTS no definido")
@pytest.mark.asyncio
async def test_recommendations_query_maps_import_timestamp() -> None:
    async with SessionLocal() as session:
        await session.execute(
            text(
                """
                INSERT INTO parking_zones
                    (id, city_code, source, street_name, parking_type, geom,
                     evidence_count, source_feature_ids, updated_at)
                VALUES
                    ('00000000-0000-0000-0000-000000000099', 'VLC', 'test',
                     'Calle de prueba', 'unregulated',
                     ST_Multi(ST_GeomFromText(
                         'LINESTRING(-0.3763 39.4699, -0.3762 39.4700)', 4326
                     )), 4, ARRAY['test-1'], now())
                """
            )
        )
        result = await recommendations(session, 39.4699, -0.3763, 500, 5)
        await session.rollback()

    assert result.items[0].street_name == "Calle de prueba"
    assert result.items[0].imported_at is not None


@pytest.mark.integration
@pytest.mark.skipif(not os.getenv("RUN_POSTGIS_TESTS"), reason="RUN_POSTGIS_TESTS no definido")
@pytest.mark.asyncio
async def test_concurrent_geocode_cache_writes_are_idempotent(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    class FakeClient:
        async def __aenter__(self):
            return self

        async def __aexit__(self, *_args):
            return None

        async def get(self, *_args, **_kwargs):
            return httpx.Response(
                200,
                request=httpx.Request("GET", "http://nominatim/search"),
                json=[
                    {
                        "display_name": "Plaça de l'Ajuntament, València",
                        "lat": "39.4706473",
                        "lon": "-0.3768264",
                        "type": "square",
                        "importance": 0.1,
                    }
                ],
            )

    monkeypatch.setattr(
        "app.integrations.geocoder.httpx.AsyncClient", lambda **_kwargs: FakeClient()
    )
    query = "E2E concurrent cache write"
    async with SessionLocal() as first, SessionLocal() as second:
        results = await asyncio.gather(
            NominatimGeocoder().search(first, query, 2),
            NominatimGeocoder().search(second, query, 2),
        )

    assert len(results[0]) == len(results[1]) == 1


@pytest.mark.integration
@pytest.mark.skipif(not os.getenv("RUN_POSTGIS_TESTS"), reason="RUN_POSTGIS_TESTS no definido")
@pytest.mark.asyncio
async def test_regulated_predictions_are_ranked_by_occupancy_before_distance(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, "enable_regulated_predictions", True)
    async with SessionLocal() as session:
        await session.execute(
            text(
                """
                INSERT INTO regulated_parking_predictions
                    (id, source_id, segment_id, street_name, horizon_hours,
                     occupancy_percent, geom, imported_at)
                VALUES
                    ('10000000-0000-0000-0000-000000000001', 'far-free', '1',
                     'Calle con más opciones', 1, 30,
                     ST_GeomFromText('LINESTRING(-0.3770 39.4699, -0.3769 39.4700)', 4326),
                     now()),
                    ('10000000-0000-0000-0000-000000000002', 'near-busy', '2',
                     'Calle casi llena', 1, 90,
                     ST_GeomFromText('LINESTRING(-0.3763 39.4699, -0.3762 39.4700)', 4326),
                     now())
                """
            )
        )
        result = await regulated_predictions(session, 39.4699, -0.3763, 500, 1, 10)
        await session.rollback()

    assert [item.properties["occupancy_percent"] for item in result.features] == [30, 90]
    assert result.features[0].properties["probability_level"] == "high"
    assert result.features[1].properties["probability_level"] == "low"
