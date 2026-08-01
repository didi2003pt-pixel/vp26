#!/usr/bin/env bash
set -euo pipefail
umask 077

: "${DATABASE_URL:?DATABASE_URL is required}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
mkdir -p "$BACKUP_DIR"

timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
base="$BACKUP_DIR/desafio-volta-${timestamp}"
archive="${base}.dump"
metadata="${base}.json"

if [[ "${NODE_ENV:-development}" == "production" \
  && -z "${BACKUP_ENCRYPTION_RECIPIENT:-}" \
  && "${ALLOW_UNENCRYPTED_BACKUPS:-false}" != "true" ]]; then
  echo "Production backups must be encrypted. Set BACKUP_ENCRYPTION_RECIPIENT." >&2
  exit 1
fi

pg_dump \
  --dbname="$DATABASE_URL" \
  --format=custom \
  --compress=9 \
  --no-owner \
  --no-privileges \
  --file="$archive"

sha="$(sha256sum "$archive" | awk '{print $1}')"
size="$(stat -c '%s' "$archive")"
encrypted=false
stored="$archive"

if [[ -n "${BACKUP_ENCRYPTION_RECIPIENT:-}" ]]; then
  command -v age >/dev/null || { echo "age is required for encryption." >&2; exit 1; }
  age -r "$BACKUP_ENCRYPTION_RECIPIENT" -o "${archive}.age" "$archive"
  rm -f "$archive"
  stored="${archive}.age"
  encrypted=true
  sha="$(sha256sum "$stored" | awk '{print $1}')"
  size="$(stat -c '%s' "$stored")"
fi

cat > "$metadata" <<JSON
{
  "createdAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "file": "$(basename "$stored")",
  "sha256": "$sha",
  "sizeBytes": $size,
  "encrypted": $encrypted,
  "format": "PostgreSQL custom archive",
  "retentionDays": $RETENTION_DAYS
}
JSON

sha256sum "$stored" > "${stored}.sha256"
echo "$stored"
