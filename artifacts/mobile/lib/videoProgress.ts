// ─── Video Playback Progress — Permanent SQLite Store ─────────────────────────
// Resume positions are stored in SQLite (documentDirectory) so they survive
// app restarts, device reboots, "Clear Data", and account restores.
//
// Migration: on first use after upgrade, any positions stored under the old
// AsyncStorage "vp:<postId>" keys are imported into SQLite and removed.
//
// Write strategy: debounced (4 s) to avoid thrashing SQLite during scrubbing.
// In-memory cache gives sub-millisecond sync reads for the current session.

import { getDB } from "./storage/db";

const LEGACY_PREFIX = "vp:";
const MIGRATED_KEY = "video_progress_migrated_v1";

// In-memory hot cache (current session only)
const cache = new Map<string, number>();
const pendingWrites = new Map<string, ReturnType<typeof setTimeout>>();

// ─── One-time AsyncStorage → SQLite migration ─────────────────────────────────

let _migrated = false;
async function migrateFromAsyncStorage(): Promise<void> {
  if (_migrated) return;
  _migrated = true;
  try {
    const { storage } = await import("./storage/mmkv");
    if (storage.getBoolean(MIGRATED_KEY)) return;
    storage.setBoolean(MIGRATED_KEY, true);

    const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;
    const allKeys = await AsyncStorage.getAllKeys();
    const vpKeys = allKeys.filter((k) => k.startsWith(LEGACY_PREFIX));
    if (vpKeys.length === 0) return;

    const pairs = await AsyncStorage.multiGet(vpKeys);
    const db = await getDB();
    const now = Date.now();

    for (const [key, value] of pairs) {
      if (!value) continue;
      const postId = key.slice(LEGACY_PREFIX.length);
      const fraction = parseFloat(value);
      if (isNaN(fraction) || fraction < 0.02 || fraction > 0.97) continue;
      await db.runAsync(
        "INSERT OR IGNORE INTO video_progress (post_id, fraction, updated_at) VALUES (?, ?, ?)",
        [postId, fraction, now],
      );
    }

    await AsyncStorage.multiRemove(vpKeys);
  } catch {}
}

// ─── Public API ────────────────────────────────────────────────────────────────

/** Synchronous — returns the in-memory cached value for this session (no I/O). */
export function getVideoProgressCached(postId: string): number | null {
  return cache.has(postId) ? cache.get(postId)! : null;
}

/** Load the resume position from SQLite. Returns null if not stored. */
export async function loadVideoProgress(postId: string): Promise<number | null> {
  if (cache.has(postId)) return cache.get(postId)!;
  try {
    migrateFromAsyncStorage().catch(() => {});
    const db = await getDB();
    const row = await db.getFirstAsync<{ fraction: number }>(
      "SELECT fraction FROM video_progress WHERE post_id = ?",
      [postId],
    );
    if (row == null) return null;
    cache.set(postId, row.fraction);
    return row.fraction;
  } catch {
    return null;
  }
}

/**
 * Save a playback position. Writes are debounced (4 s) to avoid SQLite
 * thrashing while the user scrubs through a video.
 * Fractions < 0.02 (near start) and > 0.97 (near end) are not stored
 * so "resume" never triggers for videos the user just started or finished.
 */
export function saveVideoProgress(postId: string, fraction: number): void {
  if (fraction < 0.02 || fraction > 0.97) return;
  cache.set(postId, fraction);
  if (pendingWrites.has(postId)) clearTimeout(pendingWrites.get(postId)!);
  pendingWrites.set(
    postId,
    setTimeout(() => {
      pendingWrites.delete(postId);
      getDB()
        .then((db) =>
          db.runAsync(
            "INSERT OR REPLACE INTO video_progress (post_id, fraction, updated_at) VALUES (?, ?, ?)",
            [postId, fraction, Date.now()],
          ),
        )
        .catch(() => {});
    }, 4000),
  );
}

/** Clear the resume position for a specific post (e.g., user finished watching). */
export function clearVideoProgress(postId: string): void {
  cache.delete(postId);
  if (pendingWrites.has(postId)) {
    clearTimeout(pendingWrites.get(postId)!);
    pendingWrites.delete(postId);
  }
  getDB()
    .then((db) => db.runAsync("DELETE FROM video_progress WHERE post_id = ?", [postId]))
    .catch(() => {});
}

/** Delete ALL video progress rows (called on sign-out / account switch). */
export async function clearAllVideoProgress(): Promise<void> {
  cache.clear();
  for (const t of pendingWrites.values()) clearTimeout(t);
  pendingWrites.clear();
  try {
    const db = await getDB();
    await db.execAsync("DELETE FROM video_progress");
  } catch {}
}
