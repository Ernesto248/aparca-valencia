"""Store municipal regulated-parking forecasts."""

import sqlalchemy as sa
from geoalchemy2 import Geometry
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "20261115_0002"
down_revision = "20261115_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "regulated_parking_predictions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("source_id", sa.String(128), nullable=False),
        sa.Column("segment_id", sa.String(128)),
        sa.Column("street_name", sa.String(255)),
        sa.Column("horizon_hours", sa.SmallInteger(), nullable=False),
        sa.Column("occupancy_percent", sa.SmallInteger(), nullable=False),
        sa.Column("geom", Geometry("LINESTRING", srid=4326, spatial_index=False), nullable=False),
        sa.Column("imported_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint(
            "horizon_hours IN (1, 6, 12, 24)", name="ck_regulated_prediction_horizon"
        ),
        sa.CheckConstraint(
            "occupancy_percent BETWEEN 0 AND 100",
            name="ck_regulated_prediction_occupancy",
        ),
        sa.UniqueConstraint(
            "source_id", "horizon_hours", name="uq_regulated_prediction_source_horizon"
        ),
    )
    op.create_index(
        "ix_regulated_predictions_geom",
        "regulated_parking_predictions",
        ["geom"],
        postgresql_using="gist",
    )
    op.create_index(
        "ix_regulated_predictions_horizon_occupancy",
        "regulated_parking_predictions",
        ["horizon_hours", "occupancy_percent"],
    )


def downgrade() -> None:
    op.drop_table("regulated_parking_predictions")
