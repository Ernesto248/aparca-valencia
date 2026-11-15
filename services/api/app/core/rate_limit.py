from __future__ import annotations

import asyncio
import time
from collections import defaultdict, deque

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.responses import JSONResponse, Response


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app: object, requests_per_minute: int) -> None:
        super().__init__(app)
        self.requests_per_minute = requests_per_minute
        self._requests: defaultdict[str, deque[float]] = defaultdict(deque)
        self._lock = asyncio.Lock()

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        if request.url.path in {"/api/v1/health", "/api/v1/ready"}:
            return await call_next(request)
        forwarded = request.headers.get("x-forwarded-for", "")
        client_key = forwarded.split(",", 1)[0].strip() or (
            request.client.host if request.client else "unknown"
        )
        now = time.monotonic()
        async with self._lock:
            bucket = self._requests[client_key]
            while bucket and bucket[0] < now - 60:
                bucket.popleft()
            if len(bucket) >= self.requests_per_minute:
                return JSONResponse(
                    status_code=429,
                    content={
                        "type": "about:blank",
                        "title": "Demasiadas solicitudes",
                        "status": 429,
                        "detail": "Vuelve a intentarlo dentro de un minuto.",
                        "instance": request.url.path,
                        "code": "rate_limit_exceeded",
                    },
                    headers={"Retry-After": "60"},
                )
            bucket.append(now)
        return await call_next(request)
