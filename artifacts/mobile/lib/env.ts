/**
 * env.ts — single source of truth for all public runtime constants.
 *
 * The website works with ZERO environment variables set.
 * EXPO_PUBLIC_* vars are still read first so local dev overrides keep working,
 * but every constant has a hardcoded production fallback so no build-time env
 * injection is needed on Vercel or any other host.
 *
 * Rules:
 *  - Never add secrets here (no service-role keys, no private tokens).
 *  - Supabase URL + anon key are intentionally public (Supabase RLS guards data).
 *  - Import from this file; never call process.env.EXPO_PUBLIC_* elsewhere.
 */

export const SUPABASE_URL: string =
  (process.env.EXPO_PUBLIC_SUPABASE_URL ?? "").trim() ||
  "https://rhnsjqqtdzlkvqazfcbg.supabase.co";

export const SUPABASE_ANON_KEY: string =
  (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "").trim() ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJobnNqcXF0ZHpsa3ZxYXpmY2JnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2NzA4NjksImV4cCI6MjA3NzI0Njg2OX0.j8zuszO1K6Apjn-jRiVUyZeqe3Re424xyOho9qDl_oY";

export const APP_DOMAIN: string =
  (process.env.EXPO_PUBLIC_DOMAIN ?? "").trim() || "afuchat.com";

export const APP_ORIGIN: string = `https://${APP_DOMAIN}`;

export const SUPABASE_EDGE_URL: string = `${SUPABASE_URL}/functions/v1`;

/**
 * Base URL for the AfuChat API server.
 * In production: https://afuchat.com  (API is at /api/*)
 * In dev/Replit: set EXPO_PUBLIC_API_URL to your API server URL (e.g. https://your-repl-name-3000.replit.dev)
 */
export const API_URL: string =
  (process.env.EXPO_PUBLIC_API_URL ?? "").trim() || "https://afuchat.com";
