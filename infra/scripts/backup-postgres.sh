#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BACKUP_DIR="${BACKUP_DIR:-$ROOT_DIR/backups/postgres}"
mkdir -p "$BACKUP_DIR"

set -a
source "$ROOT_DIR/.env"
set +a

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
docker compose -f "$ROOT_DIR/compose.yaml" -f "$ROOT_DIR/compose.prod.yaml" \
  exec -T db pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc \
  > "$BACKUP_DIR/aparca-$STAMP.dump"

find "$BACKUP_DIR" -type f -name 'aparca-*.dump' -mtime +7 -delete
