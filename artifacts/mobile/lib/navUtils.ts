/**
 * navUtils — Global navigation-lock + safe wrappers.
 *
 * WHY: React Native (and the web build) deliver touches to JS in bursts.
 * A user can easily fire 3-4 press events before the first route even
 * renders. Without a lock, all three navigations execute and the user
 * lands on an unintended deep stack or sees a flickering screen.
 *
 * HOW:
 * - A module-level boolean `_locked` is set to `true` the instant any
 *   navigation is triggered and reset after NAV_COOLDOWN_MS.
 * - Every navigation helper checks and sets this lock atomically.
 * - `SafePressable` / `SafeTouchableOpacity` (in components/ui) also
 *   check the lock so even button presses that trigger navigation
 *   indirectly (like openApp()) are protected.
 */

import { router } from "expo-router";
import { useCallback, useRef } from "react";

export const NAV_COOLDOWN_MS = 600;

let _locked    = false;
let _lockTimer: ReturnType<typeof setTimeout> | null = null;

// ── Core lock ─────────────────────────────────────────────────────────────────

/**
 * Attempt to acquire the navigation lock.
 * Returns `true` (and sets the lock) if navigation is allowed.
 * Returns `false` immediately if the lock is already held.
 */
export function acquireNavLock(cooldownMs = NAV_COOLDOWN_MS): boolean {
  if (_locked) return false;
  _locked = true;
  if (_lockTimer) clearTimeout(_lockTimer);
  _lockTimer = setTimeout(() => {
    _locked   = false;
    _lockTimer = null;
  }, cooldownMs);
  return true;
}

/** True while the lock is held (i.e., navigation in progress). */
export function isNavLocked(): boolean {
  return _locked;
}

/** Force-release the lock early (e.g., on back-gesture completion). */
export function releaseNavLock(): void {
  _locked = false;
  if (_lockTimer) { clearTimeout(_lockTimer); _lockTimer = null; }
}

// ── Safe router ───────────────────────────────────────────────────────────────

/**
 * Drop-in replacements for `router.push / replace / navigate / back`.
 * All calls are silently ignored while the lock is held.
 *
 * @example
 *   import { safeRouter } from "@/lib/navUtils";
 *   safeRouter.push("/profile");
 */
export const safeRouter = {
  push    (href: any, cooldown = NAV_COOLDOWN_MS): void { if (acquireNavLock(cooldown)) router.push(href); },
  replace (href: any, cooldown = NAV_COOLDOWN_MS): void { if (acquireNavLock(cooldown)) router.replace(href); },
  navigate(href: any, cooldown = NAV_COOLDOWN_MS): void { if (acquireNavLock(cooldown)) router.navigate(href); },
  back    (cooldown = NAV_COOLDOWN_MS):             void { if (acquireNavLock(cooldown)) { if (router.canGoBack()) router.back(); } },
};

// ── React hooks ───────────────────────────────────────────────────────────────

/**
 * Returns stable, debounced navigation helpers bound to the global lock.
 * Prefer this over calling `router` directly inside event handlers.
 *
 * @example
 *   const { push, back } = useSafeNavigation();
 *   <Pressable onPress={() => push("/chat/123")} />
 */
export function useSafeNavigation() {
  const push     = useCallback((href: any) => safeRouter.push(href),     []);
  const replace  = useCallback((href: any) => safeRouter.replace(href),  []);
  const navigate = useCallback((href: any) => safeRouter.navigate(href), []);
  const back     = useCallback(()          => safeRouter.back(),          []);
  return { push, replace, navigate, back };
}

/**
 * Wraps a press handler with the global navigation lock.
 * Use for buttons that perform navigation indirectly (openApp, etc.).
 * The returned function is stable and safe to use as a `useCallback` dep.
 *
 * @example
 *   const handleOpen = useSafePress(() => openApp("afumarket"));
 *   <Pressable onPress={handleOpen} />
 */
export function useSafePress<T extends any[]>(
  handler : (...args: T) => void,
  cooldown: number = NAV_COOLDOWN_MS,
): (...args: T) => void {
  const ref = useRef(handler);
  ref.current = handler;              // always up-to-date without re-creating
  return useCallback(
    (...args: T) => {
      if (!acquireNavLock(cooldown)) return;
      ref.current(...args);
    },
    // cooldown intentionally omitted — it never changes in practice
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
}
