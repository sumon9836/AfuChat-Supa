/**
 * Direct PostgreSQL client for the API server.
 * Connects to Supabase's PostgreSQL database via SUPABASE_DB_URL.
 * Used by server-side services (videoEncoder, storiesCleanup, realtimeWatcher, etc.)
 * that need direct SQL access beyond what the Supabase JS client provides.
 */

import pg from "pg";
import { logger } from "./logger";

const { Pool } = pg;

let pool: pg.Pool | null = null;

export function getDb(): pg.Pool {
  if (!pool) {
    const connectionString = process.env.SUPABASE_DB_URL;
    if (!connectionString) {
      throw new Error(
        "SUPABASE_DB_URL is not configured. " +
        "Add it to the public.app_settings table in Supabase " +
        "(key: SUPABASE_DB_URL, value: your Session Pooler connection string). " +
        "The bootstrap process will load it automatically on next server restart."
      );
    }
    // Determine SSL settings. The Supabase Session Pooler uses a self-signed
    // certificate chain, so we enable SSL but skip cert verification.
    // Never override if sslmode=disable is explicitly requested.
    const sslDisabled = connectionString.includes("sslmode=disable");
    pool = new Pool({
      connectionString,
      ssl: sslDisabled ? false : { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
    pool.on("error", (err) => {
      logger.error({ err }, "pg pool error");
    });
  }
  return pool;
}

/** Run a single query and return rows */
export async function query<T = Record<string, unknown>>(
  sql: string,
  params?: unknown[],
): Promise<T[]> {
  const db = getDb();
  const result = await db.query(sql, params);
  return result.rows as T[];
}

/** Run a single query and return the first row or null */
export async function queryOne<T = Record<string, unknown>>(
  sql: string,
  params?: unknown[],
): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows[0] ?? null;
}

/** Check if DB is reachable */
export async function checkDb(): Promise<{ ok: boolean; latency_ms: number }> {
  const start = Date.now();
  try {
    await query("SELECT 1");
    return { ok: true, latency_ms: Date.now() - start };
  } catch {
    return { ok: false, latency_ms: Date.now() - start };
  }
}
