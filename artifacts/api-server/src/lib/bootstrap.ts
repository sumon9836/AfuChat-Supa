/**
 * Server bootstrap: validate required settings from process.env before the
 * HTTP listener accepts requests.
 *
 * Settings are read directly from environment variables / Replit secrets.
 * No Supabase fetch is performed at startup — all keys must be supplied via
 * the Replit Secrets panel (or .env in local dev).
 *
 * Env-supplied values always win so local dev can override without touching
 * any remote config store.
 */

import { logger } from "./logger";

const KEYS_WE_CARE_ABOUT = [
  "CLOUDFLARE_ACCOUNT_ID",
  "CLOUDFLARE_R2_ACCESS_KEY_ID",
  "CLOUDFLARE_R2_SECRET_ACCESS_KEY",
  "R2_BUCKET",
  "R2_PUBLIC_BASE_URL",
  "R2_S3_ENDPOINT",
  "PESAPAL_CONSUMER_KEY",
  "PESAPAL_CONSUMER_SECRET",
  "PESAPAL_IPN_ID",
  "PESAPAL_ENV",
];

export interface BootstrapResult {
  loaded: number;
  skipped: number;
  source: "env-only";
  error?: string;
}

export async function loadAppSettings(): Promise<BootstrapResult> {
  const missing = KEYS_WE_CARE_ABOUT.filter(
    (k) => !process.env[k] || process.env[k] === "",
  );

  if (missing.length) {
    logger.warn({ missing }, "bootstrap: some expected settings still missing from env");
  } else {
    logger.info("bootstrap: all expected settings present in env");
  }

  return { loaded: 0, skipped: 0, source: "env-only" };
}
