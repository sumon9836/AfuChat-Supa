import React, { useEffect, useRef, useState } from "react";
import {
  Animated, Easing, KeyboardAvoidingView, Platform, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "@/components/ui/SafeGradient";
import { useTheme } from "@/hooks/useTheme";
import * as Haptics from "@/lib/haptics";

const PUZZLES = [
  { emoji: "🦁👑", answer: "lion king", hint: "Disney animated film" },
  { emoji: "🕷️🕸️👨", answer: "spider-man", hint: "Marvel superhero" },
  { emoji: "❄️👸", answer: "frozen", hint: "Disney princess film" },
  { emoji: "🚂🔥", answer: "fire train", hint: "Think: express locomotive" },
  { emoji: "🐟🔍", answer: "finding nemo", hint: "Disney/Pixar under the sea" },
  { emoji: "🌹💀", answer: "beauty and the beast", hint: "Tale as old as time" },
  { emoji: "🌙🧙‍♂️⚡", answer: "harry potter", hint: "Boy who lived" },
  { emoji: "🍕🗽🐢", answer: "teenage mutant ninja turtles", hint: "Heroes in a half shell" },
  { emoji: "🦸‍♀️🕊️", answer: "wonder woman", hint: "DC Amazonian hero" },
  { emoji: "🍎💤👸", answer: "snow white", hint: "Fairest of them all" },
  { emoji: "🐘🎪", answer: "dumbo", hint: "Flying Disney elephant" },
  { emoji: "🎭🦇", answer: "batman", hint: "Dark Knight of Gotham" },
  { emoji: "🌊🏄", answer: "surf", hint: "Riding waves" },
  { emoji: "🌍🔭🚀", answer: "star wars", hint: "A long time ago in a galaxy far away" },
  { emoji: "👻🏠", answer: "haunted house", hint: "Spooky dwelling" },
  { emoji: "🦈🏖️", answer: "jaws", hint: "Classic Spielberg thriller" },
  { emoji: "🐧❄️", answer: "happy feet", hint: "Dancing penguin movie" },
  { emoji: "🤖🚗", answer: "transformers", hint: "More than meets the eye" },
  { emoji: "👨‍🍳🐀", answer: "ratatouille", hint: "Rat who can cook" },
  { emoji: "🤖💖", answer: "wall-e", hint: "Pixar robot love story" },
];

const LEVEL_CONFIGS = [
  { name: "Easy",   timer: 30, pointsPerCorrect: 10, questions: 5  },
  { name: "Medium", timer: 20, pointsPerCorrect: 20, questions: 8  },
  { name: "Hard",   timer: 12, pointsPerCorrect: 30, questions: 10 },
];

type Phase = "intro" | "level" | "playing" | "result";

export default function EmojiQuizGame() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [phase, setPhase]       = useState<Phase>("intro");
  const [level, setLevel]       = useState(0);
  const [puzzles, setPuzzles]   = useState<typeof PUZZLES>([]);
  const [qIndex, setQIndex]     = useState(0);
  const [input, setInput]       = useState("");
  const [score, setScore]       = useState(0);
  const [timeLeft, setTime]     = useState(30);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [hints, setHints]       = useState(3);
  const [showHint, setShowHint] = useState(false);
  const [results, setResults]   = useState<{ emoji: string; answer: string; userAnswer: string; correct: boolean }[]>([]);

  const timerRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const shakeAnim  = useRef(new Animated.Value(0)).current;
  const timerAnim  = useRef(new Animated.Value(1)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;

  const cfg     = LEVEL_CONFIGS[level];
  const puzzle  = puzzles[qIndex];

  function startLevel(lvl: number) {
    const shuffled = [...PUZZLES].sort(() => Math.random() - 0.5).slice(0, LEVEL_CONFIGS[lvl].questions);
    setPuzzles(shuffled);
    setLevel(lvl);
    setQIndex(0);
    setScore(0);
    setInput("");
    setFeedback(null);
    setHints(3);
    setShowHint(false);
    setResults([]);
    setPhase("playing");
    resetTimer(LEVEL_CONFIGS[lvl].timer);
  }

  function resetTimer(secs: number) {
    if (timerRef.current) clearInterval(timerRef.current);
    setTime(secs);
    timerAnim.setValue(1);
    Animated.timing(timerAnim, {
      toValue: 0, duration: secs * 1000, useNativeDriver: false, easing: Easing.linear,
    }).start();
    timerRef.current = setInterval(() => {
      setTime((t) => {
        if (t <= 1) { clearInterval(timerRef.current!); skipQuestion(); return 0; }
        return t - 1;
      });
    }, 1000);
  }

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  function skipQuestion() {
    const p = puzzles[qIndex];
    setResults((r) => [...r, { emoji: p.emoji, answer: p.answer, userAnswer: "", correct: false }]);
    advance();
  }

  function advance() {
    setInput("");
    setShowHint(false);
    setFeedback(null);
    if (qIndex + 1 >= puzzles.length) {
      clearInterval(timerRef.current!);
      setPhase("result");
    } else {
      setQIndex((i) => i + 1);
      resetTimer(cfg.timer);
    }
  }

  function submitAnswer() {
    if (!puzzle) return;
    const userAns = input.trim().toLowerCase();
    const correct = puzzle.answer.toLowerCase().includes(userAns) || userAns === puzzle.answer.toLowerCase();

    clearInterval(timerRef.current!);

    if (correct) {
      setFeedback("correct");
      setScore((s) => s + cfg.pointsPerCorrect);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Animated.sequence([
        Animated.timing(bounceAnim, { toValue: -10, duration: 150, useNativeDriver: Platform.OS !== "web" }),
        Animated.timing(bounceAnim, { toValue: 0, duration: 150, useNativeDriver: Platform.OS !== "web" }),
      ]).start();
      setResults((r) => [...r, { emoji: puzzle.emoji, answer: puzzle.answer, userAnswer: userAns, correct: true }]);
      setTimeout(advance, 1200);
    } else {
      setFeedback("wrong");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: Platform.OS !== "web" }),
        Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: Platform.OS !== "web" }),
        Animated.timing(shakeAnim, { toValue: 6, duration: 60, useNativeDriver: Platform.OS !== "web" }),
        Animated.timing(shakeAnim, { toValue: -6, duration: 60, useNativeDriver: Platform.OS !== "web" }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: Platform.OS !== "web" }),
      ]).start();
      setResults((r) => [...r, { emoji: puzzle.emoji, answer: puzzle.answer, userAnswer: userAns, correct: false }]);
      setTimeout(advance, 1500);
    }
    resetTimer(cfg.timer);
  }

  function useHint() {
    if (hints <= 0) return;
    setHints((h) => h - 1);
    setShowHint(true);
  }

  if (phase === "intro") {
    return (
      <View style={[s.root, { backgroundColor: colors.background }]}>
        <LinearGradient colors={["#FF9500","#FF6B35"]} style={[s.banner, { paddingTop: insets.top + 20 }]}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={{ fontSize: 56, marginTop: 16 }}>😄🎯</Text>
          <Text style={[s.bannerTitle]}>Emoji Quiz</Text>
          <Text style={[s.bannerSub]}>Decode emoji combinations into movies, phrases & more</Text>
        </LinearGradient>
        <View style={s.body}>
          {[
            { icon: "happy", label: "Read the emoji — type what it represents" },
            { icon: "bulb-outline", label: "3 hints available per game" },
            { icon: "flash", label: "Faster answers = more points" },
          ].map((r) => (
            <View key={r.label} style={[s.ruleRow, { borderColor: colors.border }]}>
              <View style={[s.ruleIcon, { backgroundColor: "#FF950020" }]}>
                <Ionicons name={r.icon as any} size={18} color="#FF9500" />
              </View>
              <Text style={[s.ruleText, { color: colors.text }]}>{r.label}</Text>
            </View>
          ))}
          <Text style={[s.levelLabel, { color: colors.textMuted }]}>CHOOSE DIFFICULTY</Text>
          {LEVEL_CONFIGS.map((l, i) => (
            <TouchableOpacity
              key={l.name}
              style={[s.levelBtn, { backgroundColor: i === 0 ? "#34C759" : i === 1 ? "#FF9500" : "#FF3B30" }]}
              onPress={() => startLevel(i)}
            >
              <Text style={s.levelBtnText}>{l.name}</Text>
              <Text style={s.levelBtnSub}>{l.timer}s · {l.questions} questions · {l.pointsPerCorrect} pts each</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  }

  if (phase === "result") {
    const correct = results.filter((r) => r.correct).length;
    const pct = Math.round((correct / puzzles.length) * 100);
    return (
      <View style={[s.root, { backgroundColor: colors.background }]}>
        <LinearGradient colors={["#FF9500","#FF6B35"]} style={[s.banner, { paddingTop: insets.top + 30 }]}>
          <Text style={{ fontSize: 52 }}>{pct >= 70 ? "🏆" : "🎯"}</Text>
          <Text style={s.bannerTitle}>{pct >= 80 ? "Emoji Master!" : pct >= 60 ? "Nice work!" : "Keep trying!"}</Text>
          <Text style={s.bannerSub}>{correct}/{puzzles.length} correct · {score} points</Text>
        </LinearGradient>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 8, paddingBottom: insets.bottom + 30 }}>
          <Text style={[s.reviewTitle, { color: colors.textMuted }]}>REVIEW</Text>
          {results.map((r, i) => (
            <View key={i} style={[s.reviewCard, { backgroundColor: colors.surface, borderColor: r.correct ? "#34C75440" : "#FF3B3040" }]}>
              <Text style={{ fontSize: 32 }}>{r.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[s.reviewAnswer, { color: colors.text }]}>✓ {r.answer}</Text>
                {!r.correct && r.userAnswer && (
                  <Text style={[s.reviewAnswer, { color: "#FF3B30" }]}>✗ {r.userAnswer}</Text>
                )}
                {!r.userAnswer && <Text style={[s.reviewAnswer, { color: colors.textMuted }]}>⏱ Time's up</Text>}
              </View>
              <Ionicons name={r.correct ? "checkmark-circle" : "close-circle"} size={22} color={r.correct ? "#34C759" : "#FF3B30"} />
            </View>
          ))}
          <TouchableOpacity style={[s.startBtn, { backgroundColor: "#FF9500" }]} onPress={() => setPhase("intro")}>
            <Text style={s.startBtnText}>Play Again</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.startBtn, { backgroundColor: colors.surface, marginTop: 4 }]} onPress={() => router.back()}>
            <Text style={[s.startBtnText, { color: colors.text }]}>Back to Games</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  const timerColor = timeLeft <= 5 ? "#FF3B30" : timeLeft <= 10 ? "#FF9500" : "#34C759";

  return (
    <KeyboardAvoidingView style={[s.root, { backgroundColor: colors.background }]} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      {/* Top bar */}
      <LinearGradient colors={["#FF9500","#FF6B35"]} style={[s.topBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="close" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: "center", gap: 4 }}>
          <Text style={s.topLabel}>{qIndex + 1}/{puzzles.length}</Text>
          <View style={s.timerTrack}>
            <Animated.View style={[s.timerFill, { width: timerAnim.interpolate({ inputRange:[0,1], outputRange:["0%","100%"] }), backgroundColor: "#fff" }]} />
          </View>
        </View>
        <View style={[s.scorePill, { backgroundColor: "rgba(0,0,0,0.2)" }]}>
          <Text style={s.scoreText}>{score} pts</Text>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View style={s.gameBody}>
          {/* Timer */}
          <View style={[s.timerCircle, { borderColor: timerColor }]}>
            <Text style={[s.timerNum, { color: timerColor }]}>{timeLeft}</Text>
          </View>

          {/* Emoji display */}
          <Animated.View style={[s.emojiCard, { backgroundColor: colors.surface, borderColor: colors.border, transform: [{ translateX: shakeAnim }, { translateY: bounceAnim }] }]}>
            <Text style={s.emojiDisplay}>{puzzle?.emoji}</Text>
          </Animated.View>

          {/* Feedback */}
          {feedback && (
            <View style={[s.feedbackBanner, { backgroundColor: feedback === "correct" ? "#34C75918" : "#FF3B3018" }]}>
              <Ionicons name={feedback === "correct" ? "checkmark-circle" : "close-circle"} size={20} color={feedback === "correct" ? "#34C759" : "#FF3B30"} />
              <Text style={[s.feedbackText, { color: feedback === "correct" ? "#34C759" : "#FF3B30" }]}>
                {feedback === "correct" ? `+${cfg.pointsPerCorrect} pts — Correct!` : `Wrong — it was "${puzzle?.answer}"`}
              </Text>
            </View>
          )}

          {/* Hint */}
          {showHint && puzzle?.hint && (
            <View style={[s.hintBanner, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Ionicons name="bulb" size={16} color="#FF9500" />
              <Text style={[s.hintText, { color: colors.text }]}>{puzzle.hint}</Text>
            </View>
          )}

          {/* Input */}
          <View style={[s.inputCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <TextInput
              style={[s.input, { color: colors.text }]}
              placeholder="Type your answer..."
              placeholderTextColor={colors.textMuted}
              value={input}
              onChangeText={setInput}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={submitAnswer}
            />
          </View>

          {/* Buttons */}
          <View style={s.btnRow}>
            <TouchableOpacity
              style={[s.hintBtn, { backgroundColor: hints > 0 ? "#FF950018" : colors.backgroundSecondary, borderColor: hints > 0 ? "#FF9500" : colors.border }]}
              onPress={useHint}
              disabled={hints === 0 || showHint}
            >
              <Ionicons name="bulb-outline" size={16} color={hints > 0 ? "#FF9500" : colors.textMuted} />
              <Text style={[s.hintBtnText, { color: hints > 0 ? "#FF9500" : colors.textMuted }]}>Hint ({hints})</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.submitBtn, { backgroundColor: "#FF9500", flex: 1 }]} onPress={submitAnswer}>
              <Text style={s.submitBtnText}>Submit</Text>
              <Ionicons name="checkmark" size={18} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={[s.skipBtn, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={skipQuestion}>
              <Text style={[s.skipBtnText, { color: colors.textMuted }]}>Skip</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  banner: { alignItems: "center", paddingHorizontal: 24, paddingBottom: 32, gap: 8, position: "relative" },
  backBtn: { position: "absolute", top: 50, left: 16, width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(0,0,0,0.2)", alignItems: "center", justifyContent: "center" },
  bannerTitle: { fontSize: 28, fontFamily: "Inter_700Bold", color: "#fff" },
  bannerSub: { fontSize: 14, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.85)", textAlign: "center" },
  body: { flex: 1, padding: 20, gap: 10 },
  ruleRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 14, borderWidth: 0.5 },
  ruleIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  ruleText: { fontSize: 14, fontFamily: "Inter_500Medium", flex: 1 },
  levelLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.7, marginTop: 4 },
  levelBtn: { padding: 16, borderRadius: 16, gap: 4 },
  levelBtnText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#fff" },
  levelBtnSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.8)" },
  startBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: 16, borderRadius: 16 },
  startBtnText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#fff" },

  topBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 14, gap: 12 },
  topLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "rgba(255,255,255,0.9)" },
  timerTrack: { height: 4, width: 100, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.3)", overflow: "hidden" },
  timerFill: { height: "100%", borderRadius: 2 },
  scorePill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  scoreText: { fontSize: 13, fontFamily: "Inter_700Bold", color: "#fff" },

  gameBody: { flex: 1, padding: 20, alignItems: "center", gap: 16 },
  timerCircle: { width: 60, height: 60, borderRadius: 30, borderWidth: 3, alignItems: "center", justifyContent: "center" },
  timerNum: { fontSize: 22, fontFamily: "Inter_700Bold" },
  emojiCard: { width: "100%", borderRadius: 24, borderWidth: 1, paddingVertical: 36, alignItems: "center", justifyContent: "center" },
  emojiDisplay: { fontSize: 72, textAlign: "center" },
  feedbackBanner: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14, width: "100%" },
  feedbackText: { fontSize: 14, fontFamily: "Inter_600SemiBold", flex: 1 },
  hintBanner: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 14, borderWidth: 0.5, width: "100%" },
  hintText: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1 },
  inputCard: { width: "100%", borderRadius: 14, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 4 },
  input: { fontSize: 17, fontFamily: "Inter_500Medium", paddingVertical: 12 },
  btnRow: { flexDirection: "row", gap: 10, width: "100%" },
  hintBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 14, borderRadius: 14, borderWidth: 1 },
  hintBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  submitBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 14, borderRadius: 14 },
  submitBtnText: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#fff" },
  skipBtn: { paddingHorizontal: 14, paddingVertical: 14, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  skipBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },

  reviewTitle: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.7 },
  reviewCard: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 14, borderWidth: 1, padding: 12 },
  reviewAnswer: { fontSize: 13, fontFamily: "Inter_500Medium" },
});
