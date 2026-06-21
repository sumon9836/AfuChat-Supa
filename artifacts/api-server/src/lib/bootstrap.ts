/**
 * Server bootstrap — loads ALL secrets from Supabase `public.app_settings`.
 *
 * Architecture rule:
 *   SUPABASE_SERVICE_ROLE_KEY is the ONLY environment variable the server ever needs.
 *   Every other secret (R2 credentials, Pesapal keys, Resend key, OAuth session secret,
 *   Groq/Gemini AI keys, account purge secret, etc.) lives exclusively in the
 *   `public.app_settings` table in Supabase and is injected into process.env here.
 *
 *   To add a secret:
 *     INSERT INTO public.app_settings (key, value) VALUES ('MY_SECRET_KEY', 'value');
 *
 *   Keys currently expected in app_settings:
 *     RESEND_API_KEY            — Resend transactional email
 *     CLOUDFLARE_ACCOUNT_ID     — R2 media storage
 *     CLOUDFLARE_R2_ACCESS_KEY_ID
 *     CLOUDFLARE_R2_SECRET_ACCESS_KEY
 *     R2_BUCKET                 — bucket name (default: afuchat-media)
 *     R2_PUBLIC_BASE_URL        — public CDN base URL for R2 objects
 *     PESAPAL_CONSUMER_KEY      — Pesapal payments
 *     PESAPAL_CONSUMER_SECRET
 *     PESAPAL_IPN_ID
 *     OAUTH_SESSION_SECRET      — cookie signing for OAuth consent flow
 *     GROQ_API_KEY              — AI auto-responder (optional)
 *     GOOGLE_AI_KEY             — Gemini fallback for AI (optional)
 *     ACCOUNT_PURGE_SECRET      — admin key for account purge endpoint
 *     PUSH_WEBHOOK_TOKEN        — push notification webhook auth
 *
 * Values already present in process.env always win so local dev can override
 * any row without touching the remote config store.
 */

import { createClient } from "@supabase/supabase-js";
import { logger } from "./logger";
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from "./constants";

export interface BootstrapResult {
  loaded: number;
  skipped: number;
  source: "supabase" | "env-only";
  error?: string;
}

export async function loadAppSettings(): Promise<BootstrapResult> {
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    logger.warn(
      "bootstrap: SUPABASE_SERVICE_ROLE_KEY not set — cannot load app_settings from Supabase. " +
        "All runtime config must be provided via environment variables.",
    );
    return { loaded: 0, skipped: 0, source: "env-only", error: "Missing service role key" };
  }

  try {
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data, error } = await admin
      .from("app_settings")
      .select("key, value");

    if (error) {
      logger.warn(
        { code: error.code, message: error.message },
        "bootstrap: failed to fetch app_settings — falling back to env vars only",
      );
      return { loaded: 0, skipped: 0, source: "env-only", error: error.message };
    }

    if (!data || data.length === 0) {
      logger.info("bootstrap: app_settings table is empty — relying on env vars");
      return { loaded: 0, skipped: 0, source: "supabase" };
    }

    let loaded = 0;
    let skipped = 0;

    for (const row of data as { key: string; value: string }[]) {
      if (!row.key || row.value === null || row.value === undefined) continue;

      if (process.env[row.key] && process.env[row.key] !== "") {
        // Env var already set — local override wins
        skipped++;
      } else {
        process.env[row.key] = row.value;
        loaded++;
      }
    }

    logger.info(
      { loaded, skipped, total: data.length },
      "bootstrap: app_settings loaded from Supabase",
    );

    return { loaded, skipped, source: "supabase" };
  } catch (err: any) {
    logger.error(
      { err: err?.message },
      "bootstrap: unexpected error fetching app_settings — falling back to env vars",
    );
    return {
      loaded: 0,
      skipped: 0,
      source: "env-only",
      error: err?.message || "Unknown error",
    };
  }
}
