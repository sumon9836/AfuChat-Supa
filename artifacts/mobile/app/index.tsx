import { useEffect, useRef } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { getCachedUserId } from "@/lib/offlineStore";

export default function IndexScreen() {
  const { session, profile, loading } = useAuth();
  const redirected = useRef(false);
  const { handle } = useLocalSearchParams<{ handle?: string }>();

  function doRedirect(hasSession: boolean, profileReady: boolean, profileOnboarded: boolean) {
    if (redirected.current) return;

    const cachedId  = getCachedUserId();
    const isLoggedIn = hasSession || Boolean(cachedId);

    if (!isLoggedIn) {
      redirected.current = true;
      router.replace("/welcome");
      return;
    }

    // Known returning user (MMKV has their ID): go home INSTANTLY.
    // Never wait for token refresh or profile fetch — those happen in the
    // background. A user who has ever logged in must never see the welcome
    // or onboarding screens while we're busy restoring their session.
    // Exception: only route to onboarding when a LIVE session + LOADED profile
    // explicitly confirms it's needed (onboarding_completed === false).
    if (cachedId) {
      redirected.current = true;
      if (hasSession && profileReady && profile?.onboarding_completed === false) {
        router.replace("/onboarding");
      } else {
        router.replace("/(tabs)/chats");
      }
      return;
    }

    // Brand-new sign-in (no cachedId yet): wait for profile before routing
    // so we can decide onboarding vs. home correctly.
    if (hasSession && !profileReady) return;

    redirected.current = true;
    if (hasSession && profileReady && !profileOnboarded) {
      router.replace("/onboarding");
    } else {
      router.replace("/(tabs)/chats");
    }
  }

  // Handle ?handle= query param (referral / handle deep links via web)
  useEffect(() => {
    if (!handle || redirected.current || loading) return;
    redirected.current = true;
    router.replace(`/${handle}` as any);
  }, [handle, loading]);

  // Main routing — fires whenever auth state resolves
  useEffect(() => {
    if (loading) return;
    if (handle) return;
    doRedirect(
      !!session,
      !!profile,
      profile?.onboarding_completed === true,
    );
  }, [session, profile, loading, handle]);

  // Safety net: if auth takes too long, route based on cached state.
  // 1500 ms is plenty on Android — getSession() is synchronous from
  // the Supabase AsyncStorage cache.
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (redirected.current) return;

      redirected.current = true;
      if (handle) {
        router.replace(`/${handle}` as any);
      } else if (getCachedUserId()) {
        // Known user — always go home, never to welcome/onboarding
        router.replace("/(tabs)/chats");
      } else {
        router.replace("/welcome");
      }
    }, 1500);

    return () => clearTimeout(timeout);
  }, [handle]);

  return null;
}
