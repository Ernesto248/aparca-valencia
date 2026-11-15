# Aparca València — tareas verificables

## Base del proyecto

- [x] Crear monorepositorio pnpm con frontend, API, infraestructura y documentación.
- [x] Añadir configuración de entorno sin secretos y licencia MIT.
- [ ] Instalar Docker Desktop y verificar `docker compose version`.

## Datos y backend

- [x] Modelar geometrías municipales crudas, zonas derivadas y ejecuciones de importación.
- [x] Implementar importación ArcGIS por OID con reintentos, validación y staging transaccional.
- [x] Implementar agrupación espacial y motor heurístico determinista.
- [x] Publicar API v1, Problem Details y OpenAPI.
- [x] Añadir adaptador regulado detrás de feature flag.
- [ ] Ejecutar migraciones y pruebas sobre PostGIS real.
- [ ] Ejecutar una importación completa y conciliar el recuento municipal.

## Frontend

- [x] Implementar mapa MapLibre/PMTiles, búsqueda, selección manual y ubicación actual.
- [x] Implementar recomendaciones, detalle, estados de carga/error/sin cobertura y responsive.
- [x] Añadir aviso, atribuciones, privacidad, noindex y Vercel Analytics.
- [x] Generar tipos TypeScript desde OpenAPI.
- [ ] Validar visualmente móvil, tablet y escritorio.

## Calidad y publicación

- [x] Añadir pruebas unitarias, integración, frontend y E2E.
- [x] Añadir CI sin secretos y flujo de release documentado.
- [ ] Crear y publicar `Ernesto248/aparca-valencia`.
- [ ] Desplegar el stack aislado en Hostinger tras verificar la red Traefik.
- [ ] Reautenticar Vercel, crear preview, ejecutar E2E y promover el build validado.
- [ ] Verificar salud, logs, copias y sincronizaciones programadas.
