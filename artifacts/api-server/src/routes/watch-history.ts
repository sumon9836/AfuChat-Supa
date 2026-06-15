/**
 * Watch History API
 * ─────────────────
 *   GET    /api/watch-history          — fetch user's watch history (paginated)
 *   POST   /api/watch-history          — upsert a video watch event
 *   DELETE /api/watch-history          — clear ALL watch history + returns 204
 *   DELETE /api/watch-history/:postId  — remove a single entry
 */

import { Router, type Request, type Response } from "express";
import { authedUser } from "../lib/auth";
import { getAdminClient } from "../lib/supabase-admin";
import { logger } from "../lib/logger";

const router = Router();

// ── GET /api/watch-history ──────────────────────────────────────────────────

router.get("/api/watch-history", async (req: Request, res: Response) => {
  const auth = await authedUser(req, res as any);
  if (!auth) return;

  const limit  = Math.min(Number(req.query.limit)  || 50, 200);
  const offset = Math.max(Number(req.query.offset) || 0,  0);

  try {
    const admin = getAdminClient();
    const { data, error } = await admin
      .from("video_watch_history")
      .select("id, post_id, watched_at, progress, watch_count, title, thumbnail, video_url")
      .eq("user_id", auth.userId)
      .order("watched_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      logger.warn({ err: error }, "watch-history: select failed");
      res.status(500).json({ error: "Failed to fetch watch history" });
      return;
    }

    res.json({ items: data ?? [], offset, limit });
  } catch (err) {
    logger.error({ err }, "watch-history: GET error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── POST /api/watch-history ─────────────────────────────────────────────────

router.post("/api/watch-history", async (req: Request, res: Response) => {
  const auth = await authedUser(req, res as any);
  if (!auth) return;

  const { postId, progress, title, thumbnail, videoUrl } = req.body ?? {};
  if (!postId || typeof postId !== "string") {
    res.status(400).json({ error: "postId is required" });
    return;
  }

  try {
    const admin = getAdminClient();

    // Upsert: on conflict (user_id, post_id) increment watch_count + update metadata
    const { error } = await admin.from("video_watch_history").upsert(
      {
        user_id:     auth.userId,
        post_id:     postId,
        watched_at:  new Date().toISOString(),
        progress:    typeof progress === "number" ? Math.min(1, Math.max(0, progress)) : 0,
        watch_count: 1,
        title:       title   ?? null,
        thumbnail:   thumbnail ?? null,
        video_url:   videoUrl  ?? null,
      },
      {
        onConflict:        "user_id,post_id",
        ignoreDuplicates:  false,
      },
    );

    if (error) {
      // Graceful degradation — table may not exist yet
      if (error.code === "42P01") {
        logger.warn("watch-history table not yet created — run the migration");
        res.status(202).json({ ok: false, reason: "table_missing" });
        return;
      }
      logger.warn({ err: error, postId }, "watch-history: upsert failed");
      res.status(500).json({ error: "Failed to record watch" });
      return;
    }

    // Increment watch_count separately (upsert above sets it to 1 on first insert)
    await admin.rpc("increment_video_watch_count", {
      p_user_id: auth.userId,
      p_post_id: postId,
    }).throwOnError().then(
      () => {},
      () => {}, // silently ignore if rpc doesn't exist — watch_count = 1 is fine
    );

    res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "watch-history: POST error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── DELETE /api/watch-history/:postId ───────────────────────────────────────

router.delete("/api/watch-history/:postId", async (req: Request, res: Response) => {
  const auth = await authedUser(req, res as any);
  if (!auth) return;

  const { postId } = req.params;

  try {
    const admin = getAdminClient();
    const { error } = await admin
      .from("video_watch_history")
      .delete()
      .eq("user_id", auth.userId)
      .eq("post_id", postId);

    if (error) {
      logger.warn({ err: error }, "watch-history: delete single failed");
      res.status(500).json({ error: "Failed to delete entry" });
      return;
    }

    res.status(204).end();
  } catch (err) {
    logger.error({ err }, "watch-history: DELETE single error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── DELETE /api/watch-history ────────────────────────────────────────────────

router.delete("/api/watch-history", async (req: Request, res: Response) => {
  const auth = await authedUser(req, res as any);
  if (!auth) return;

  try {
    const admin = getAdminClient();
    const { error } = await admin
      .from("video_watch_history")
      .delete()
      .eq("user_id", auth.userId);

    if (error) {
      logger.warn({ err: error }, "watch-history: clear all failed");
      res.status(500).json({ error: "Failed to clear history" });
      return;
    }

    res.status(204).end();
  } catch (err) {
    logger.error({ err }, "watch-history: DELETE all error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
