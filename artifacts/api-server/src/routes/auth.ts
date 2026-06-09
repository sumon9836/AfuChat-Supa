import { Router } from "express";
import { getAdminClient } from "../lib/supabase-admin";
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
    const supabase = getAdminClient();

    if (isPhone) {
      const normalized = raw.startsWith("+") ? raw.replace(/[^\d+]/g, "") : `+${digitsOnly}`;
      const alt = normalized.replace(/^\+/, "");
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .or(`phone_number.eq.${normalized},phone_number.eq.${alt}`)
        .limit(1)
        .single();
      userId = profile?.id ?? null;
    } else {
      const handle = raw.replace(/^@/, "").toLowerCase();
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("handle", handle)
        .limit(1)
        .single();
      userId = profile?.id ?? null;
    }

    if (!userId) {
      return res.status(404).json({ error: "No account found with that identifier" });
    }

    const { data: { user: authUser }, error: authErr } = await supabase.auth.admin.getUserById(userId);
    if (authErr || !authUser?.email) {
      logger.warn({ userId, err: authErr }, "resolve-identifier: no email in auth.users");
      return res.status(404).json({ error: "No account found with that identifier" });
    }

    return res.json({ email: authUser.email });
  } catch (err) {
    logger.error({ err }, "resolve-identifier: unexpected error");
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
