from __future__ import annotations

import hashlib
from datetime import UTC, datetime, timedelta

import httpx
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models import GeocodeCache
from app.schemas import GeocodeCandidate


class NominatimGeocoder:
    async def search(self, session: AsyncSession, query: str, limit: int) -> list[GeocodeCandidate]:
        normalized = " ".join(query.casefold().split())
        cache_key = hashlib.sha256(f"{normalized}:{limit}".encode()).hexdigest()
        cached = await session.get(GeocodeCache, cache_key)
        now = datetime.now(UTC)
        if cached and cached.expires_at > now:
            return [GeocodeCandidate.model_validate(item) for item in cached.response]

        west, south, east, north = settings.geocoder_bbox
        async with httpx.AsyncClient(
            timeout=10,
            headers={"User-Agent": settings.nominatim_user_agent},
        ) as client:
            response = await client.get(
                f"{settings.nominatim_url.rstrip('/')}/search",
                params={
                    "q": query,
                    "format": "jsonv2",
                    "limit": limit,
                    "addressdetails": 1,
                    "bounded": 1,
                    "viewbox": f"{west},{north},{east},{south}",
                },
            )
            response.raise_for_status()
            payload = response.json()

        candidates = [
            GeocodeCandidate(
                display_name=item["display_name"],
                latitude=float(item["lat"]),
                longitude=float(item["lon"]),
                type=item.get("type"),
                importance=item.get("importance"),
            )
            for item in payload
            if south <= float(item["lat"]) <= north and west <= float(item["lon"]) <= east
        ]
        serialized = [candidate.model_dump(mode="json") for candidate in candidates]
        if cached:
            cached.response = serialized
            cached.expires_at = now + timedelta(days=settings.geocoder_cache_days)
        else:
            session.add(
                GeocodeCache(
                    cache_key=cache_key,
                    query=query,
                    response=serialized,
                    created_at=now,
                    expires_at=now + timedelta(days=settings.geocoder_cache_days),
                )
            )
        await session.commit()
        return candidates
