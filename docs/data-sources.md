# Fuentes de datos

## Aparcamiento no regulado

- Ajuntament de València, Geoportal, capa ArcGIS 197.
- Campos observados: `gid`, `calle`, `tipocalle`; geometría de línea en EPSG:25830.
- El servicio limita respuestas a 2.000 registros. El importador obtiene todos los OID y solicita lotes de 1.000 transformados a EPSG:4326.
- Licencia publicada: CC BY 4.0. Debe mantenerse la atribución visible.

Las geometrías observadas son muy pequeñas y cerradas. Se conservan sin afirmar que cada una equivalga a una plaza utilizable. Las zonas agrupadas son una ayuda de presentación y se pueden reconstruir.

## Predicción regulada

Capas 254, 253, 252 y 4 para horizontes 1, 6, 12 y 24 horas. Cada capa contiene 257 tramos; actualmente 255 tienen un porcentaje de ocupación previsto entre 0 y 100 y 2 figuran sin dato. La simbología oficial clasifica la probabilidad de estacionamiento como alta cuando la ocupación es menor de 60%, media entre 60% y 80%, y baja por encima de 80%.

El importador actualiza las cuatro capas de forma transaccional cada hora. La predicción se muestra solo sobre sus tramos regulados y nunca se extrapola al inventario no regulado.

## OpenStreetMap y Protomaps

- La cartografía base y Nominatim derivan de OpenStreetMap bajo ODbL.
- Protomaps Basemap se distribuye como Produced Work; se conserva atribución a ambos proyectos.
- Cobertura inicial: bbox `-0.60,39.25,-0.15,39.70`.
