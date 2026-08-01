#!/usr/bin/env bash
set -euo pipefail
umask 077

backup="${1:-}"
[[ -n "$backup" ]] || { echo "Usage: $0 backup.dump[.age]" >&2; exit 2; }
[[ -f "$backup" ]] || { echo "Backup not found: $backup" >&2; exit 2; }

work="$backup"
temporary=""
cleanup() { [[ -n "$temporary" ]] && rm -f "$temporary"; }
trap cleanup EXIT

if [[ "$backup" == *.age ]]; then
  : "${BACKUP_AGE_IDENTITY_FILE:?BACKUP_AGE_IDENTITY_FILE is required}"
  command -v age >/dev/null || { echo "age is required." >&2; exit 1; }
  temporary="$(mktemp)"
  age -d -i "$BACKUP_AGE_IDENTITY_FILE" -o "$temporary" "$backup"
  work="$temporary"
fi

if [[ -f "${backup}.sha256" ]]; then
  (cd "$(dirname "$backup")" && sha256sum -c "$(basename "${backup}.sha256")")
fi

pg_restore --list "$work" >/dev/null
echo "Backup archive is readable: $backup"
