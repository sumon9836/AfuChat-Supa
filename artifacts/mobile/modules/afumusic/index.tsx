/**
 * AfuMusic — offline device music player.
 *
 * Design goals:
 *  - Fully offline: reads only from the device's MediaLibrary, no network calls.
 *  - No loading spinner: tracks stream into the list as each page loads.
 *  - No stale closures: all playback-control callbacks read from refs so
 *    repeat/shuffle changes are reflected immediately even mid-song.
 *  - No 3rd-party push notifications: playing status lives only in the UI.
 */

import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
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
import { Audio } from "expo-av";
import * as MediaLibrary from "expo-media-library";
import { LinearGradient } from "@/components/ui/SafeGradient";
import { useTheme } from "@/hooks/useTheme";
import * as Haptics from "@/lib/haptics";

// ─── Types ───────────────────────────────────────────────────────────────────

type AppView = "library" | "player";
type RepeatMode = "none" | "one" | "all";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const ACCENT_COLORS = [
  "#5856D6", "#FF3B30", "#FF9500", "#34C759",
  "#AF52DE", "#007AFF", "#FF2D55", "#00BCD4",
];

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

// ─── Component ───────────────────────────────────────────────────────────────

export default function AfuMusicApp() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  // ── Permission ──────────────────────────────────────────────────────────────
  // We never show a spinner for the permission check — we just show
  // "Allow Access" immediately if not granted.
  const [permGranted, setPermGranted] = useState(false);
  const [permChecked, setPermChecked] = useState(false);

  const requestPermission = useCallback(async () => {
    try {
      const res = await MediaLibrary.requestPermissionsAsync();
      setPermGranted(res.granted);
    } catch {
      setPermGranted(false);
    }
    setPermChecked(true);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const { granted } = await MediaLibrary.getPermissionsAsync();
        setPermGranted(granted);
      } catch {
        setPermGranted(false);
      }
      setPermChecked(true);
    })();
  }, []);

  // ── Library ─────────────────────────────────────────────────────────────────
  const [tracks, setTracks] = useState<MediaLibrary.Asset[]>([]);
  const [view, setView] = useState<AppView>("library");
  const [search, setSearch] = useState("");

  // Stream tracks in progressively — each page of 100 is appended immediately
  // so the list populates as the scan runs, with no blocking spinner.
  useEffect(() => {
    if (!permGranted) return;
    let cancelled = false;
    (async () => {
      let after: string | undefined;
      let hasMore = true;
      while (hasMore && !cancelled) {
        try {
          const page = await MediaLibrary.getAssetsAsync({
            mediaType: MediaLibrary.MediaType.audio,
            sortBy: [MediaLibrary.SortBy.default],
            first: 100,
            after,
          });
          if (!cancelled && page.assets.length > 0) {
            setTracks(prev => [...prev, ...page.assets]);
          }
          hasMore = page.hasNextPage;
          after = page.endCursor;
        } catch {
          break;
        }
      }
    })();
    return () => { cancelled = true; };
  }, [permGranted]);

  // ── Playback state ──────────────────────────────────────────────────────────
  const [currentIndex, setCurrentIndex] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<RepeatMode>("none");

  const soundRef = useRef<Audio.Sound | null>(null);

  // ── Refs so finish/next/prev callbacks are never stale ─────────────────────
  const repeatRef = useRef<RepeatMode>("none");
  const shuffleRef = useRef(false);
  const tracksRef = useRef<MediaLibrary.Asset[]>([]);
  const currentIndexRef = useRef<number | null>(null);
  const shuffleOrderRef = useRef<number[]>([]);
  const shufflePosRef = useRef(0);

  useLayoutEffect(() => { repeatRef.current = repeat; }, [repeat]);
  useLayoutEffect(() => { shuffleRef.current = shuffle; }, [shuffle]);
  useLayoutEffect(() => { tracksRef.current = tracks; }, [tracks]);
  useLayoutEffect(() => { currentIndexRef.current = currentIndex; }, [currentIndex]);

  // ── Audio session setup ─────────────────────────────────────────────────────
  useEffect(() => {
    Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      staysActiveInBackground: true,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    }).catch(() => {});
    return () => {
      soundRef.current?.unloadAsync().catch(() => {});
    };
  }, []);

  // ── Shuffle helper ──────────────────────────────────────────────────────────
  function buildShuffleOrder(length: number) {
    const order = Array.from({ length }, (_, i) => i);
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    shuffleOrderRef.current = order;
    shufflePosRef.current = 0;
  }

  // ── Core playback ───────────────────────────────────────────────────────────
  // loadAndPlayRef lets handleFinish call the latest loadAndPlay without
  // needing to capture it in the status callback closure at create time.
  const loadAndPlayRef = useRef<(index: number) => Promise<void>>();

  const handleFinish = useCallback(() => {
    const rep = repeatRef.current;
    const shuf = shuffleRef.current;
    const trks = tracksRef.current;
    const ci = currentIndexRef.current ?? 0;

    if (rep === "one") {
      soundRef.current?.replayAsync().catch(() => {});
      return;
    }
    if (shuf) {
      shufflePosRef.current = (shufflePosRef.current + 1) % shuffleOrderRef.current.length;
      loadAndPlayRef.current?.(shuffleOrderRef.current[shufflePosRef.current]);
    } else {
      const next = (ci + 1) % trks.length;
      if (rep === "all" || next !== 0) {
        loadAndPlayRef.current?.(next);
      } else {
        setIsPlaying(false);
      }
    }
  }, []);

  const loadAndPlay = useCallback(async (index: number) => {
    const trks = tracksRef.current;
    if (index < 0 || index >= trks.length) return;
    try {
      if (soundRef.current) {
        await soundRef.current.stopAsync().catch(() => {});
        await soundRef.current.unloadAsync().catch(() => {});
        soundRef.current = null;
      }
      setCurrentIndex(index);
      setPosition(0);
      setDuration(0);
      setIsPlaying(false);

      const { sound } = await Audio.Sound.createAsync(
        { uri: trks[index].uri },
        { shouldPlay: true, progressUpdateIntervalMillis: 500 },
        (status) => {
          if (!status.isLoaded) return;
          setPosition(status.positionMillis ?? 0);
          setDuration((status as any).durationMillis ?? 0);
          setIsPlaying(status.isPlaying ?? false);
          if ((status as any).didJustFinish) handleFinish();
        },
      );
      soundRef.current = sound;
      setIsPlaying(true);
    } catch {}
  }, [handleFinish]);

  useLayoutEffect(() => { loadAndPlayRef.current = loadAndPlay; }, [loadAndPlay]);

  // ── Controls ────────────────────────────────────────────────────────────────
  async function playPause() {
    if (!soundRef.current) {
      if (currentIndexRef.current !== null) await loadAndPlay(currentIndexRef.current);
      return;
    }
    try {
      const status = await soundRef.current.getStatusAsync();
      if (!status.isLoaded) return;
      if (status.isPlaying) await soundRef.current.pauseAsync();
      else await soundRef.current.playAsync();
    } catch {}
    Haptics.selectionAsync();
  }

  async function playNext() {
    const trks = tracksRef.current;
    if (trks.length === 0) return;
    const ci = currentIndexRef.current ?? 0;
    if (shuffleRef.current) {
      shufflePosRef.current = (shufflePosRef.current + 1) % shuffleOrderRef.current.length;
      await loadAndPlay(shuffleOrderRef.current[shufflePosRef.current]);
    } else {
      await loadAndPlay((ci + 1) % trks.length);
    }
    Haptics.selectionAsync();
  }

  async function playPrev() {
    const trks = tracksRef.current;
    if (trks.length === 0) return;
    if (position > 3000) {
      await soundRef.current?.setPositionAsync(0);
      return;
    }
    const ci = currentIndexRef.current ?? 0;
    await loadAndPlay((ci - 1 + trks.length) % trks.length);
    Haptics.selectionAsync();
  }

  async function seekTo(ratio: number) {
    if (!soundRef.current || duration === 0) return;
    const ms = Math.floor(ratio * duration);
    await soundRef.current.setPositionAsync(ms);
    setPosition(ms);
  }

  function handleTrackTap(index: number) {
    Haptics.selectionAsync();
    if (shuffleRef.current && shuffleOrderRef.current.length !== tracksRef.current.length) {
      buildShuffleOrder(tracksRef.current.length);
    }
    loadAndPlay(index);
    setView("player");
  }

  function toggleShuffle() {
    const next = !shuffleRef.current;
    setShuffle(next);
    if (next) buildShuffleOrder(tracksRef.current.length);
    Haptics.selectionAsync();
  }

  function toggleRepeat() {
    setRepeat(r => r === "none" ? "all" : r === "all" ? "one" : "none");
    Haptics.selectionAsync();
  }

  // ── Derived ─────────────────────────────────────────────────────────────────
  const currentTrack = currentIndex !== null ? tracks[currentIndex] : null;
  const progress = duration > 0 ? position / duration : 0;
  const accentColor = currentTrack ? colorForTrack(currentTrack.filename) : "#5856D6";
  const filtered = search.trim()
    ? tracks.filter(t => t.filename.toLowerCase().includes(search.toLowerCase()))
    : tracks;

  // ── Web stub ─────────────────────────────────────────────────────────────────
  if (Platform.OS === "web") {
    return (
      <View style={[s.center, { backgroundColor: colors.background, padding: 40 }]}>
        <LinearGradient colors={["#5856D6", "#7B79E8"]} style={s.permIcon}>
          <Ionicons name="musical-notes" size={40} color="#fff" />
        </LinearGradient>
        <Text style={[s.permTitle, { color: colors.text, textAlign: "center" }]}>AfuMusic</Text>
        <Text style={[s.permSub, { color: colors.textMuted, textAlign: "center" }]}>
          Music playback from your device is only available on the Android app.
        </Text>
      </View>
    );
  }

  // ── Permission wall (shown only if not yet granted) ──────────────────────────
  // We wait until `permChecked` to avoid flashing the permission screen briefly
  // before the async check finishes. Until then, render nothing (blank).
  if (!permChecked) return <View style={{ flex: 1, backgroundColor: colors.background }} />;

  if (!permGranted) {
    return (
      <View style={[s.center, { backgroundColor: colors.background, padding: 32 }]}>
        <LinearGradient colors={["#5856D6", "#7B79E8"]} style={s.permIcon}>
          <Ionicons name="musical-notes" size={40} color="#fff" />
        </LinearGradient>
        <Text style={[s.permTitle, { color: colors.text }]}>Music Library</Text>
        <Text style={[s.permSub, { color: colors.textMuted }]}>
          AfuMusic needs access to your device's music library to play your songs.
        </Text>
        <TouchableOpacity
          style={[s.permBtn, { backgroundColor: "#5856D6" }]}
          onPress={requestPermission}
          activeOpacity={0.85}
        >
          <Ionicons name="lock-open" size={18} color="#fff" />
          <Text style={s.permBtnText}>Allow Access</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Player screen ─────────────────────────────────────────────────────────────
  if (view === "player") {
    return (
      <View style={[s.root, { backgroundColor: colors.background }]}>
        <View style={[s.playerScreen, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 20 }]}>
          <TouchableOpacity style={s.downBtn} onPress={() => setView("library")}>
            <Ionicons name="chevron-down" size={28} color={colors.textSecondary} />
          </TouchableOpacity>

          <View style={s.albumWrap}>
            <LinearGradient colors={[accentColor, accentColor + "88"]} style={s.albumArt}>
              <Ionicons name="musical-notes" size={80} color="rgba(255,255,255,0.9)" />
            </LinearGradient>
          </View>

          <View style={s.trackInfoWrap}>
            <Text style={[s.playerTitle, { color: colors.text }]} numberOfLines={2}>
              {currentTrack ? trackTitle(currentTrack) : "Nothing playing"}
            </Text>
            <Text style={[s.playerArtist, { color: colors.textSecondary }]} numberOfLines={1}>
              {currentTrack ? trackArtist(currentTrack) : "Select a track from the library"}
            </Text>
          </View>

          <ProgressBar
            progress={progress}
            position={position}
            duration={duration}
            accentColor={accentColor}
            colors={colors}
            onSeek={seekTo}
          />

          <View style={s.controls}>
            <TouchableOpacity hitSlop={16} onPress={toggleShuffle}>
              <Ionicons name="shuffle" size={22} color={shuffle ? accentColor : colors.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity hitSlop={12} onPress={playPrev}>
              <Ionicons name="play-skip-back" size={30} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity style={[s.playBtn, { backgroundColor: accentColor }]} onPress={playPause}>
              <Ionicons
                name={isPlaying ? "pause" : "play"}
                size={30}
                color="#fff"
                style={!isPlaying && { marginLeft: 3 }}
              />
            </TouchableOpacity>
            <TouchableOpacity hitSlop={12} onPress={playNext}>
              <Ionicons name="play-skip-forward" size={30} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity hitSlop={16} onPress={toggleRepeat} style={{ alignItems: "center" }}>
              <Ionicons
                name={repeat === "one" ? "repeat-outline" : "repeat"}
                size={22}
                color={repeat !== "none" ? accentColor : colors.textMuted}
              />
              {repeat === "one" && (
                <View style={[s.repeatOneDot, { backgroundColor: accentColor }]} />
              )}
            </TouchableOpacity>
          </View>

          {tracks.length > 0 && (
            <Text style={[s.trackCount, { color: colors.textMuted }]}>
              {currentIndex !== null ? currentIndex + 1 : "—"} / {tracks.length}
            </Text>
          )}
        </View>
      </View>
    );
  }

  // ── Library screen ────────────────────────────────────────────────────────────
  return (
    <View style={[s.root, { backgroundColor: colors.background }]}>
      <View style={[s.libraryHeader, { paddingTop: insets.top + 6, borderBottomColor: colors.border }]}>
        <Text style={[s.libraryTitle, { color: colors.text }]}>Music Library</Text>
        <Text style={[s.libraryCount, { color: colors.textMuted }]}>
          {tracks.length > 0 ? `${tracks.length} songs` : "Scanning…"}
        </Text>
      </View>

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

      {filtered.length === 0 && tracks.length === 0 ? (
        // Still scanning — show empty list with a subtle hint (no spinner)
        <View style={s.center}>
          <Ionicons name="musical-notes-outline" size={56} color={colors.textMuted} />
          <Text style={[s.emptyTitle, { color: colors.text }]}>Scanning your music…</Text>
          <Text style={[s.emptySub, { color: colors.textMuted }]}>
            Songs will appear here as they are found.
          </Text>
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
          contentContainerStyle={{ paddingBottom: currentTrack ? 96 + insets.bottom : insets.bottom + 16 }}
          showsVerticalScrollIndicator={false}
          windowSize={10}
          maxToRenderPerBatch={15}
          initialNumToRender={25}
          removeClippedSubviews
          renderItem={({ item }) => {
            const realIndex = tracks.indexOf(item);
            const active = realIndex === currentIndex;
            const color = colorForTrack(item.filename);
            return (
              <TouchableOpacity
                style={[s.trackRow, active && { backgroundColor: color + "12" }]}
                onPress={() => handleTrackTap(realIndex)}
                activeOpacity={0.75}
              >
                <View style={[s.trackThumb, { backgroundColor: color + "22" }]}>
                  {active && isPlaying ? (
                    <Ionicons name="pause" size={18} color={color} />
                  ) : (
                    <Ionicons name={active ? "play" : "musical-note"} size={18} color={color} />
                  )}
                </View>
                <View style={s.trackInfo}>
                  <Text style={[s.trackTitle, { color: active ? color : colors.text }]} numberOfLines={1}>
                    {trackTitle(item)}
                  </Text>
                  <Text style={[s.trackArtist, { color: colors.textMuted }]} numberOfLines={1}>
                    {trackArtist(item)}
                    {item.duration ? ` · ${formatMs(item.duration * 1000)}` : ""}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}

      {currentTrack && (
        <TouchableOpacity
          style={[s.miniPlayer, {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            bottom: insets.bottom + 8,
          }]}
          onPress={() => setView("player")}
          activeOpacity={0.9}
        >
          <View style={[s.miniThumb, { backgroundColor: accentColor + "22" }]}>
            <Ionicons name="musical-notes" size={18} color={accentColor} />
          </View>
          <View style={s.miniInfo}>
            <Text style={[s.miniTitle, { color: colors.text }]} numberOfLines={1}>
              {trackTitle(currentTrack)}
            </Text>
            <Text style={[s.miniArtist, { color: colors.textMuted }]} numberOfLines={1}>
              {trackArtist(currentTrack)}
            </Text>
          </View>
          <TouchableOpacity hitSlop={12} onPress={playPause} style={s.miniPlayBtn}>
            <Ionicons
              name={isPlaying ? "pause-circle" : "play-circle"}
              size={36}
              color={accentColor}
            />
          </TouchableOpacity>
          <TouchableOpacity hitSlop={12} onPress={playNext} style={s.miniNextBtn}>
            <Ionicons name="play-skip-forward" size={22} color={colors.textSecondary} />
          </TouchableOpacity>
          <View style={[s.miniProgress, { backgroundColor: colors.border }]}>
            <View
              style={[s.miniProgressFill, { backgroundColor: accentColor, width: `${progress * 100}%` as any }]}
            />
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Progress bar ─────────────────────────────────────────────────────────────

function ProgressBar({
  progress, position, duration, accentColor, colors, onSeek,
}: {
  progress: number;
  position: number;
  duration: number;
  accentColor: string;
  colors: any;
  onSeek: (ratio: number) => void;
}) {
  const [barWidth, setBarWidth] = useState(1);

  function handleLayout(e: LayoutChangeEvent) {
    setBarWidth(e.nativeEvent.layout.width || 1);
  }

  function handlePress(e: any) {
    onSeek(Math.max(0, Math.min(1, e.nativeEvent.locationX / barWidth)));
  }

  const pct = `${Math.max(0, Math.min(100, progress * 100))}%` as any;

  return (
    <View style={s.progressWrap}>
      <Pressable style={s.progressBar} onLayout={handleLayout} onPress={handlePress}>
        <View style={[s.progressTrack, { backgroundColor: colors.border }]}>
          <View style={[s.progressFill, { backgroundColor: accentColor, width: pct }]} />
          <View style={[s.progressThumb, { backgroundColor: accentColor, left: `${Math.max(0, Math.min(98, progress * 100))}%` as any }]} />
        </View>
      </Pressable>
      <View style={s.timesRow}>
        <Text style={[s.timeText, { color: colors.textMuted }]}>{formatMs(position)}</Text>
        <Text style={[s.timeText, { color: colors.textMuted }]}>{formatMs(duration)}</Text>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 12 },
  permIcon: { width: 80, height: 80, borderRadius: 24, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  permTitle: { fontSize: 22, fontFamily: "Inter_700Bold" },
  permSub: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 21 },
  permBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 24, paddingVertical: 13, borderRadius: 14, marginTop: 8 },
  permBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
  libraryHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  libraryTitle: { fontSize: 20, fontFamily: "Inter_700Bold" },
  libraryCount: { fontSize: 13, fontFamily: "Inter_400Regular" },
  searchWrap: { flexDirection: "row", alignItems: "center", gap: 8, marginHorizontal: 16, marginVertical: 10, borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 9 },
  searchInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular" },
  emptyTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  emptySub: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
  trackRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  trackThumb: { width: 42, height: 42, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  trackInfo: { flex: 1 },
  trackTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", marginBottom: 2 },
  trackArtist: { fontSize: 12, fontFamily: "Inter_400Regular" },
  miniPlayer: { position: "absolute", left: 12, right: 12, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 10, gap: 10, shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 12, elevation: 8, overflow: "hidden" },
  miniThumb: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  miniInfo: { flex: 1 },
  miniTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  miniArtist: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },
  miniPlayBtn: { padding: 2 },
  miniNextBtn: { padding: 4 },
  miniProgress: { position: "absolute", bottom: 0, left: 0, right: 0, height: 2, borderRadius: 1 },
  miniProgressFill: { height: 2, borderRadius: 1 },
  playerScreen: { flex: 1, paddingHorizontal: 24, alignItems: "center" },
  downBtn: { alignSelf: "flex-start", padding: 6, marginBottom: 8 },
  albumWrap: { marginTop: 16, marginBottom: 28 },
  albumArt: { width: 220, height: 220, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  trackInfoWrap: { width: "100%", alignItems: "center", gap: 5, marginBottom: 28 },
  playerTitle: { fontSize: 22, fontFamily: "Inter_700Bold", textAlign: "center" },
  playerArtist: { fontSize: 15, fontFamily: "Inter_400Regular" },
  progressWrap: { width: "100%", marginBottom: 24 },
  progressBar: { width: "100%", paddingVertical: 10 },
  progressTrack: { height: 4, borderRadius: 2, width: "100%", position: "relative", overflow: "visible" },
  progressFill: { height: 4, borderRadius: 2, position: "absolute", top: 0, left: 0 },
  progressThumb: { width: 14, height: 14, borderRadius: 7, position: "absolute", top: -5, marginLeft: -7 },
  timesRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 6 },
  timeText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  controls: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", width: "100%", paddingHorizontal: 4 },
  playBtn: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center" },
  repeatOneDot: { width: 5, height: 5, borderRadius: 3, marginTop: 2 },
  trackCount: { marginTop: 20, fontSize: 12, fontFamily: "Inter_400Regular" },
});
