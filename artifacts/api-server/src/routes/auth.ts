import { Router } from "express";
import { queryOne } from "../lib/db";
import { logger } from "../lib/logger";

const router = Router();

/**
 * POST /api/auth/resolve-identifier
 *
 * Resolves a username (handle) or phone number to the auth email
 * so the client can sign in with signInWithPassword({ email, password }).
 *
 * We intentionally return a generic 404 to avoid leaking user enumeration.
 */
router.post("/auth/resolve-identifier", async (req, res) => {
  try {
    const { identifier } = req.body as { identifier?: string };
    if (!identifier || typeof identifier !== "string") {
      return res.status(400).json({ error: "identifier is required" });
    }

    const raw = identifier.trim();
    if (!raw) return res.status(400).json({ error: "identifier is required" });

    const digitsOnly = raw.replace(/[\s\-().]/g, "");
    const isPhone = raw.startsWith("+") || /^\d{7,15}$/.test(digitsOnly);

    let userId: string | null = null;

    if (isPhone) {
      const normalized = raw.startsWith("+") ? raw.replace(/[^\d+]/g, "") : `+${digitsOnly}`;
      const alt = normalized.replace(/^\+/, "");
      const profile = await queryOne<{ id: string }>(
        `SELECT id FROM public.profiles WHERE phone_number = $1 OR phone_number = $2 LIMIT 1`,
        [normalized, alt],
      );
      userId = profile?.id ?? null;
    } else {
      const handle = raw.replace(/^@/, "").toLowerCase();
      const profile = await queryOne<{ id: string }>(
        `SELECT id FROM public.profiles WHERE handle = $1 LIMIT 1`,
        [handle],
      );
      userId = profile?.id ?? null;
    }

    if (!userId) {
      return res.status(404).json({ error: "No account found with that identifier" });
    }

    // Look up email from auth.users
    const authUser = await queryOne<{ email: string }>(
      `SELECT email FROM auth.users WHERE id = $1 LIMIT 1`,
      [userId],
    );
    if (!authUser?.email) {
      logger.warn({ userId }, "resolve-identifier: no email in auth.users");
      return res.status(404).json({ error: "No account found with that identifier" });
    }

    return res.json({ email: authUser.email });
  } catch (err) {
    logger.error({ err }, "resolve-identifier: unexpected error");
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
