import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  GestureResponderEvent,
  LayoutChangeEvent,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAudioPlayer, useAudioPlayerStatus, setAudioModeAsync } from "expo-audio";

interface AudioPlayerProps {
  uri: string;
  tintColor?: string;
  waveColor?: string;
}

const SPEEDS = [1, 1.5, 2] as const;
type Speed = typeof SPEEDS[number];

function formatTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

const BARS = 28;

function buildWaveBars(bars: number): number[] {
  return Array.from({ length: bars }, (_, i) => {
    const base = 0.3 + Math.sin(i * 0.85) * 0.25 + Math.cos(i * 1.4 + 0.6) * 0.15;
    return Math.max(0.15, Math.min(0.95, base));
  });
}

const WAVE_SHAPE = buildWaveBars(BARS);

// Shown before the user taps play — no audio loaded, no network request.
function AudioPlayerIdle({
  onPlay,
  tintColor,
  waveColor,
}: {
  onPlay: () => void;
  tintColor: string;
  waveColor?: string;
}) {
  const barColor = waveColor || tintColor;
  return (
    <View style={s.row}>
      <TouchableOpacity onPress={onPlay} hitSlop={8}>
        <Ionicons name="play" size={24} color={tintColor} />
      </TouchableOpacity>
      <View style={s.waveContainer}>
        {WAVE_SHAPE.map((h, i) => (
          <View
            key={i}
            style={[s.bar, { height: `${h * 100}%`, backgroundColor: `${barColor}40` }]}
          />
        ))}
      </View>
      <Text style={[s.speed, { color: tintColor, opacity: 0.45 }]}>1×</Text>
      <Text style={[s.time, { color: tintColor, opacity: 0.55 }]}>-:--</Text>
    </View>
  );
}

// Created only when the user taps play — loads + auto-plays the audio.
function AudioPlayerActive({ uri, tintColor = "#FFFFFF", waveColor }: AudioPlayerProps) {
  const player = useAudioPlayer({ uri }, 80);
  const status = useAudioPlayerStatus(player);
  const [speed, setSpeed] = useState<Speed>(1);
  const trackWidth = useRef(0);
  const barColor = waveColor || tintColor;
  const hasAutoPlayed = useRef(false);

  useEffect(() => {
    if (Platform.OS !== "web") {
      setAudioModeAsync({
        playsInSilentMode: true,
        shouldDuckAndroid: false,
        staysActiveInBackground: false,
      } as any).catch(() => {});
    }
  }, []);

  // Auto-play once the audio is loaded
  useEffect(() => {
    if (!hasAutoPlayed.current && status.isLoaded && !status.playing) {
      hasAutoPlayed.current = true;
      player.play();
    }
  }, [status.isLoaded]);

  useEffect(() => {
    if (status.didJustFinish) {
      player.seekTo(0).catch(() => {});
    }
  }, [status.didJustFinish]);

  const durationMs = (status.duration ?? 0) * 1000;
  const positionMs = (status.currentTime ?? 0) * 1000;
  const isPlaying = status.playing ?? false;
  const isLoaded = status.isLoaded ?? false;

  const progress = durationMs > 0 ? Math.min(1, positionMs / durationMs) : 0;
  const filled = Math.round(progress * BARS);

  const togglePlay = useCallback(async () => {
    if (!isLoaded) return;
    try {
      if (isPlaying) {
        player.pause();
      } else {
        if (positionMs >= durationMs && durationMs > 0) {
          await player.seekTo(0);
        }
        player.play();
      }
    } catch {}
  }, [isPlaying, positionMs, durationMs, isLoaded, player]);

  const cycleSpeed = useCallback(() => {
    if (!isLoaded) return;
    const idx = SPEEDS.indexOf(speed);
    const next = SPEEDS[(idx + 1) % SPEEDS.length];
    setSpeed(next);
    player.setPlaybackRate(next);
  }, [speed, isLoaded, player]);

  const seekFromTouch = useCallback(
    (e: GestureResponderEvent) => {
      if (!isLoaded || durationMs === 0) return;
      const { locationX } = e.nativeEvent;
      const ratio = Math.max(0, Math.min(1, locationX / (trackWidth.current || 1)));
      player.seekTo(ratio * (status.duration ?? 0)).catch(() => {});
    },
    [isLoaded, durationMs, status.duration, player]
  );

  const onTrackLayout = useCallback((e: LayoutChangeEvent) => {
    trackWidth.current = e.nativeEvent.layout.width;
  }, []);

  const displayTime =
    isPlaying || positionMs > 0 ? formatTime(positionMs) : formatTime(durationMs);

  return (
    <View style={s.row}>
      <TouchableOpacity onPress={togglePlay} hitSlop={8} disabled={!isLoaded}>
        {!isLoaded ? (
          <Ionicons name="ellipsis-horizontal" size={24} color={tintColor} style={{ opacity: 0.5 }} />
        ) : (
          <Ionicons name={isPlaying ? "pause" : "play"} size={24} color={tintColor} />
        )}
      </TouchableOpacity>

      <TouchableOpacity
        activeOpacity={0.85}
        style={s.waveContainer}
        onPress={seekFromTouch}
        onLayout={onTrackLayout}
      >
        {WAVE_SHAPE.map((h, i) => (
          <View
            key={i}
            style={[
              s.bar,
              {
                height: `${h * 100}%`,
                backgroundColor: i < filled ? barColor : `${barColor}40`,
              },
            ]}
          />
        ))}
      </TouchableOpacity>

      <TouchableOpacity onPress={cycleSpeed} hitSlop={8} disabled={!isLoaded}>
        <Text style={[s.speed, { color: tintColor, opacity: isLoaded ? 1 : 0.4 }]}>
          {speed}×
        </Text>
      </TouchableOpacity>

      <Text style={[s.time, { color: tintColor }]}>{displayTime}</Text>
    </View>
  );
}

// Public component: idle until the user taps play
export default function AudioPlayer({ uri, tintColor = "#FFFFFF", waveColor }: AudioPlayerProps) {
  const [active, setActive] = useState(false);

  if (!active) {
    return (
      <AudioPlayerIdle
        onPlay={() => setActive(true)}
        tintColor={tintColor}
        waveColor={waveColor}
      />
    );
  }

  return <AudioPlayerActive uri={uri} tintColor={tintColor} waveColor={waveColor} />;
}

const s = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minWidth: 200,
    paddingVertical: 4,
  },
  waveContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: 30,
    paddingVertical: 2,
  },
  bar: {
    flex: 1,
    borderRadius: 2,
    marginHorizontal: 1,
    minWidth: 2,
  },
  speed: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    minWidth: 24,
    textAlign: "center",
  },
  time: {
    fontSize: 12,
    fontVariant: ["tabular-nums"],
    minWidth: 34,
    textAlign: "right",
  },
});
