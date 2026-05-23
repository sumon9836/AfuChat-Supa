import React from "react";
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

type Game = {
  id: string;
  name: string;
  genre: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  gradient: [string, string];
  players: string;
  comingSoon?: boolean;
};

const GAMES: Game[] = [
  { id: "quiz", name: "AfuQuiz", genre: "Trivia", icon: "help-circle", gradient: ["#FF9500", "#FFCC00"], players: "2.4K playing" },
  { id: "word", name: "AfuWords", genre: "Word", icon: "text", gradient: ["#34C759", "#30D158"], players: "1.8K playing" },
  { id: "chess", name: "AfuChess", genre: "Strategy", icon: "grid", gradient: ["#1C1C1E", "#3A3A3C"], players: "920 playing", comingSoon: true },
  { id: "runner", name: "AfuRun", genre: "Action", icon: "flash", gradient: ["#FF3B30", "#FF6B35"], players: "3.1K playing", comingSoon: true },
  { id: "cards", name: "AfuCards", genre: "Card", icon: "card", gradient: ["#5856D6", "#7B79E8"], players: "560 playing", comingSoon: true },
  { id: "predict", name: "AfuPredict", genre: "Prediction", icon: "analytics", gradient: ["#00BCD4", "#0097A7"], players: "2.0K playing", comingSoon: true },
];

const LEADERBOARD = [
  { rank: 1, name: "Kwame A.", score: "48,200", badge: "🥇" },
  { rank: 2, name: "Amara T.", score: "41,880", badge: "🥈" },
  { rank: 3, name: "Bayo K.", score: "39,400", badge: "🥉" },
  { rank: 4, name: "Fatou S.", score: "34,100", badge: "4th" },
  { rank: 5, name: "Nana O.", score: "29,750", badge: "5th" },
];

export default function AfuGamesApp() {
  const { colors, accent } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero */}
      <LinearGradient
        colors={["#FF3B30", "#FF6B35"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <Ionicons name="game-controller" size={44} color="rgba(255,255,255,0.9)" />
        <Text style={styles.heroTitle}>{"AfuGames"}</Text>
        <Text style={styles.heroSub}>
          {"Play with friends inside AfuChat.\nMini games coming soon!"}
        </Text>
      </LinearGradient>

      {/* Games grid */}
      <Text style={[styles.sectionTitle, { color: colors.textSecondary, paddingHorizontal: 16 }]}>
        {"GAMES"}
      </Text>
      <View style={styles.gamesGrid}>
        {GAMES.map((g) => (
          <Pressable
            key={g.id}
            style={({ pressed }) => [styles.gameCard, { backgroundColor: colors.surface, opacity: pressed ? 0.8 : 1 }]}
          >
            <LinearGradient
              colors={g.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.gameIcon}
            >
              <Ionicons name={g.icon} size={26} color="#fff" />
            </LinearGradient>
            <Text style={[styles.gameName, { color: colors.text }]} numberOfLines={1}>
              {g.name}
            </Text>
            <Text style={[styles.gameGenre, { color: colors.textMuted }]}>
              {g.genre}
            </Text>
            {g.comingSoon ? (
              <View style={[styles.soonBadge, { backgroundColor: colors.backgroundSecondary }]}>
                <Text style={[styles.soonText, { color: colors.textMuted }]}>{"Soon"}</Text>
              </View>
            ) : (
              <Text style={[styles.gamePlayers, { color: accent }]} numberOfLines={1}>
                {g.players}
              </Text>
            )}
          </Pressable>
        ))}
      </View>

      {/* Leaderboard */}
      <Text style={[styles.sectionTitle, { color: colors.textSecondary, paddingHorizontal: 16, marginTop: 8 }]}>
        {"LEADERBOARD"}
      </Text>
      <View style={[styles.leaderCard, { backgroundColor: colors.surface }]}>
        {LEADERBOARD.map((entry, i) => (
          <View key={entry.rank}>
            {i > 0 && <View style={[styles.sep, { backgroundColor: colors.border }]} />}
            <View style={styles.leaderRow}>
              <Text style={[styles.badge, entry.rank <= 3 ? styles.badgeTop : {}]}>
                {entry.badge}
              </Text>
              <Text style={[styles.leaderName, { color: colors.text }]}>
                {entry.name}
              </Text>
              <Text style={[styles.leaderScore, { color: accent }]}>
                {entry.score}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  hero: {
    margin: 16,
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    gap: 8,
  },
  heroTitle: { color: "#fff", fontSize: 22, fontFamily: "Inter_700Bold" },
  heroSub: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 18,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  gamesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 12,
    gap: 10,
    marginBottom: 16,
  },
  gameCard: {
    width: "29%",
    borderRadius: 14,
    padding: 12,
    alignItems: "center",
    gap: 6,
  },
  gameIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  gameName: { fontSize: 12, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  gameGenre: { fontSize: 10, fontFamily: "Inter_400Regular" },
  gamePlayers: { fontSize: 10, fontFamily: "Inter_500Medium" },
  soonBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  soonText: { fontSize: 9, fontFamily: "Inter_600SemiBold" },
  leaderCard: {
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: "hidden",
  },
  leaderRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  badge: { fontSize: 18, width: 28, textAlign: "center" },
  badgeTop: {},
  leaderName: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium" },
  leaderScore: { fontSize: 14, fontFamily: "Inter_700Bold" },
  sep: { height: StyleSheet.hairlineWidth },
});
