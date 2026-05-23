import React, { useEffect, useState } from "react";
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
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { LinearGradient } from "@/components/ui/SafeGradient";
import { GlassCard } from "@/components/ui/GlassCard";

type Tx = {
  id: string;
  type: "credit" | "debit";
  label: string;
  amount: number;
  currency: string;
  created_at: string;
};

const QUICK_ACTIONS = [
  { icon: "arrow-up-circle" as const, label: "Send", color: "#34C759" },
  { icon: "arrow-down-circle" as const, label: "Receive", color: "#007AFF" },
  { icon: "add-circle" as const, label: "Top Up", color: "#FF9500" },
  { icon: "swap-horizontal" as const, label: "Exchange", color: "#AF52DE" },
];

export default function AfuPayApp() {
  const { colors, accent } = useTheme();
  const { user, profile } = useAuth();
  const insets = useSafeAreaInsets();
  const [acoin, setAcoin] = useState<number>(profile?.acoin ?? 0);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    supabase
      .from("profiles")
      .select("acoin")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data) setAcoin(data.acoin ?? 0);
      });

    supabase
      .from("acoin_transactions")
      .select("id, type, label, amount, currency, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data }) => {
        setTxs((data as Tx[]) ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [user]);

  function fmtDate(iso: string) {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  function fmtAmt(n: number) {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return n.toString();
  }

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Balance Card */}
      <LinearGradient
        colors={["#34C759", "#00C781"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.balanceCard}
      >
        <Text style={styles.balanceLabel}>{"Total Balance"}</Text>
        <Text style={styles.balanceAmount}>
          {fmtAmt(acoin)} <Text style={styles.balanceCurrency}>{"ACoin"}</Text>
        </Text>
        <Text style={styles.balanceSub}>{"AfuChat Coin • Always available"}</Text>
      </LinearGradient>

      {/* Quick Actions */}
      <View style={styles.actionsRow}>
        {QUICK_ACTIONS.map((a) => (
          <Pressable
            key={a.label}
            style={({ pressed }) => [styles.actionItem, pressed && { opacity: 0.7 }]}
          >
            <View style={[styles.actionIcon, { backgroundColor: a.color + "18" }]}>
              <Ionicons name={a.icon} size={24} color={a.color} />
            </View>
            <Text style={[styles.actionLabel, { color: colors.textSecondary }]}>
              {a.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Transactions */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          {"RECENT TRANSACTIONS"}
        </Text>
        <GlassCard variant="medium" style={styles.txCard}>
          {loading ? (
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>{"Loading…"}</Text>
          ) : txs.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Ionicons name="receipt-outline" size={38} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                {"No transactions yet"}
              </Text>
            </View>
          ) : (
            txs.map((tx, i) => (
              <View key={tx.id}>
                {i > 0 && (
                  <View style={[styles.sep, { backgroundColor: colors.border }]} />
                )}
                <View style={styles.txRow}>
                  <View
                    style={[
                      styles.txIcon,
                      {
                        backgroundColor:
                          (tx.type === "credit" ? "#34C759" : "#FF3B30") + "18",
                      },
                    ]}
                  >
                    <Ionicons
                      name={tx.type === "credit" ? "arrow-down" : "arrow-up"}
                      size={16}
                      color={tx.type === "credit" ? "#34C759" : "#FF3B30"}
                    />
                  </View>
                  <View style={styles.txInfo}>
                    <Text
                      style={[styles.txLabel, { color: colors.text }]}
                      numberOfLines={1}
                    >
                      {tx.label ?? (tx.type === "credit" ? "Received" : "Sent")}
                    </Text>
                    <Text style={[styles.txDate, { color: colors.textMuted }]}>
                      {fmtDate(tx.created_at)}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.txAmount,
                      {
                        color: tx.type === "credit" ? "#34C759" : "#FF3B30",
                      },
                    ]}
                  >
                    {tx.type === "credit" ? "+" : "-"}
                    {fmtAmt(tx.amount)} {tx.currency ?? "AC"}
                  </Text>
                </View>
              </View>
            ))
          )}
        </GlassCard>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  balanceCard: {
    margin: 16,
    borderRadius: 20,
    padding: 24,
  },
  balanceLabel: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    marginBottom: 6,
  },
  balanceAmount: {
    color: "#fff",
    fontSize: 36,
    fontFamily: "Inter_700Bold",
    marginBottom: 4,
  },
  balanceCurrency: {
    fontSize: 18,
    fontFamily: "Inter_500Medium",
  },
  balanceSub: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  actionsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  actionItem: { alignItems: "center", gap: 6 },
  actionIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  actionLabel: { fontSize: 12, fontFamily: "Inter_500Medium" },
  section: { paddingHorizontal: 16, marginTop: 16 },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  txCard: { borderRadius: 16, overflow: "hidden" },
  txRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  txIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  txInfo: { flex: 1 },
  txLabel: { fontSize: 14, fontFamily: "Inter_500Medium", marginBottom: 2 },
  txDate: { fontSize: 12, fontFamily: "Inter_400Regular" },
  txAmount: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  sep: { height: StyleSheet.hairlineWidth, marginLeft: 62 },
  emptyWrap: { alignItems: "center", padding: 32, gap: 8 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
});
