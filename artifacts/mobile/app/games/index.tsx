import React from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";
import { useIsDesktop } from "@/hooks/useIsDesktop";

const GAMES = [
  { id: "snake",         label: "Snake",          icon: "infinite-outline",    desc: "Classic snake, grow as long as you can" },
  { id: "tetris",        label: "Tetris",          icon: "apps-outline",        desc: "Stack and clear falling blocks" },
  { id: "game-2048",     label: "2048",            icon: "grid-outline",        desc: "Slide tiles and reach 2048" },
  { id: "brick-breaker", label: "Brick Breaker",   icon: "browsers-outline",    desc: "Break all the bricks with your ball" },
  { id: "flappy",        label: "Flappy Bird",     icon: "airplane-outline",    desc: "Flap through the pipes" },
  { id: "memory-match",  label: "Memory Match",    icon: "copy-outline",        desc: "Find all matching pairs" },
  { id: "minesweeper",   label: "Minesweeper",     icon: "nuclear-outline",     desc: "Clear the board without hitting mines" },
  { id: "space-shooter", label: "Space Shooter",   icon: "planet-outline",      desc: "Defend the galaxy from invaders" },
];

export default function GamesIndex() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { isDesktop } = useIsDesktop();

  const cardBg    = isDark ? "#1A1A1A" : "#F7F7F7";
  const hoverBg   = isDark ? "#232323" : "#EFEFEF";
  const titleCol  = colors.text;
  const descCol   = colors.textMuted;
  const accentCol = colors.accent;
  const borderCol = isDark ? "#2A2A2A" : "#E5E5E5";

  const cols = isDesktop ? 4 : 2;
  const gap  = isDesktop ? 16 : 12;

  return (
    <ScrollView
      style={[s.root, { backgroundColor: colors.backgroundSecondary }]}
      contentContainerStyle={[
        s.body,
        isDesktop
          ? { paddingTop: 32, paddingHorizontal: 0, paddingBottom: 64 }
          : { paddingTop: 16, paddingHorizontal: 16, paddingBottom: 40 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {isDesktop && (
        <View style={s.dtHeader}>
          <Text style={[s.dtTitle, { color: titleCol }]}>Games</Text>
          <Text style={[s.dtSub, { color: descCol }]}>
            {GAMES.length} games available — play directly in your browser
          </Text>
        </View>
      )}

      <View style={[s.grid, { gap, flexWrap: "wrap" }]}>
        {GAMES.map((g) => (
          <GameCard
            key={g.id}
            game={g}
            cols={cols}
            gap={gap}
            isDesktop={isDesktop}
            cardBg={cardBg}
            hoverBg={hoverBg}
            titleCol={titleCol}
            descCol={descCol}
            accentCol={accentCol}
            borderCol={borderCol}
            onPress={() => router.push(`/games/${g.id}` as any)}
          />
        ))}
      </View>
    </ScrollView>
  );
}

function GameCard({
  game, cols, gap, isDesktop,
  cardBg, hoverBg, titleCol, descCol, accentCol, borderCol, onPress,
}: {
  game: (typeof GAMES)[0];
  cols: number; gap: number; isDesktop: boolean;
  cardBg: string; hoverBg: string; titleCol: string;
  descCol: string; accentCol: string; borderCol: string;
  onPress: () => void;
}) {
  const [hovered, setHovered] = React.useState(false);

  const cardWidth = Platform.OS === "web"
    ? (`calc(${100 / cols}% - ${gap * (cols - 1) / cols}px)` as any)
    : `${100 / cols - 2}%` as any;

  return (
    <Pressable
      style={[
        s.card,
        {
          width: cardWidth,
          backgroundColor: hovered ? hoverBg : cardBg,
          borderColor: hovered ? accentCol : borderCol,
          padding: isDesktop ? 20 : 14,
        },
      ]}
      onPress={onPress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      accessibilityRole="button"
    >
      <View style={[s.iconWrap, { backgroundColor: accentCol + "18" }]}>
        <Ionicons name={game.icon as any} size={isDesktop ? 30 : 26} color={accentCol} />
      </View>
      <Text style={[s.cardLabel, { color: titleCol, fontSize: isDesktop ? 15 : 13 }]}>
        {game.label}
      </Text>
      {isDesktop && (
        <Text style={[s.cardDesc, { color: descCol }]} numberOfLines={2}>
          {game.desc}
        </Text>
      )}
    </Pressable>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  body: {},
  dtHeader: { marginBottom: 28 },
  dtTitle: { fontSize: 26, fontFamily: "Inter_700Bold", letterSpacing: -0.5, marginBottom: 6 },
  dtSub:   { fontSize: 14, fontFamily: "Inter_400Regular" },
  grid:  { flexDirection: "row", flexWrap: "wrap" },
  card:  {
    borderRadius: 14, alignItems: "flex-start", gap: 10,
    borderWidth: 1,
    ...Platform.select({
      web: { cursor: "pointer", transition: "background .13s, border-color .13s" } as any,
      default: {},
    }),
  },
  iconWrap: { width: 52, height: 52, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  cardLabel: { fontFamily: "Inter_600SemiBold", letterSpacing: -0.2 },
  cardDesc:  { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
});
