import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated, Dimensions, Easing, Platform, Pressable,
  ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "@/components/ui/SafeGradient";
import { useTheme } from "@/hooks/useTheme";
import * as Haptics from "@/lib/haptics";

const { width: W } = Dimensions.get("window");

const ALL_QUESTIONS = [
  { q: "What is the capital of Kenya?", options: ["Mombasa","Nairobi","Kisumu","Nakuru"], answer: 1, category: "Geography" },
  { q: "How many continents are there on Earth?", options: ["5","6","7","8"], answer: 2, category: "Geography" },
  { q: "Which planet is known as the Red Planet?", options: ["Venus","Jupiter","Saturn","Mars"], answer: 3, category: "Science" },
  { q: "What is the chemical symbol for Gold?", options: ["Go","Gd","Au","Ag"], answer: 2, category: "Science" },
  { q: "Who painted the Mona Lisa?", options: ["Michelangelo","Raphael","Leonardo da Vinci","Caravaggio"], answer: 2, category: "Art" },
  { q: "What year did World War II end?", options: ["1943","1944","1945","1946"], answer: 2, category: "History" },
  { q: "How many sides does a hexagon have?", options: ["5","6","7","8"], answer: 1, category: "Math" },
  { q: "What is the largest ocean on Earth?", options: ["Atlantic","Indian","Arctic","Pacific"], answer: 3, category: "Geography" },
  { q: "Which language has the most native speakers?", options: ["English","Spanish","Hindi","Mandarin"], answer: 3, category: "Language" },
  { q: "What is the speed of light (approx)?", options: ["300,000 km/s","150,000 km/s","500,000 km/s","1,000,000 km/s"], answer: 0, category: "Science" },
  { q: "Who wrote 'Romeo and Juliet'?", options: ["Charles Dickens","Jane Austen","William Shakespeare","Mark Twain"], answer: 2, category: "Literature" },
  { q: "What is 12 × 12?", options: ["132","144","124","148"], answer: 1, category: "Math" },
  { q: "Which gas do plants absorb during photosynthesis?", options: ["Oxygen","Nitrogen","Carbon Dioxide","Hydrogen"], answer: 2, category: "Science" },
  { q: "In which country is the Eiffel Tower located?", options: ["Italy","Spain","Germany","France"], answer: 3, category: "Geography" },
  { q: "What is the smallest prime number?", options: ["0","1","2","3"], answer: 2, category: "Math" },
];

const TIMER_SECONDS = 15;
const CATEGORY_COLORS: Record<string, string> = {
  Geography: "#007AFF", Science: "#34C759", Art: "#AF52DE",
  History: "#FF9500", Math: "#FF2D55", Language: "#5AC8FA", Literature: "#FF6B35",
};

type Phase = "intro" | "playing" | "result";

