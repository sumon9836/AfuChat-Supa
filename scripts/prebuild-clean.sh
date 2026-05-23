#!/usr/bin/env bash
# prebuild-clean.sh — Remove stale .git/index.lock before an EAS build starts.
# Safe to run when no lock file is present (idempotent).

set -euo pipefail

GIT_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || echo "")"

if [ -z "$GIT_ROOT" ]; then
  echo "[prebuild-clean] WARNING: could not determine git root; skipping lock-file check."
  exit 0
fi

LOCK_FILE="$GIT_ROOT/.git/index.lock"

if [ -f "$LOCK_FILE" ]; then
  SIZE=$(wc -c < "$LOCK_FILE")
  if [ "$SIZE" -eq 0 ]; then
    echo "[prebuild-clean] Removing stale (0-byte) $LOCK_FILE"
    rm -f "$LOCK_FILE"
    echo "[prebuild-clean] Done."
  else
    echo "[prebuild-clean] $LOCK_FILE exists but is non-empty ($SIZE bytes); leaving it alone."
  fi
else
  echo "[prebuild-clean] No lock file found at $LOCK_FILE; nothing to do."
fi
