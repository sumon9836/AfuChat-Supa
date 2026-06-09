import { logger } from "../lib/logger";
import { query } from "../lib/db";

const CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

async function cleanupExpiredStories(): Promise<void> {
  try {
    const expired = await query<{ id: string }>(
      `SELECT id FROM public.stories WHERE expires_at < now()`,
    );

    if (!expired.length) {
      logger.debug("[stories-cleanup] No expired stories to delete");
      return;
    }

    const ids = expired.map((s) => s.id);
    const placeholders = ids.map((_, i) => `$${i + 1}`).join(",");

    await query(`DELETE FROM public.story_replies WHERE story_id IN (${placeholders})`, ids);
    await query(`DELETE FROM public.story_views WHERE story_id IN (${placeholders})`, ids);
    await query(`DELETE FROM public.stories WHERE id IN (${placeholders})`, ids);

    logger.info({ count: ids.length }, "[stories-cleanup] Deleted expired stories");
  } catch (err) {
    logger.error({ err }, "[stories-cleanup] Unexpected error during cleanup");
  }
}

export function startStoriesCleanup(): void {
  cleanupExpiredStories().catch((err) =>
    logger.error({ err }, "[stories-cleanup] Startup cleanup failed"),
  );

  setInterval(() => {
    cleanupExpiredStories().catch((err) =>
      logger.error({ err }, "[stories-cleanup] Periodic cleanup failed"),
    );
  }, CLEANUP_INTERVAL_MS);

  logger.info("[stories-cleanup] Scheduled hourly expired-story cleanup");
}
