/**
 * deepLinkHandler.ts
 *
 * Parses incoming URLs and dispatches navigation actions or referral signals.
 *
 * Supported URL formats:
 *   https://afuchat.com/join/:id      → join a group/channel
 *   https://afuchat.com/john          → referral code "JOHN"
 *   https://afuchat.com/john?ref=JOHN → referral code "JOHN" (explicit param)
 *   afuchat://john                    → referral code "JOHN"
 *   afuchat://ref/JOHN                → referral code "JOHN" (dedicated path)
 *   afuchat://join/:id                → join a group/channel
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

export const REFERRER_KEY = "referrer_handle";
export const PENDING_JOIN_KEY = "pending_join_group_id";

export type DeepLinkAction =
  | { type: "referral"; code: string }
  | { type: "join_group"; groupId: string }
  | null;

/**
 * These path segments are NOT user handles — they are app routes.
 * Any single-segment URL that matches one of these is ignored.
 */
const SYSTEM_ROUTES = new Set([
  "wallet", "settings", "chat", "premium", "referral", "onboarding",
  "login", "register", "search", "discover", "communities", "contacts",
  "apps", "moments", "shorts", "stories", "post", "video", "article",
  "shop", "freelance", "company", "mini-programs", "prestige",
  "username-market", "match", "gifts", "events", "market", "jobs",
  "support", "qr-scanner", "digital-id", "language-settings",
  "monetize", "me", "call", "call-history", "red-envelope", "p",
  "saved-posts", "my-posts", "profile", "followers", "user-discovery",
  "linked-accounts", "device-security", "status", "contact", "group",
  "channel", "digital-events", "ref", "app", "download", "privacy",
  "terms", "about", "help", "feedback", "notifications", "likes",
  "explore", "trending", "feed", "home", "index", "join",
]);

/** Validate that a string looks like a real user handle */
function isValidHandle(s: string): boolean {
  return /^[a-z0-9_]{2,30}$/.test(s);
}

/** Validate a UUID v4 */
function isUUID(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}

/**
 * Parse a URL and return a DeepLinkAction if one is identified, or null.
 *
 * Side-effects:
 *  - Persists referral codes to AsyncStorage (REFERRER_KEY).
 *  - Persists pending group-join IDs to AsyncStorage (PENDING_JOIN_KEY)
 *    so the app can navigate after the auth state is ready.
 */
export async function handleIncomingUrl(url: string | null | undefined): Promise<DeepLinkAction> {
  if (!url) return null;

  try {
    const normalised = url.startsWith("afuchat://")
      ? url.replace("afuchat://", "https://afuchat.com/")
      : url;

    const parsed = new URL(normalised);
    const segments = parsed.pathname.split("/").filter(Boolean);

    // 1. /join/:id — group/channel invite link
    if (segments.length === 2 && segments[0] === "join") {
      const groupId = segments[1];
      if (isUUID(groupId)) {
        await AsyncStorage.setItem(PENDING_JOIN_KEY, groupId);
        return { type: "join_group", groupId };
      }
    }

    // 2. Explicit ?ref=HANDLE query param — highest priority for referrals
    const refParam = parsed.searchParams.get("ref");
    if (refParam) {
      const code = refParam.trim().toUpperCase();
      if (code.length >= 2) {
        await AsyncStorage.setItem(REFERRER_KEY, code);
        return { type: "referral", code };
      }
    }

    // 3. Dedicated /ref/HANDLE path (e.g. afuchat://ref/JOHN)
    if (segments.length === 2 && segments[0] === "ref") {
      const handle = segments[1].toLowerCase();
      if (isValidHandle(handle)) {
        const code = handle.toUpperCase();
        await AsyncStorage.setItem(REFERRER_KEY, code);
        return { type: "referral", code };
      }
    }

    // 4. Profile-style link: https://afuchat.com/handle
    if (segments.length === 1) {
      const handle = segments[0].toLowerCase();
      if (!SYSTEM_ROUTES.has(handle) && isValidHandle(handle)) {
        const code = handle.toUpperCase();
        await AsyncStorage.setItem(REFERRER_KEY, code);
        return { type: "referral", code };
      }
    }
  } catch {
    // Malformed URL — silently ignore
  }

  return null;
}

/** Consume a pending group-join ID — returns it and clears the storage entry */
export async function consumePendingJoin(): Promise<string | null> {
  try {
    const id = await AsyncStorage.getItem(PENDING_JOIN_KEY);
    if (id) await AsyncStorage.removeItem(PENDING_JOIN_KEY);
    return id;
  } catch {
    return null;
  }
}

/**
 * Clear the stored referrer after it has been consumed by onboarding.
 * Call this after successfully submitting the referral, not before.
 */
export async function clearStoredReferrer(): Promise<void> {
  try {
    await AsyncStorage.removeItem(REFERRER_KEY);
  } catch {}
}