export default function TriviaGame() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const [phase, setPhase]         = useState<Phase>("intro");
  const [questions, setQuestions] = useState<typeof ALL_QUESTIONS>([]);
  const [qIndex, setQIndex]       = useState(0);
  const [selected, setSelected]   = useState<number | null>(null);
  const [score, setScore]         = useState(0);
  const [timeLeft, setTimeLeft]   = useState(TIMER_SECONDS);
  const [answers, setAnswers]     = useState<(number | null)[]>([]);

  const timerRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim     = useRef(new Animated.Value(0)).current;
  const slideAnim    = useRef(new Animated.Value(30)).current;

  const question = questions[qIndex];

  function shuffle<T>(arr: T[]): T[] {
    return [...arr].sort(() => Math.random() - 0.5);
  }

  function startGame() {
    const q = shuffle(ALL_QUESTIONS).slice(0, 10);
    setQuestions(q);
    setQIndex(0);
    setScore(0);
    setAnswers([]);
    setSelected(null);
    setTimeLeft(TIMER_SECONDS);
    setPhase("playing");
    fadeAnim.setValue(0);
    slideAnim.setValue(30);
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: Platform.OS !== "web" }),
      Animated.timing(slideAnim, { toValue: 0, duration: 400, easing: Easing.out(Easing.quad), useNativeDriver: Platform.OS !== "web" }),
    ]).start();
  }

  const nextQuestion = useCallback((sel: number | null) => {
    if (timerRef.current) clearInterval(timerRef.current);
    const q = questions[qIndex];
    const correct = sel === q?.answer;
    if (correct) {
      setScore((s) => s + 10);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
    setAnswers((prev) => [...prev, sel]);

    setTimeout(() => {
      if (qIndex + 1 >= questions.length) {
        setPhase("result");
      } else {
        setQIndex((i) => i + 1);
        setSelected(null);
        setTimeLeft(TIMER_SECONDS);
        progressAnim.setValue(1);
        fadeAnim.setValue(0);
        slideAnim.setValue(20);
        Animated.parallel([
          Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: Platform.OS !== "web" }),
          Animated.timing(slideAnim, { toValue: 0, duration: 300, easing: Easing.out(Easing.quad), useNativeDriver: Platform.OS !== "web" }),
        ]).start();
      }
    }, 900);
  }, [qIndex, questions]);

  useEffect(() => {
    if (phase !== "playing" || selected !== null) return;
    progressAnim.setValue(1);
    Animated.timing(progressAnim, {
      toValue: 0,
      duration: TIMER_SECONDS * 1000,
      useNativeDriver: false,
      easing: Easing.linear,
    }).start();

    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          nextQuestion(null);
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [qIndex, phase, selected]);

  function handleSelect(idx: number) {
    if (selected !== null) return;
    setSelected(idx);
    if (timerRef.current) clearInterval(timerRef.current);
    nextQuestion(idx);
  }

  const catColor = question ? (CATEGORY_COLORS[question.category] || "#1f95ff") : "#1f95ff";
  const pct = questions.length > 0 ? ((qIndex + 1) / questions.length) * 100 : 0;

  // ── INTRO ──────────────────────────────────────────────────────────────────
  if (phase === "intro") {
    return (
      <View style={[s.root, { backgroundColor: colors.background }]}>
        <LinearGradient colors={["#5856D6", "#6E6CD3"]} style={[s.introBanner, { paddingTop: insets.top + 20 }]}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={s.introEmoji}>🧠</Text>
          <Text style={s.introTitle}>AfuTrivia</Text>
          <Text style={s.introSub}>10 questions · 15 seconds each · Test your knowledge</Text>
        </LinearGradient>
        <View style={s.introBody}>
          {[
            { icon: "help-circle", label: "10 random questions" },
            { icon: "timer-outline", label: "15 seconds per question" },
            { icon: "flash", label: "+10 XP per correct answer" },
            { icon: "trophy", label: "Earn up to 100 XP" },
          ].map((r) => (
            <View key={r.label} style={[s.ruleRow, { borderColor: colors.border }]}>
              <View style={[s.ruleIcon, { backgroundColor: "#5856D620" }]}>
                <Ionicons name={r.icon as any} size={18} color="#5856D6" />
              </View>
              <Text style={[s.ruleText, { color: colors.text }]}>{r.label}</Text>
            </View>
          ))}
          <TouchableOpacity style={[s.startBtn, { backgroundColor: "#5856D6" }]} onPress={startGame}>
            <Text style={s.startBtnText}>Start Game</Text>
            <Ionicons name="play" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── RESULT ─────────────────────────────────────────────────────────────────
  if (phase === "result") {
    const correct = answers.filter((a, i) => a === questions[i]?.answer).length;
    const pctScore = Math.round((correct / questions.length) * 100);
    const grade = pctScore >= 90 ? "🏆 Outstanding!" : pctScore >= 70 ? "🌟 Great job!" : pctScore >= 50 ? "👍 Good try!" : "💪 Keep practicing!";
    return (
      <View style={[s.root, { backgroundColor: colors.background }]}>
        <LinearGradient colors={["#5856D6", "#6E6CD3"]} style={[s.resultBanner, { paddingTop: insets.top + 20 }]}>
          <Text style={s.resultEmoji}>{pctScore >= 70 ? "🏆" : pctScore >= 50 ? "🎯" : "😅"}</Text>
          <Text style={s.resultGrade}>{grade}</Text>
          <Text style={s.resultScore}>{correct}/{questions.length} correct</Text>
          <View style={s.resultXpBadge}>
            <Text style={s.resultXpText}>+{score} XP earned</Text>
          </View>
        </LinearGradient>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 8, paddingBottom: insets.bottom + 30 }}>
          <Text style={[s.reviewTitle, { color: colors.textMuted }]}>REVIEW</Text>
          {questions.map((q, i) => {
            const userAns = answers[i];
            const correct = userAns === q.answer;
            return (
              <View key={i} style={[s.reviewCard, { backgroundColor: colors.surface, borderColor: correct ? "#34C75940" : "#FF3B3040" }]}>
                <View style={s.reviewTop}>
                  <View style={[s.reviewBadge, { backgroundColor: CATEGORY_COLORS[q.category] + "20" }]}>
                    <Text style={[s.reviewBadgeText, { color: CATEGORY_COLORS[q.category] }]}>{q.category}</Text>
                  </View>
                  <Ionicons name={correct ? "checkmark-circle" : "close-circle"} size={20} color={correct ? "#34C759" : "#FF3B30"} />
                </View>
                <Text style={[s.reviewQ, { color: colors.text }]}>{q.q}</Text>
                <Text style={[s.reviewA, { color: correct ? "#34C759" : colors.textMuted }]}>
                  ✓ {q.options[q.answer]}
                </Text>
                {!correct && userAns !== null && (
                  <Text style={[s.reviewA, { color: "#FF3B30" }]}>✗ {q.options[userAns]}</Text>
                )}
                {userAns === null && (
                  <Text style={[s.reviewA, { color: colors.textMuted }]}>⏱ Time's up</Text>
                )}
              </View>
            );
          })}
          <TouchableOpacity style={[s.startBtn, { backgroundColor: "#5856D6", marginTop: 8 }]} onPress={startGame}>
            <Text style={s.startBtnText}>Play Again</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.startBtn, { backgroundColor: colors.surface, marginTop: 4 }]} onPress={() => router.back()}>
            <Text style={[s.startBtnText, { color: colors.text }]}>Back to Games</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // ── PLAYING ────────────────────────────────────────────────────────────────
  return (
    <View style={[s.root, { backgroundColor: colors.background }]}>
      {/* Top bar */}
      <LinearGradient colors={["#5856D6", "#7B79E8"]} style={[s.topBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="close" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={s.topCenter}>
          <Text style={s.topQ}>{qIndex + 1} / {questions.length}</Text>
          <View style={s.topProgressTrack}>
            <Animated.View style={[s.topProgressFill, { width: progressAnim.interpolate({ inputRange: [0,1], outputRange: ["0%","100%"] }) }]} />
          </View>
        </View>
        <View style={[s.timerBadge, { backgroundColor: timeLeft <= 5 ? "#FF3B30" : "rgba(255,255,255,0.2)" }]}>
          <Ionicons name="timer-outline" size={14} color="#fff" />
          <Text style={s.timerText}>{timeLeft}s</Text>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: insets.bottom + 20 }}>
        {/* Category + XP */}
        <View style={s.metaRow}>
          <View style={[s.catBadge, { backgroundColor: catColor + "22" }]}>
            <Text style={[s.catText, { color: catColor }]}>{question?.category}</Text>
          </View>
          <View style={[s.catBadge, { backgroundColor: "#FF950022" }]}>
            <Ionicons name="flash" size={11} color="#FF9500" />
            <Text style={[s.catText, { color: "#FF9500" }]}>+10 XP</Text>
          </View>
          <View style={{ flex: 1 }} />
          <Text style={[s.scoreText, { color: colors.textMuted }]}>Score: {score}</Text>
        </View>

        {/* Question */}
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          <View style={[s.questionCard, { backgroundColor: colors.surface, borderColor: catColor + "33" }]}>
            <Text style={[s.questionText, { color: colors.text }]}>{question?.q}</Text>
          </View>

          {/* Options */}
          <View style={{ gap: 10, marginTop: 16 }}>
            {question?.options.map((opt, idx) => {
              const isCorrect = idx === question.answer;
              const isSelected = selected === idx;
              const showResult = selected !== null;
              let bg = colors.surface;
              let border = colors.border;
              let textColor = colors.text;
              if (showResult && isCorrect) { bg = "#34C75918"; border = "#34C759"; textColor = "#34C759"; }
              else if (showResult && isSelected && !isCorrect) { bg = "#FF3B3018"; border = "#FF3B30"; textColor = "#FF3B30"; }

              return (
                <Pressable key={idx} onPress={() => handleSelect(idx)} disabled={selected !== null}>
                  <View style={[s.optionCard, { backgroundColor: bg, borderColor: border }]}>
                    <View style={[s.optionLetter, { backgroundColor: showResult && isCorrect ? "#34C759" : showResult && isSelected ? "#FF3B30" : colors.backgroundSecondary }]}>
                      <Text style={[s.optionLetterText, { color: (showResult && (isCorrect || isSelected)) ? "#fff" : colors.textMuted }]}>
                        {["A","B","C","D"][idx]}
                      </Text>
                    </View>
                    <Text style={[s.optionText, { color: textColor, flex: 1 }]}>{opt}</Text>
                    {showResult && isCorrect && <Ionicons name="checkmark-circle" size={20} color="#34C759" />}
                    {showResult && isSelected && !isCorrect && <Ionicons name="close-circle" size={20} color="#FF3B30" />}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  introBanner: { alignItems: "center", paddingHorizontal: 24, paddingBottom: 36, gap: 8, position: "relative" },
  backBtn: { position: "absolute", top: 50, left: 16, width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(0,0,0,0.2)", alignItems: "center", justifyContent: "center" },
  introEmoji: { fontSize: 60, marginTop: 20 },
  introTitle: { fontSize: 28, fontFamily: "Inter_700Bold", color: "#fff" },
  introSub: { fontSize: 14, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.8)", textAlign: "center" },
  introBody: { flex: 1, padding: 20, gap: 12 },
  ruleRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 14, borderWidth: 0.5 },
  ruleIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  ruleText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  startBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: 16, borderRadius: 16, marginTop: 8 },
  startBtnText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#fff" },

  topBar: { paddingHorizontal: 16, paddingBottom: 16, flexDirection: "row", alignItems: "center", gap: 12 },
  topCenter: { flex: 1, gap: 6 },
  topQ: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "rgba(255,255,255,0.8)" },
  topProgressTrack: { height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.25)", overflow: "hidden" },
  topProgressFill: { height: "100%", borderRadius: 2, backgroundColor: "#fff" },
  timerBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  timerText: { fontSize: 13, fontFamily: "Inter_700Bold", color: "#fff" },

  metaRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  catBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  catText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  scoreText: { fontSize: 13, fontFamily: "Inter_700Bold" },

  questionCard: { borderRadius: 20, borderWidth: 1, padding: 24, minHeight: 120, justifyContent: "center" },
  questionText: { fontSize: 19, fontFamily: "Inter_600SemiBold", lineHeight: 27, textAlign: "center" },

  optionCard: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16, borderRadius: 14, borderWidth: 1.5 },
  optionLetter: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  optionLetterText: { fontSize: 14, fontFamily: "Inter_700Bold" },
  optionText: { fontSize: 15, fontFamily: "Inter_500Medium" },

  resultBanner: { alignItems: "center", paddingTop: 80, paddingBottom: 36, gap: 8 },
  resultEmoji: { fontSize: 56 },
  resultGrade: { fontSize: 22, fontFamily: "Inter_700Bold", color: "#fff" },
  resultScore: { fontSize: 16, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.85)" },
  resultXpBadge: { backgroundColor: "rgba(255,149,0,0.3)", paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, marginTop: 4 },
  resultXpText: { fontSize: 14, fontFamily: "Inter_700Bold", color: "#FFCC00" },

  reviewTitle: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.7, marginBottom: 4 },
  reviewCard: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 6 },
  reviewTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  reviewBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  reviewBadgeText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  reviewQ: { fontSize: 14, fontFamily: "Inter_500Medium", lineHeight: 20 },
  reviewA: { fontSize: 13, fontFamily: "Inter_400Regular" },
});
