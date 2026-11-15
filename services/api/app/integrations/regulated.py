from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from app.integrations.arcgis import ArcGISClient


@dataclass(frozen=True, slots=True)
class RegulatedLayer:
    horizon_hours: int
    layer_id: int
    occupancy_field: str


LAYERS = {
    1: RegulatedLayer(1, 254, "ocupacion_1"),
    6: RegulatedLayer(6, 253, "ocupacion_6"),
    12: RegulatedLayer(12, 252, "ocupacion_12"),
    24: RegulatedLayer(24, 4, "ocupacion_24"),
}


class RegulatedPredictionAdapter:
    def __init__(self, client: ArcGISClient) -> None:
        self.client = client

    async def fetch(self, horizon_hours: int) -> list[dict[str, Any]]:
        layer = LAYERS.get(horizon_hours)
        if layer is None:
            raise ValueError("El horizonte debe ser 1, 6, 12 o 24 horas")
        await self.client.metadata(layer.layer_id)
        records: list[dict[str, Any]] = []
        async for features in self.client.iter_features(
            layer.layer_id,
            out_fields=f"objectid,id_tramo,{layer.occupancy_field},nombre_via",
        ):
            for feature in features:
                properties = feature["properties"]
                records.append(
                    {
                        "source_id": str(properties["objectid"]),
                        "segment_id": properties.get("id_tramo"),
                        "street_name": properties.get("nombre_via"),
                        "occupancy_prediction": properties.get(layer.occupancy_field),
                        "horizon_hours": horizon_hours,
                        "geometry": feature["geometry"],
                    }
                )
        return records
