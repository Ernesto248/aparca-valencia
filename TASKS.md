# Aparca València — tareas verificables

## Base del proyecto

- [x] Crear monorepositorio pnpm con frontend, API, infraestructura y documentación.
- [x] Añadir configuración de entorno sin secretos y licencia MIT.
- [x] Instalar Docker Desktop y verificar Docker 29.9.3 / Compose 5.7.0.

## Datos y backend

- [x] Modelar geometrías municipales crudas, zonas derivadas y ejecuciones de importación.
- [x] Implementar importación ArcGIS por OID con reintentos, validación y staging transaccional.
- [x] Implementar agrupación espacial y motor heurístico determinista.
- [x] Publicar API v1, Problem Details y OpenAPI.
- [x] Añadir adaptador regulado detrás de feature flag.
- [x] Ejecutar migraciones y pruebas sobre PostGIS real en CI y en el VPS.
- [x] Conciliar 282.248 registros municipales, sin rechazos, y derivar 6.970 zonas.

## Frontend

- [x] Implementar mapa MapLibre/PMTiles, búsqueda, selección manual y ubicación actual.
- [x] Implementar recomendaciones, detalle, estados de carga/error/sin cobertura y responsive.
- [x] Añadir aviso, atribuciones, privacidad, noindex y Vercel Analytics.
- [x] Generar tipos TypeScript desde OpenAPI.
- [x] Validar visualmente móvil, tablet y escritorio con la cartografía publicada.

## Calidad y publicación

- [x] Añadir pruebas unitarias, integración, frontend y E2E.
- [x] Añadir CI sin secretos y flujo de release documentado.
- [x] Crear y publicar `Ernesto248/aparca-valencia` con licencia MIT.
- [x] Desplegar API, PostGIS, Nominatim y assets en Hostinger mediante la red Traefik existente.
- [x] Validar la sesión de Vercel, ejecutar E2E de escritorio/móvil y promover el build aprobado.
- [x] Verificar salud, logs, backup restaurable y cron diario/mensual.
