from __future__ import annotations

import uuid
from datetime import datetime

from geoalchemy2 import Geometry
from sqlalchemy import Boolean, DateTime, Integer, SmallInteger, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class ParkingFeature(Base):
    __tablename__ = "parking_features"
    __table_args__ = (UniqueConstraint("source", "source_id", name="uq_parking_feature_source_id"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    city_code: Mapped[str] = mapped_column(String(32))
    source: Mapped[str] = mapped_column(String(64))
    source_id: Mapped[str] = mapped_column(String(128))
    street_name: Mapped[str | None] = mapped_column(String(255))
    street_type: Mapped[str | None] = mapped_column(String(32))
    parking_type: Mapped[str] = mapped_column(String(32))
    geom: Mapped[object] = mapped_column(Geometry("LINESTRING", srid=4326, spatial_index=False))
    source_metadata: Mapped[dict] = mapped_column(JSONB, default=dict)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    imported_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    last_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class ParkingZone(Base):
    __tablename__ = "parking_zones"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    city_code: Mapped[str] = mapped_column(String(32))
    source: Mapped[str] = mapped_column(String(64))
    street_name: Mapped[str | None] = mapped_column(String(255))
    parking_type: Mapped[str] = mapped_column(String(32))
    geom: Mapped[object] = mapped_column(
        Geometry("MULTILINESTRING", srid=4326, spatial_index=False)
    )
    evidence_count: Mapped[int] = mapped_column(Integer)
    source_feature_ids: Mapped[list[str]] = mapped_column(ARRAY(Text))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class RegulatedParkingPrediction(Base):
    __tablename__ = "regulated_parking_predictions"
    __table_args__ = (
        UniqueConstraint(
            "source_id", "horizon_hours", name="uq_regulated_prediction_source_horizon"
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    source_id: Mapped[str] = mapped_column(String(128))
    segment_id: Mapped[str | None] = mapped_column(String(128))
    street_name: Mapped[str | None] = mapped_column(String(255))
    horizon_hours: Mapped[int] = mapped_column(SmallInteger)
    occupancy_percent: Mapped[int] = mapped_column(SmallInteger)
    geom: Mapped[object] = mapped_column(Geometry("LINESTRING", srid=4326, spatial_index=False))
    imported_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class DataImportRun(Base):
    __tablename__ = "data_import_runs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    source: Mapped[str] = mapped_column(String(64))
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    status: Mapped[str] = mapped_column(String(32))
    expected_records: Mapped[int | None] = mapped_column(Integer)
    processed_records: Mapped[int] = mapped_column(Integer, default=0)
    inserted_records: Mapped[int] = mapped_column(Integer, default=0)
    updated_records: Mapped[int] = mapped_column(Integer, default=0)
    rejected_records: Mapped[int] = mapped_column(Integer, default=0)
    error_messages: Mapped[list[str]] = mapped_column(JSONB, default=list)


class GeocodeCache(Base):
    __tablename__ = "geocode_cache"

    cache_key: Mapped[str] = mapped_column(String(512), primary_key=True)
    query: Mapped[str] = mapped_column(String(255))
    response: Mapped[list[dict]] = mapped_column(JSONB)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
