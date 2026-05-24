import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Share,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { LinearGradient } from "@/components/ui/SafeGradient";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { showAlert } from "@/lib/alert";
import * as Haptics from "@/lib/haptics";
import Colors from "@/constants/colors";

type ReferralStats = {
  total_referrals: number;
  successful_referrals: number;
  total_nexa_earned: number;
};

const REWARD_PER_REFERRAL = 50;

export default function AfuReferralApp() {
  const { colors } = useTheme();
  const { user, profile } = useAuth();
  const insets = useSafeAreaInsets();
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [referrals, setReferrals] = useState<{ id: string; created_at: string; status: string; referee: { display_name: string; handle: string } | null }[]>([]);

  const referralCode = profile?.handle ? `${profile.handle}-afu` : user?.id?.substring(0, 8) || "yourcode";
  const referralLink = `https://afuchat.com/join?ref=${referralCode}`;

  const load = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from("referrals")
      .select("id,created_at,status,referee:referee_id(display_name,handle)")
      .eq("referrer_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);
    const list = (data as any[]) || [];
    setReferrals(list);
    const successful = list.filter(r => r.status === "completed").length;
    setStats({ total_referrals: list.length, successful_referrals: successful, total_nexa_earned: successful * REWARD_PER_REFERRAL });
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  async function copyCode() {
    await Clipboard.setStringAsync(referralCode);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    showAlert("Copied!", "Referral code copied to clipboard.");
  }

  async function shareLink() {
    try {
      await Share.share({ message: `Join me on AfuChat — Africa's super app!\n\n${referralLink}\n\nUse my code: ${referralCode}`, url: referralLink, title: "Join AfuChat" });
    } catch (_) {}
  }

  return (
    <ScrollView style={[s.root, { backgroundColor: colors.background }]} contentContainerStyle={{ paddingBottom: insets.bottom + 32 }} showsVerticalScrollIndicator={false}>
      <LinearGradient colors={["#0A2E1F", "#062218"]} style={s.hero}>
        <Ionicons name="people" size={36} color={Colors.brand} />
        <Text style={s.heroTitle}>Invite Friends</Text>
        <Text style={s.heroSub}>Earn {REWARD_PER_REFERRAL} Nexa for every friend who joins AfuChat</Text>
      </LinearGradient>

      <View style={s.statsRow}>
        {[
          { label: "Invited", value: stats?.total_referrals ?? 0, icon: "person-add" as const, color: Colors.brand },
          { label: "Joined", value: stats?.successful_referrals ?? 0, icon: "checkmark-circle" as const, color: "#34C759" },
          { label: "Nexa Earned", value: stats?.total_nexa_earned ?? 0, icon: "flash" as const, color: "#FF9500" },
        ].map(stat => (
          <View key={stat.label} style={[s.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name={stat.icon} size={18} color={stat.color} />
            <Text style={[s.statValue, { color: colors.text }]}>{loading ? "—" : stat.value.toLocaleString()}</Text>
            <Text style={[s.statLabel, { color: colors.textMuted }]}>{stat.label}</Text>
          </View>
        ))}
      </View>

      <View style={s.section}>
        <Text style={[s.sectionTitle, { color: colors.textSecondary }]}>YOUR REFERRAL CODE</Text>
        <View style={[s.codeCard, { backgroundColor: colors.surface, borderColor: Colors.brand + "40" }]}>
          <Text style={[s.codeText, { color: Colors.brand }]}>{referralCode}</Text>
          <TouchableOpacity style={[s.copyBtn, { backgroundColor: Colors.brand + "18" }]} onPress={copyCode}>
            <Ionicons name="copy-outline" size={16} color={Colors.brand} />
            <Text style={[s.copyBtnText, { color: Colors.brand }]}>Copy</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={[s.shareBtn, { backgroundColor: Colors.brand }]} onPress={shareLink} activeOpacity={0.85}>
          <Ionicons name="share-social" size={18} color="#fff" />
          <Text style={s.shareBtnText}>Share Invite Link</Text>
        </TouchableOpacity>
      </View>

      <View style={s.section}>
        <Text style={[s.sectionTitle, { color: colors.textSecondary }]}>HOW IT WORKS</Text>
        <View style={[s.howCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {[
            { step: "1", text: "Share your referral code or link with friends", icon: "share-social-outline" as const },
            { step: "2", text: "Your friend signs up using your code", icon: "person-add-outline" as const },
            { step: "3", text: `You both earn ${REWARD_PER_REFERRAL} Nexa when they join`, icon: "flash-outline" as const },
          ].map((item, i) => (
            <View key={i}>
              {i > 0 && <View style={[s.howDivider, { backgroundColor: colors.border }]} />}
              <View style={s.howRow}>
                <View style={[s.howStep, { backgroundColor: Colors.brand }]}>
                  <Text style={s.howStepText}>{item.step}</Text>
                </View>
                <Ionicons name={item.icon} size={18} color={Colors.brand} />
                <Text style={[s.howText, { color: colors.text }]}>{item.text}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      {referrals.length > 0 && (
        <View style={s.section}>
          <Text style={[s.sectionTitle, { color: colors.textSecondary }]}>RECENT REFERRALS</Text>
          <View style={[s.listCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {loading ? <ActivityIndicator color={Colors.brand} style={{ padding: 16 }} /> :
              referrals.slice(0, 8).map((r, i) => (
                <View key={r.id}>
                  {i > 0 && <View style={[s.howDivider, { backgroundColor: colors.border }]} />}
                  <View style={s.referralRow}>
                    <View style={[s.referralIcon, { backgroundColor: Colors.brand + "18" }]}>
                      <Ionicons name="person" size={16} color={Colors.brand} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.referralName, { color: colors.text }]}>{r.referee?.display_name || "User"}</Text>
                      <Text style={[s.referralHandle, { color: colors.textMuted }]}>@{r.referee?.handle}</Text>
                    </View>
                    <View style={[s.statusBadge, { backgroundColor: r.status === "completed" ? "#34C75918" : "#FF950018" }]}>
                      <Text style={[s.statusText, { color: r.status === "completed" ? "#34C759" : "#FF9500" }]}>
                        {r.status === "completed" ? `+${REWARD_PER_REFERRAL} NX` : "Pending"}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  hero: { margin: 16, borderRadius: 20, padding: 24, alignItems: "center", gap: 8 },
  heroTitle: { color: "#fff", fontSize: 22, fontFamily: "Inter_700Bold" },
  heroSub: { color: "rgba(255,255,255,0.7)", fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
  statsRow: { flexDirection: "row", gap: 10, paddingHorizontal: 16, marginBottom: 8 },
  statCard: { flex: 1, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, padding: 14, alignItems: "center", gap: 4 },
  statValue: { fontSize: 20, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  section: { paddingHorizontal: 16, marginTop: 20 },
  sectionTitle: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.5, marginBottom: 10 },
  codeCard: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderRadius: 14, borderWidth: 1.5, paddingHorizontal: 18, paddingVertical: 14, marginBottom: 12 },
  codeText: { fontSize: 22, fontFamily: "Inter_700Bold", letterSpacing: 2 },
  copyBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10 },
  copyBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  shareBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 14, paddingVertical: 14 },
  shareBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
  howCard: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, overflow: "hidden" },
  howRow: { flexDirection: "row", alignItems: "center", padding: 14, gap: 12 },
  howStep: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  howStepText: { color: "#fff", fontSize: 12, fontFamily: "Inter_700Bold" },
  howText: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular" },
  howDivider: { height: StyleSheet.hairlineWidth },
  listCard: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, overflow: "hidden" },
  referralRow: { flexDirection: "row", alignItems: "center", padding: 14, gap: 12 },
  referralIcon: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  referralName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  referralHandle: { fontSize: 12, fontFamily: "Inter_400Regular" },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
});
