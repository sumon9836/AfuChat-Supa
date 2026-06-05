import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";

/**
 * VoiceWaveform — 7 animated bars that pulse while recording is active.
 * Uses React Native's built-in Animated API (no Reanimated) so it works
 * on every platform including Expo Go on Android.
 *
 * Each bar has a unique height range, duration, and phase offset so they
 * move independently and produce a natural-looking waveform.
 */

const BAR_CONFIGS = [
  { low: 4,  high: 18, dur: 340, phase: 0   },
  { low: 6,  high: 26, dur: 430, phase: 190 },
  { low: 3,  high: 14, dur: 280, phase: 70  },
  { low: 7,  high: 24, dur: 390, phase: 300 },
  { low: 3,  high: 20, dur: 460, phase: 130 },
  { low: 5,  high: 22, dur: 310, phase: 250 },
  { low: 4,  high: 16, dur: 410, phase: 210 },
] as const;

type Props = {
  active: boolean;
  color?: string;
};

export function VoiceWaveform({ active, color = "#FFFFFF" }: Props) {
  const bars = useRef(
    BAR_CONFIGS.map((c) => new Animated.Value(c.low))
  ).current;

  const phaseTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const loopAnims = useRef<Animated.CompositeAnimation[]>([]);

  useEffect(() => {
    // cleanup helper
    const stop = () => {
      phaseTimers.current.forEach(clearTimeout);
      phaseTimers.current = [];
      loopAnims.current.forEach((a) => a.stop());
      loopAnims.current = [];
      BAR_CONFIGS.forEach((c, i) => bars[i].setValue(c.low));
    };

    stop();
    if (!active) return;

    BAR_CONFIGS.forEach((cfg, i) => {
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
        loop.start();
      };

      if (cfg.phase === 0) {
        startLoop();
      } else {
        phaseTimers.current[i] = setTimeout(startLoop, cfg.phase);
      }
    });

    return stop;
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
    gap: 3,
    height: 28,
    paddingVertical: 2,
  },
  bar: {
    width: 3,
    borderRadius: 2,
  },
});
