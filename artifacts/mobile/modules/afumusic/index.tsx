/**
 * AfuMusic — premium device music player.
 *
 * Features:
 *  • Rotating vinyl disc animation while playing
 *  • Animated equalizer bars on active track in library
 *  • Seekable progress bar
 *  • Playback speed control (0.5× – 2×)
 *  • Sleep timer with live countdown
 *  • Queue view showing current play order
 *  • Lock screen + notification controls via react-native-track-player
 *    (real Android MediaSession / MediaStyle — not custom notifications)
 *  • Background playback that survives app-kill
 *  • Fully safe in Expo Go (shows info screen instead of crashing)
 */

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Animated,
  Easing,
  FlatList,
  LayoutChangeEvent,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as MediaLibrary from "expo-media-library";
import { LinearGradient } from "@/components/ui/SafeGradient";
import { useTheme } from "@/hooks/useTheme";
import * as Haptics from "@/lib/haptics";
import { afuMusicPlayer, type MusicPlayerState } from "@/lib/afuMusicPlayer";

// ─── Types ───────────────────────────────────────────────────────────────────

type AppView = "library" | "player" | "queue";

// ─── Constants ───────────────────────────────────────────────────────────────

const ACCENT_COLORS = [
  "#5856D6", "#FF3B30", "#FF9500", "#34C759",
  "#AF52DE", "#007AFF", "#FF2D55", "#00BCD4",
];

const SPEEDS = [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0];
const SLEEP_OPTIONS: (number | null)[] = [null, 15, 30, 45, 60, 90]; // null = off

// ─── Helpers ─────────────────────────────────────────────────────────────────

function colorForTrack(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return ACCENT_COLORS[Math.abs(h) % ACCENT_COLORS.length];
}

function formatMs(ms: number): string {
  if (!ms || ms < 0) return "0:00";
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function trackTitle(a: MediaLibrary.Asset): string {
  return a.filename.replace(/\.[^.]+$/, "").replace(/[_-]/g, " ").trim();
}

function trackArtist(a: MediaLibrary.Asset): string {
  const p = a.filename.split(/[-–]/);
  return p.length >= 2 ? p[0].trim() : "Unknown Artist";
}

function fmtRate(r: number): string {
  return `${r}×`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/**
 * Animated equalizer bars — 4 bars that pulse up/down when playing.
 * Uses React Native Animated (not Reanimated) for stability on all archs.
 */
function EqBars({ isPlaying, color, size = 18 }: { isPlaying: boolean; color: string; size?: number }) {
  const b0 = useRef(new Animated.Value(0.35)).current;
  const b1 = useRef(new Animated.Value(0.65)).current;
  const b2 = useRef(new Animated.Value(0.4)).current;
  const b3 = useRef(new Animated.Value(0.55)).current;
  const animRefs = useRef<(Animated.CompositeAnimation | null)[]>([null, null, null, null]);

  useEffect(() => {
    animRefs.current.forEach(a => a?.stop());
    if (!isPlaying) {
      b0.setValue(0.25); b1.setValue(0.25); b2.setValue(0.25); b3.setValue(0.25);
      return;
    }
    const make = (b: Animated.Value, dur: number, maxV: number) =>
      Animated.loop(Animated.sequence([
        Animated.timing(b, { toValue: maxV, duration: dur, useNativeDriver: false }),
        Animated.timing(b, { toValue: 0.12, duration: Math.round(dur * 0.65), useNativeDriver: false }),
      ]));

    animRefs.current[0] = make(b0, 290, 0.88);
    animRefs.current[1] = make(b1, 360, 1.0);
    animRefs.current[2] = make(b2, 220, 0.75);
    animRefs.current[3] = make(b3, 310, 0.92);
    animRefs.current.forEach(a => a?.start());

    return () => { animRefs.current.forEach(a => a?.stop()); };
  }, [isPlaying]);

  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 2, width: size, height: size }}>
      {[b0, b1, b2, b3].map((b, i) => (
        <Animated.View
          key={i}
          style={{
            flex: 1,
            height: b.interpolate({ inputRange: [0, 1], outputRange: [2, size] }),
            backgroundColor: color,
            borderRadius: 1.5,
          }}
        />
      ))}
    </View>
  );
}

