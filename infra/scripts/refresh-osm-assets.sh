#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

dotenv_value() {
  sed -n "s/^$1=//p" "$ROOT_DIR/.env" | tail -n 1
}
POSTGRES_USER="${POSTGRES_USER:-$(dotenv_value POSTGRES_USER)}"
: "${POSTGRES_USER:?POSTGRES_USER is required}"

BUILD_DATE="${PROTOMAPS_BUILD_DATE:-$(date -u -d yesterday +%Y%m%d)}"
PROTOMAPS_SOURCE_URL="https://build.protomaps.com/${BUILD_DATE}.pmtiles" \
  "$ROOT_DIR/infra/scripts/prepare-maps.sh"

COMPOSE=(docker compose -f compose.yaml -f compose.prod.yaml)
"${COMPOSE[@]}" --profile geocoder stop nominatim

restart_existing_geocoder() {
  "${COMPOSE[@]}" --profile geocoder up -d nominatim >/dev/null 2>&1 || true
}
trap restart_existing_geocoder ERR

"$ROOT_DIR/infra/scripts/prepare-geocoder.sh"
"${COMPOSE[@]}" exec -T db dropdb -U "$POSTGRES_USER" --force nominatim
"${COMPOSE[@]}" --profile geocoder up -d --build nominatim
trap - ERR

echo "Refreshed OSM assets from Protomaps build $BUILD_DATE"
