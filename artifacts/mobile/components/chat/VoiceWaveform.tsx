import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";
import { useAnimationGuard } from "@/hooks/useAnimationGuard";

/**
 * VoiceWaveform — scrolling-history amplitude bars during voice recording.
 *
 * Two modes:
 *  • Live  — `amplitudes` prop is a 0–1 array (newest last).  Each bar springs
 *            to its target height so the waveform scrolls left on every sample.
 *  • Idle  — `amplitudes` is empty / not provided.  Bars are shown as static
 *            short stubs.  The previous looping animation has been intentionally
 *            removed: 20 concurrent Animated.loop instances with
 *            useNativeDriver:false were the primary cause of
 *            NativeAnimatedNodesManager heap exhaustion (OOM crash).
 *
 * OOM guard: all 20 Animated.Value bars are registered on mount so the guard
 * can call .stopAnimation() on them when the app backgrounds.
 */

const N_BARS = 20;
const MIN_H = 2;
const MAX_H = 26;

/** Static heights shown in idle mode — a gentle visual pattern, no animation. */
const IDLE_HEIGHTS: ReadonlyArray<number> = [
  4, 7, 5, 9, 6, 4, 8, 5, 7, 4,
  6, 9, 4, 7, 5, 8, 4, 6, 7, 5,
];

type Props = {
  active: boolean;
  color?: string;
  /** 0–1 per bar, oldest first / newest last. Omit for idle animation. */
  amplitudes?: number[];
};

export function VoiceWaveform({ active, color = "#FFFFFF", amplitudes }: Props) {
  const bars = useRef(
    Array.from({ length: N_BARS }, (_, i) => new Animated.Value(IDLE_HEIGHTS[i]))
  ).current;

  const hasLive = !!amplitudes && amplitudes.length > 0;

  // Register all 20 Animated.Value bars with the OOM guard.
  // The guard will call .stopAnimation() on them when the app backgrounds.
  useAnimationGuard(...bars);

  // ── Live mode: spring every bar toward its real amplitude ──────────────────
  useEffect(() => {
    if (!hasLive || !active) return;

    const src = amplitudes!;
    const padded: number[] =
      src.length >= N_BARS
        ? src.slice(-N_BARS)
        : [...Array(N_BARS - src.length).fill(0), ...src];

    padded.forEach((amp, i) => {
      Animated.spring(bars[i], {
        toValue: MIN_H + amp * (MAX_H - MIN_H),
        speed: 28,
        bounciness: 3,
        useNativeDriver: false,
      }).start();
    });
  }, [amplitudes, active, hasLive]);

  // ── Idle mode: reset bars to static idle heights, no looping ──────────────
  // Previously this was 20 concurrent Animated.loop instances. Removed because
  // each loop registers perpetual vsync callbacks in NativeAnimatedNodesManager,
  // and 20 loops across multiple mounted VoiceWaveform instances fills the
  // Java heap (268 MB limit) causing OOM on the next GC attempt.
  useEffect(() => {
    if (hasLive) return;
    // Stop any in-flight springs and snap to static idle heights
    bars.forEach((bar, i) => {
      bar.stopAnimation();
      bar.setValue(IDLE_HEIGHTS[i]);
    });
  }, [hasLive]);

  // On deactivate: snap all bars back to idle heights immediately
  useEffect(() => {
    if (active) return;
    bars.forEach((bar, i) => {
      bar.stopAnimation();
      bar.setValue(IDLE_HEIGHTS[i]);
    });
  }, [active]);

  return (
    <View style={s.container}>
      {bars.map((bar, i) => (
        <Animated.View
          key={i}
          style={[s.bar, { height: bar, backgroundColor: color }]}
        />
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    height: 28,
    paddingVertical: 1,
  },
  bar: {
    width: 3,
    borderRadius: 2,
  },
});
