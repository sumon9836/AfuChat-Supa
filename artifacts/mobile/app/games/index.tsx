import React, { useRef, useState } from "react";
import {
  Animated,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "@/components/ui/SafeGradient";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/context/AuthContext";
import { GlassHeader } from "@/components/ui/GlassHeader";

type Game = {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  gradient: [string, string];
  category: string;
  players: string;
  xpReward: number;
  badge?: string;
  comingSoon?: boolean;
};

const GAMES: Game[] = [
  {
    id: "trivia",
    title: "AfuTrivia",
    description: "Test your knowledge across 12 categories. Beat your friends and climb the global leaderboard.",
    icon: "help-circle",
    gradient: ["#5856D6", "#6E6CD3"],
    category: "Brain",
    players: "1–4",
    xpReward: 50,
    badge: "HOT",
  },
  {
    id: "wordchain",
    title: "WordChain",
    description: "Chain words together faster than your opponent. Last word standing wins.",
    icon: "text",
    gradient: ["#34C759", "#30D158"],
    category: "Word",
    players: "2",
    xpReward: 30,
    badge: "NEW",
  },
  {
    id: "memoryflip",
    title: "Memory Flip",
    description: "Match pairs of cards before the timer runs out. How sharp is your memory?",
    icon: "albums",
    gradient: ["#FF9500", "#FFCC00"],
    category: "Memory",
    players: "1",
    xpReward: 25,
  },
  {
    id: "prediction",
    title: "AfuPredict",
    description: "Predict trending topics, match outcomes, and world events to win ACoins.",
    icon: "trending-up",
    gradient: ["#FF2D55", "#FF6B6B"],
    category: "Strategy",
    players: "All",
    xpReward: 100,
    badge: "AC",
  },
  {
    id: "emoji",
    title: "Emoji Quiz",
    description: "Decode movie titles, songs, and phrases from emojis. Race against the clock.",
    icon: "happy",
    gradient: ["#FF9500", "#FF6B35"],
    category: "Casual",
    players: "1–8",
    xpReward: 20,
  },
  {
    id: "numberbattle",
    title: "Number Duel",
    description: "Challenge a friend to a mental math battle. First to 10 correct answers wins.",
    icon: "calculator",
    gradient: ["#007AFF", "#5AC8FA"],
    category: "Brain",
    players: "2",
    xpReward: 35,
    comingSoon: true,
  },
  {
    id: "chess",
    title: "AfuChess",
    description: "Classic chess with AfuChat social features. Chat, react, and analyse together.",
    icon: "grid",
    gradient: ["#1C1C1E", "#3A3A3C"],
    category: "Strategy",
    players: "2",
    xpReward: 75,
    comingSoon: true,
  },
  {
    id: "rhythm",
    title: "BeatTap",
    description: "Tap to the beat of trending tracks. Compete globally for the top spot.",
    icon: "musical-notes",
    gradient: ["#AF52DE", "#BF5AF2"],
    category: "Music",
    players: "1",
    xpReward: 40,
    comingSoon: true,
  },
];

const CATEGORIES = ["All", "Brain", "Word", "Memory", "Strategy", "Casual", "Music"];

function GameCard({ game, accent }: { game: Game; accent: string }) {
  const { colors, isDark } = useTheme();
  const scale = useRef(new Animated.Value(1)).current;

  function onPressIn() {
    Animated.spring(scale, { toValue: 0.96, useNativeDriver: Platform.OS !== "web", speed: 50, bounciness: 0 }).start();
  }
  function onPressOut() {
    Animated.spring(scale, { toValue: 1, useNativeDriver: Platform.OS !== "web", speed: 30, bounciness: 6 }).start();
  }

  return (
    <Pressable
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      onPress={() => {
        if (!game.comingSoon) {
          router.push({ pathname: "/games/play", params: { id: game.id } } as any);
        }
      }}
      style={{ flex: 1 }}
    >
      <Animated.View style={[s.gameCard, { backgroundColor: colors.surface, transform: [{ scale }] }]}>
        <LinearGradient colors={game.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.gameIconWrap}>
          <Ionicons name={game.icon} size={28} color="#fff" />
        </LinearGradient>

        <View style={s.gameInfo}>
          <View style={s.gameTitleRow}>
            <Text style={[s.gameTitle, { color: colors.text }]} numberOfLines={1}>{game.title}</Text>
            {game.badge && (
              <View style={[s.gameBadge, {
                backgroundColor: game.badge === "HOT" ? "#FF3B30" : game.badge === "NEW" ? "#34C759" : game.badge === "AC" ? "#FF9500" : accent,
              }]}>
                <Text style={s.gameBadgeText}>{game.badge}</Text>
              </View>
            )}
            {game.comingSoon && (
              <View style={[s.gameBadge, { backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)" }]}>
                <Text style={[s.gameBadgeText, { color: colors.textMuted }]}>SOON</Text>
              </View>
            )}
          </View>
          <Text style={[s.gameDesc, { color: colors.textSecondary }]} numberOfLines={2}>{game.description}</Text>

          <View style={s.gameMeta}>
            <View style={s.gameMetaChip}>
              <Ionicons name="people-outline" size={11} color={colors.textMuted} />
              <Text style={[s.gameMetaText, { color: colors.textMuted }]}>{game.players}</Text>
            </View>
            <View style={s.gameMetaChip}>
              <Ionicons name="flash-outline" size={11} color="#FF9500" />
              <Text style={[s.gameMetaText, { color: "#FF9500" }]}>+{game.xpReward} XP</Text>
            </View>
            <View style={[s.gameMetaChip, { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }]}>
              <Text style={[s.gameMetaText, { color: colors.textMuted }]}>{game.category}</Text>
            </View>
          </View>
        </View>

        {!game.comingSoon && (
          <View style={[s.playBtn, { backgroundColor: accent }]}>
            <Ionicons name="play" size={14} color="#fff" />
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
}

export default function GamesScreen() {
  const { colors, accent, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const [activeCategory, setActiveCategory] = useState("All");

  const filtered = activeCategory === "All" ? GAMES : GAMES.filter((g) => g.category === activeCategory);
  const live = filtered.filter((g) => !g.comingSoon);
  const soon = filtered.filter((g) => g.comingSoon);

  const totalXpAvailable = live.reduce((sum, g) => sum + g.xpReward, 0);

  return (
    <View style={[s.root, { backgroundColor: colors.background }]}>
      <GlassHeader
        title="AfuGames"
        right={
          <View style={s.headerRight}>
            <View style={[s.xpBadge, { backgroundColor: isDark ? "rgba(255,149,0,0.18)" : "rgba(255,149,0,0.12)" }]}>
              <Ionicons name="flash" size={13} color="#FF9500" />
              <Text style={s.xpBadgeText}>{(profile as any)?.xp ?? 0} XP</Text>
            </View>
          </View>
        }
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
      >
        {/* Hero banner */}
        <LinearGradient
          colors={["#FF3B30", "#FF6B35"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.hero}
        >
          <View style={s.heroContent}>
            <View style={s.heroIconWrap}>
              <Ionicons name="game-controller" size={36} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.heroTitle}>Play & Earn</Text>
              <Text style={s.heroSub}>{live.length} games · Up to {totalXpAvailable} XP to earn daily</Text>
            </View>
          </View>
          <View style={s.heroStats}>
            <View style={s.heroStat}>
              <Text style={s.heroStatNum}>{live.length}</Text>
              <Text style={s.heroStatLabel}>Live Games</Text>
            </View>
            <View style={s.heroStatDivider} />
            <View style={s.heroStat}>
              <Text style={s.heroStatNum}>{GAMES.length}</Text>
              <Text style={s.heroStatLabel}>Total</Text>
            </View>
            <View style={s.heroStatDivider} />
            <View style={s.heroStat}>
              <Text style={s.heroStatNum}>{totalXpAvailable}</Text>
              <Text style={s.heroStatLabel}>Max XP/day</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Category filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.categoryRow}
        >
          {CATEGORIES.map((cat) => (
            <Pressable
              key={cat}
              onPress={() => setActiveCategory(cat)}
              style={[
                s.categoryChip,
                activeCategory === cat
                  ? { backgroundColor: accent }
                  : { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)" },
              ]}
            >
              <Text style={[s.categoryChipText, { color: activeCategory === cat ? "#fff" : colors.textMuted }]}>
                {cat}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Live games */}
        {live.length > 0 && (
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <View style={[s.sectionDot, { backgroundColor: "#34C759" }]} />
              <Text style={[s.sectionTitle, { color: colors.text }]}>Live Now</Text>
              <Text style={[s.sectionCount, { color: colors.textMuted }]}>{live.length}</Text>
            </View>
            {live.map((game) => (
              <GameCard key={game.id} game={game} accent={accent} />
            ))}
          </View>
        )}

        {/* Coming soon */}
        {soon.length > 0 && (
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <View style={[s.sectionDot, { backgroundColor: colors.textMuted }]} />
              <Text style={[s.sectionTitle, { color: colors.text }]}>Coming Soon</Text>
              <Text style={[s.sectionCount, { color: colors.textMuted }]}>{soon.length}</Text>
            </View>
            {soon.map((game) => (
              <GameCard key={game.id} game={game} accent={accent} />
            ))}
          </View>
        )}

        {filtered.length === 0 && (
          <View style={s.emptyWrap}>
            <Ionicons name="game-controller-outline" size={48} color={colors.textMuted} />
            <Text style={[s.emptyTitle, { color: colors.text }]}>No games in this category</Text>
            <Text style={[s.emptySub, { color: colors.textMuted }]}>Check back soon</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },

  headerRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  xpBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  xpBadgeText: { fontSize: 13, fontFamily: "Inter_700Bold", color: "#FF9500" },

  hero: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    borderRadius: 20,
    padding: 20,
    gap: 16,
  },
  heroContent: { flexDirection: "row", alignItems: "center", gap: 14 },
  heroIconWrap: {
    width: 60, height: 60, borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center", justifyContent: "center",
  },
  heroTitle: { fontSize: 22, fontFamily: "Inter_700Bold", color: "#fff" },
  heroSub: { fontSize: 13, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.8)", marginTop: 2 },
  heroStats: { flexDirection: "row", backgroundColor: "rgba(0,0,0,0.15)", borderRadius: 14, padding: 14 },
  heroStat: { flex: 1, alignItems: "center", gap: 2 },
  heroStatNum: { fontSize: 20, fontFamily: "Inter_700Bold", color: "#fff" },
  heroStatLabel: { fontSize: 10, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.75)" },
  heroStatDivider: { width: 1, backgroundColor: "rgba(255,255,255,0.2)", marginVertical: 4 },

  categoryRow: { paddingHorizontal: 16, paddingVertical: 12, gap: 8, flexDirection: "row" },
  categoryChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 },
  categoryChipText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },

  section: { paddingHorizontal: 16, gap: 10, marginBottom: 8 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 2 },
  sectionDot: { width: 7, height: 7, borderRadius: 4 },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_700Bold", flex: 1 },
  sectionCount: { fontSize: 13, fontFamily: "Inter_400Regular" },

  gameCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: 16,
    padding: 14,
    ...Platform.select({
      web: { boxShadow: "0 1px 8px rgba(0,0,0,0.06)" } as any,
      default: { shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
    }),
  },
  gameIconWrap: {
    width: 56, height: 56, borderRadius: 16,
    alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },
  gameInfo: { flex: 1, gap: 4 },
  gameTitleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  gameTitle: { fontSize: 15, fontFamily: "Inter_700Bold", flexShrink: 1 },
  gameBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 },
  gameBadgeText: { fontSize: 9, fontFamily: "Inter_700Bold", color: "#fff", letterSpacing: 0.5 },
  gameDesc: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
  gameMeta: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 2 },
  gameMetaChip: { flexDirection: "row", alignItems: "center", gap: 3 },
  gameMetaText: { fontSize: 11, fontFamily: "Inter_500Medium" },

  playBtn: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },

  emptyWrap: { alignItems: "center", paddingVertical: 60, gap: 10 },
  emptyTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  emptySub: { fontSize: 14, fontFamily: "Inter_400Regular" },
});
