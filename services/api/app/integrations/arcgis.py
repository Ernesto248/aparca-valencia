from __future__ import annotations

import asyncio
import json
from collections.abc import AsyncIterator
from typing import Any

import httpx


class ArcGISError(RuntimeError):
    pass


class ArcGISClient:
    def __init__(
        self,
        base_url: str,
        *,
        timeout_seconds: float = 30,
        retries: int = 3,
        client: httpx.AsyncClient | None = None,
    ) -> None:
        self.base_url = base_url.rstrip("/")
        self.retries = retries
        self._owns_client = client is None
        self.client = client or httpx.AsyncClient(
            timeout=httpx.Timeout(timeout_seconds),
            headers={"User-Agent": "AparcaValencia/0.1"},
        )

    async def close(self) -> None:
        if self._owns_client:
            await self.client.aclose()

    async def _get_json(self, url: str, params: dict[str, Any]) -> dict[str, Any]:
        last_error: Exception | None = None
        for attempt in range(self.retries):
            try:
                response = await self.client.get(url, params=params)
                response.raise_for_status()
                payload = json.loads(response.content)
                if "error" in payload:
                    raise ArcGISError(str(payload["error"]))
                return payload
            except (httpx.HTTPError, json.JSONDecodeError, ArcGISError) as exc:
                last_error = exc
                if attempt + 1 < self.retries:
                    await asyncio.sleep(0.5 * (2**attempt))
        raise ArcGISError(f"ArcGIS no respondió correctamente: {last_error}")

    async def metadata(self, layer_id: int) -> dict[str, Any]:
        metadata = await self._get_json(f"{self.base_url}/{layer_id}", {"f": "pjson"})
        if metadata.get("geometryType") != "esriGeometryPolyline":
            raise ArcGISError("La capa no contiene geometrías de línea")
        if not metadata.get("objectIdField") and not any(
            field.get("type") == "esriFieldTypeOID" for field in metadata.get("fields", [])
        ):
            raise ArcGISError("La capa no declara un campo OID")
        return metadata

    async def object_ids(self, layer_id: int) -> list[int]:
        payload = await self._get_json(
            f"{self.base_url}/{layer_id}/query",
            {"where": "1=1", "returnIdsOnly": "true", "f": "json"},
        )
        ids = payload.get("objectIds")
        if not isinstance(ids, list):
            raise ArcGISError("Respuesta de identificadores incompleta")
        return sorted(int(item) for item in ids)

    async def features_by_ids(
        self,
        layer_id: int,
        object_ids: list[int],
        *,
        out_fields: str = "*",
    ) -> dict[str, Any]:
        payload = await self._get_json(
            f"{self.base_url}/{layer_id}/query",
            {
                "objectIds": ",".join(str(item) for item in object_ids),
                "outFields": out_fields,
                "returnGeometry": "true",
                "outSR": 4326,
                "f": "geojson",
            },
        )
        if payload.get("type") != "FeatureCollection" or not isinstance(
            payload.get("features"), list
        ):
            raise ArcGISError("Lote GeoJSON inválido")
        return payload

    async def iter_features(
        self, layer_id: int, *, batch_size: int = 1000, out_fields: str = "*"
    ) -> AsyncIterator[list[dict[str, Any]]]:
        if not 1 <= batch_size < 2000:
            raise ValueError("batch_size debe estar entre 1 y 1999")
        object_ids = await self.object_ids(layer_id)
        for offset in range(0, len(object_ids), batch_size):
            batch_ids = object_ids[offset : offset + batch_size]
            payload = await self.features_by_ids(layer_id, batch_ids, out_fields=out_fields)
            features = payload["features"]
            returned_ids = {
                int(feature.get("id") or feature.get("properties", {}).get("gid"))
                for feature in features
            }
            if returned_ids != set(batch_ids):
                raise ArcGISError(
                    f"Lote parcial: solicitados {len(batch_ids)}, recibidos {len(returned_ids)}"
                )
            yield features
