#!/usr/bin/env bash
set -euo pipefail
umask 077

: "${DATABASE_URL:?DATABASE_URL is required}"
backup="${1:-}"
[[ -n "$backup" && -f "$backup" ]] || { echo "Usage: $0 backup.dump[.age]" >&2; exit 2; }
[[ "${RESTORE_CONFIRM:-}" == "RESTORE_DESAFIO_VOLTA" ]] || {
  echo "Set RESTORE_CONFIRM=RESTORE_DESAFIO_VOLTA to continue." >&2
  exit 2
}

work="$backup"
temporary=""
cleanup() { [[ -n "$temporary" ]] && rm -f "$temporary"; }
trap cleanup EXIT

if [[ "$backup" == *.age ]]; then
  : "${BACKUP_AGE_IDENTITY_FILE:?BACKUP_AGE_IDENTITY_FILE is required}"
  temporary="$(mktemp)"
  age -d -i "$BACKUP_AGE_IDENTITY_FILE" -o "$temporary" "$backup"
  work="$temporary"
fi

pg_restore \
  --dbname="$DATABASE_URL" \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  --exit-on-error \
  "$work"

echo "Restore completed. Run migrations and application smoke tests."