/**
 * Rotating vinyl disc — spins while playing, freezes in place when paused.
 */
function AlbumDisc({
  accentColor,
  isPlaying,
  size = 230,
}: {
  accentColor: string;
  isPlaying: boolean;
  size?: number;
}) {
  const spin = useRef(new Animated.Value(0)).current;
  const animRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    animRef.current?.stop();
    if (isPlaying) {
      animRef.current = Animated.loop(
        Animated.timing(spin, {
          toValue: 1,
          duration: 10000,
          useNativeDriver: true,
          easing: Easing.linear,
        })
      );
      animRef.current.start();
    }
  }, [isPlaying]);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });
  const R = size / 2;

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Animated.View
        style={[
          { width: size, height: size, borderRadius: R, overflow: "hidden" },
          { transform: [{ rotate }] },
          Platform.select({
            default: {
              shadowColor: accentColor,
              shadowOpacity: 0.55,
              shadowRadius: 28,
              shadowOffset: { width: 0, height: 10 },
              elevation: 22,
            },
            web: { boxShadow: `0 10px 40px ${accentColor}99` } as any,
          }),
        ]}
      >
        <LinearGradient
          colors={[accentColor, accentColor + "CC", "#0f0f1e", "#0a0a18"]}
          style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
        >
          {/* Groove rings */}
          {[0.88, 0.72, 0.58, 0.44].map((scale, i) => (
            <View
              key={i}
              style={{
                position: "absolute",
                width: size * scale,
                height: size * scale,
                borderRadius: (size * scale) / 2,
                borderWidth: 0.6,
                borderColor: "rgba(255,255,255,0.06)",
              }}
            />
          ))}
          {/* Center label */}
          <View
            style={{
              width: size * 0.3,
              height: size * 0.3,
              borderRadius: size * 0.15,
              backgroundColor: "#0a0a18",
              borderWidth: 1.5,
              borderColor: accentColor + "55",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {/* Spindle hole */}
            <View
              style={{
                width: 11,
                height: 11,
                borderRadius: 5.5,
                backgroundColor: accentColor + "99",
              }}
            />
          </View>
        </LinearGradient>
      </Animated.View>

      {/* Tonearm — shown when paused */}
      {!isPlaying && (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            right: -8,
            top: R * 0.1,
            width: 3,
            height: R * 0.55,
            backgroundColor: "rgba(200,200,200,0.35)",
            borderRadius: 2,
            transform: [{ rotate: "30deg" }],
          }}
        />
      )}
    </View>
  );
}

/**
 * Seekable progress bar with time labels.
 */
