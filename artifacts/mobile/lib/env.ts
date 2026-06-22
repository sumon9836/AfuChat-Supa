/**
 * env.ts — single source of truth for all public runtime constants.
 *
 * Supports both EXPO_PUBLIC_* (Expo / Replit dev) and NEXT_PUBLIC_* (Vercel)
 * env var prefixes so the same .env works in both places.
 *
 * Rules:
 *  - Never add secrets here (no service-role keys, no private tokens).
 *  - Supabase URL + anon key are intentionally public (Supabase RLS guards data).
 *  - Import from this file; never call process.env directly elsewhere.
 */

const pick = (...candidates: (string | undefined)[]): string =>
  candidates.find((v) => typeof v === "string" && v.trim() !== "")?.trim() ?? "";

export const SUPABASE_URL: string =
  pick(
    process.env.EXPO_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_URL,
  ) || "https://airihsxtauwbwlkhegna.supabase.co";

export const SUPABASE_ANON_KEY: string =
  pick(
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  ) || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpcmloc3h0YXV3Yndsa2hlZ25hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIwNTcwMDQsImV4cCI6MjA5NzYzMzAwNH0.MgF0A7JSA26Dl9zJY_iFJTtGtFB2wXtZwLro8Y94yRc";

export const APP_DOMAIN: string =
  pick(
    process.env.EXPO_PUBLIC_DOMAIN,
    process.env.NEXT_PUBLIC_DOMAIN,
    process.env.VERCEL_URL,
  ) || "afuchat.com";

export const APP_ORIGIN: string = `https://${APP_DOMAIN}`;

export const SUPABASE_EDGE_URL: string = `${SUPABASE_URL}/functions/v1`;
