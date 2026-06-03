/**
 * AfuMusic — MusicBrainz metadata cache.
 *
 * Design principles:
 *  • OFFLINE-FIRST: Always returns cached data synchronously. The UI never
 *    blocks on a network call — enriched data appears when it's ready.
 *  • SILENT FAIL: Any network error (offline, timeout, rate-limit) is swallowed.
 *    The filename-parsed fallback stays visible until the next successful fetch.
 *  • RATE-LIMITED: MusicBrainz allows 1 req/s. We wait 1150 ms between requests.
 *  • 30-DAY CACHE: Successful lookups persist to AsyncStorage and are reused
 *    across app restarts without re-fetching.
 *  • SESSION SKIP: Tracks with no MusicBrainz match are skipped for the
 *    remainder of the session (not re-queried repeatedly).
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

// ─── Types ───────────────────────────────────────────────────────────────────

export type TrackMeta = {
  title: string | null;
  artist: string | null;
  album: string | null;
  genre: string | null;
  cachedAt: number;
};

type MetaListener = (filenameKey: string, meta: TrackMeta) => void;

// ─── Constants ────────────────────────────────────────────────────────────────

const CACHE_KEY = "afumusic_meta_v2";
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const RATE_LIMIT_MS = 1150;                      // just above 1 req/s
const MAX_QUEUE = 250;                            // max tracks queued per session
const FETCH_TIMEOUT_MS = 9000;

// ─── In-memory state ─────────────────────────────────────────────────────────

let memCache: Record<string, TrackMeta> = {};
let cacheReady = false;
let loadPromise: Promise<void> | null = null;

const sessionSkip = new Set<string>(); // filenames that 404'd this session
const listeners = new Set<MetaListener>();

// ─── Cache I/O ───────────────────────────────────────────────────────────────

export async function initMetaCache(): Promise<void> {
  if (cacheReady) return;
  if (loadPromise) { await loadPromise; return; }
  loadPromise = (async () => {
    try {
      const raw = await AsyncStorage.getItem(CACHE_KEY);
      if (raw) memCache = JSON.parse(raw);
    } catch {}
    cacheReady = true;
  })();
  await loadPromise;
}

async function persistCache(): Promise<void> {
  try {
    // Prune expired entries to keep storage lean
    const now = Date.now();
    const pruned: Record<string, TrackMeta> = {};
    for (const [k, v] of Object.entries(memCache)) {
      if (now - v.cachedAt < CACHE_TTL_MS) pruned[k] = v;
    }
    memCache = pruned;
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(pruned));
  } catch {}
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Returns cached metadata synchronously (null if not cached or expired).
 * initMetaCache() must have been called at some point before this is useful.
 */
export function getMetaSync(filename: string): TrackMeta | null {
  const key = filename.toLowerCase();
  const entry = memCache[key];
  if (!entry) return null;
  if (Date.now() - entry.cachedAt > CACHE_TTL_MS) return null;
  return entry;
}

/**
 * Subscribe to metadata that arrives from background fetches.
 * Fires whenever a new track's metadata is stored.
 */
export function subscribeToMeta(listener: MetaListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Queue a track for background MusicBrainz lookup.
 * Safe to call for every track on every render — deduplication is internal.
 */
export function enqueueMeta(
  filename: string,
  parsedTitle: string,
  parsedArtist: string
): void {
  const key = filename.toLowerCase();

  // Already freshly cached — skip
  const existing = memCache[key];
  if (existing && Date.now() - existing.cachedAt < CACHE_TTL_MS) return;

  // 404'd or failed this session — skip until next launch
  if (sessionSkip.has(key)) return;

  // Already in queue
  if (fetchQueue.some(q => q.key === key)) return;

  if (fetchQueue.length >= MAX_QUEUE) return;
  fetchQueue.push({ key, title: parsedTitle, artist: parsedArtist });
  if (!queueRunning) runFetchQueue();
}

// ─── Fetch queue ─────────────────────────────────────────────────────────────

interface QueueItem { key: string; title: string; artist: string; }
const fetchQueue: QueueItem[] = [];
let queueRunning = false;

async function runFetchQueue(): Promise<void> {
  if (queueRunning) return;
  queueRunning = true;
  await initMetaCache();

  let dirty = false;

  while (fetchQueue.length > 0) {
    const item = fetchQueue.shift()!;

    // Re-check after cache is ready (another item may have filled it)
    const existing = memCache[item.key];
    if (existing && Date.now() - existing.cachedAt < CACHE_TTL_MS) continue;
    if (sessionSkip.has(item.key)) continue;

    const result = await fetchFromMusicBrainz(item.title, item.artist);
    if (result) {
      memCache[item.key] = { ...result, cachedAt: Date.now() };
      dirty = true;
      notifyListeners(item.key);
    } else {
      // No match or network error — skip this session
      sessionSkip.add(item.key);
    }

    // Respect MusicBrainz rate limit between every request
    await pause(RATE_LIMIT_MS);
  }

  if (dirty) await persistCache();
  queueRunning = false;
}

function notifyListeners(key: string): void {
  const meta = memCache[key];
  if (!meta) return;
  listeners.forEach(l => { try { l(key, meta); } catch {} });
}

function pause(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

// ─── MusicBrainz API ─────────────────────────────────────────────────────────

async function fetchFromMusicBrainz(
  rawTitle: string,
  rawArtist: string
): Promise<Omit<TrackMeta, "cachedAt"> | null> {
  try {
    // Sanitise — strip quotes that would break the Lucene query
    const title = rawTitle.replace(/["'`]/g, "").trim();
    const artist = rawArtist === "Unknown Artist"
      ? ""
      : rawArtist.replace(/["'`]/g, "").trim();

    if (!title) return null;

    const queryStr = artist
      ? `recording:"${title}" AND artist:"${artist}"`
      : `recording:"${title}"`;

    // inc=releases fetches album names; inc=tags fetches genre tags
    const url =
      "https://musicbrainz.org/ws/2/recording" +
      `?query=${encodeURIComponent(queryStr)}` +
      "&fmt=json&limit=1&inc=releases+tags";

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    let res: Response;
    try {
      res = await fetch(url, {
        headers: {
          // Required by MusicBrainz ToS — identifies the app
          "User-Agent": "AfuChat/2.0.79 (support@afuchat.com)",
          Accept: "application/json",
        },
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }

    if (!res.ok) return null;

    const data = await res.json();
    const rec = data?.recordings?.[0];
    if (!rec) return null;

    const mbTitle: string | null = rec.title ?? null;

    // Artist — prefer the credited name on this recording
    const mbArtist: string | null =
      rec["artist-credit"]?.[0]?.name ??
      rec["artist-credit"]?.[0]?.artist?.name ??
      null;

    // Album — take the most recent official release
    const releases: any[] = rec.releases ?? [];
    const official = releases.find(r => r.status === "Official") ?? releases[0];
    const mbAlbum: string | null = official?.title ?? null;

    // Genre — highest-voted tag (MusicBrainz tags are community-curated genres)
    const tags: { name: string; count: number }[] = rec.tags ?? [];
    tags.sort((a, b) => b.count - a.count);
    const mbGenre: string | null = tags[0]?.name
      ? tags[0].name.charAt(0).toUpperCase() + tags[0].name.slice(1)
      : null;

    // Only return if we got at least a title or artist back
    if (!mbTitle && !mbArtist) return null;

    return { title: mbTitle, artist: mbArtist, album: mbAlbum, genre: mbGenre };
  } catch {
    // AbortError (timeout), TypeError (offline), parse error — all silent
    return null;
  }
}
