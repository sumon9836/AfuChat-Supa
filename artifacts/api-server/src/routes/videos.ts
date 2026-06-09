/**
 * Video pipeline endpoints
 * ────────────────────────
 *   POST /api/videos                      — register a freshly uploaded source
 *   GET  /api/videos/:id                  — full asset + renditions (debug/admin)
 *   GET  /api/videos/:id/manifest         — playback manifest for an asset_id
 *   GET  /api/videos/by-post/:postId/manifest
 *                                         — playback manifest looked up by post
 *
 * The manifest endpoint is the only thing clients need at playback time.
 */

import { Router, type Request, type Response } from "express";
import { authedUser as verifyAuth } from "../lib/auth";
import { getAdminClient } from "../lib/supabase-admin";
import { publicUrlFor } from "../lib/videoStorage";
import { RENDITION_HEIGHTS, type Codec } from "../lib/ffmpeg";
import { logger } from "../lib/logger";
import { notifyJobsAvailable } from "../services/videoEncoder";

const router = Router();

// ─── helpers ──────────────────────────────────────────────────────────────

async function authedUser(
  req: Request,
  res: Response,
): Promise<{ userId: string } | null> {
  return verifyAuth(req, res as any);
}

const HEIGHT_PRIORITY: Record<number, number> = { 720: 0, 1080: 5, 360: 10 };

const PRIORITY_BY_CODEC: Record<Codec, number> = {
  h264: 10,
  av1: 50,
};

function planRenditions(sourceHeight: number | null) {
  const heights = RENDITION_HEIGHTS.filter(
    (h) => sourceHeight == null || h <= sourceHeight,
  );
  const finalHeights = heights.length ? heights : [360];

  const plan: Array<{
    codec: Codec;
    height: number;
    priority: number;
  }> = [];
  for (const codec of ["h264", "av1"] as const) {
    for (const height of finalHeights) {
      const heightBoost = HEIGHT_PRIORITY[height] ?? 20;
      plan.push({
        codec,
        height,
        priority: PRIORITY_BY_CODEC[codec] + heightBoost,
      });
    }
  }
  return plan;
}

function mimeFor(codec: Codec, container: string): string {
  if (container === "mp4") {
    return codec === "av1"
      ? 'video/mp4; codecs="av01.0.05M.08"'
      : 'video/mp4; codecs="avc1.4d401f, mp4a.40.2"';
  }
  if (container === "webm") return "video/webm";
  if (container === "hls") return "application/vnd.apple.mpegurl";
  if (container === "dash") return "application/dash+xml";
  return "video/mp4";
}

// ─── POST /api/videos ─────────────────────────────────────────────────────

interface RegisterBody {
  source_path: string;
  post_id?: string | null;
  duration?: number | null;
  width?: number | null;
  height?: number | null;
  source_size_bytes?: number | null;
  source_mime?: string | null;
}

router.post("/videos", async (req: Request, res: Response) => {
  try {
    const auth = await authedUser(req, res);
    if (!auth) return;

    const body = (req.body || {}) as RegisterBody;

    if (!body.source_path || typeof body.source_path !== "string") {
      return res.status(400).json({ error: "source_path is required" });
    }
    if (!body.source_path.startsWith(`${auth.userId}/`)) {
      return res.status(403).json({ error: "source_path is not owned by caller" });
    }

    const supabase = getAdminClient();

    const { data: assetData, error: assetErr } = await supabase
      .from("video_assets")
      .insert({
        owner_id: auth.userId,
        post_id: body.post_id ?? null,
        source_path: body.source_path,
        source_size_bytes: body.source_size_bytes ?? null,
        source_mime: body.source_mime ?? null,
        duration_seconds: body.duration ?? null,
        width: body.width ?? null,
        height: body.height ?? null,
        status: "pending",
      })
      .select("id")
      .single();

    if (assetErr || !assetData) {
      logger.error({ err: assetErr }, "video_assets insert failed");
      return res.status(500).json({ error: "insert failed" });
    }
    const assetId = assetData.id;

    const plan = planRenditions(body.height ?? null);
    const renditions: Array<{ id: string; codec: string; height: number }> = [];

    for (const p of plan) {
      const { data: rData, error: rErr } = await supabase
        .from("video_renditions")
        .insert({ asset_id: assetId, codec: p.codec, container: "mp4", height: p.height, status: "pending" })
        .select("id")
        .single();
      if (!rErr && rData) {
        renditions.push({ id: rData.id, codec: p.codec, height: p.height });
      }
    }

    for (const r of renditions) {
      await supabase.from("video_jobs").insert({
        asset_id: assetId,
        rendition_id: r.id,
        codec: r.codec,
        height: r.height,
        priority: PRIORITY_BY_CODEC[r.codec as Codec] + (HEIGHT_PRIORITY[r.height] ?? 20),
        status: "queued",
      });
    }

    if (body.post_id) {
      await supabase
        .from("posts")
        .update({ video_asset_id: assetId })
        .eq("id", body.post_id)
        .eq("author_id", auth.userId);
    }

    notifyJobsAvailable();

    return res.status(201).json({ id: assetId, status: "pending", planned_renditions: plan.length });
  } catch (e) {
    logger.error({ err: e }, "POST /videos failed");
    return res.status(500).json({ error: "Internal error" });
  }
});

