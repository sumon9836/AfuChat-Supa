#!/usr/bin/env bash
set -e

# ── Vercel web build for AfuChat ─────────────────────────────────────────────
# Builds the Expo web app into artifacts/mobile/dist
#
# Required Vercel env vars (set in Vercel Dashboard → Project → Settings → Env):
#   EXPO_PUBLIC_SUPABASE_URL        — your Supabase project URL
#   EXPO_PUBLIC_SUPABASE_ANON_KEY   — your Supabase anon key
#   EXPO_PUBLIC_API_URL             — your deployed API server URL
#
# Optional:
#   EXPO_PUBLIC_DOMAIN              — your production domain (e.g. afuchat.com)
#                                     defaults to VERCEL_URL for preview deploys

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Resolve public domain: prefer explicit override, fall back to Vercel's own URL
DOMAIN="${EXPO_PUBLIC_DOMAIN:-${VERCEL_URL:-}}"

if [ -n "$DOMAIN" ]; then
  # Strip protocol prefix if someone accidentally included it
  DOMAIN="${DOMAIN#https://}"
  DOMAIN="${DOMAIN#http://}"
  export EXPO_PUBLIC_DOMAIN="$DOMAIN"
fi

echo "▶ AfuChat Vercel web build"
echo "  EXPO_PUBLIC_DOMAIN   = ${EXPO_PUBLIC_DOMAIN:-<not set — relative paths>}"
echo "  EXPO_PUBLIC_API_URL  = ${EXPO_PUBLIC_API_URL:-<not set>}"

cd "$REPO_ROOT/artifacts/mobile"

# Expo SDK 55 web export — outputs to dist/
EXPO_NO_DOTENV=1 \
  node_modules/.bin/expo export \
  --platform web \
  --output-dir dist \
  --clear

echo "✓ Build complete → artifacts/mobile/dist"
