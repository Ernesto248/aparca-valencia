import uuid

from app.recommendations import HeuristicRecommendationEngine, RecommendationInput


def candidate(distance: float, evidence: int, suffix: int) -> RecommendationInput:
    return RecommendationInput(
        id=uuid.UUID(int=suffix),
        street_name=f"Calle {suffix}",
        latitude=39.47,
        longitude=-0.38,
        distance_meters=distance,
        evidence_count=evidence,
        source="valencia_arcgis_197",
    )


def test_ranking_is_deterministic() -> None:
    engine = HeuristicRecommendationEngine()
    items = [candidate(100, 5, 1), candidate(100, 5, 2), candidate(250, 50, 3)]

    first = engine.rank(items, radius_meters=500, limit=3)
    second = engine.rank(list(reversed(items)), radius_meters=500, limit=3)

    assert [item.id for item in first] == [item.id for item in second]
    assert all(item.availability_probability is None for item in first)
    assert all(item.availability_status == "unknown" for item in first)


def test_distance_has_greater_weight_than_evidence() -> None:
    engine = HeuristicRecommendationEngine()
    nearby = candidate(50, 1, 1)
    far_with_evidence = candidate(450, 50, 2)

    ranked = engine.rank([far_with_evidence, nearby], radius_meters=500, limit=2)

    assert ranked[0].id == nearby.id
    assert 0 <= ranked[0].ranking_score <= 1
