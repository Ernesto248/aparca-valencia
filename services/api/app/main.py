from __future__ import annotations

import logging

import httpx
from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import ORJSONResponse
from sqlalchemy.exc import SQLAlchemyError

from app.api.router import router
from app.core.config import settings
from app.core.logging import configure_logging
from app.core.rate_limit import RateLimitMiddleware

configure_logging(settings.log_level)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Aparca València API",
    version="0.1.0",
    description=(
        "Localización municipal de aparcamiento no regulado. "
        "La disponibilidad de plazas no está confirmada."
    ),
    default_response_class=ORJSONResponse,
    docs_url="/docs",
    redoc_url="/redoc",
)
app.add_middleware(RateLimitMiddleware, requests_per_minute=settings.rate_limit_per_minute)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=False,
    allow_methods=["GET", "OPTIONS"],
    allow_headers=["Accept", "Content-Type"],
)
app.include_router(router)


def problem(
    request: Request, status_code: int, title: str, detail: str, code: str
) -> ORJSONResponse:
    return ORJSONResponse(
        status_code=status_code,
        content={
            "type": "about:blank",
            "title": title,
            "status": status_code,
            "detail": detail,
            "instance": request.url.path,
            "code": code,
        },
    )


@app.exception_handler(RequestValidationError)
async def validation_error(request: Request, exc: RequestValidationError) -> ORJSONResponse:
    return problem(request, 422, "Solicitud inválida", str(exc.errors()), "validation_error")


@app.exception_handler(HTTPException)
async def http_error(request: Request, exc: HTTPException) -> ORJSONResponse:
    return problem(request, exc.status_code, "Error HTTP", str(exc.detail), "http_error")


@app.exception_handler(httpx.HTTPError)
async def provider_error(request: Request, exc: httpx.HTTPError) -> ORJSONResponse:
    logger.warning("External provider error", exc_info=exc)
    return problem(
        request,
        503,
        "Proveedor temporalmente no disponible",
        "No se ha podido consultar el proveedor externo.",
        "provider_unavailable",
    )


@app.exception_handler(SQLAlchemyError)
async def database_error(request: Request, exc: SQLAlchemyError) -> ORJSONResponse:
    logger.error("Database error", exc_info=exc)
    return problem(
        request,
        503,
        "Base de datos no disponible",
        "El servicio de datos no está disponible temporalmente.",
        "database_unavailable",
    )
