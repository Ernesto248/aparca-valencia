import os

import pytest
from sqlalchemy import text

from app.db.session import SessionLocal
from app.services.parking import recommendations


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
