#!/usr/bin/env bash
set -e

# ── Vercel web build for AfuChat ─────────────────────────────────────────────
# Builds the Expo web app into artifacts/mobile/dist
#
# Required Vercel env vars (set in Vercel Dashboard → Project → Settings → Env):
#   NEXT_PUBLIC_SUPABASE_URL      — your Supabase project URL
#   NEXT_PUBLIC_SUPABASE_ANON_KEY — your Supabase anon key
#   SUPABASE_SERVICE_ROLE_KEY     — your Supabase service-role key (secret)
#
# The NEXT_PUBLIC_* names are aliased to EXPO_PUBLIC_* automatically below
# so the Expo bundler picks them up without any code changes.

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# ── Alias NEXT_PUBLIC_* → EXPO_PUBLIC_* so Expo bundler picks them up ────────
if [ -n "${NEXT_PUBLIC_SUPABASE_URL:-}" ] && [ -z "${EXPO_PUBLIC_SUPABASE_URL:-}" ]; then
  export EXPO_PUBLIC_SUPABASE_URL="$NEXT_PUBLIC_SUPABASE_URL"
fi
if [ -n "${NEXT_PUBLIC_SUPABASE_ANON_KEY:-}" ] && [ -z "${EXPO_PUBLIC_SUPABASE_ANON_KEY:-}" ]; then
  export EXPO_PUBLIC_SUPABASE_ANON_KEY="$NEXT_PUBLIC_SUPABASE_ANON_KEY"
fi
if [ -n "${NEXT_PUBLIC_DOMAIN:-}" ] && [ -z "${EXPO_PUBLIC_DOMAIN:-}" ]; then
  export EXPO_PUBLIC_DOMAIN="$NEXT_PUBLIC_DOMAIN"
fi

# Resolve public domain: prefer explicit override, fall back to Vercel's own URL
DOMAIN="${EXPO_PUBLIC_DOMAIN:-${VERCEL_URL:-}}"

if [ -n "$DOMAIN" ]; then
  # Strip protocol prefix if someone accidentally included it
  DOMAIN="${DOMAIN#https://}"
  DOMAIN="${DOMAIN#http://}"
  export EXPO_PUBLIC_DOMAIN="$DOMAIN"
fi

echo "▶ AfuChat Vercel web build"
echo "  Supabase URL = ${EXPO_PUBLIC_SUPABASE_URL:-<not set — using built-in default>}"
echo "  Domain       = ${EXPO_PUBLIC_DOMAIN:-<not set — relative paths>}"

cd "$REPO_ROOT/artifacts/mobile"

# Expo SDK 55 web export — outputs to dist/
EXPO_NO_DOTENV=1 \
  node_modules/.bin/expo export \
  --platform web \
  --output-dir dist \
  --clear

echo "✓ Build complete → artifacts/mobile/dist"
