#!/bin/sh
set -eu

if [ ! -f "${OSM_FILE:-/data/valencia.osm.pbf}" ]; then
  echo "Missing OSM extract at ${OSM_FILE:-/data/valencia.osm.pbf}" >&2
  exit 1
fi

until pg_isready -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE"; do
  sleep 2
done

if [ "$(psql -tAc "SELECT to_regclass('public.placex') IS NOT NULL")" != "t" ]; then
  nominatim import --project-dir /srv/nominatim-project \
    --osm-file "${OSM_FILE:-/data/valencia.osm.pbf}" --no-updates
fi

exec gunicorn -b 0.0.0.0:8080 -w 1 --worker-class asgi \
  --worker-connections 100 "nominatim_api.server.falcon.server:run_wsgi()"
