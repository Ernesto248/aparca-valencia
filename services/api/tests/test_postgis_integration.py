import os

import pytest
from sqlalchemy import text

from app.db.session import SessionLocal


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
