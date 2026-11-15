#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
OSM_DIR="$ROOT_DIR/data/osm"
mkdir -p "$OSM_DIR"

SPAIN_PBF="$OSM_DIR/spain-latest.osm.pbf"
VALENCIA_PBF="$OSM_DIR/valencia.osm.pbf"
curl --fail --location --continue-at - \
  https://download.geofabrik.de/europe/spain-latest.osm.pbf \
  --output "$SPAIN_PBF"

docker compose run --rm --entrypoint osmium nominatim extract \
  --bbox=-0.60,39.25,-0.15,39.70 \
  --strategy=complete_ways \
  --overwrite \
  /data/spain-latest.osm.pbf \
  --output=/data/valencia.osm.pbf

test -s "$VALENCIA_PBF"
echo "Created $VALENCIA_PBF"
