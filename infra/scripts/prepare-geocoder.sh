#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
OSM_DIR="$ROOT_DIR/data/osm"
mkdir -p "$OSM_DIR"

REGION_PBF="$OSM_DIR/valencia-community-latest.osm.pbf"
REGION_DOWNLOAD="$REGION_PBF.download"
VALENCIA_PBF="$OSM_DIR/valencia.osm.pbf"
VALENCIA_NEXT="$OSM_DIR/valencia.osm.pbf.next"
if [[ ! -s "$REGION_PBF" ]]; then
  curl --fail --location --retry 3 \
    https://download.geofabrik.de/europe/spain/valencia-latest.osm.pbf \
    --output "$REGION_DOWNLOAD"
  mv "$REGION_DOWNLOAD" "$REGION_PBF"
else
  echo "Reusing $REGION_PBF"
fi

rm -f "$VALENCIA_NEXT"
NOMINATIM_MEMORY_LIMIT=4g docker compose run --rm --user 0:0 --entrypoint osmium nominatim extract \
  --bbox=-0.60,39.25,-0.15,39.70 \
  --strategy=complete_ways \
  --overwrite \
  /data/valencia-community-latest.osm.pbf \
  --output=/data/valencia.osm.pbf.next

test -s "$VALENCIA_NEXT"
mv "$VALENCIA_NEXT" "$VALENCIA_PBF"
rm -f "$REGION_PBF"
echo "Created $VALENCIA_PBF"
