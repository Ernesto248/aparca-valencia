from __future__ import annotations

import json
import uuid
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import text

from app.core.config import settings
from app.db.session import SessionLocal
from app.integrations.arcgis import ArcGISClient, ArcGISError
from app.models import DataImportRun

SOURCE = "valencia_arcgis_197"


def _validate_feature(feature: dict[str, Any]) -> dict[str, Any]:
    geometry = feature.get("geometry") or {}
    properties = feature.get("properties") or {}
    if geometry.get("type") != "LineString":
        raise ValueError("Geometría no compatible")
    coordinates = geometry.get("coordinates")
    if not isinstance(coordinates, list) or len(coordinates) < 2:
        raise ValueError("Geometría sin coordenadas suficientes")
    for point in coordinates:
        if not isinstance(point, list) or len(point) < 2:
            raise ValueError("Coordenada inválida")
        longitude, latitude = float(point[0]), float(point[1])
        if not (-1.0 <= longitude <= 0.5 and 38.5 <= latitude <= 40.5):
            raise ValueError("Coordenada fuera del entorno de València")
    source_id = properties.get("gid") or feature.get("id")
    if source_id is None:
        raise ValueError("Registro sin gid")
    return {
        "id": uuid.uuid4(),
        "city_code": "VLC",
        "source": SOURCE,
        "source_id": str(source_id),
        "street_name": properties.get("calle"),
        "street_type": properties.get("tipocalle"),
        "parking_type": "unregulated",
        "geometry": json.dumps(geometry),
        "metadata": json.dumps(properties, ensure_ascii=False),
    }


