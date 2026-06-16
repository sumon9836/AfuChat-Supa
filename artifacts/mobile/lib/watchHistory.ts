/**
 * Watch History -- client-side library
 *
 * Keeps a server-side log of every video the signed-in user has watched.
 * Cross-device: data is stored in Supabase, not just local SQLite.
 *
 * Clearing watch history also resets the algorithm's seen-video demotions
 * (AsyncStorage "seen_video_ids_v2") and optionally the learned interest
 * weights ("feed_interaction_weights_v1"), giving the user a clean slate.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "@/lib/supabase";

const SEEN_VIDEO_IDS_KEY       = "seen_video_ids_v2";
const INTERACTION_WEIGHTS_KEY  = "feed_interaction_weights_v1";
const SEEN_FEED_POSTS_KEY      = "seen_feed_post_ids_v2";

export type WatchHistoryEntry = {
  id:         string;
  postId:     string;
  watchedAt:  string;
  progress:   number;
  watchCount: number;
  title:      string | null;
  thumbnail:  string | null;
  videoUrl:   string | null;
};

// --- Record a watch event ---

/**
 * Called whenever a video becomes active in the feed.
 * Fire-and-forget -- never blocks the UI.
 */
export async function recordWatchHistory(
  postId: string,
  meta: {
    title:     string | null;
    thumbnail: string | null;
    videoUrl:  string | null;
    progress?: number;
  },
): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    // Use the anon client directly -- RLS ensures user_id = auth.uid()
    await supabase.from("video_watch_history").upsert(
      {
        user_id:    session.user.id,
        post_id:    postId,
        watched_at: new Date().toISOString(),
        progress:   typeof meta.progress === "number"
          ? Math.min(1, Math.max(0, meta.progress))
          : 0,
        title:      meta.title     ?? null,
        thumbnail:  meta.thumbnail ?? null,
        video_url:  meta.videoUrl  ?? null,
      },
      { onConflict: "user_id,post_id" },
    );
  } catch {
    // Silent -- never crash the video player over analytics
  }
}

// --- Fetch history ---

export async function getWatchHistory(opts?: {
  limit?: number;
  offset?: number;
}): Promise<WatchHistoryEntry[]> {
  const limit  = opts?.limit  ?? 100;
  const offset = opts?.offset ?? 0;

  try {
    const { data, error } = await supabase
      .from("video_watch_history")
      .select("id, post_id, watched_at, progress, watch_count, title, thumbnail, video_url")
      .order("watched_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error || !data) return [];

    return data.map((row: any) => ({
      id:         row.id,
      postId:     row.post_id,
      watchedAt:  row.watched_at,
      progress:   row.progress   ?? 0,
      watchCount: row.watch_count ?? 1,
      title:      row.title      ?? null,
      thumbnail:  row.thumbnail  ?? null,
      videoUrl:   row.video_url  ?? null,
    }));
  } catch {
    return [];
  }
}

// --- Remove single entry ---

export async function removeFromWatchHistory(postId: string): Promise<void> {
  try {
    await supabase
      .from("video_watch_history")
      .delete()
      .eq("post_id", postId);
  } catch {}
}

// --- Clear all history + reset algorithm ---

/**
 * Clears all server-side watch history AND resets the local feed algorithm:
 *  - Deletes all rows from video_watch_history (Supabase)
 *  - Clears seen_video_ids_v2 (feed demotion weights)
 *  - Clears seen_feed_post_ids_v2 (post feed seen tracking)
 *  - Optionally clears feed_interaction_weights_v1 (learned interests)
 */
export async function clearAllWatchHistory(opts?: {
  resetLearnedWeights?: boolean;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from("video_watch_history")
      .delete()
      .neq("post_id", "00000000-0000-0000-0000-000000000000");

    if (error) {
      return { ok: false, error: error.message };
    }

    const keysToRemove = [SEEN_VIDEO_IDS_KEY, SEEN_FEED_POSTS_KEY];
    if (opts?.resetLearnedWeights) {
      keysToRemove.push(INTERACTION_WEIGHTS_KEY);
    }
    await AsyncStorage.multiRemove(keysToRemove);

    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message ?? "Unknown error" };
  }
}

// --- Algorithm reset only (no server clear) ---

export async function resetFeedAlgorithm(): Promise<void> {
  await AsyncStorage.multiRemove([
    SEEN_VIDEO_IDS_KEY,
    SEEN_FEED_POSTS_KEY,
    INTERACTION_WEIGHTS_KEY,
  ]).catch(() => {});
}
