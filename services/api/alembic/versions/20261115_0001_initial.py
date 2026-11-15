"""Initial spatial schema."""

import sqlalchemy as sa
from geoalchemy2 import Geometry
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "20261115_0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS postgis")
    op.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto")

    op.create_table(
        "parking_features",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("city_code", sa.String(32), nullable=False),
        sa.Column("source", sa.String(64), nullable=False),
        sa.Column("source_id", sa.String(128), nullable=False),
        sa.Column("street_name", sa.String(255)),
        sa.Column("street_type", sa.String(32)),
        sa.Column("parking_type", sa.String(32), nullable=False),
        sa.Column("geom", Geometry("LINESTRING", srid=4326, spatial_index=False), nullable=False),
        sa.Column("source_metadata", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("imported_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("source", "source_id", name="uq_parking_feature_source_id"),
    )
    op.create_index(
        "ix_parking_features_geom", "parking_features", ["geom"], postgresql_using="gist"
    )
    op.create_index("ix_parking_features_active", "parking_features", ["source", "is_active"])

    op.create_table(
        "parking_zones",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("city_code", sa.String(32), nullable=False),
        sa.Column("source", sa.String(64), nullable=False),
        sa.Column("street_name", sa.String(255)),
        sa.Column("parking_type", sa.String(32), nullable=False),
        sa.Column(
            "geom", Geometry("MULTILINESTRING", srid=4326, spatial_index=False), nullable=False
        ),
        sa.Column("evidence_count", sa.Integer(), nullable=False),
        sa.Column("source_feature_ids", postgresql.ARRAY(sa.String()), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_parking_zones_geom", "parking_zones", ["geom"], postgresql_using="gist")

    op.create_table(
        "data_import_runs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("source", sa.String(64), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("finished_at", sa.DateTime(timezone=True)),
        sa.Column("status", sa.String(32), nullable=False),
        sa.Column("expected_records", sa.Integer()),
        sa.Column("processed_records", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("inserted_records", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("updated_records", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("rejected_records", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("error_messages", postgresql.JSONB(), nullable=False, server_default="[]"),
    )
    op.create_index(
        "ix_data_import_runs_source_started", "data_import_runs", ["source", "started_at"]
    )

    op.create_table(
        "geocode_cache",
        sa.Column("cache_key", sa.String(512), primary_key=True),
        sa.Column("query", sa.String(255), nullable=False),
        sa.Column("response", postgresql.JSONB(), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_geocode_cache_expires", "geocode_cache", ["expires_at"])


def downgrade() -> None:
    op.drop_table("geocode_cache")
    op.drop_table("data_import_runs")
    op.drop_table("parking_zones")
    op.drop_table("parking_features")