class UnregulatedParkingImporter:
    def __init__(self, client: ArcGISClient | None = None) -> None:
        self.client = client or ArcGISClient(settings.arcgis_base_url)
        self._owns_client = client is None

    async def run(self) -> uuid.UUID:
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
        try:
            metadata = await self.client.metadata(settings.arcgis_unregulated_layer_id)
            max_record_count = int(metadata.get("maxRecordCount") or 2000)
            batch_size = min(max_record_count - 1, 1000)
            object_ids = await self.client.object_ids(settings.arcgis_unregulated_layer_id)
            if len(object_ids) < 1:
                raise ArcGISError("La capa no devolvió identificadores")

            async with SessionLocal() as session, session.begin():
                await session.execute(
                    text(
                        """
                        CREATE TEMP TABLE parking_features_stage (
                            id uuid NOT NULL,
                            city_code varchar(32) NOT NULL,
                            source varchar(64) NOT NULL,
                            source_id varchar(128) NOT NULL,
                            street_name varchar(255),
                            street_type varchar(32),
                            parking_type varchar(32) NOT NULL,
                            geom geometry(LineString, 4326) NOT NULL,
                            source_metadata jsonb NOT NULL
                        ) ON COMMIT DROP
                        """
                    )
                )

                insert_stage = text(
                    """
                    INSERT INTO parking_features_stage
                        (id, city_code, source, source_id, street_name, street_type,
                         parking_type, geom, source_metadata)
                    VALUES
                        (:id, :city_code, :source, :source_id, :street_name, :street_type,
                         :parking_type, ST_SetSRID(ST_GeomFromGeoJSON(:geometry), 4326),
                         CAST(:metadata AS jsonb))
                    """
                )
                for offset in range(0, len(object_ids), batch_size):
                    batch_ids = object_ids[offset : offset + batch_size]
                    payload = await self.client.features_by_ids(
                        settings.arcgis_unregulated_layer_id,
                        batch_ids,
                        out_fields="gid,calle,tipocalle",
                    )
                    received = {
                        int(item.get("id") or item.get("properties", {}).get("gid"))
                        for item in payload["features"]
                    }
                    if received != set(batch_ids):
                        raise ArcGISError(
                            f"Lote parcial en offset {offset}: {len(received)}/{len(batch_ids)}"
                        )
                    valid_rows: list[dict[str, Any]] = []
                    for feature in payload["features"]:
                        try:
                            valid_rows.append(_validate_feature(feature))
                        except ValueError:
                            rejected += 1
                    if valid_rows:
                        await session.execute(insert_stage, valid_rows)
                    processed += len(payload["features"])

                if processed != len(object_ids):
                    raise ArcGISError(
                        f"Importación incompleta: {processed} de {len(object_ids)} registros"
                    )

                existing = await session.scalar(
                    text(
                        """
                        SELECT count(*) FROM parking_features p
                        JOIN parking_features_stage s
                          ON p.source = s.source AND p.source_id = s.source_id
                        """
                    )
                )
                now = datetime.now(UTC)
                await session.execute(
                    text(
                        """
                        INSERT INTO parking_features
                            (id, city_code, source, source_id, street_name, street_type,
                             parking_type, geom, source_metadata, is_active,
                             imported_at, updated_at, last_seen_at)
                        SELECT id, city_code, source, source_id, street_name, street_type,
                               parking_type, geom, source_metadata, true, :now, :now, :now
                        FROM parking_features_stage
                        ON CONFLICT (source, source_id) DO UPDATE SET
                            street_name = EXCLUDED.street_name,
                            street_type = EXCLUDED.street_type,
                            parking_type = EXCLUDED.parking_type,
                            geom = EXCLUDED.geom,
                            source_metadata = EXCLUDED.source_metadata,
                            is_active = true,
                            updated_at = EXCLUDED.updated_at,
                            last_seen_at = EXCLUDED.last_seen_at
                        """
                    ),
                    {"now": now},
                )
                await session.execute(
                    text(
                        """
                        UPDATE parking_features p SET is_active = false, updated_at = :now
                        WHERE p.source = :source AND p.is_active
                          AND NOT EXISTS (
                              SELECT 1 FROM parking_features_stage s
                              WHERE s.source = p.source AND s.source_id = p.source_id
                          )
                        """
                    ),
                    {"now": now, "source": SOURCE},
                )
                await self._rebuild_zones(session, now)

            await self._finish_run(
                run_id,
                status="success",
                expected=len(object_ids),
                processed=processed,
                inserted=processed - int(existing or 0),
                updated=int(existing or 0),
                rejected=rejected,
            )
            return run_id
        except Exception as exc:
            await self._finish_run(
                run_id,
                status="failed",
                expected=None,
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

    async def _rebuild_zones(self, session: Any, now: datetime) -> None:
        await session.execute(
            text("DELETE FROM parking_zones WHERE source = :source"), {"source": SOURCE}
        )
        await session.execute(
            text(
                """
                WITH clustered AS (
                    SELECT source, city_code, source_id, street_name, parking_type, geom,
                           ST_ClusterDBSCAN(
                               ST_Transform(geom, 25830), eps := :distance, minpoints := 1
                           ) OVER (
                               PARTITION BY source, coalesce(street_name, ''), parking_type
                           ) AS cluster_id
                    FROM parking_features
                    WHERE source = :source AND is_active
                ), grouped AS (
                    SELECT source, city_code, street_name, parking_type, cluster_id,
                           ST_Multi(ST_Collect(geom)) AS geom,
                           count(*)::integer AS evidence_count,
                           array_agg(source_id ORDER BY source_id) AS source_feature_ids,
                           min(source_id) AS first_source_id
                    FROM clustered
                    GROUP BY source, city_code, street_name, parking_type, cluster_id
                )
                INSERT INTO parking_zones
                    (id, city_code, source, street_name, parking_type, geom,
                     evidence_count, source_feature_ids, updated_at)
                SELECT md5(
                    concat_ws(':', source, coalesce(street_name, ''), first_source_id)
                )::uuid,
                       city_code, source, street_name, parking_type, geom,
                       evidence_count, source_feature_ids, :now
                FROM grouped
                """
            ),
            {
                "source": SOURCE,
                "distance": settings.parking_cluster_distance_meters,
                "now": now,
            },
        )

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
