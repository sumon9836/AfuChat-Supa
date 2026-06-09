import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { getCachedUserId } from "@/lib/offlineStore";

function hasOAuthCallbackInUrl(): boolean {
  if (typeof window === "undefined") return false;
  const hash   = window.location.hash   || "";
  const search = window.location.search || "";
  return (
    hash.includes("access_token") ||
    hash.includes("refresh_token") ||
    search.includes("code=") ||
    search.includes("access_token")
  );
}

export default function IndexScreen() {
  const { session, profile, loading } = useAuth();
  const redirected = useRef(false);
  const { handle } = useLocalSearchParams<{ handle?: string }>();

  function doRedirect(hasSession: boolean, profileReady: boolean, profileOnboarded: boolean, _userId?: string) {
    if (redirected.current) return;

    const cachedId = getCachedUserId();
    const isLoggedIn = hasSession || Boolean(cachedId);

    if (!isLoggedIn) {
      redirected.current = true;
      if (Platform.OS === "web") {
        router.replace("/landing");
      } else {
        router.replace("/welcome");
      }
      return;
    }

    // Logged in — but if we have a live session and the profile hasn't loaded
    // yet, wait. Profile is in the dependency array so this will re-fire once
    // the profile resolves. The timeout below is the safety net for slow networks.
    if (hasSession && !profileReady) return;

    redirected.current = true;

    if (hasSession && profileReady && !profileOnboarded) {
      // Profile is complete but onboarding wasn't finished — send them there.
      router.replace("/onboarding");
    } else {
      // Onboarding done, or offline mode (cached userId, no live session/profile).
      router.replace("/(tabs)/chats");
    }
  }

  useEffect(() => {
    if (!handle || redirected.current || loading) return;
    redirected.current = true;
    router.replace(`/${handle}` as any);
  }, [handle, loading]);

  useEffect(() => {
    if (loading) return;
    if (handle) return;
    doRedirect(
      !!session,
      !!profile,
      profile?.onboarding_completed === true,
      session?.user?.id,
    );
  }, [session, profile, loading, handle]);

  useEffect(() => {
    const isOAuthCallback = Platform.OS === "web" && hasOAuthCallbackInUrl();

    // OAuth callbacks need more time — Supabase processes the token asynchronously.
    // Regular loads get the short timeout; OAuth gets up to 8 seconds.
    // If a stored Supabase session exists in localStorage, give it more time to
    // restore before giving up — prevents a landing-page flash on hard refresh.
    const hasStoredSession =
      Platform.OS === "web" &&
      typeof window !== "undefined" &&
      Object.keys(window.localStorage || {}).some(
        (k) => k.startsWith("sb-") && k.endsWith("-auth-token"),
      );

    const delay = isOAuthCallback ? 8000 : hasStoredSession ? 5000 : 1500;

    const timeout = setTimeout(() => {
      if (redirected.current) return;

      // If we're still inside an OAuth handshake, let the auth listener handle it.
      if (Platform.OS === "web" && hasOAuthCallbackInUrl()) return;

      // If a stored session token still exists, Supabase is still restoring the
      // session — don't redirect to the landing page yet.
      if (
        Platform.OS === "web" &&
        typeof window !== "undefined" &&
        Object.keys(window.localStorage || {}).some(
          (k) => k.startsWith("sb-") && k.endsWith("-auth-token"),
        )
      ) {
        return;
      }

      redirected.current = true;
      if (handle) {
        router.replace(`/${handle}` as any);
      } else if (Platform.OS === "web") {
        router.replace("/landing");
      } else if (getCachedUserId()) {
        // Previously logged-in user — send to app even if session not yet restored
        router.replace("/(tabs)/chats");
      } else {
        router.replace("/welcome");
      }
    }, delay);

    return () => clearTimeout(timeout);
  }, [handle]);

  return null;
}
