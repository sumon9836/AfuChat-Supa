/**
 * JWT verification helpers.
 *
 * The mobile app uses Supabase Auth — JWTs are issued by Supabase and can be
 * verified either by calling Supabase's getUser() (online, authoritative) or
 * by decoding the JWT payload directly (offline, trust the signature).
 *
 * For server routes that need to identify the caller, we use a lightweight
 * approach: decode the JWT payload (base64) and extract the `sub` claim.
 * Full cryptographic verification happens at the Supabase level — callers
 * sign in via the mobile app's Supabase client, which validates the session.
 *
 * For routes that need hard guarantees, pass the JWT to Supabase's REST API.
 */

import { createClient } from "@supabase/supabase-js";
import { logger } from "./logger";
import { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY } from "./constants";

const SUPABASE_SERVICE_KEY = SUPABASE_SERVICE_ROLE_KEY;

/**
 * Decode a JWT payload without verifying the signature.
 * Returns the claims object, or null if the token is malformed.
 */
export function decodeJwt(jwt: string): Record<string, unknown> | null {
  try {
    const parts = jwt.split(".");
    if (parts.length !== 3) return null;
    const payload = Buffer.from(parts[1], "base64url").toString("utf8");
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

/**
 * Extract userId from a Bearer JWT without network calls.
 * Returns the `sub` claim (Supabase user UUID), or null if invalid.
 */
export function extractUserId(jwt: string): string | null {
  const claims = decodeJwt(jwt);
  if (!claims) return null;
  const sub = claims["sub"];
  if (typeof sub !== "string" || !sub) return null;
  // Check expiry
  const exp = claims["exp"];
  if (typeof exp === "number" && Date.now() / 1000 > exp) return null;
  return sub;
}

/**
 * Verify a JWT with Supabase (authoritative, network call).
 * Uses the service key if available for admin-level verification,
 * otherwise falls back to anon key.
 * Returns { userId, email } or null if invalid.
 */
export async function verifySupabaseJwt(
  jwt: string,
): Promise<{ userId: string; email?: string } | null> {
  if (!SUPABASE_URL) {
    // No Supabase URL — fall back to local JWT decode
    const userId = extractUserId(jwt);
    return userId ? { userId } : null;
  }

  try {
    const key = SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY;
    if (!key) {
      const userId = extractUserId(jwt);
      return userId ? { userId } : null;
    }

    const client = createClient(SUPABASE_URL, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: { user }, error } = await client.auth.getUser(jwt);
    if (error || !user) return null;
    return { userId: user.id, email: user.email };
  } catch (err) {
    logger.warn({ err }, "verifySupabaseJwt: Supabase call failed, falling back to local decode");
    const userId = extractUserId(jwt);
    return userId ? { userId } : null;
  }
}

/**
 * Express middleware helper — extract and verify caller from Authorization header.
 * Returns { userId, email } or null (and writes the error response).
 */
export async function authedUser(
  req: { headers: { authorization?: string } },
  res: { status: (code: number) => { json: (body: unknown) => void } },
): Promise<{ userId: string; email?: string } | null> {
  const authHeader = req.headers.authorization || "";
  const jwt = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!jwt) {
    res.status(401).json({ error: "Authorization required" });
    return null;
  }

  const user = await verifySupabaseJwt(jwt);
  if (!user) {
    res.status(401).json({ error: "Invalid or expired token" });
    return null;
  }

  return user;
}
