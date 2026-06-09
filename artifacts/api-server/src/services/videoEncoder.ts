/**
 * Video encoder worker
 * ────────────────────
 * Long-running loop that drains the `video_jobs` queue. For each job:
 *
 *   1. Atomically claim it with `claim_video_job(...)`.
 *   2. Download the source video from the `videos` bucket.
 *   3. Run ffmpeg with the codec/height-appropriate settings.
 *   4. Upload the resulting MP4 to the bucket at a deterministic path.
 *   5. Patch `video_renditions` with `status='ready'` + size/bitrate/path.
 *      (A trigger then rolls up `video_assets.status` to 'ready' as soon as
 *      the H.264 baseline is available.)
 *   6. Mark the job 'done'. Failures are retried up to `max_attempts` with
 *      exponential backoff.
 *
 * H.264 jobs have lower (better) priority than AV1 so playback becomes
 * available as fast as possible after upload, while bandwidth-optimized AV1
 * variants encode in the background.
 */

import { hostname } from "node:os";
import { join } from "node:path";
import { mkdir, stat } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { logger } from "../lib/logger";
import {
  encode,
  extractPoster,
  probe,
  checkFfmpegEncoders,
  type Codec,
  type RenditionHeight,
} from "../lib/ffmpeg";
import {
  downloadObjectToFile,
  uploadFileToBucket,
  safeRemoveDir,
} from "../lib/videoStorage";
import { query } from "../lib/db";

const WORKER_ID = `${hostname()}-${process.pid}-${randomUUID().slice(0, 8)}`;
const TMP_ROOT = process.env.VIDEO_TMP_DIR || "/tmp/afuchat-videos";

const IDLE_POLL_MS = 5_000;
const BUSY_POLL_MS = 250;

let running = false;
let stopped = false;
let wakeResolver: (() => void) | null = null;

/** Called by the API after enqueuing new work to skip the idle delay. */
export function notifyJobsAvailable(): void {
  if (wakeResolver) {
    const fn = wakeResolver;
    wakeResolver = null;
    fn();
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      wakeResolver = null;
      resolve();
    }, ms);
    wakeResolver = () => {
      clearTimeout(timer);
      resolve();
    };
  });
}

interface ClaimedJob {
  id: string;
  asset_id: string;
  rendition_id: string;
  codec: Codec;
  height: RenditionHeight;
  attempts: number;
  max_attempts: number;
}

async function claimNext(): Promise<ClaimedJob | null> {
  try {
    const rows = await query<ClaimedJob>(
      `SELECT * FROM claim_video_job($1, $2::text[])`,
      [WORKER_ID, ["h264", "av1"]],
    );
    return rows[0] ?? null;
  } catch (error) {
    logger.error({ err: error }, "claim_video_job failed");
    return null;
  }
}

async function loadAsset(assetId: string) {
  const rows = await query<{
    id: string;
    owner_id: string;
    source_path: string;
    height: number | null;
    poster_path: string | null;
  }>(
    `SELECT id, owner_id, source_path, height, poster_path FROM public.video_assets WHERE id = $1 LIMIT 1`,
    [assetId],
  );
  if (!rows.length) throw new Error(`asset ${assetId} not found`);
  return rows[0];
}

function renditionStoragePath(
  ownerId: string,
  assetId: string,
  codec: Codec,
  height: number,
): string {
  return `${ownerId}/encoded/${assetId}/${codec}_${height}p.mp4`;
}

function posterStoragePath(ownerId: string, assetId: string): string {
  return `${ownerId}/posters/${assetId}.jpg`;
}

async function markRenditionReady(
  renditionId: string,
  fields: {
    storage_path: string;
    size_bytes: number;
    bitrate_kbps: number;
    width: number;
    height: number;
  },
): Promise<void> {
  await query(
    `UPDATE public.video_renditions
     SET status='ready', storage_path=$1, size_bytes=$2, bitrate_kbps=$3, width=$4, height=$5
     WHERE id=$6`,
    [fields.storage_path, fields.size_bytes, fields.bitrate_kbps, fields.width, fields.height, renditionId],
  );
}

async function markRenditionFailed(renditionId: string, errorMessage: string): Promise<void> {
  await query(
    `UPDATE public.video_renditions SET status='failed', error=$1 WHERE id=$2`,
    [errorMessage.slice(0, 1000), renditionId],
  );
}

async function finishJob(job: ClaimedJob, success: boolean, errorMessage?: string): Promise<void> {
  if (success) {
    await query(
      `UPDATE public.video_jobs SET status='done', finished_at=$1 WHERE id=$2`,
      [new Date().toISOString(), job.id],
    );
    return;
  }
  if (job.attempts >= job.max_attempts) {
    await query(
      `UPDATE public.video_jobs SET status='failed', finished_at=$1, last_error=$2 WHERE id=$3`,
      [new Date().toISOString(), (errorMessage ?? "").slice(0, 1000), job.id],
    );
    await markRenditionFailed(job.rendition_id, errorMessage ?? "unknown error");
  } else {
    // Exponential backoff: 30s, 2min, 8min.
    const delayMs = Math.min(8 * 60_000, 30_000 * 4 ** (job.attempts - 1));
    const next = new Date(Date.now() + delayMs).toISOString();
    await query(
      `UPDATE public.video_jobs SET status='queued', worker_id=NULL, scheduled_at=$1, last_error=$2 WHERE id=$3`,
      [next, (errorMessage ?? "").slice(0, 1000), job.id],
    );
  }
}

