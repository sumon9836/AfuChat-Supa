/**
 * SwipeBackGesture
 * ─────────────────
 * Adds an iOS-style edge-swipe-to-go-back gesture on Android.
 * iOS already has this natively via the Stack's gestureEnabled default.
 * Web has no touch gestures.
 *
 * Rules:
 *  ✓  Swipe RIGHT starting within the left-edge zone → page slides off → router.back()
 *  ✗  Disabled while any mini app is open (activeAppId !== null)
 *  ✗  Disabled on tab-root screens (nothing to go back to)
 *  ✗  Disabled while a horizontal scroll/tab-swipe is already in progress
 *  ✗  Disabled if router.canGoBack() returns false
 *  ✗  No-op on iOS and web
 */

import React, { useEffect } from "react";
import { Dimensions, Platform } from "react-native";
import Reanimated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { router, usePathname } from "expo-router";

import { useSuperApp } from "@/lib/superapp/SuperAppContext";
import { useHorizontalScrollLock } from "@/context/TabSwipeContext";
import { releaseNavLock } from "@/lib/navUtils";

// ─── Constants ───────────────────────────────────────────────────────────────

const SCREEN_W = Dimensions.get("window").width;

/** px from left edge — gesture only starts inside this zone */
const EDGE_ZONE = 40;

/** translation required to commit back navigation */
const SUCCEED_DIST = SCREEN_W * 0.28;

/** horizontal velocity (px/s) required to commit regardless of distance */
const SUCCEED_VEL = 500;

/** ms to animate the page off-screen when committing */
const SLIDE_MS = 175;

/** Routes where going back makes no sense (tab roots / app root). */
const NO_BACK_ROUTES = new Set([
  "/",
  "/(tabs)",
  "/(tabs)/chats",
  "/(tabs)/discover",
  "/(tabs)/shorts",
  "/(tabs)/apps",
  "/(tabs)/me",
]);

// ─── Helpers (called on JS thread from worklets) ──────────────────────────────

function execBack() {
  releaseNavLock();
  if (router.canGoBack()) router.back();
}

// ─── Android-only inner component ────────────────────────────────────────────

function SwipeBackAndroid({ children }: { children: React.ReactNode }) {
  const pathname       = usePathname();
  const { activeAppId } = useSuperApp();
  const tabScrollActive = useHorizontalScrollLock(); // SharedValue<boolean>

  // --- Shared values readable inside Pan worklets ---
  const gestureEnabled = useSharedValue(false);
  const startedInEdge  = useSharedValue(false);
  const translateX     = useSharedValue(0);

  // Recompute gate whenever the relevant JS state changes
  useEffect(() => {
    gestureEnabled.value =
      !activeAppId &&
      !NO_BACK_ROUTES.has(pathname) &&
      router.canGoBack();
  }, [pathname, activeAppId]);

  // ── Gesture definition ──────────────────────────────────────────────────
  const pan = Gesture.Pan()
    // Only activate for clearly rightward horizontal movement
    .activeOffsetX([12, Infinity])
    // Fail (hand off to scrollview) if user goes vertical first
    .failOffsetY([-28, 28])
    .minPointers(1)
    .maxPointers(1)

    .onBegin((e) => {
      "worklet";
      // Record whether the touch started inside the edge zone
      startedInEdge.value = e.x <= EDGE_ZONE;
    })

    .onUpdate((e) => {
      "worklet";
      if (
        !gestureEnabled.value ||
        !startedInEdge.value ||
        tabScrollActive.value
      ) return;
      // Clamp to [0, ∞) — only allow rightward slide
      translateX.value = Math.max(0, e.translationX);
    })

    .onEnd((e) => {
      "worklet";
      const moved = translateX.value;

      if (!gestureEnabled.value || !startedInEdge.value || moved === 0) {
        translateX.value = withSpring(0, { damping: 22, stiffness: 220 });
        return;
      }

      const shouldGoBack =
        e.translationX >= SUCCEED_DIST || e.velocityX >= SUCCEED_VEL;

      if (shouldGoBack) {
        // Slide page fully off-screen to the right, then navigate back
        translateX.value = withTiming(
          SCREEN_W,
          { duration: SLIDE_MS, easing: Easing.out(Easing.cubic) },
          (finished) => {
            if (finished) {
              runOnJS(execBack)();
              // Reset wrapper so the incoming screen starts at position 0
              translateX.value = 0;
            }
          },
        );
      } else {
        // Not enough — spring back to resting position
        translateX.value = withSpring(0, { damping: 22, stiffness: 220 });
      }
    })

    .onFinalize(() => {
      "worklet";
      startedInEdge.value = false;
    });

  // ── Animated style ──────────────────────────────────────────────────────
  const animStyle = useAnimatedStyle(() => ({
    flex: 1,
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <GestureDetector gesture={pan}>
      <Reanimated.View style={animStyle}>
        {children}
      </Reanimated.View>
    </GestureDetector>
  );
}

// ─── Public export ────────────────────────────────────────────────────────────

/**
 * Wrap your navigation Stack with this component.
 * Must live inside both GestureHandlerRootView AND MiniAppRuntimeProvider.
 */
export function SwipeBackGesture({ children }: { children: React.ReactNode }) {
  // iOS: native gesture already active via Stack gestureEnabled default
  // Web: no touch gesture support needed
  if (Platform.OS !== "android") return <>{children}</>;
  return <SwipeBackAndroid>{children}</SwipeBackAndroid>;
}
