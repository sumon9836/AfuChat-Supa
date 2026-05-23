#!/usr/bin/env bash
set -e
echo "[post-merge] Installing dependencies..."
pnpm install --frozen-lockfile 2>&1 || pnpm install 2>&1
echo "[post-merge] Building API server..."
cd artifacts/api-server && pnpm run build
echo "[post-merge] Done."
