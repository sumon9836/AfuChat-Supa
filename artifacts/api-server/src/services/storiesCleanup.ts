import { logger } from "../lib/logger";
import { getAdminClient } from "../lib/supabase-admin";

const CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

async function cleanupExpiredStories(): Promise<void> {
  try {
    const supabase = getAdminClient();
    const now = new Date().toISOString();

    const { data: expired, error } = await supabase
      .from("stories")
      .select("id")
      .lt("expires_at", now);

    if (error) throw error;
    if (!expired?.length) {
      logger.debug("[stories-cleanup] No expired stories to delete");
      return;
    }

    const ids = expired.map((s: { id: string }) => s.id);

    await Promise.all([
      supabase.from("story_replies").delete().in("story_id", ids),
      supabase.from("story_views").delete().in("story_id", ids),
    ]);
    const { error: delErr } = await supabase.from("stories").delete().in("id", ids);
    if (delErr) throw delErr;

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
