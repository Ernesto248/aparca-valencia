# Fuentes de datos

## Aparcamiento no regulado

- Ajuntament de València, Geoportal, capa ArcGIS 197.
- Campos observados: `gid`, `calle`, `tipocalle`; geometría de línea en EPSG:25830.
- El servicio limita respuestas a 2.000 registros. El importador obtiene todos los OID y solicita lotes de 1.000 transformados a EPSG:4326.
- Licencia publicada: CC BY 4.0. Debe mantenerse la atribución visible.

Las geometrías observadas son muy pequeñas y cerradas. Se conservan sin afirmar que cada una equivalga a una plaza utilizable. Las zonas agrupadas son una ayuda de presentación y se pueden reconstruir.

## Predicción regulada

Capas 254, 253, 252 y 4 para horizontes 1, 6, 12 y 24 horas. El adaptador es independiente, no mezcla datos con el inventario no regulado y permanece desactivado por defecto.

## OpenStreetMap y Protomaps

- La cartografía base y Nominatim derivan de OpenStreetMap bajo ODbL.
- Protomaps Basemap se distribuye como Produced Work; se conserva atribución a ambos proyectos.
- Cobertura inicial: bbox `-0.60,39.25,-0.15,39.70`.