// ─── manifest helpers ─────────────────────────────────────────────────────

interface AssetRow {
  id: string;
  status: string;
  duration_seconds: number | null;
  width: number | null;
  height: number | null;
  poster_path: string | null;
  source_path: string;
}
interface RenditionRow {
  codec: string;
  container: string;
  height: number;
  width: number | null;
  bitrate_kbps: number | null;
  storage_path: string | null;
  status: string;
}

const CODEC_ORDER: Record<string, number> = { av1: 0, h264: 1 };

async function loadAssetWithRenditions(
  assetId: string,
): Promise<{ asset: AssetRow; renditions: RenditionRow[] } | null> {
  const supabase = getAdminClient();

  const { data: asset, error: assetErr } = await supabase
    .from("video_assets")
    .select("id, status, duration_seconds, width, height, poster_path, source_path")
    .eq("id", assetId)
    .limit(1)
    .single();

  if (assetErr || !asset) return null;

  const { data: renditions } = await supabase
    .from("video_renditions")
    .select("codec, container, height, width, bitrate_kbps, storage_path, status")
    .eq("asset_id", assetId);

  return { asset: asset as AssetRow, renditions: (renditions ?? []) as RenditionRow[] };
}

function buildManifest(
  asset: AssetRow,
  renditions: RenditionRow[],
): Record<string, unknown> {
  const sources = renditions
    .filter((r) => r.status === "ready" && r.storage_path)
    .sort((a, b) => {
      const codecA = CODEC_ORDER[a.codec] ?? 9;
      const codecB = CODEC_ORDER[b.codec] ?? 9;
      if (codecA !== codecB) return codecA - codecB;
      return b.height - a.height;
    })
    .map((r) => ({
      codec: r.codec,
      container: r.container,
      height: r.height,
      width: r.width,
      bitrate_kbps: r.bitrate_kbps,
      mime: mimeFor(r.codec as Codec, r.container),
      url: publicUrlFor(r.storage_path!),
    }));

  return {
    id: asset.id,
    status: asset.status,
    duration: asset.duration_seconds,
    width: asset.width,
    height: asset.height,
    poster: asset.poster_path ? publicUrlFor(asset.poster_path) : null,
    fallback_url: publicUrlFor(asset.source_path),
    sources,
  };
}

// ─── GET /api/videos/:id ──────────────────────────────────────────────────

router.get("/videos/:id", async (req, res) => {
  const loaded = await loadAssetWithRenditions(req.params.id);
  if (!loaded) return res.status(404).json({ error: "Not found" });
  return res.json({ asset: loaded.asset, renditions: loaded.renditions });
});

// ─── GET /api/videos/:id/manifest ─────────────────────────────────────────

router.get("/videos/:id/manifest", async (req, res) => {
  const loaded = await loadAssetWithRenditions(req.params.id);
  if (!loaded) return res.status(404).json({ error: "Not found" });
  return res.json(buildManifest(loaded.asset, loaded.renditions));
});

// ─── GET /api/videos/by-post/:postId/manifest ─────────────────────────────

router.get("/videos/by-post/:postId/manifest", async (req, res) => {
  const supabase = getAdminClient();
  const { data: post, error } = await supabase
    .from("posts")
    .select("video_asset_id")
    .eq("id", req.params.postId)
    .limit(1)
    .single();

  if (error || !post) return res.status(404).json({ error: "Not found" });
  if (!post.video_asset_id) return res.status(404).json({ error: "No video asset for post" });

  const loaded = await loadAssetWithRenditions(post.video_asset_id);
  if (!loaded) return res.status(404).json({ error: "Not found" });
  return res.json(buildManifest(loaded.asset, loaded.renditions));
});

export default router;
