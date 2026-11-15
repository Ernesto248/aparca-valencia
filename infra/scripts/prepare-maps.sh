#!/usr/bin/env bash
set -euo pipefail

: "${PROTOMAPS_SOURCE_URL:?Set PROTOMAPS_SOURCE_URL to a current official .pmtiles build}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
MAP_DIR="$ROOT_DIR/data/maps"
mkdir -p "$MAP_DIR"

if ! command -v pmtiles >/dev/null 2>&1; then
  echo "Install the pmtiles CLI from https://github.com/protomaps/go-pmtiles/releases" >&2
  exit 1
fi

pmtiles extract "$PROTOMAPS_SOURCE_URL" "$MAP_DIR/valencia.pmtiles" \
  --bbox=-0.60,39.25,-0.15,39.70 --maxzoom=15

ASSET_TMP="$(mktemp -d)"
trap 'rm -rf "$ASSET_TMP"' EXIT
curl --fail --location \
  https://github.com/protomaps/basemaps-assets/archive/refs/heads/main.zip \
  --output "$ASSET_TMP/assets.zip"
unzip -q "$ASSET_TMP/assets.zip" -d "$ASSET_TMP"
cp -R "$ASSET_TMP"/basemaps-assets-main/fonts "$MAP_DIR"/
mkdir -p "$MAP_DIR/sprites"
cp -R "$ASSET_TMP"/basemaps-assets-main/sprites/v4/* "$MAP_DIR/sprites"/

echo "Prepared map assets in $MAP_DIR"
