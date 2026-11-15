# API

La especificación canónica está en `/openapi.json` y la documentación interactiva en `/docs`.

| Endpoint | Propósito |
| --- | --- |
| `GET /api/v1/health` | Vida del proceso, sin dependencias. |
| `GET /api/v1/ready` | Disponibilidad de PostgreSQL. |
| `GET /api/v1/geocode` | Buscar un destino dentro de la cobertura local. |
| `GET /api/v1/parking/nearby` | Zonas derivadas próximas como GeoJSON. |
| `GET /api/v1/parking/features` | Geometrías municipales crudas para un bbox pequeño. |
| `GET /api/v1/parking/recommendations` | Ranking heurístico sin probabilidad de ocupación. |
| `GET /api/v1/parking/segments/{id}` | Detalle de una zona derivada. |
| `GET /api/v1/data/status` | Recuento, sincronización y obsolescencia. |

Los errores siguen Problem Details con `title`, `status`, `detail`, `instance` y `code`.

Radios admitidos: 100–2.000 m. El bbox de detalle no puede superar 0,1 grados por eje. Las recomendaciones se limitan a 50 y las zonas a 500.
