import pytest

from app.services.importer import _validate_feature


def test_valid_feature_is_normalized() -> None:
    result = _validate_feature(
        {
            "id": 123,
            "properties": {"gid": 123, "calle": "COLÓN", "tipocalle": "C"},
            "geometry": {
                "type": "LineString",
                "coordinates": [[-0.38, 39.47], [-0.37999, 39.47001]],
            },
        }
    )

    assert result["source_id"] == "123"
    assert result["street_name"] == "COLÓN"
    assert result["parking_type"] == "unregulated"


@pytest.mark.parametrize(
    "geometry",
    [
        {"type": "Point", "coordinates": [-0.38, 39.47]},
        {"type": "LineString", "coordinates": [[-0.38, 39.47]]},
        {"type": "LineString", "coordinates": [[30.0, 39.47], [30.1, 39.48]]},
    ],
)
def test_invalid_geometry_is_rejected(geometry: dict) -> None:
    with pytest.raises(ValueError):
        _validate_feature({"properties": {"gid": 1}, "geometry": geometry})
