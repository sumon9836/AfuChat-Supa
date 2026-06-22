import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated, Dimensions, Easing, Platform, Pressable,
  StyleSheet, Text, TouchableOpacity, View,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "@/components/ui/SafeGradient";
import { useTheme } from "@/hooks/useTheme";
import * as Haptics from "@/lib/haptics";

const { width: W } = Dimensions.get("window");
const CARD_SIZE = Math.floor((W - 48 - 30) / 4);

const EMOJI_PAIRS = ["🦁","🐬","🦋","🐸","🦊","🐙","🦅","🐼"];

type CardState = { id: number; emoji: string; flipped: boolean; matched: boolean };
type Phase = "intro" | "playing" | "result";

function makeCards(): CardState[] {
  const pairs = [...EMOJI_PAIRS, ...EMOJI_PAIRS];
  const shuffled = pairs.sort(() => Math.random() - 0.5);
  return shuffled.map((emoji, i) => ({ id: i, emoji, flipped: false, matched: false }));
}

function FlipCard({ card, onPress, disabled }: { card: CardState; onPress: () => void; disabled: boolean }) {
  const { colors } = useTheme();
  const anim = useRef(new Animated.Value(card.flipped || card.matched ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(anim, {
      toValue: card.flipped || card.matched ? 1 : 0,
      friction: 8, tension: 80,
      useNativeDriver: Platform.OS !== "web",
    }).start();
  }, [card.flipped, card.matched]);

  const frontInterp = anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: ["0deg", "90deg", "0deg"] });
  const backInterp  = anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: ["90deg", "90deg", "0deg"] });
  const scaleVal    = anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 0.8, 1] });

  return (
    <Pressable onPress={onPress} disabled={disabled || card.matched} style={[s.cardWrap, { width: CARD_SIZE, height: CARD_SIZE }]}>
      <Animated.View
        style={[
          s.cardFace, s.cardBack,
          {
            backgroundColor: colors.surface, borderColor: colors.border,
            transform: [{ rotateY: frontInterp }, { scale: scaleVal }],
            opacity: anim.interpolate({ inputRange: [0, 0.49, 0.5, 1], outputRange: [1, 1, 0, 0] }),
          },
        ]}
      >
        <Text style={{ fontSize: 22, color: colors.textMuted }}>❓</Text>
      </Animated.View>
      <Animated.View
        style={[
          s.cardFace, s.cardFront,
          {
            backgroundColor: card.matched ? "#34C75918" : "#5856D618",
            borderColor: card.matched ? "#34C759" : "#5856D6",
            transform: [{ rotateY: backInterp }, { scale: scaleVal }],
            opacity: anim.interpolate({ inputRange: [0, 0.49, 0.5, 1], outputRange: [0, 0, 1, 1] }),
          },
        ]}
      >
        <Text style={{ fontSize: 28 }}>{card.emoji}</Text>
      </Animated.View>
    </Pressable>
  );
}

