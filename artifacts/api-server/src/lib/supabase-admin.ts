/**
 * Supabase admin client — lazy singleton.
 *
 * Uses the service-role key so RLS is bypassed.
 * This is the primary data-access layer for the API server;
 * it connects via HTTPS (PostgREST) so it works from Replit's
 * IPv4-only environment without needing a direct PostgreSQL connection.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from "./constants";

let _admin: SupabaseClient | null = null;

export function getAdminClient(): SupabaseClient {
  if (!_admin) {
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || SUPABASE_SERVICE_ROLE_KEY;
    if (!key) {
      throw new Error(
        "SUPABASE_SERVICE_ROLE_KEY is not configured. " +
        "Set it as a Replit secret (Settings > Secrets).",
      );
    }
    _admin = createClient(SUPABASE_URL, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return _admin;
}
