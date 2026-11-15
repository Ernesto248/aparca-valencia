import json
from urllib.parse import parse_qs

import httpx
import pytest

from app.integrations.arcgis import ArcGISClient, ArcGISError


@pytest.mark.asyncio
async def test_metadata_and_oid_pagination() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path.endswith("/197"):
            return httpx.Response(
                200,
                text=json.dumps(
                    {
                        "geometryType": "esriGeometryPolyline",
                        "objectIdField": "gid",
                        "maxRecordCount": 2000,
                        "fields": [{"name": "gid", "type": "esriFieldTypeOID"}],
                    }
                ),
            )
        if request.url.params.get("returnIdsOnly") == "true":
            return httpx.Response(200, json={"objectIds": [3, 1, 2]})
        assert request.method == "POST"
        form = parse_qs(request.content.decode())
        ids = [int(value) for value in form["objectIds"][0].split(",")]
        return httpx.Response(
            200,
            json={
                "type": "FeatureCollection",
                "features": [
                    {
                        "type": "Feature",
                        "id": item,
                        "properties": {"gid": item},
                        "geometry": {
                            "type": "LineString",
                            "coordinates": [[-0.38, 39.47], [-0.379, 39.471]],
                        },
                    }
                    for item in ids
                ],
            },
        )

    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as http_client:
        client = ArcGISClient("https://example.test/MapServer", client=http_client)
        metadata = await client.metadata(197)
        batches = [batch async for batch in client.iter_features(197, batch_size=2)]

    assert metadata["maxRecordCount"] == 2000
    assert [[feature["id"] for feature in batch] for batch in batches] == [[1, 2], [3]]


@pytest.mark.asyncio
async def test_partial_batch_is_rejected() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.params.get("returnIdsOnly") == "true":
            return httpx.Response(200, json={"objectIds": [1, 2]})
        return httpx.Response(
            200,
            json={
                "type": "FeatureCollection",
                "features": [
                    {
                        "type": "Feature",
                        "id": 1,
                        "properties": {"gid": 1},
                        "geometry": {"type": "LineString", "coordinates": [[0, 0], [1, 1]]},
                    }
                ],
            },
        )

    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as http_client:
        client = ArcGISClient("https://example.test/MapServer", retries=1, client=http_client)
        with pytest.raises(ArcGISError, match="Lote parcial"):
            _ = [batch async for batch in client.iter_features(197, batch_size=1000)]