export default function MemoryFlipGame() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [phase, setPhase]         = useState<Phase>("intro");
  const [cards, setCards]         = useState<CardState[]>([]);
  const [flipped, setFlipped]     = useState<number[]>([]);
  const [moves, setMoves]         = useState(0);
  const [matches, setMatches]     = useState(0);
  const [seconds, setSeconds]     = useState(0);
  const [locked, setLocked]       = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function startGame() {
    setCards(makeCards());
    setFlipped([]);
    setMoves(0);
    setMatches(0);
    setSeconds(0);
    setLocked(false);
    setPhase("playing");
    intervalRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
  }

  useEffect(() => {
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  function handleCardPress(id: number) {
    if (locked) return;
    setFlipped((prev) => {
      if (prev.includes(id)) return prev;
      if (prev.length === 2) return prev;
      return [...prev, id];
    });
  }

  useEffect(() => {
    if (flipped.length < 2) return;
    const [a, b] = flipped;
    const cardA = cards.find((c) => c.id === a);
    const cardB = cards.find((c) => c.id === b);

    setCards((prev) => prev.map((c) => c.id === a || c.id === b ? { ...c, flipped: true } : c));
    setLocked(true);

    setTimeout(() => {
      if (cardA?.emoji === cardB?.emoji) {
        setCards((prev) => prev.map((c) => c.id === a || c.id === b ? { ...c, matched: true, flipped: false } : c));
        setMatches((m) => {
          const next = m + 1;
          if (next === EMOJI_PAIRS.length) {
            clearInterval(intervalRef.current!);
            setTimeout(() => setPhase("result"), 600);
          }
          return next;
        });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        setCards((prev) => prev.map((c) => c.id === a || c.id === b ? { ...c, flipped: false } : c));
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      setMoves((m) => m + 1);
      setFlipped([]);
      setLocked(false);
    }, 900);
  }, [flipped]);

  const fmtTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  const starRating = moves <= 12 ? 3 : moves <= 18 ? 2 : 1;
  const xpEarned = starRating === 3 ? 25 : starRating === 2 ? 15 : 8;

  if (phase === "intro") {
    return (
      <View style={[s.root, { backgroundColor: colors.background }]}>
        <LinearGradient colors={["#FF9500", "#FFCC00"]} style={[s.introBanner, { paddingTop: insets.top + 20 }]}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={s.introEmoji}>🧩</Text>
          <Text style={s.introTitle}>Memory Flip</Text>
          <Text style={s.introSub}>Match all 8 pairs in the fewest moves possible</Text>
        </LinearGradient>
        <View style={s.body}>
          {[
            { icon: "albums", label: "16 cards · 8 pairs to match" },
            { icon: "footsteps-outline", label: "Fewer moves = more stars" },
            { icon: "star", label: "3 stars = 25 XP · 2 stars = 15 XP" },
          ].map((r) => (
            <View key={r.label} style={[s.ruleRow, { borderColor: colors.border }]}>
              <View style={[s.ruleIcon, { backgroundColor: "#FF950020" }]}>
                <Ionicons name={r.icon as any} size={18} color="#FF9500" />
              </View>
              <Text style={[s.ruleText, { color: colors.text }]}>{r.label}</Text>
            </View>
          ))}
          <TouchableOpacity style={[s.startBtn, { backgroundColor: "#FF9500" }]} onPress={startGame}>
            <Text style={s.startBtnText}>Start Game</Text>
            <Ionicons name="play" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (phase === "result") {
    return (
      <View style={[s.root, { backgroundColor: colors.background }]}>
        <LinearGradient colors={["#FF9500", "#FFCC00"]} style={[s.introBanner, { paddingTop: insets.top + 30 }]}>
          <Text style={s.introEmoji}>🎉</Text>
          <Text style={s.introTitle}>You Won!</Text>
          <View style={{ flexDirection: "row", gap: 4, marginTop: 4 }}>
            {[1, 2, 3].map((i) => (
              <Ionicons key={i} name={i <= starRating ? "star" : "star-outline"} size={28} color={i <= starRating ? "#FFD700" : "rgba(255,255,255,0.4)"} />
            ))}
          </View>
        </LinearGradient>
        <View style={s.body}>
          {[
            { label: "Pairs matched", value: `${matches}/${EMOJI_PAIRS.length}` },
            { label: "Total moves", value: String(moves) },
            { label: "Time taken", value: fmtTime(seconds) },
            { label: "XP earned", value: `+${xpEarned} XP` },
          ].map((stat) => (
            <View key={stat.label} style={[s.statRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[s.statLabel, { color: colors.textMuted }]}>{stat.label}</Text>
              <Text style={[s.statValue, { color: colors.text }]}>{stat.value}</Text>
            </View>
          ))}
          <TouchableOpacity style={[s.startBtn, { backgroundColor: "#FF9500" }]} onPress={startGame}>
            <Text style={s.startBtnText}>Play Again</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.startBtn, { backgroundColor: colors.surface, marginTop: 4 }]} onPress={() => router.back()}>
            <Text style={[s.startBtnText, { color: colors.text }]}>Back to Games</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[s.root, { backgroundColor: colors.background }]}>
      <LinearGradient colors={["#FF9500", "#FFCC00"]} style={[s.topBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="close" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: "center", gap: 2 }}>
          <Text style={s.topLabel}>Memory Flip</Text>
          <Text style={s.topSub}>{matches}/{EMOJI_PAIRS.length} matched</Text>
        </View>
        <View style={[s.timerBadge]}>
          <Ionicons name="timer-outline" size={14} color="#fff" />
          <Text style={s.timerText}>{fmtTime(seconds)}</Text>
        </View>
      </LinearGradient>

      <View style={s.statsRow}>
        <View style={[s.statChip, { backgroundColor: colors.surface }]}>
          <Ionicons name="footsteps-outline" size={13} color={colors.textMuted} />
          <Text style={[s.statChipText, { color: colors.text }]}>{moves} moves</Text>
        </View>
        <View style={{ flex: 1, alignItems: "center" }}>
          <View style={[s.matchProgress, { backgroundColor: colors.border }]}>
            <View style={[s.matchFill, { width: `${(matches / EMOJI_PAIRS.length) * 100}%`, backgroundColor: "#34C759" }]} />
          </View>
        </View>
        <View style={[s.statChip, { backgroundColor: colors.surface }]}>
          <Ionicons name="star" size={13} color="#FFD700" />
          <Text style={[s.statChipText, { color: colors.text }]}>{starRating} ★</Text>
        </View>
      </View>

      <View style={s.grid}>
        {cards.map((card) => (
          <FlipCard
            key={card.id}
            card={card}
            onPress={() => handleCardPress(card.id)}
            disabled={locked || flipped.length === 2}
          />
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  introBanner: { alignItems: "center", paddingHorizontal: 24, paddingBottom: 36, gap: 8, position: "relative" },
  backBtn: { position: "absolute", top: 50, left: 16, width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(0,0,0,0.2)", alignItems: "center", justifyContent: "center" },
  introEmoji: { fontSize: 60, marginTop: 20 },
  introTitle: { fontSize: 28, fontFamily: "Inter_700Bold", color: "#fff" },
  introSub: { fontSize: 14, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.85)", textAlign: "center" },
  body: { flex: 1, padding: 20, gap: 12 },
  ruleRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 14, borderWidth: 0.5 },
  ruleIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  ruleText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  startBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: 16, borderRadius: 16, marginTop: 8 },
  startBtnText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#fff" },
  statRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, borderRadius: 14, borderWidth: 0.5 },
  statLabel: { fontSize: 14, fontFamily: "Inter_400Regular" },
  statValue: { fontSize: 14, fontFamily: "Inter_700Bold" },

  topBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 14, gap: 12 },
  topLabel: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#fff" },
  topSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.8)" },
  timerBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, backgroundColor: "rgba(0,0,0,0.2)" },
  timerText: { fontSize: 13, fontFamily: "Inter_700Bold", color: "#fff" },

  statsRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  statChip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  statChipText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  matchProgress: { height: 6, width: 120, borderRadius: 3, overflow: "hidden" },
  matchFill: { height: "100%", borderRadius: 3 },

  grid: { flexWrap: "wrap", flexDirection: "row", paddingHorizontal: 16, gap: 10, justifyContent: "center" },
  cardWrap: { position: "relative" },
  cardFace: { position: "absolute", inset: 0, borderRadius: 12, borderWidth: 1.5, alignItems: "center", justifyContent: "center", backfaceVisibility: "hidden" },
  cardBack: {},
  cardFront: {},
});