function ProgressBar({
  progress, position, duration, accentColor, colors, onSeek,
}: {
  progress: number; position: number; duration: number;
  accentColor: string; colors: any; onSeek: (ratio: number) => void;
}) {
  const [barW, setBarW] = useState(1);
  const pct = `${Math.max(0, Math.min(100, progress * 100))}%` as any;
  const thumbLeft = `${Math.max(0, Math.min(96, progress * 100))}%` as any;

  return (
    <View style={s.progressWrap}>
      <Pressable
        style={s.progressHit}
        onLayout={(e: LayoutChangeEvent) => setBarW(e.nativeEvent.layout.width || 1)}
        onPress={(e: any) => onSeek(Math.max(0, Math.min(1, e.nativeEvent.locationX / barW)))}
      >
        <View style={[s.progressTrack, { backgroundColor: colors.border + "60" }]}>
          <View style={[s.progressFill, { backgroundColor: accentColor, width: pct }]} />
          <View style={[s.progressThumb, { backgroundColor: "#fff", left: thumbLeft, shadowColor: accentColor }]} />
        </View>
      </Pressable>
      <View style={s.timesRow}>
        <Text style={[s.timeText, { color: colors.textMuted }]}>{formatMs(position)}</Text>
        <Text style={[s.timeText, { color: colors.textMuted }]}>{formatMs(duration)}</Text>
      </View>
    </View>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AfuMusicApp() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  // ── Permission ──────────────────────────────────────────────────────────────
  const [permGranted, setPermGranted] = useState(false);
  const [permChecked, setPermChecked] = useState(false);

  const requestPermission = useCallback(async () => {
    try {
      const res = await (MediaLibrary.requestPermissionsAsync as any)(false, ["audio"]);
      setPermGranted(res.granted ?? false);
    } catch {
      setPermGranted(false);
    }
    setPermChecked(true);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const perm = await MediaLibrary.getPermissionsAsync();
        setPermGranted(perm.granted ?? false);
      } catch {
        setPermGranted(false);
      }
      setPermChecked(true);
    })();
  }, []);

  // ── Player singleton state ──────────────────────────────────────────────────
  const [ps, setPs] = useState<MusicPlayerState>(() => afuMusicPlayer.getState());
  useEffect(() => afuMusicPlayer.subscribe(setPs), []);

  // ── View / search ────────────────────────────────────────────────────────────
  const [view, setView] = useState<AppView>("library");
  const [search, setSearch] = useState("");

  // ── Load device tracks ───────────────────────────────────────────────────────
  const scanStartedRef = useRef(false);
  useEffect(() => {
    if (!permGranted) return;
    if (ps.tracks.length > 0) return;
    if (scanStartedRef.current) return;
    scanStartedRef.current = true;

    let cancelled = false;
    (async () => {
      let after: string | undefined;
      let hasMore = true;
      while (hasMore && !cancelled) {
        try {
          const page = await MediaLibrary.getAssetsAsync({
            mediaType: MediaLibrary.MediaType.audio,
            sortBy: [MediaLibrary.SortBy.default ?? MediaLibrary.SortBy.creationTime],
            first: 100,
            after,
          });
          if (!cancelled && page.assets.length > 0) afuMusicPlayer.appendTracks(page.assets);
          hasMore = page.hasNextPage;
          after = page.endCursor;
        } catch { break; }
      }
    })();

    return () => { cancelled = true; };
  }, [permGranted, ps.tracks.length]);

  // ── Sleep timer countdown display ───────────────────────────────────────────
  const [sleepIdx, setSleepIdx] = useState(0);
  const [timerDisplay, setTimerDisplay] = useState<string | null>(null);

  useEffect(() => {
    if (!ps.sleepTimerEnd) { setTimerDisplay(null); setSleepIdx(0); return; }
    const tick = () => {
      const left = (ps.sleepTimerEnd ?? 0) - Date.now();
      if (left <= 0) { setTimerDisplay(null); return; }
      const totalSec = Math.ceil(left / 1000);
      const m = Math.floor(totalSec / 60);
      const sec = totalSec % 60;
      setTimerDisplay(m > 0 ? `${m}:${String(sec).padStart(2, "0")}` : `${sec}s`);
    };
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [ps.sleepTimerEnd]);

  // ── Derived values ──────────────────────────────────────────────────────────
  const { tracks, currentIndex, isPlaying, position, duration, shuffle, repeat, rate, queueMap } = ps;
  const currentTrack = currentIndex !== null ? tracks[currentIndex] : null;
  const progress = duration > 0 ? position / duration : 0;
  const accentColor = currentTrack ? colorForTrack(currentTrack.filename) : ACCENT_COLORS[0];
  const filtered = search.trim()
    ? tracks.filter(t => t.filename.toLowerCase().includes(search.toLowerCase()))
    : tracks;

  // ── Control handlers ────────────────────────────────────────────────────────
  function handleTrackTap(index: number) {
    Haptics.selectionAsync();
    afuMusicPlayer.tapTrack(index);
    setView("player");
  }
  function handlePlayPause() { Haptics.selectionAsync(); afuMusicPlayer.playPause(); }
  function handleNext()      { Haptics.selectionAsync(); afuMusicPlayer.playNext(); }
  function handlePrev()      { Haptics.selectionAsync(); afuMusicPlayer.playPrev(); }
  function handleSeek(r: number) { afuMusicPlayer.seekTo(r); }

  function handleCycleSpeed() {
    Haptics.selectionAsync();
    const idx = SPEEDS.findIndex(s => Math.abs(s - rate) < 0.01);
    afuMusicPlayer.setRate(SPEEDS[(idx < 0 ? 2 : idx + 1) % SPEEDS.length]);
  }

  function handleSleepTap() {
    Haptics.selectionAsync();
    const next = (sleepIdx + 1) % SLEEP_OPTIONS.length;
    setSleepIdx(next);
    afuMusicPlayer.setSleepTimer(SLEEP_OPTIONS[next] as number | null);
  }

  // ── Unavailable (Expo Go) ───────────────────────────────────────────────────
  if (ps.unavailable) {
    return (
      <View style={[s.center, { backgroundColor: colors.background, padding: 40 }]}>
        <LinearGradient colors={["#5856D6", "#7B79E8"]} style={s.bigIcon}>
          <Ionicons name="musical-notes" size={44} color="#fff" />
        </LinearGradient>
        <Text style={[s.pTitle, { color: colors.text }]}>AfuMusic</Text>
        <Text style={[s.pSub, { color: colors.textMuted }]}>
          Music playback requires the AfuChat APK or a development build.{"\n\n"}
          It is not available in Expo Go because it uses a native audio module
          that integrates directly with the Android MediaSession API.
        </Text>
      </View>
    );
  }

  // ── Web stub ────────────────────────────────────────────────────────────────
  if (Platform.OS === "web") {
    return (
      <View style={[s.center, { backgroundColor: colors.background, padding: 40 }]}>
        <LinearGradient colors={["#5856D6", "#7B79E8"]} style={s.bigIcon}>
          <Ionicons name="musical-notes" size={44} color="#fff" />
        </LinearGradient>
        <Text style={[s.pTitle, { color: colors.text }]}>AfuMusic</Text>
        <Text style={[s.pSub, { color: colors.textMuted }]}>
          Music playback from your device library is only available on Android.
        </Text>
      </View>
    );
  }

  // ── Permission loading ──────────────────────────────────────────────────────
  if (!permChecked) return <View style={{ flex: 1, backgroundColor: colors.background }} />;

  // ── Permission wall ─────────────────────────────────────────────────────────
  if (!permGranted) {
    return (
      <View style={[s.center, { backgroundColor: colors.background, padding: 32 }]}>
        <LinearGradient colors={["#5856D6", "#7B79E8"]} style={s.bigIcon}>
          <Ionicons name="musical-notes" size={44} color="#fff" />
        </LinearGradient>
        <Text style={[s.pTitle, { color: colors.text }]}>Music Library</Text>
        <Text style={[s.pSub, { color: colors.textMuted }]}>
          AfuMusic needs access to your device's music library to play your songs.
        </Text>
        <TouchableOpacity style={[s.pBtn, { backgroundColor: "#5856D6" }]} onPress={requestPermission} activeOpacity={0.85}>
          <Ionicons name="lock-open" size={18} color="#fff" />
          <Text style={s.pBtnText}>Allow Access</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Queue view ──────────────────────────────────────────────────────────────
  if (view === "queue") {
    const queueTracks = queueMap.map(idx => tracks[idx]).filter(Boolean);
    const currentQueuePos = currentIndex !== null ? queueMap.indexOf(currentIndex) : -1;

    return (
      <View style={[s.root, { backgroundColor: colors.background }]}>
        <View style={[s.qHeader, { paddingTop: insets.top + 10, borderBottomColor: colors.border }]}>
          <TouchableOpacity hitSlop={14} onPress={() => setView("player")}>
            <Ionicons name="chevron-down" size={26} color={colors.text} />
          </TouchableOpacity>
          <View style={{ alignItems: "center" }}>
            <Text style={[s.qTitle, { color: colors.text }]}>Up Next</Text>
            <Text style={[s.qSub, { color: colors.textMuted }]}>
              {queueTracks.length} track{queueTracks.length !== 1 ? "s" : ""}
              {shuffle ? " · Shuffle on" : ""}
            </Text>
          </View>
          <View style={{ width: 26 }} />
        </View>

        {queueTracks.length === 0 ? (
          <View style={s.center}>
            <Ionicons name="list-outline" size={44} color={colors.textMuted} />
            <Text style={[s.emptyTitle, { color: colors.text }]}>No queue yet</Text>
            <Text style={[s.emptySub, { color: colors.textMuted }]}>Tap a track in the library to start playing.</Text>
          </View>
        ) : (
          <FlatList
            data={queueMap}
            keyExtractor={(_, i) => String(i)}
            contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
            renderItem={({ item: tIdx, index: qPos }) => {
              const track = tracks[tIdx];
              if (!track) return null;
              const isActive = tIdx === currentIndex;
              const color = colorForTrack(track.filename);
              return (
                <TouchableOpacity
                  style={[s.trackRow, isActive && { backgroundColor: color + "14" }]}
                  onPress={() => { afuMusicPlayer.tapTrack(tIdx); }}
                  activeOpacity={0.75}
                >
                  <View style={[s.trackThumb, { backgroundColor: color + "22" }]}>
                    {isActive && isPlaying
                      ? <EqBars isPlaying color={color} />
                      : <Ionicons name={isActive ? "play" : "musical-note"} size={17} color={color} />
                    }
                  </View>
                  <View style={s.trackInfo}>
                    <Text style={[s.trackTitle, { color: isActive ? color : colors.text }]} numberOfLines={1}>
                      {trackTitle(track)}
                    </Text>
                    <Text style={[s.trackArtist, { color: colors.textMuted }]} numberOfLines={1}>
                      {trackArtist(track)}
                      {track.duration ? ` · ${formatMs(track.duration * 1000)}` : ""}
                    </Text>
                  </View>
                  {isActive
                    ? <Text style={[s.nowLabel, { color, backgroundColor: color + "20" }]}>NOW</Text>
                    : <Text style={[s.qPos, { color: colors.textMuted }]}>{qPos + 1}</Text>
                  }
                </TouchableOpacity>
              );
            }}
          />
        )}
      </View>
    );
  }

  // ── Player view ─────────────────────────────────────────────────────────────
  if (view === "player") {
    return (
      <View style={[s.root, { backgroundColor: colors.background }]}>
        {/* Accent background tint */}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: accentColor + "12" }]} />

        <View style={[s.playerScreen, { paddingTop: insets.top + 6, paddingBottom: insets.bottom + 16 }]}>
          {/* Top bar */}
          <View style={s.playerTopBar}>
            <TouchableOpacity hitSlop={14} onPress={() => setView("library")} style={s.downBtn}>
              <Ionicons name="chevron-down" size={28} color={colors.text} />
            </TouchableOpacity>
            <View style={{ alignItems: "center" }}>
              <Text style={[s.nowPlaying, { color: colors.textMuted }]}>NOW PLAYING</Text>
            </View>
            <TouchableOpacity hitSlop={14} onPress={() => setView("queue")} style={s.queueBtn}>
              <Ionicons name="list" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Disc */}
          <View style={s.discWrap}>
            <AlbumDisc accentColor={accentColor} isPlaying={isPlaying} />
          </View>

          {/* Track info */}
          <View style={s.trackInfoWrap}>
            <Text style={[s.playerTitle, { color: colors.text }]} numberOfLines={2}>
              {currentTrack ? trackTitle(currentTrack) : "Nothing playing"}
            </Text>
            <Text style={[s.playerArtist, { color: colors.textSecondary }]} numberOfLines={1}>
              {currentTrack ? trackArtist(currentTrack) : "Select a track from the library"}
            </Text>
          </View>

          {/* Progress */}
          <ProgressBar
            progress={progress}
            position={position}
            duration={duration}
            accentColor={accentColor}
            colors={colors}
            onSeek={handleSeek}
          />

          {/* Main controls */}
          <View style={s.controls}>
            <TouchableOpacity hitSlop={16} onPress={() => { Haptics.selectionAsync(); afuMusicPlayer.toggleShuffle(); }}>
              <Ionicons
                name="shuffle"
                size={23}
                color={shuffle ? accentColor : colors.textMuted}
              />
            </TouchableOpacity>
            <TouchableOpacity hitSlop={12} onPress={handlePrev}>
              <Ionicons name="play-skip-back" size={32} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.playBtn, { backgroundColor: accentColor }]}
              onPress={handlePlayPause}
              activeOpacity={0.85}
            >
              <Ionicons
                name={isPlaying ? "pause" : "play"}
                size={32}
                color="#fff"
                style={!isPlaying ? { marginLeft: 3 } : undefined}
              />
            </TouchableOpacity>
            <TouchableOpacity hitSlop={12} onPress={handleNext}>
              <Ionicons name="play-skip-forward" size={32} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity
              hitSlop={16}
              onPress={() => { Haptics.selectionAsync(); afuMusicPlayer.toggleRepeat(); }}
              style={{ alignItems: "center" }}
            >
              <Ionicons
                name={repeat === "one" ? "repeat-outline" : "repeat"}
                size={23}
                color={repeat !== "none" ? accentColor : colors.textMuted}
              />
              {repeat === "one" && (
                <View style={[s.repeatOneDot, { backgroundColor: accentColor }]} />
              )}
            </TouchableOpacity>
          </View>

          {/* Secondary controls — speed · sleep timer · queue */}
          <View style={s.secondary}>
            {/* Speed */}
            <TouchableOpacity
              style={[s.pill, {
                borderColor: rate !== 1.0 ? accentColor : colors.border,
                backgroundColor: rate !== 1.0 ? accentColor + "18" : "transparent",
              }]}
              onPress={handleCycleSpeed}
              activeOpacity={0.75}
            >
              <Ionicons name="speedometer-outline" size={13} color={rate !== 1.0 ? accentColor : colors.textMuted} />
              <Text style={[s.pillText, { color: rate !== 1.0 ? accentColor : colors.textSecondary }]}>
                {fmtRate(rate)}
              </Text>
            </TouchableOpacity>

            {/* Sleep timer */}
            <TouchableOpacity
              style={[s.pill, {
                borderColor: timerDisplay ? accentColor : colors.border,
                backgroundColor: timerDisplay ? accentColor + "18" : "transparent",
              }]}
              onPress={handleSleepTap}
              activeOpacity={0.75}
            >
              <Ionicons name="moon-outline" size={13} color={timerDisplay ? accentColor : colors.textMuted} />
              {timerDisplay ? (
                <Text style={[s.pillText, { color: accentColor }]}>{timerDisplay}</Text>
              ) : (
                <Text style={[s.pillText, { color: colors.textSecondary }]}>Sleep</Text>
              )}
            </TouchableOpacity>

            {/* Queue */}
            <TouchableOpacity
              style={[s.pill, { borderColor: colors.border }]}
              onPress={() => setView("queue")}
              activeOpacity={0.75}
            >
              <Ionicons name="list-outline" size={13} color={colors.textMuted} />
              <Text style={[s.pillText, { color: colors.textSecondary }]}>
                {queueMap.length > 0 ? `Queue · ${queueMap.length}` : "Queue"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Track counter */}
          {tracks.length > 0 && (
            <Text style={[s.trackCount, { color: colors.textMuted }]}>
              {currentIndex !== null ? currentIndex + 1 : "—"} / {tracks.length}
            </Text>
          )}
        </View>
      </View>
    );
  }

  // ── Library view ────────────────────────────────────────────────────────────
  return (
    <View style={[s.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[s.libHeader, { paddingTop: insets.top + 10, borderBottomColor: colors.border }]}>
        <View style={s.libHeaderLeft}>
          <View style={[s.libIcon, { backgroundColor: accentColor + "22" }]}>
            <Ionicons name="musical-notes" size={18} color={accentColor} />
          </View>
          <View>
            <Text style={[s.libTitle, { color: colors.text }]}>AfuMusic</Text>
            <Text style={[s.libCount, { color: colors.textMuted }]}>
              {tracks.length > 0 ? `${tracks.length} songs` : "Scanning…"}
            </Text>
          </View>
        </View>
        {currentTrack && (
          <TouchableOpacity hitSlop={12} onPress={() => setView("player")}>
            <Ionicons name="chevron-up-circle" size={28} color={accentColor} />
          </TouchableOpacity>
        )}
      </View>

      {/* Search */}
      <View style={[s.searchWrap, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
        <Ionicons name="search" size={15} color={colors.textMuted} />
        <TextInput
          style={[s.searchInput, { color: colors.text }]}
          placeholder="Search songs…"
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={setSearch}
          autoCorrect={false}
          autoCapitalize="none"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch("")}>
            <Ionicons name="close-circle" size={15} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Track list */}
      {filtered.length === 0 && tracks.length === 0 ? (
        <View style={s.center}>
          <Ionicons name="musical-notes-outline" size={56} color={colors.textMuted} />
          <Text style={[s.emptyTitle, { color: colors.text }]}>Scanning your music…</Text>
          <Text style={[s.emptySub, { color: colors.textMuted }]}>Songs will appear here as they are found.</Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={s.center}>
          <Ionicons name="search-outline" size={40} color={colors.textMuted} />
          <Text style={[s.emptyTitle, { color: colors.text }]}>No results for "{search}"</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            paddingBottom: currentTrack ? 88 + insets.bottom : insets.bottom + 16,
          }}
          showsVerticalScrollIndicator={false}
          windowSize={10}
          maxToRenderPerBatch={15}
          initialNumToRender={25}
          removeClippedSubviews
          renderItem={({ item }) => {
            const realIdx = tracks.indexOf(item);
            const isActive = realIdx === currentIndex;
            const color = colorForTrack(item.filename);
            return (
              <TouchableOpacity
                style={[s.trackRow, isActive && { backgroundColor: color + "12" }]}
                onPress={() => handleTrackTap(realIdx)}
                activeOpacity={0.75}
              >
                <View style={[s.trackThumb, { backgroundColor: color + "22" }]}>
                  {isActive && isPlaying
                    ? <EqBars isPlaying color={color} />
                    : <Ionicons name={isActive ? "play" : "musical-note"} size={17} color={color} />
                  }
                </View>
                <View style={s.trackInfo}>
                  <Text style={[s.trackTitle, { color: isActive ? color : colors.text }]} numberOfLines={1}>
                    {trackTitle(item)}
                  </Text>
                  <Text style={[s.trackArtist, { color: colors.textMuted }]} numberOfLines={1}>
                    {trackArtist(item)}
                    {item.duration ? ` · ${formatMs(item.duration * 1000)}` : ""}
                  </Text>
                </View>
                {isActive && isPlaying && (
                  <View style={[s.activeDot, { backgroundColor: color }]} />
                )}
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* Mini player */}
      {currentTrack && (
        <TouchableOpacity
          style={[s.mini, {
            backgroundColor: accentColor,
            bottom: insets.bottom + 8,
            ...Platform.select({
              default: { shadowColor: accentColor, shadowOpacity: 0.5, shadowRadius: 16, elevation: 12 },
              web: { boxShadow: `0 4px 20px ${accentColor}88` } as any,
            }),
          }]}
          onPress={() => setView("player")}
          activeOpacity={0.92}
        >
          {/* Disc thumbnail */}
          <View style={[s.miniDisc, { backgroundColor: "rgba(0,0,0,0.25)" }]}>
            <EqBars isPlaying={isPlaying} color="#fff" size={16} />
          </View>

          <View style={s.miniInfo}>
            <Text style={s.miniTitle} numberOfLines={1}>{trackTitle(currentTrack)}</Text>
            <Text style={s.miniArtist} numberOfLines={1}>{trackArtist(currentTrack)}</Text>
          </View>

          <TouchableOpacity hitSlop={10} onPress={handlePrev} style={s.miniBtn}>
            <Ionicons name="play-skip-back" size={19} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity hitSlop={10} onPress={handlePlayPause} style={s.miniBtn}>
            <Ionicons name={isPlaying ? "pause" : "play"} size={22} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity hitSlop={10} onPress={handleNext} style={s.miniBtn}>
            <Ionicons name="play-skip-forward" size={19} color="#fff" />
          </TouchableOpacity>

          {/* Progress line */}
          <View style={s.miniProgressBg}>
            <View style={[s.miniProgressFill, { width: `${Math.max(0, Math.min(100, progress * 100))}%` as any }]} />
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 12 },

  // Unavailable / permission screens
  bigIcon: { width: 88, height: 88, borderRadius: 26, alignItems: "center", justifyContent: "center", marginBottom: 10 },
  pTitle: { fontSize: 22, fontFamily: "Inter_700Bold", textAlign: "center" },
  pSub: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 21 },
  pBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 26, paddingVertical: 14, borderRadius: 14, marginTop: 8 },
  pBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },

  // Library header
  libHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  libHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  libIcon: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  libTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  libCount: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },

  // Search
  searchWrap: {
    flexDirection: "row", alignItems: "center", gap: 8,
    marginHorizontal: 16, marginVertical: 10,
    borderRadius: 12, borderWidth: 1,
    paddingHorizontal: 12, paddingVertical: 9,
  },
  searchInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular" },

  // Empty states
  emptyTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  emptySub: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },

  // Track rows
  trackRow: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 11, gap: 12,
  },
  trackThumb: { width: 42, height: 42, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  trackInfo: { flex: 1 },
  trackTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", marginBottom: 2 },
  trackArtist: { fontSize: 12, fontFamily: "Inter_400Regular" },
  activeDot: { width: 6, height: 6, borderRadius: 3 },

  // Mini player
  mini: {
    position: "absolute", left: 12, right: 12,
    borderRadius: 20, flexDirection: "row", alignItems: "center",
    paddingHorizontal: 14, paddingVertical: 11, gap: 10, overflow: "hidden",
  },
  miniDisc: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  miniInfo: { flex: 1 },
  miniTitle: { color: "#fff", fontSize: 13, fontFamily: "Inter_600SemiBold" },
  miniArtist: { color: "rgba(255,255,255,0.75)", fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },
  miniBtn: { padding: 4 },
  miniProgressBg: { position: "absolute", bottom: 0, left: 0, right: 0, height: 3, backgroundColor: "rgba(0,0,0,0.2)" },
  miniProgressFill: { height: 3, backgroundColor: "rgba(255,255,255,0.6)", borderRadius: 1.5 },

  // Player screen
  playerScreen: { flex: 1, paddingHorizontal: 24, alignItems: "center" },
  playerTopBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", width: "100%", marginBottom: 6 },
  downBtn: { padding: 6 },
  queueBtn: { padding: 6 },
  nowPlaying: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 1.5 },

  discWrap: { flex: 1, alignItems: "center", justifyContent: "center", maxHeight: 280 },

  trackInfoWrap: { width: "100%", marginTop: 20, marginBottom: 8 },
  playerTitle: { fontSize: 22, fontFamily: "Inter_700Bold", lineHeight: 28 },
  playerArtist: { fontSize: 15, fontFamily: "Inter_400Regular", marginTop: 4 },

  // Progress bar
  progressWrap: { width: "100%", marginVertical: 16 },
  progressHit: { paddingVertical: 10 },
  progressTrack: { height: 4, borderRadius: 2, width: "100%", position: "relative" },
  progressFill: { position: "absolute", left: 0, top: 0, bottom: 0, borderRadius: 2 },
  progressThumb: {
    position: "absolute", top: -5, width: 14, height: 14, borderRadius: 7,
    marginLeft: -7, shadowOpacity: 0.3, shadowRadius: 4, elevation: 4,
  },
  timesRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 4 },
  timeText: { fontSize: 12, fontFamily: "Inter_400Regular" },

  // Main controls
  controls: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", width: "100%", marginVertical: 8 },
  playBtn: { width: 68, height: 68, borderRadius: 34, alignItems: "center", justifyContent: "center" },
  repeatOneDot: { width: 5, height: 5, borderRadius: 2.5, marginTop: 2 },

  // Secondary controls (pills)
  secondary: { flexDirection: "row", gap: 10, marginTop: 14, flexWrap: "wrap", justifyContent: "center" },
  pill: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1,
  },
  pillText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },

  trackCount: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 10 },

  // Queue view
  qHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  qTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  qSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  nowLabel: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 0.8, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6 },
  qPos: { fontSize: 12, fontFamily: "Inter_400Regular", minWidth: 20, textAlign: "right" },
});
