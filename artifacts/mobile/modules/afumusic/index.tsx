import React, { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";
import { LinearGradient } from "@/components/ui/SafeGradient";
import { GlassCard } from "@/components/ui/GlassCard";

type Track = {
  id: string;
  title: string;
  artist: string;
  duration: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  color: string;
};

const PLAYLIST: Track[] = [
  { id: "1", title: "Afrobeat Vibes", artist: "DJ AfuChat", duration: "3:42", icon: "musical-notes", color: "#FF9500" },
  { id: "2", title: "Chill Lofi Study", artist: "AfuBeats", duration: "4:15", icon: "headset", color: "#5856D6" },
  { id: "3", title: "Naija Hits Mix", artist: "Various Artists", duration: "58:00", icon: "disc", color: "#FF3B30" },
  { id: "4", title: "Amapiano Sessions", artist: "AfuSound", duration: "6:20", icon: "radio", color: "#34C759" },
  { id: "5", title: "Gospel Sunday", artist: "Praise Collective", duration: "45:00", icon: "heart", color: "#AF52DE" },
];

const CATEGORIES = ["Trending", "Afrobeats", "Gospel", "Lofi", "Podcasts", "New"];

export default function AfuMusicApp() {
  const { colors, accent } = useTheme();
  const insets = useSafeAreaInsets();
  const [playing, setPlaying] = useState<string | null>(null);
  const [cat, setCat] = useState("Trending");

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Player Card */}
      <LinearGradient
        colors={["#5856D6", "#7B79E8"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.playerCard}
      >
        <View style={styles.albumArt}>
          <Ionicons name="musical-notes" size={40} color="rgba(255,255,255,0.9)" />
        </View>
        <View style={styles.playerInfo}>
          <Text style={styles.playerTitle} numberOfLines={1}>
            {playing
              ? PLAYLIST.find((t) => t.id === playing)?.title ?? "AfuMusic"
              : "AfuMusic"}
          </Text>
          <Text style={styles.playerArtist}>
            {playing
              ? PLAYLIST.find((t) => t.id === playing)?.artist ?? "Select a track"
              : "Select a track to play"}
          </Text>
        </View>
        {/* Progress bar */}
        <View style={styles.progress}>
          <View style={[styles.progressFill, { backgroundColor: "rgba(255,255,255,0.9)", width: playing ? "38%" : "0%" }]} />
        </View>
        <View style={styles.controls}>
          <Pressable hitSlop={12}>
            <Ionicons name="shuffle" size={20} color="rgba(255,255,255,0.7)" />
          </Pressable>
          <Pressable hitSlop={12}>
            <Ionicons name="play-skip-back" size={26} color="#fff" />
          </Pressable>
          <Pressable
            onPress={() => setPlaying(playing ? null : PLAYLIST[0].id)}
            style={styles.playBtn}
          >
            <Ionicons
              name={playing ? "pause" : "play"}
              size={26}
              color="#5856D6"
            />
          </Pressable>
          <Pressable hitSlop={12}>
            <Ionicons name="play-skip-forward" size={26} color="#fff" />
          </Pressable>
          <Pressable hitSlop={12}>
            <Ionicons name="repeat" size={20} color="rgba(255,255,255,0.7)" />
          </Pressable>
        </View>
      </LinearGradient>

      {/* Categories */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.catRow}
      >
        {CATEGORIES.map((c) => (
          <Pressable
            key={c}
            onPress={() => setCat(c)}
            style={[
              styles.catChip,
              cat === c
                ? { backgroundColor: accent }
                : { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 },
            ]}
          >
            <Text style={[styles.catText, { color: cat === c ? "#fff" : colors.textSecondary }]}>
              {c}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Playlist */}
      <Text style={[styles.sectionTitle, { color: colors.textSecondary, paddingHorizontal: 16 }]}>
        {"PLAYLIST"}
      </Text>
      <GlassCard variant="medium" style={styles.listCard}>
        {PLAYLIST.map((track, i) => (
          <View key={track.id}>
            {i > 0 && (
              <View style={[styles.sep, { backgroundColor: colors.border, marginLeft: 60 }]} />
            )}
            <Pressable
              onPress={() => setPlaying(playing === track.id ? null : track.id)}
              style={({ pressed }) => [
                styles.trackRow,
                pressed && { backgroundColor: colors.backgroundSecondary },
              ]}
            >
              <View style={[styles.trackIcon, { backgroundColor: track.color + "20" }]}>
                <Ionicons name={track.icon} size={18} color={track.color} />
              </View>
              <View style={styles.trackInfo}>
                <Text
                  style={[
                    styles.trackTitle,
                    { color: playing === track.id ? accent : colors.text },
                  ]}
                  numberOfLines={1}
                >
                  {track.title}
                </Text>
                <Text style={[styles.trackArtist, { color: colors.textMuted }]}>
                  {track.artist}
                </Text>
              </View>
              <Text style={[styles.trackDur, { color: colors.textMuted }]}>
                {track.duration}
              </Text>
              {playing === track.id ? (
                <Ionicons name="pause-circle" size={22} color={accent} />
              ) : (
                <Ionicons name="play-circle-outline" size={22} color={colors.textMuted} />
              )}
            </Pressable>
          </View>
        ))}
      </GlassCard>

      <View style={[styles.betaBanner, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Ionicons name="information-circle-outline" size={16} color={colors.textMuted} />
        <Text style={[styles.betaText, { color: colors.textMuted }]}>
          {"AfuMusic is in beta. Full streaming coming soon."}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  playerCard: {
    margin: 16,
    borderRadius: 20,
    padding: 20,
    gap: 12,
  },
  albumArt: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
  },
  playerInfo: { alignItems: "center", gap: 2 },
  playerTitle: { color: "#fff", fontSize: 17, fontFamily: "Inter_700Bold" },
  playerArtist: { color: "rgba(255,255,255,0.75)", fontSize: 13, fontFamily: "Inter_400Regular" },
  progress: {
    height: 3,
    backgroundColor: "rgba(255,255,255,0.25)",
    borderRadius: 2,
  },
  progressFill: { height: 3, borderRadius: 2 },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
  },
  playBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  catRow: { paddingHorizontal: 16, paddingBottom: 12, gap: 8 },
  catChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 },
  catText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  listCard: { marginHorizontal: 16, borderRadius: 16, overflow: "hidden" },
  trackRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 11,
    gap: 12,
  },
  trackIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  trackInfo: { flex: 1 },
  trackTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", marginBottom: 2 },
  trackArtist: { fontSize: 12, fontFamily: "Inter_400Regular" },
  trackDur: { fontSize: 12, fontFamily: "Inter_400Regular", marginRight: 4 },
  sep: { height: StyleSheet.hairlineWidth },
  betaBanner: {
    margin: 16,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  betaText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 16 },
});
