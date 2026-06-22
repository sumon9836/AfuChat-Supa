import React, { useState } from "react";
import {
  Animated, Dimensions, Platform, ScrollView,
  StyleSheet, Text, TouchableOpacity, View,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "@/components/ui/SafeGradient";
import { useTheme } from "@/hooks/useTheme";
import * as Haptics from "@/lib/haptics";

const { width: W } = Dimensions.get("window");

type Prediction = {
  id: string;
  category: string;
  categoryColor: string;
  question: string;
  optionA: string;
  optionB: string;
  deadline: string;
  yesVotes: number;
  noVotes: number;
  acoinPool: number;
  status: "open" | "resolved";
  result?: "A" | "B";
  xpReward: number;
};

const PREDICTIONS: Prediction[] = [
  {
    id: "p1", category: "Tech", categoryColor: "#007AFF",
    question: "Will a major AI company release a GPT-5 equivalent by end of year?",
    optionA: "Yes, it will happen", optionB: "No, not this year",
    deadline: "Dec 31, 2025", yesVotes: 6842, noVotes: 3158, acoinPool: 50000, xpReward: 100, status: "open",
  },
  {
    id: "p2", category: "Sports", categoryColor: "#FF3B30",
    question: "Will a new world record be set at the next Olympics 100m sprint?",
    optionA: "New record broken", optionB: "Current record holds",
    deadline: "Aug 2026", yesVotes: 4521, noVotes: 5479, acoinPool: 35000, xpReward: 80, status: "open",
  },
  {
    id: "p3", category: "Finance", categoryColor: "#34C759",
    question: "Will Bitcoin surpass $150K before the end of 2025?",
    optionA: "Yes — $150K+", optionB: "No — stays below",
    deadline: "Dec 31, 2025", yesVotes: 7200, noVotes: 2800, acoinPool: 120000, xpReward: 150, status: "open",
  },
  {
    id: "p4", category: "Entertainment", categoryColor: "#AF52DE",
    question: "Will the next Marvel Avengers movie break box office records?",
    optionA: "Record-breaking", optionB: "Doesn't break records",
    deadline: "2026", yesVotes: 8100, noVotes: 1900, acoinPool: 75000, xpReward: 60, status: "open",
  },
  {
    id: "p5", category: "Tech", categoryColor: "#007AFF",
    question: "Will a consumer-grade humanoid robot be sold by a top-3 tech company in 2025?",
    optionA: "Yes — on shelves", optionB: "Still in development",
    deadline: "Dec 31, 2025", yesVotes: 2900, noVotes: 7100, acoinPool: 45000, xpReward: 120, status: "resolved",
    result: "B",
  },
  {
    id: "p6", category: "AfuChat", categoryColor: "#1f95ff",
    question: "Will AfuChat reach 1M active users by Q2 2026?",
    optionA: "🚀 Yes!", optionB: "Not yet",
    deadline: "Jun 30, 2026", yesVotes: 9200, noVotes: 800, acoinPool: 200000, xpReward: 200, status: "open",
  },
];

type Tab = "live" | "resolved" | "myvotes";

export default function PredictionGame() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const [activeTab, setActiveTab] = useState<Tab>("live");
  const [votes, setVotes] = useState<Record<string, "A" | "B">>({});
  const [expanded, setExpanded] = useState<string | null>(null);

  function castVote(id: string, option: "A" | "B") {
    if (votes[id]) return;
    setVotes((v) => ({ ...v, [id]: option }));
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  const live     = PREDICTIONS.filter((p) => p.status === "open");
  const resolved = PREDICTIONS.filter((p) => p.status === "resolved");
  const myvotes  = PREDICTIONS.filter((p) => votes[p.id]);

  const tabs = [
    { id: "live" as Tab,     label: "Live",     icon: "radio-outline",    count: live.length },
    { id: "resolved" as Tab, label: "Resolved", icon: "checkmark-circle-outline", count: resolved.length },
    { id: "myvotes" as Tab,  label: "My Votes", icon: "person-outline",   count: myvotes.length },
  ];

  const displayList = activeTab === "live" ? live : activeTab === "resolved" ? resolved : myvotes;

  return (
    <View style={[s.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <LinearGradient colors={["#FF2D55","#FF6B6B"]} style={[s.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>AfuPredict</Text>
          <Text style={s.headerSub}>Predict the future · Earn ACoins</Text>
        </View>
        <View style={[s.poolBadge]}>
          <Ionicons name="cash-outline" size={14} color="#FFD700" />
          <Text style={s.poolText}>{(PREDICTIONS.reduce((s, p) => s + p.acoinPool, 0) / 1000).toFixed(0)}K Pool</Text>
        </View>
      </LinearGradient>

      {/* Stats strip */}
      <View style={[s.statsStrip, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {[
          { label: "Live Predictions", value: String(live.length), icon: "radio-outline", color: "#FF2D55" },
          { label: "Total Voted",      value: String(Object.keys(votes).length), icon: "people-outline", color: "#007AFF" },
          { label: "XP Available",     value: `${live.reduce((s,p)=>s+p.xpReward,0)}`, icon: "flash", color: "#FF9500" },
        ].map((stat, i) => (
          <React.Fragment key={stat.label}>
            {i > 0 && <View style={[s.stripDivider, { backgroundColor: colors.border }]} />}
            <View style={s.stripStat}>
              <Ionicons name={stat.icon as any} size={14} color={stat.color} />
              <Text style={[s.stripValue, { color: colors.text }]}>{stat.value}</Text>
              <Text style={[s.stripLabel, { color: colors.textMuted }]}>{stat.label}</Text>
            </View>
          </React.Fragment>
        ))}
      </View>

      {/* Tabs */}
      <View style={[s.tabBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {tabs.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={[s.tab, active && { borderBottomColor: "#FF2D55", borderBottomWidth: 2 }]}
              onPress={() => setActiveTab(tab.id)}
            >
              <Ionicons name={tab.icon as any} size={14} color={active ? "#FF2D55" : colors.textMuted} />
              <Text style={[s.tabLabel, { color: active ? "#FF2D55" : colors.textMuted }]}>{tab.label}</Text>
              {tab.count > 0 && (
                <View style={[s.tabCount, { backgroundColor: active ? "#FF2D55" : colors.border }]}>
                  <Text style={[s.tabCountText, { color: active ? "#fff" : colors.textMuted }]}>{tab.count}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 14, gap: 12, paddingBottom: insets.bottom + 30 }}>
        {displayList.length === 0 && (
          <View style={s.empty}>
            <Text style={{ fontSize: 44 }}>🎯</Text>
            <Text style={[s.emptyTitle, { color: colors.text }]}>
              {activeTab === "myvotes" ? "No votes yet" : "Nothing here"}
            </Text>
            <Text style={[s.emptySub, { color: colors.textMuted }]}>
              {activeTab === "myvotes" ? "Cast your first prediction on the Live tab" : "Check back soon"}
            </Text>
          </View>
        )}

        {displayList.map((pred) => {
          const myVote    = votes[pred.id];
          const total     = pred.yesVotes + pred.noVotes + (myVote ? 1 : 0);
          const aVotes    = pred.yesVotes + (myVote === "A" ? 1 : 0);
          const bVotes    = pred.noVotes  + (myVote === "B" ? 1 : 0);
          const aPct      = Math.round((aVotes / total) * 100);
          const bPct      = 100 - aPct;
          const isExpanded = expanded === pred.id;
          const isResolved = pred.status === "resolved";
          const wonA = isResolved && pred.result === "A";
          const wonB = isResolved && pred.result === "B";
          const myCorrect = isResolved && myVote && myVote === pred.result;

          return (
            <TouchableOpacity
              key={pred.id}
              style={[s.card, { backgroundColor: colors.surface, borderColor: myVote ? "#FF2D5540" : colors.border }]}
              onPress={() => setExpanded(isExpanded ? null : pred.id)}
              activeOpacity={0.85}
            >
              {/* Card header */}
              <View style={s.cardTop}>
                <View style={[s.catBadge, { backgroundColor: pred.categoryColor + "20" }]}>
                  <Text style={[s.catText, { color: pred.categoryColor }]}>{pred.category}</Text>
                </View>
                <View style={{ flex: 1 }} />
                {isResolved && (
                  <View style={[s.catBadge, { backgroundColor: "#34C75920" }]}>
                    <Ionicons name="checkmark-circle" size={11} color="#34C759" />
                    <Text style={[s.catText, { color: "#34C759" }]}>Resolved</Text>
                  </View>
                )}
                {!isResolved && (
                  <View style={[s.catBadge, { backgroundColor: "#FF3B3020" }]}>
                    <View style={[s.liveIndicator, { backgroundColor: "#FF3B30" }]} />
                    <Text style={[s.catText, { color: "#FF3B30" }]}>Live</Text>
                  </View>
                )}
                <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={16} color={colors.textMuted} />
              </View>

              <Text style={[s.question, { color: colors.text }]}>{pred.question}</Text>

              {/* Community split bar */}
              <View style={s.splitWrap}>
                <View style={[s.splitBar, { borderRadius: 6, overflow: "hidden" }]}>
                  <View style={[s.splitA, { flex: aPct, backgroundColor: wonA ? "#34C759" : "#007AFF" }]} />
                  <View style={[s.splitB, { flex: bPct, backgroundColor: wonB ? "#34C759" : "#FF3B30" }]} />
                </View>
                <View style={s.splitLabels}>
                  <Text style={[s.splitPct, { color: "#007AFF" }]}>{aPct}%</Text>
                  <Text style={[s.splitPct, { color: "#FF3B30" }]}>{bPct}%</Text>
                </View>
              </View>

              {/* Expanded vote section */}
              {isExpanded && (
                <View style={{ gap: 10 }}>
                  {/* Deadline + pool */}
                  <View style={s.infoRow}>
                    <View style={[s.infoPill, { backgroundColor: colors.backgroundSecondary }]}>
                      <Ionicons name="calendar-outline" size={12} color={colors.textMuted} />
                      <Text style={[s.infoPillText, { color: colors.textMuted }]}>{pred.deadline}</Text>
                    </View>
                    <View style={[s.infoPill, { backgroundColor: "#FF950018" }]}>
                      <Text style={[s.infoPillText, { color: "#FF9500" }]}>🪙 {pred.acoinPool.toLocaleString()} pool</Text>
                    </View>
                    <View style={[s.infoPill, { backgroundColor: "#FF2D5518" }]}>
                      <Ionicons name="flash" size={12} color="#FF2D55" />
                      <Text style={[s.infoPillText, { color: "#FF2D55" }]}>+{pred.xpReward} XP</Text>
                    </View>
                  </View>

                  {/* Vote buttons */}
                  {!myVote && !isResolved && (
                    <View style={{ gap: 8 }}>
                      <Text style={[s.votePrompt, { color: colors.textMuted }]}>Cast your prediction:</Text>
                      <TouchableOpacity style={[s.voteBtn, { backgroundColor: "#007AFF" }]} onPress={() => castVote(pred.id, "A")}>
                        <Ionicons name="thumbs-up" size={16} color="#fff" />
                        <Text style={s.voteBtnText}>{pred.optionA}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[s.voteBtn, { backgroundColor: "#FF3B30" }]} onPress={() => castVote(pred.id, "B")}>
                        <Ionicons name="thumbs-down" size={16} color="#fff" />
                        <Text style={s.voteBtnText}>{pred.optionB}</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {myVote && (
                    <View style={[s.myVoteBanner, { backgroundColor: myCorrect ? "#34C75918" : myVote ? "#007AFF18" : colors.backgroundSecondary, borderColor: myCorrect ? "#34C759" : "#007AFF" }]}>
                      <Ionicons name={myCorrect ? "checkmark-circle" : "checkmark-circle-outline"} size={18} color={myCorrect ? "#34C759" : "#007AFF"} />
                      <View style={{ flex: 1 }}>
                        <Text style={[s.myVoteText, { color: myCorrect ? "#34C759" : "#007AFF" }]}>
                          You voted: {myVote === "A" ? pred.optionA : pred.optionB}
                        </Text>
                        {myCorrect && <Text style={[s.myVoteSub, { color: "#34C759" }]}>+{pred.xpReward} XP earned!</Text>}
                        {isResolved && !myCorrect && <Text style={[s.myVoteSub, { color: colors.textMuted }]}>Better luck next time</Text>}
                      </View>
                    </View>
                  )}

                  {/* Vote counts */}
                  <View style={s.voteCountRow}>
                    <Text style={[s.voteCountText, { color: colors.textMuted }]}>
                      <Text style={{ color: "#007AFF" }}>{aVotes.toLocaleString()}</Text> voted "{pred.optionA.split(" ")[0]}"
                    </Text>
                    <Text style={[s.voteCountText, { color: colors.textMuted }]}>
                      <Text style={{ color: "#FF3B30" }}>{bVotes.toLocaleString()}</Text> voted "{pred.optionB.split(" ")[0]}"
                    </Text>
                  </View>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 16, gap: 12 },
  headerTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: "#fff" },
  headerSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.8)", marginTop: 1 },
  poolBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(0,0,0,0.25)", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
  poolText: { fontSize: 13, fontFamily: "Inter_700Bold", color: "#FFD700" },

  statsStrip: { flexDirection: "row", borderTopWidth: 0.5, borderBottomWidth: 0.5, paddingVertical: 14 },
  stripStat: { flex: 1, alignItems: "center", gap: 4 },
  stripDivider: { width: 0.5, marginVertical: 4 },
  stripValue: { fontSize: 17, fontFamily: "Inter_700Bold" },
  stripLabel: { fontSize: 10, fontFamily: "Inter_400Regular", textAlign: "center" },

  tabBar: { flexDirection: "row", borderBottomWidth: 0.5 },
  tab: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingVertical: 12 },
  tabLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  tabCount: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 10 },
  tabCountText: { fontSize: 10, fontFamily: "Inter_700Bold" },

  card: { borderRadius: 18, borderWidth: 1, padding: 16, gap: 12 },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 8 },
  catBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 9, paddingVertical: 3, borderRadius: 20 },
  catText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  liveIndicator: { width: 6, height: 6, borderRadius: 3 },
  question: { fontSize: 15, fontFamily: "Inter_600SemiBold", lineHeight: 22 },

  splitWrap: { gap: 6 },
  splitBar: { height: 8, flexDirection: "row" },
  splitA: { height: "100%" },
  splitB: { height: "100%" },
  splitLabels: { flexDirection: "row", justifyContent: "space-between" },
  splitPct: { fontSize: 12, fontFamily: "Inter_700Bold" },

  infoRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  infoPill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  infoPillText: { fontSize: 11, fontFamily: "Inter_500Medium" },

  votePrompt: { fontSize: 13, fontFamily: "Inter_500Medium" },
  voteBtn: { flexDirection: "row", alignItems: "center", gap: 8, padding: 14, borderRadius: 14 },
  voteBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#fff", flex: 1 },

  myVoteBanner: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 12, borderWidth: 1 },
  myVoteText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  myVoteSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },

  voteCountRow: { gap: 4 },
  voteCountText: { fontSize: 12, fontFamily: "Inter_400Regular" },

  empty: { alignItems: "center", gap: 10, paddingVertical: 60 },
  emptyTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  emptySub: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", maxWidth: 240 },
});
