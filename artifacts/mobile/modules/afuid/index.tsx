import React from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "@/components/ui/SafeGradient";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/context/AuthContext";
import Colors from "@/constants/colors";

function InfoRow({ label, value, colors }: { label: string; value: string; colors: any }) {
  return (
    <View style={r.infoRow}>
      <Text style={[r.infoLabel, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[r.infoValue, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

export default function AfuIDApp() {
  const { colors } = useTheme();
  const { profile } = useAuth();
  const insets = useSafeAreaInsets();

  const joinDate = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })
    : "Unknown";
  const idNumber = (profile?.id || "").substring(0, 12).toUpperCase().replace(/(.{4})/g, "$1 ").trim();

  return (
    <ScrollView
      style={[r.root, { backgroundColor: colors.background }]}
      contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 40, alignItems: "center" }}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[r.pageTitle, { color: colors.text }]}>Digital ID</Text>
      <Text style={[r.pageSub, { color: colors.textMuted }]}>Your verifiable AfuChat identity</Text>

      <View style={r.cardWrap}>
        <LinearGradient
          colors={["#1E3A5F", "#2C5282"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={r.card}
        >
          <View style={r.cardHeader}>
            <View>
              <Text style={r.cardBrand}>AfuChat</Text>
              <Text style={r.cardType}>Digital Identity</Text>
            </View>
            <View style={[r.chipWrap, { backgroundColor: "rgba(255,255,255,0.15)" }]}>
              <Ionicons name="id-card" size={22} color="#fff" />
            </View>
          </View>

          <View style={r.avatarRow}>
            {profile?.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={r.cardAvatar} />
            ) : (
              <View style={[r.cardAvatarFallback, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
                <Ionicons name="person" size={32} color="#fff" />
              </View>
            )}
            <View style={{ gap: 2, flex: 1 }}>
              <Text style={r.cardName} numberOfLines={1}>{profile?.display_name || "User"}</Text>
              <Text style={r.cardHandle}>@{profile?.handle || "handle"}</Text>
              {profile?.is_verified && (
                <View style={r.verifiedBadge}>
                  <Ionicons name="checkmark-circle" size={12} color={Colors.brand} />
                  <Text style={r.verifiedText}>Verified</Text>
                </View>
              )}
            </View>
          </View>

          <View style={[r.cardDivider, { backgroundColor: "rgba(255,255,255,0.2)" }]} />

          <View style={r.cardFooter}>
            <View>
              <Text style={r.cardFooterLabel}>ID NUMBER</Text>
              <Text style={r.cardFooterValue}>{idNumber}</Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={r.cardFooterLabel}>MEMBER SINCE</Text>
              <Text style={r.cardFooterValue}>{new Date(profile?.created_at || Date.now()).getFullYear()}</Text>
            </View>
          </View>
        </LinearGradient>
      </View>

      <View style={[r.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[r.detailTitle, { color: colors.textSecondary }]}>IDENTITY DETAILS</Text>
        <InfoRow label="Full Name" value={profile?.display_name || "—"} colors={colors} />
        <View style={[r.divider, { backgroundColor: colors.border }]} />
        <InfoRow label="Username" value={`@${profile?.handle || "—"}`} colors={colors} />
        <View style={[r.divider, { backgroundColor: colors.border }]} />
        <InfoRow label="Member Since" value={joinDate} colors={colors} />
        <View style={[r.divider, { backgroundColor: colors.border }]} />
        <InfoRow label="Account Status" value={profile?.is_verified ? "Verified" : "Active"} colors={colors} />
        <View style={[r.divider, { backgroundColor: colors.border }]} />
        <InfoRow label="XP Level" value={`${(profile?.xp || 0).toLocaleString()} Nexa`} colors={colors} />
        <View style={[r.divider, { backgroundColor: colors.border }]} />
        <InfoRow label="ACoin Balance" value={`${(profile?.acoin || 0).toLocaleString()} AC`} colors={colors} />
      </View>

      <View style={[r.qrCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Ionicons name="qr-code" size={80} color={colors.text} />
        <Text style={[r.qrLabel, { color: colors.textMuted }]}>Scan to verify identity</Text>
      </View>

      <TouchableOpacity style={[r.shareBtn, { backgroundColor: Colors.brand }]} activeOpacity={0.85}>
        <Ionicons name="share-outline" size={18} color="#fff" />
        <Text style={r.shareBtnText}>Share Digital ID</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const r = StyleSheet.create({
  root: { flex: 1 },
  pageTitle: { fontSize: 22, fontFamily: "Inter_700Bold", marginBottom: 4 },
  pageSub: { fontSize: 13, fontFamily: "Inter_400Regular", marginBottom: 24 },
  cardWrap: { width: "100%", marginBottom: 24 },
  card: { borderRadius: 20, padding: 20, gap: 0 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 },
  cardBrand: { color: "#fff", fontSize: 18, fontFamily: "Inter_700Bold" },
  cardType: { color: "rgba(255,255,255,0.6)", fontSize: 11, fontFamily: "Inter_400Regular" },
  chipWrap: { width: 40, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  avatarRow: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 16 },
  cardAvatar: { width: 64, height: 64, borderRadius: 32, borderWidth: 2, borderColor: "rgba(255,255,255,0.3)" },
  cardAvatarFallback: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center" },
  cardName: { color: "#fff", fontSize: 18, fontFamily: "Inter_700Bold" },
  cardHandle: { color: "rgba(255,255,255,0.7)", fontSize: 13, fontFamily: "Inter_400Regular" },
  verifiedBadge: { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "rgba(255,255,255,0.1)", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, alignSelf: "flex-start", marginTop: 2 },
  verifiedText: { color: "#00BCD4", fontSize: 11, fontFamily: "Inter_600SemiBold" },
  cardDivider: { height: 1, marginVertical: 14 },
  cardFooter: { flexDirection: "row", justifyContent: "space-between" },
  cardFooterLabel: { color: "rgba(255,255,255,0.5)", fontSize: 9, fontFamily: "Inter_600SemiBold", letterSpacing: 0.5, marginBottom: 2 },
  cardFooterValue: { color: "#fff", fontSize: 13, fontFamily: "Inter_600SemiBold" },
  detailCard: { width: "100%", borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, padding: 16, marginBottom: 16 },
  detailTitle: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.5, marginBottom: 12 },
  infoRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 10 },
  infoLabel: { fontSize: 13, fontFamily: "Inter_400Regular" },
  infoValue: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  divider: { height: StyleSheet.hairlineWidth },
  qrCard: { width: "100%", borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, padding: 24, alignItems: "center", gap: 8, marginBottom: 20 },
  qrLabel: { fontSize: 13, fontFamily: "Inter_400Regular" },
  shareBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", borderRadius: 14, paddingVertical: 14 },
  shareBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
});
