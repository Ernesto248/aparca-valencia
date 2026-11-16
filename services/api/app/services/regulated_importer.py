from __future__ import annotations

import json
import uuid
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import text

from app.core.config import settings
from app.db.session import SessionLocal
from app.integrations.arcgis import ArcGISClient
from app.integrations.regulated import LAYERS, RegulatedPredictionAdapter
from app.models import DataImportRun

SOURCE = "valencia_arcgis_regulated_predictions"
HORIZONS = (1, 6, 12, 24)


def probability_level(occupancy_percent: int) -> str:
    """Mirror the municipality's ArcGIS renderer thresholds."""
    if occupancy_percent < 60:
        return "high"
    if occupancy_percent <= 80:
        return "medium"
    return "low"


def _validate_record(record: dict[str, Any]) -> dict[str, Any]:
    geometry = record.get("geometry") or {}
    if geometry.get("type") != "LineString":
        raise ValueError("Geometría regulada no compatible")
    coordinates = geometry.get("coordinates")
    if not isinstance(coordinates, list) or len(coordinates) < 2:
        raise ValueError("Geometría regulada sin coordenadas suficientes")
    for point in coordinates:
        if not isinstance(point, list) or len(point) < 2:
            raise ValueError("Coordenada regulada inválida")
        longitude, latitude = float(point[0]), float(point[1])
        if not (-1.0 <= longitude <= 0.5 and 38.5 <= latitude <= 40.5):
            raise ValueError("Coordenada regulada fuera del entorno de València")

    horizon = int(record["horizon_hours"])
    if horizon not in LAYERS:
        raise ValueError("Horizonte regulado inválido")
    occupancy = int(record["occupancy_prediction"])
    if not 0 <= occupancy <= 100:
        raise ValueError("Ocupación regulada fuera del rango 0-100")
    source_id = str(record["source_id"])
    return {
        "id": uuid.uuid5(uuid.NAMESPACE_URL, f"{SOURCE}:{horizon}:{source_id}"),
        "source_id": source_id,
        "segment_id": str(record["segment_id"]) if record.get("segment_id") is not None else None,
        "street_name": record.get("street_name"),
        "horizon_hours": horizon,
        "occupancy_percent": occupancy,
        "geometry": json.dumps(geometry),
    }


class RegulatedPredictionImporter:
    def __init__(self, client: ArcGISClient | None = None) -> None:
        self.client = client or ArcGISClient(settings.arcgis_base_url)
        self._owns_client = client is None

    async def run(self, horizons: tuple[int, ...] = HORIZONS) -> uuid.UUID:
        if any(horizon not in LAYERS for horizon in horizons):
            raise ValueError("El horizonte debe ser 1, 6, 12 o 24 horas")
        run_id = uuid.uuid4()
        started_at = datetime.now(UTC)
        async with SessionLocal() as session:
            session.add(
                DataImportRun(
                    id=run_id,
                    source=SOURCE,
                    started_at=started_at,
                    status="running",
                    processed_records=0,
                    inserted_records=0,
                    updated_records=0,
                    rejected_records=0,
                    error_messages=[],
                )
            )
            await session.commit()

        processed = 0
        rejected = 0
        expected = 0
        try:
            rows: list[dict[str, Any]] = []
            adapter = RegulatedPredictionAdapter(self.client)
            for horizon in horizons:
                records = await adapter.fetch(horizon)
                if not records:
                    raise ValueError(f"La capa de {horizon} h no devolvió registros")
                expected += len(records)
                for record in records:
                    processed += 1
                    if record.get("occupancy_prediction") is None:
                        continue
                    try:
                        rows.append(_validate_record(record))
                    except (KeyError, TypeError, ValueError):
                        rejected += 1

            if rejected:
                raise ValueError(f"La importación regulada rechazó {rejected} registros")

            async with SessionLocal() as session, session.begin():
                await session.execute(
                    text(
                        """
                        CREATE TEMP TABLE regulated_predictions_stage (
                            id uuid NOT NULL,
                            source_id varchar(128) NOT NULL,
                            segment_id varchar(128),
                            street_name varchar(255),
                            horizon_hours smallint NOT NULL,
                            occupancy_percent smallint NOT NULL,
                            geom geometry(LineString, 4326) NOT NULL
                        ) ON COMMIT DROP
                        """
                    )
                )
                await session.execute(
                    text(
                        """
                        INSERT INTO regulated_predictions_stage
                            (id, source_id, segment_id, street_name, horizon_hours,
                             occupancy_percent, geom)
                        VALUES
                            (:id, :source_id, :segment_id, :street_name, :horizon_hours,
                             :occupancy_percent,
                             ST_SetSRID(ST_Force2D(ST_GeomFromGeoJSON(:geometry)), 4326))
                        """
                    ),
                    rows,
                )
                existing = await session.scalar(
                    text(
                        """
                        SELECT count(*)
                        FROM regulated_parking_predictions p
                        JOIN regulated_predictions_stage s
                          USING (source_id, horizon_hours)
                        """
                    )
                )
                now = datetime.now(UTC)
                await session.execute(
                    text(
                        """
                        INSERT INTO regulated_parking_predictions
                            (id, source_id, segment_id, street_name, horizon_hours,
                             occupancy_percent, geom, imported_at)
                        SELECT id, source_id, segment_id, street_name, horizon_hours,
                               occupancy_percent, geom, :now
                        FROM regulated_predictions_stage
                        ON CONFLICT (source_id, horizon_hours) DO UPDATE SET
                            segment_id = EXCLUDED.segment_id,
                            street_name = EXCLUDED.street_name,
                            occupancy_percent = EXCLUDED.occupancy_percent,
                            geom = EXCLUDED.geom,
                            imported_at = EXCLUDED.imported_at
                        """
                    ),
                    {"now": now},
                )
                await session.execute(
                    text(
                        """
                        DELETE FROM regulated_parking_predictions p
                        WHERE p.horizon_hours = ANY(CAST(:horizons AS smallint[]))
                          AND NOT EXISTS (
                              SELECT 1 FROM regulated_predictions_stage s
                              WHERE s.source_id = p.source_id
                                AND s.horizon_hours = p.horizon_hours
                          )
                        """
                    ),
                    {"horizons": list(horizons)},
                )

            await self._finish_run(
                run_id,
                status="success",
                expected=expected,
                processed=processed,
                inserted=len(rows) - int(existing or 0),
                updated=int(existing or 0),
                rejected=0,
            )
            return run_id
        except Exception as exc:
            await self._finish_run(
                run_id,
                status="failed",
                expected=expected or None,
                processed=processed,
                inserted=0,
                updated=0,
                rejected=rejected,
                errors=[str(exc)[:1000]],
            )
            raise
        finally:
            if self._owns_client:
                await self.client.close()

    async def _finish_run(
        self,
        run_id: uuid.UUID,
        *,
        status: str,
        expected: int | None,
        processed: int,
        inserted: int,
        updated: int,
        rejected: int,
        errors: list[str] | None = None,
    ) -> None:
        async with SessionLocal() as session:
            run = await session.get(DataImportRun, run_id)
            if run:
                run.status = status
                run.finished_at = datetime.now(UTC)
                run.expected_records = expected
                run.processed_records = processed
                run.inserted_records = inserted
                run.updated_records = updated
                run.rejected_records = rejected
                run.error_messages = errors or []
                await session.commit()
