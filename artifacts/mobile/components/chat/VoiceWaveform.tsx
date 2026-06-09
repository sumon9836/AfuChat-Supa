import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";
import {
  useAnimationGuard,
  useAnimationGuardComposite,
} from "@/hooks/useAnimationGuard";

/**
 * VoiceWaveform — scrolling-history amplitude bars during voice recording.
 *
 * Two modes:
 *  • Live  — `amplitudes` prop is a 0–1 array (newest last).  Each bar springs
 *            to its target height so the waveform scrolls left on every sample.
 *  • Idle  — `amplitudes` is empty / not provided; 20 bars loop with random
 *            timing offsets as a "waiting" animation (same look as before).
 *
 * OOM guard: all 20 Animated.Value bars are registered with AnimationGuard on
 * mount.  Idle-mode Animated.loop instances are registered as CompositeAnimations
 * via useAnimationGuardComposite() so the guard can call .stop() on every loop
 * when the app backgrounds, preventing NativeAnimatedNodesManager heap pile-up.
 */

const N_BARS = 20;
const MIN_H = 2;
const MAX_H = 26;

const FALLBACK: ReadonlyArray<{ low: number; high: number; dur: number; phase: number }> = [
  { low: 4,  high: 18, dur: 340, phase: 0   },
  { low: 6,  high: 26, dur: 430, phase: 190 },
  { low: 3,  high: 14, dur: 280, phase: 70  },
  { low: 7,  high: 24, dur: 390, phase: 300 },
  { low: 3,  high: 20, dur: 460, phase: 130 },
  { low: 5,  high: 22, dur: 310, phase: 250 },
  { low: 4,  high: 16, dur: 410, phase: 210 },
  { low: 6,  high: 20, dur: 350, phase: 160 },
  { low: 3,  high: 22, dur: 290, phase: 80  },
  { low: 5,  high: 18, dur: 420, phase: 230 },
  { low: 4,  high: 24, dur: 380, phase: 310 },
  { low: 6,  high: 16, dur: 450, phase: 140 },
  { low: 3,  high: 20, dur: 330, phase: 270 },
  { low: 7,  high: 26, dur: 400, phase: 50  },
  { low: 4,  high: 14, dur: 260, phase: 200 },
  { low: 5,  high: 22, dur: 440, phase: 340 },
  { low: 3,  high: 18, dur: 360, phase: 100 },
  { low: 6,  high: 24, dur: 300, phase: 180 },
  { low: 4,  high: 16, dur: 480, phase: 260 },
  { low: 5,  high: 20, dur: 370, phase: 30  },
];

type Props = {
  active: boolean;
  color?: string;
  /** 0–1 per bar, oldest first / newest last. Omit for idle animation. */
  amplitudes?: number[];
};

export function VoiceWaveform({ active, color = "#FFFFFF", amplitudes }: Props) {
  const bars = useRef(
    Array.from({ length: N_BARS }, () => new Animated.Value(MIN_H))
  ).current;

  const phaseTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const loopAnims  = useRef<Animated.CompositeAnimation[]>([]);

  const hasLive = !!amplitudes && amplitudes.length > 0;

  // ── OOM guard registration ─────────────────────────────────────────────────
  // Register all 20 Animated.Value bars; they're stable for the component's
  // lifetime so a single useAnimationGuard() call covers them all.
  useAnimationGuard(...bars);

  // Register each Animated.loop instance as it's created so the guard can
  // call .stop() on them when the app backgrounds.
  const registerComposite = useAnimationGuardComposite();

  // ── Live mode: spring every bar toward its real amplitude ──────────────────
  useEffect(() => {
    if (!hasLive || !active) return;

    // Pad left with zeros so length is always N_BARS
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

  // ── Idle mode: random-loop fallback (used when no live data is available) ──
  useEffect(() => {
    if (hasLive) return;

    const stop = () => {
      phaseTimers.current.forEach(clearTimeout);
      phaseTimers.current = [];
      loopAnims.current.forEach((a) => a.stop());
      loopAnims.current = [];
      FALLBACK.forEach((c, i) => bars[i].setValue(c.low));
    };

    stop();
    if (!active) return;

    FALLBACK.forEach((cfg, i) => {
      const bar = bars[i];
      const startLoop = () => {
        const loop = Animated.loop(
          Animated.sequence([
            Animated.timing(bar, {
              toValue: cfg.high,
              duration: cfg.dur,
              useNativeDriver: false,
            }),
            Animated.timing(bar, {
              toValue: cfg.low,
              duration: Math.round(cfg.dur * 0.7),
              useNativeDriver: false,
            }),
          ])
        );
        loopAnims.current[i] = loop;
        // Register with the OOM guard so it can stop this loop on backgrounding
        registerComposite(loop);
        loop.start();
      };

      if (cfg.phase === 0) {
        startLoop();
      } else {
        phaseTimers.current[i] = setTimeout(startLoop, cfg.phase);
      }
    });

    return stop;
  }, [active, hasLive]);

  // ── Tear down idle loops the moment live data arrives ─────────────────────
  useEffect(() => {
    if (!hasLive) return;
    phaseTimers.current.forEach(clearTimeout);
    phaseTimers.current = [];
    loopAnims.current.forEach((a) => a.stop());
    loopAnims.current = [];
  }, [hasLive]);

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
