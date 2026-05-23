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
import { router } from "expo-router";

type StatCard = {
  label: string;
  value: string;
  change: string;
  positive: boolean;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  color: string;
};

const TOOLS = [
  { icon: "storefront" as const, label: "My Shop", color: "#AF52DE", route: "/store" },
  { icon: "megaphone" as const, label: "Promote", color: "#FF9500", route: "/promote" },
  { icon: "analytics" as const, label: "Analytics", color: "#007AFF", route: "/analytics" },
  { icon: "people" as const, label: "Audience", color: "#34C759", route: "/audience" },
  { icon: "pricetag" as const, label: "Products", color: "#FF3B30", route: "/products" },
  { icon: "receipt" as const, label: "Orders", color: "#00BCD4", route: "/orders" },
];

export default function AfuBusinessApp() {
  const { colors, accent } = useTheme();
  const { user, profile } = useAuth();
  const insets = useSafeAreaInsets();
  const [followerCount, setFollowerCount] = useState(0);
  const [postCount, setPostCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("follows")
      .select("id", { count: "exact", head: true })
      .eq("following_id", user.id)
      .then(({ count }) => setFollowerCount(count ?? 0));
    supabase
      .from("posts")
      .select("id", { count: "exact", head: true })
      .eq("author_id", user.id)
      .in("visibility", ["public", "followers"])
      .then(({ count }) => setPostCount(count ?? 0));
  }, [user]);

  function fmtNum(n: number) {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return n.toString();
  }

  const stats: StatCard[] = [
    { label: "Followers", value: fmtNum(followerCount), change: "+12%", positive: true, icon: "people", color: "#007AFF" },
    { label: "Posts", value: fmtNum(postCount), change: "this month", positive: true, icon: "grid", color: "#34C759" },
    { label: "Reach", value: "—", change: "coming soon", positive: true, icon: "eye", color: "#FF9500" },
    { label: "Engagement", value: "—", change: "coming soon", positive: true, icon: "heart", color: "#FF3B30" },
  ];

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: insets.bottom + 28 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Profile Summary */}
      <LinearGradient
        colors={["#1C1C1E", "#3A3A3C"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.profileCard}
      >
        <View style={styles.profileRow}>
          <View style={[styles.profileAvatar, { backgroundColor: accent + "33" }]}>
            <Ionicons name="briefcase" size={24} color={accent} />
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName} numberOfLines={1}>
              {profile?.display_name ?? "Your Business"}
            </Text>
            <Text style={styles.profileHandle}>@{profile?.handle ?? "handle"}</Text>
          </View>
          <Pressable
            onPress={() => router.push("/settings/account" as any)}
            style={styles.editBtn}
          >
            <Text style={styles.editBtnText}>{"Edit"}</Text>
          </Pressable>
        </View>
        {!profile?.is_organization_verified && (
          <View style={styles.verifyBanner}>
            <Ionicons name="shield-checkmark-outline" size={14} color="#FFCC00" />
            <Text style={styles.verifyText}>
              {"Verify your account to unlock business features"}
            </Text>
          </View>
        )}
      </LinearGradient>

      {/* Stats */}
      <Text style={[styles.sectionTitle, { color: colors.textSecondary, paddingHorizontal: 16 }]}>
        {"OVERVIEW"}
      </Text>
      <View style={styles.statsGrid}>
        {stats.map((s) => (
          <GlassCard key={s.label} variant="medium" style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: s.color + "18" }]}>
              <Ionicons name={s.icon as any} size={18} color={s.color} />
            </View>
            <Text style={[styles.statValue, { color: colors.text }]}>{s.value}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>{s.label}</Text>
            <Text
              style={[
                styles.statChange,
                { color: s.positive ? "#34C759" : "#FF3B30" },
              ]}
            >
              {s.change}
            </Text>
          </GlassCard>
        ))}
      </View>

      {/* Tools */}
      <Text style={[styles.sectionTitle, { color: colors.textSecondary, paddingHorizontal: 16, marginTop: 8 }]}>
        {"TOOLS"}
      </Text>
      <View style={styles.toolsGrid}>
        {TOOLS.map((t) => (
          <Pressable
            key={t.label}
            onPress={() => router.push(t.route as any)}
            style={({ pressed }) => [
              styles.toolCard,
              { backgroundColor: colors.surface, opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <View style={[styles.toolIcon, { backgroundColor: t.color + "18" }]}>
              <Ionicons name={t.icon} size={22} color={t.color} />
            </View>
            <Text style={[styles.toolLabel, { color: colors.text }]}>{t.label}</Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  profileCard: {
    margin: 16,
    borderRadius: 20,
    padding: 18,
    gap: 12,
  },
  profileRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  profileAvatar: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  profileInfo: { flex: 1 },
  profileName: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
  profileHandle: { color: "rgba(255,255,255,0.6)", fontSize: 12, fontFamily: "Inter_400Regular" },
  editBtn: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  editBtnText: { color: "#fff", fontSize: 12, fontFamily: "Inter_600SemiBold" },
  verifyBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,204,0,0.12)",
    borderRadius: 8,
    padding: 10,
  },
  verifyText: {
    color: "#FFCC00",
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    flex: 1,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 12,
    gap: 10,
    marginBottom: 8,
  },
  statCard: {
    width: "46%",
    borderRadius: 14,
    padding: 14,
    gap: 4,
    marginHorizontal: 4,
  },
  statIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  statValue: { fontSize: 20, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 12, fontFamily: "Inter_400Regular" },
  statChange: { fontSize: 11, fontFamily: "Inter_500Medium" },
  toolsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 12,
    gap: 10,
  },
  toolCard: {
    width: "29%",
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
    gap: 8,
    marginHorizontal: 4,
  },
  toolIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  toolLabel: { fontSize: 12, fontFamily: "Inter_500Medium", textAlign: "center" },
});
