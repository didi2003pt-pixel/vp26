#!/usr/bin/env bash
set -euo pipefail
BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
[[ -d "$BACKUP_DIR" ]] || exit 0
find "$BACKUP_DIR" -type f \
  \( -name 'desafio-volta-*.dump' -o -name 'desafio-volta-*.dump.age' -o -name 'desafio-volta-*.json' -o -name '*.sha256' \) \
  -mtime "+$RETENTION_DAYS" -print -delete
