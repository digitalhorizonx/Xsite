#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/var/backups/xsite}"
DATABASE_URL="${DATABASE_URL:?DATABASE_URL must be set server-side}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"

umask 077
mkdir -p "$BACKUP_DIR"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
FILE="$BACKUP_DIR/xsite-$STAMP.dump"

pg_dump --format=custom --no-owner --no-acl --dbname="$DATABASE_URL" --file="$FILE"
find "$BACKUP_DIR" -type f -name 'xsite-*.dump' -mtime "+$RETENTION_DAYS" -delete
printf 'Backup created: %s\n' "$FILE"
