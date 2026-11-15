from __future__ import annotations

import math
import uuid
from dataclasses import dataclass
from datetime import datetime

from app.schemas import Recommendation


@dataclass(frozen=True, slots=True)
class RecommendationInput:
    id: uuid.UUID
    street_name: str | None
    latitude: float
    longitude: float
    distance_meters: float
    evidence_count: int
    source: str
    imported_at: datetime | None = None


class HeuristicRecommendationEngine:
    strategy = "heuristic_v0"
    distance_weight = 0.75
    evidence_weight = 0.25
    evidence_cap = 50

    def score(self, item: RecommendationInput, radius_meters: int) -> float:
        distance_score = max(0.0, 1.0 - item.distance_meters / radius_meters)
        evidence_score = min(
            math.log1p(max(item.evidence_count, 0)) / math.log1p(self.evidence_cap), 1.0
        )
        return round(
            self.distance_weight * distance_score + self.evidence_weight * evidence_score,
            4,
        )

    def rank(
        self, items: list[RecommendationInput], radius_meters: int, limit: int
    ) -> list[Recommendation]:
        ranked = sorted(
            ((self.score(item, radius_meters), item) for item in items),
            key=lambda pair: (-pair[0], pair[1].distance_meters, str(pair[1].id)),
        )
        return [
            Recommendation(
                id=item.id,
                street_name=item.street_name or "Calle sin nombre",
                latitude=item.latitude,
                longitude=item.longitude,
                distance_meters=round(item.distance_meters, 1),
                evidence_count=item.evidence_count,
                ranking_score=score,
                explanation=(
                    f"A {round(item.distance_meters)} m del destino y respaldada por "
                    f"{item.evidence_count} geometrías del inventario municipal."
                ),
                data_source=item.source,
                imported_at=item.imported_at,
            )
            for score, item in ranked[:limit]
        ]
