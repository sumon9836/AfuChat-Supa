/**
 * Public constants — single source of truth for the API server.
 *
 * All values below are intentionally hardcoded so the server starts and
 * responds correctly with ZERO environment variables configured.
 *
 * Rules:
 *   - Only non-secret, public values belong here.
 *   - Supabase anon key is public by design (Supabase RLS guards data).
 *   - Secrets (service-role key, Pesapal, R2, Resend, …) MUST stay in env vars.
 */

export const SUPABASE_URL = "https://rhnsjqqtdzlkvqazfcbg.supabase.co";

export const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJobnNqcXF0ZHpsa3ZxYXpmY2JnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2NzA4NjksImV4cCI6MjA3NzI0Njg2OX0.j8zuszO1K6Apjn-jRiVUyZeqe3Re424xyOho9qDl_oY";

export const APP_DOMAIN = "afuchat.com";

export const APP_ORIGIN = `https://${APP_DOMAIN}`;

export const API_ORIGIN = `https://api.${APP_DOMAIN}`;

export const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || "";