async function uploadPosterIfMissing(
  asset: { id: string; owner_id: string; poster_path: string | null },
  sourceFsPath: string,
): Promise<void> {
  if (asset.poster_path) return;
  try {
    const posterFs = join(TMP_ROOT, asset.id, "poster.jpg");
    await extractPoster(sourceFsPath, posterFs, 1);
    const path = posterStoragePath(asset.owner_id, asset.id);
    await uploadFileToBucket(posterFs, path, "image/jpeg");
    await query(`UPDATE public.video_assets SET poster_path=$1 WHERE id=$2`, [path, asset.id]);
  } catch (e) {
    logger.warn({ err: e, asset: asset.id }, "poster extraction failed (non-fatal)");
  }
}

async function processJob(job: ClaimedJob): Promise<void> {
  const asset = await loadAsset(job.asset_id);
  const workDir = join(TMP_ROOT, job.id);
  await mkdir(workDir, { recursive: true });

  try {
    const sourceFs = join(workDir, "source.bin");
    await downloadObjectToFile(asset.source_path, sourceFs);

    // Probe the source so we can backfill width/height on the asset and
    // skip upscaling jobs (e.g. if user uploaded 480p but we planned 1080p).
    const probed = await probe(sourceFs);
    if (probed.height && (asset.height == null || asset.height === 0)) {
      await query(
        `UPDATE public.video_assets SET width=$1, height=$2, duration_seconds=$3 WHERE id=$4`,
        [probed.width, probed.height, probed.durationSeconds, asset.id],
      );
    }

    if (probed.height && job.height > probed.height) {
      logger.info({ jobId: job.id, target: job.height, source: probed.height }, "skipping upscale rendition");
      await markRenditionFailed(
        job.rendition_id,
        `Source is ${probed.height}p, target ${job.height}p — upscale skipped`,
      );
      await query(
        `UPDATE public.video_jobs SET status='done', finished_at=$1 WHERE id=$2`,
        [new Date().toISOString(), job.id],
      );
      return;
    }

    await uploadPosterIfMissing(asset, sourceFs);

    const outFs = join(workDir, `out_${job.codec}_${job.height}.mp4`);
    const result = await encode({
      inputPath: sourceFs,
      outputPath: outFs,
      codec: job.codec,
      height: job.height,
    });

    const storagePath = renditionStoragePath(
      asset.owner_id,
      asset.id,
      job.codec,
      job.height,
    );
    await uploadFileToBucket(outFs, storagePath, "video/mp4");
    const sizeBytes = (await stat(outFs)).size;

    await markRenditionReady(job.rendition_id, {
      storage_path: storagePath,
      size_bytes: sizeBytes,
      bitrate_kbps: result.bitrateKbps,
      width: result.width,
      height: result.height,
    });
    await finishJob(job, true);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    logger.error({ jobId: job.id, err: msg }, "encode job failed");
    await finishJob(job, false, msg);
  } finally {
    await safeRemoveDir(workDir);
  }
}

async function loop(): Promise<void> {
  while (!stopped) {
    let processed = false;
    try {
      const job = await claimNext();
      if (job) {
        processed = true;
        logger.info(
          {
            jobId: job.id,
            asset: job.asset_id,
            codec: job.codec,
            height: job.height,
            attempt: job.attempts,
          },
          "encoder: claimed job",
        );
        await processJob(job);
      }
    } catch (e) {
      logger.error({ err: e }, "encoder loop tick failed");
    }
    await sleep(processed ? BUSY_POLL_MS : IDLE_POLL_MS);
  }
}

/**
 * Start the encoder worker if the environment is properly configured.
 * Safe to call multiple times — only the first invocation starts the loop.
 */
export async function startVideoEncoder(): Promise<void> {
  if (running) return;
  if (process.env.VIDEO_WORKER_ENABLED === "false") {
    logger.info("video encoder disabled via VIDEO_WORKER_ENABLED=false");
    return;
  }
  if (!process.env.SUPABASE_DB_URL) {
    logger.info("video encoder not started: SUPABASE_DB_URL not configured");
    return;
  }
  const caps = await checkFfmpegEncoders();
  if (!caps.ok || !caps.hasH264) {
    logger.warn(
      { caps },
      "video encoder NOT started: ffmpeg or libx264 missing",
    );
    return;
  }
  if (!caps.hasAv1) {
    logger.warn("ffmpeg lacks libsvtav1 — AV1 jobs will fail");
  }
  await mkdir(TMP_ROOT, { recursive: true });
  running = true;
  logger.info(
    { workerId: WORKER_ID, tmp: TMP_ROOT, hasAv1: caps.hasAv1 },
    "video encoder started",
  );
  loop().catch((err) => {
    logger.error({ err }, "video encoder loop crashed");
    running = false;
  });
}

export function stopVideoEncoder(): void {
  stopped = true;
  notifyJobsAvailable();
}
