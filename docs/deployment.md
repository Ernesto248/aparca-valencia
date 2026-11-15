# Despliegue

## Preparación

1. Clonar el repositorio en `/opt/aparca-valencia`.
2. Crear `.env` desde `.env.example` con una contraseña PostgreSQL fuerte, orígenes CORS y datos de contacto reales.
3. Confirmar el nombre de la red externa de Traefik y su `certresolver` antes de iniciar servicios.
4. Preparar el extracto OSM con `infra/scripts/prepare-geocoder.sh`.
5. Preparar PMTiles con `PROTOMAPS_SOURCE_URL=<build-oficial> infra/scripts/prepare-maps.sh`.

## Arranque

```bash
docker compose -f compose.yaml -f compose.prod.yaml build
docker compose -f compose.yaml -f compose.prod.yaml run --rm api alembic upgrade head
docker compose -f compose.yaml -f compose.prod.yaml --profile geocoder up -d
docker compose -f compose.yaml -f compose.prod.yaml run --rm api python -m app.cli sync-unregulated
```

Validar `/api/v1/ready`, `/api/v1/data/status`, `/maps/valencia.pmtiles` y los logs antes de conectar Vercel.

## Programación y copias

- Instalar `infra/cron/aparca-valencia.cron` en el crontab del host después de revisar rutas.
- `backup-postgres.sh` genera dumps diarios y elimina los de más de siete días.
- Hostinger aporta una segunda capa semanal. Nominatim y PMTiles se reconstruyen desde sus fuentes.

## Actualización y rollback

1. Construir imágenes con una etiqueta de commit.
2. Ejecutar migraciones compatibles hacia atrás.
3. Actualizar API y comprobar `ready`.
4. Crear build Vercel de producción con `--skip-domain`, ejecutar Playwright y promover ese build.
5. Ante un fallo, restaurar la imagen anterior y usar `vercel rollback`; no ejecutar downgrades destructivos de base de datos.
