import httpx
import pytest

from app.integrations.arcgis import ArcGISClient
from app.integrations.regulated import RegulatedPredictionAdapter


@pytest.mark.asyncio
async def test_regulated_layer_is_kept_separate() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path.endswith("/254"):
            return httpx.Response(
                200,
                json={
                    "geometryType": "esriGeometryPolyline",
                    "objectIdField": "objectid",
                    "fields": [{"name": "objectid", "type": "esriFieldTypeOID"}],
                },
            )
        if request.url.params.get("returnIdsOnly") == "true":
            return httpx.Response(200, json={"objectIds": [1]})
        return httpx.Response(
            200,
            json={
                "type": "FeatureCollection",
                "features": [
                    {
                        "id": 1,
                        "properties": {
                            "objectid": 1,
                            "id_tramo": 99,
                            "ocupacion_1": 70,
                            "nombre_via": "XÀTIVA",
                        },
                        "geometry": {
                            "type": "LineString",
                            "coordinates": [[-0.38, 39.47], [-0.37, 39.47]],
                        },
                    }
                ],
            },
        )

    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as http_client:
        client = ArcGISClient("https://example.test/MapServer", client=http_client)
        records = await RegulatedPredictionAdapter(client).fetch(1)

    assert records[0]["horizon_hours"] == 1
    assert records[0]["occupancy_prediction"] == 70
    assert "parking_type" not in records[0]
