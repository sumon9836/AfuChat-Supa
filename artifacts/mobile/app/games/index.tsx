import React, { useRef } from "react";
import {
  Animated, Platform, Pressable, ScrollView,
  StyleSheet, Text, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "@/components/ui/SafeGradient";
import { useTheme } from "@/hooks/useTheme";
import { GlassHeader } from "@/components/ui/GlassHeader";

export default function GamesScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const scale = useRef(new Animated.Value(1)).current;

  function onPressIn() {
    Animated.spring(scale, { toValue: 0.97, useNativeDriver: Platform.OS !== "web", speed: 50, bounciness: 0 }).start();
  }
  function onPressOut() {
    Animated.spring(scale, { toValue: 1, useNativeDriver: Platform.OS !== "web", speed: 30, bounciness: 6 }).start();
  }

  return (
    <View style={[s.root, { backgroundColor: colors.background }]}>
      <GlassHeader title="AfuGames" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>

        {/* Hero banner */}
        <LinearGradient colors={["#1a1a2e", "#16213e", "#0f3460"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.hero}>
          <View style={s.heroOrb1} />
          <View style={s.heroOrb2} />
          <Text style={s.heroEmoji}>🌍</Text>
          <Text style={s.heroTitle}>AfuGames</Text>
          <Text style={s.heroSub}>One game. Infinite lives. Every choice matters.</Text>
        </LinearGradient>

        {/* Life Earth card */}
        <View style={s.section}>
          <Pressable onPressIn={onPressIn} onPressOut={onPressOut} onPress={() => router.push({ pathname: "/games/play", params: { id: "lifesim" } } as any)}>
            <Animated.View style={{ transform: [{ scale }] }}>
              <LinearGradient colors={["#1a1a2e", "#16213e"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.gameCard}>
                {/* Live badge */}
                <View style={s.liveBadge}>
                  <View style={s.liveDot} />
                  <Text style={s.liveText}>LIVE</Text>
                </View>
                {/* Header */}
                <View style={s.cardTop}>
                  <LinearGradient colors={["#0f3460", "#533483"]} style={s.cardIconWrap}>
                    <Text style={{ fontSize: 32 }}>🌍</Text>
                  </LinearGradient>
                  <View style={{ flex: 1 }}>
                    <Text style={s.cardTitle}>LIFE EARTH</Text>
                    <Text style={s.cardSubtitle}>The Ultimate Human Life Simulation</Text>
                  </View>
                </View>
                {/* Description */}
                <Text style={s.cardDesc}>
                  You are born as a newborn into a randomly generated family anywhere on Earth. Every choice shapes your destiny — education, career, relationships, wealth, and legacy.
                </Text>
                {/* Feature pills */}
                <View style={s.pillRow}>
                  {["🌎 Every Country", "👶 Birth to Death", "🏆 Legacy System", "🎲 Random Events"].map((p) => (
                    <View key={p} style={s.pill}><Text style={s.pillText}>{p}</Text></View>
                  ))}
                </View>
                {/* Stats */}
                <View style={s.cardStats}>
                  <View style={s.cardStat}><Text style={s.cardStatNum}>∞</Text><Text style={s.cardStatLabel}>Outcomes</Text></View>
                  <View style={s.cardStatDivider} />
                  <View style={s.cardStat}><Text style={s.cardStatNum}>8</Text><Text style={s.cardStatLabel}>Life Stages</Text></View>
                  <View style={s.cardStatDivider} />
                  <View style={s.cardStat}><Text style={s.cardStatNum}>+200</Text><Text style={s.cardStatLabel}>XP Possible</Text></View>
                </View>
                {/* CTA */}
                <LinearGradient colors={["#e94560", "#c23152"]} style={s.playBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                  <Ionicons name="play" size={16} color="#fff" />
                  <Text style={s.playBtnText}>Begin Your Life</Text>
                </LinearGradient>
              </LinearGradient>
            </Animated.View>
          </Pressable>
        </View>

        {/* Coming soon */}
        <View style={s.section}>
          <Text style={[s.soonLabel, { color: colors.textMuted }]}>MORE GAMES COMING SOON</Text>
          <View style={[s.soonCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {[
              { icon: "🏟️", name: "AfuSports", desc: "Manage your own sports club" },
              { icon: "🏙️", name: "AfuCity", desc: "Build and run a city" },
              { icon: "📈", name: "AfuMarkets", desc: "Trade stocks in a live economy" },
            ].map((g, i, arr) => (
              <View key={g.name}>
                <View style={s.soonRow}>
                  <Text style={{ fontSize: 26 }}>{g.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.soonName, { color: colors.text }]}>{g.name}</Text>
                    <Text style={[s.soonDesc, { color: colors.textMuted }]}>{g.desc}</Text>
                  </View>
                  <View style={[s.soonBadge, { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)" }]}>
                    <Text style={[{ fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 0.5, color: colors.textMuted }]}>SOON</Text>
                  </View>
                </View>
                {i < arr.length - 1 && <View style={[{ height: 0.5, marginHorizontal: 16, backgroundColor: colors.border }]} />}
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  hero: { marginHorizontal: 16, marginTop: 12, borderRadius: 24, padding: 28, alignItems: "center", overflow: "hidden", position: "relative", gap: 8 },
  heroOrb1: { position: "absolute", width: 180, height: 180, borderRadius: 90, backgroundColor: "#e9456030", top: -60, right: -40 },
  heroOrb2: { position: "absolute", width: 120, height: 120, borderRadius: 60, backgroundColor: "#53348330", bottom: -40, left: -20 },
  heroEmoji: { fontSize: 52 },
  heroTitle: { fontSize: 26, fontFamily: "Inter_700Bold", color: "#fff", letterSpacing: 2 },
  heroSub: { fontSize: 13, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.7)", textAlign: "center" },
  section: { paddingHorizontal: 16, marginTop: 16 },
  gameCard: { borderRadius: 24, padding: 20, gap: 14, overflow: "hidden", position: "relative" },
  liveBadge: { position: "absolute", top: 16, right: 16, flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(233,69,96,0.25)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#e94560" },
  liveText: { fontSize: 10, fontFamily: "Inter_700Bold", color: "#e94560", letterSpacing: 1 },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 14 },
  cardIconWrap: { width: 60, height: 60, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  cardTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: "#fff", letterSpacing: 1 },
  cardSubtitle: { fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.65)", marginTop: 2 },
  cardDesc: { fontSize: 13, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.75)", lineHeight: 20 },
  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pill: { backgroundColor: "rgba(255,255,255,0.1)", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  pillText: { fontSize: 11, fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.8)" },
  cardStats: { flexDirection: "row", backgroundColor: "rgba(0,0,0,0.3)", borderRadius: 14, padding: 14 },
  cardStat: { flex: 1, alignItems: "center", gap: 3 },
  cardStatNum: { fontSize: 20, fontFamily: "Inter_700Bold", color: "#fff" },
  cardStatLabel: { fontSize: 10, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.6)" },
  cardStatDivider: { width: 1, backgroundColor: "rgba(255,255,255,0.15)", marginVertical: 4 },
  playBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: 16, borderRadius: 16 },
  playBtnText: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#fff" },
  soonLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.8, marginBottom: 10 },
  soonCard: { borderRadius: 20, borderWidth: 0.5, overflow: "hidden" },
  soonRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16 },
  soonName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  soonDesc: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  soonBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
});
