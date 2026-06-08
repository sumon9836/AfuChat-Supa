import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { LinearGradient } from "@/components/ui/SafeGradient";
import { GlassCard } from "@/components/ui/GlassCard";

type Screen = "home" | "edit-profile" | "shop" | "products" | "orders" | "audience";

type Follower = {
  id: string;
  display_name: string | null;
  handle: string | null;
  avatar_url: string | null;
  is_verified: boolean;
};

type Product = {
  id: string;
  name: string;
  price: number;
  currency: string;
  image_url: string | null;
  is_active: boolean;
};

type Order = {
  id: string;
  status: string;
  total: number;
  currency: string;
  created_at: string;
  buyer: { display_name: string | null; handle: string | null } | null;
};

const TOOLS = [
  { icon: "storefront" as const,  label: "My Shop",   color: "#AF52DE", screen: "shop"         as Screen },
  { icon: "people"     as const,  label: "Audience",  color: "#34C759", screen: "audience"     as Screen },
  { icon: "pricetag"  as const,   label: "Products",  color: "#FF3B30", screen: "products"     as Screen },
  { icon: "receipt"   as const,   label: "Orders",    color: "#1f95ff", screen: "orders"       as Screen },
];

export default function AfuBusinessApp() {
  const { colors, accent } = useTheme();
  const { user, profile } = useAuth();
  const insets = useSafeAreaInsets();

  const [screen, setScreen] = useState<Screen>("home");
  const [followerCount, setFollowerCount] = useState(0);
  const [postCount, setPostCount] = useState(0);

  // Edit Profile
  const [displayName, setDisplayName] = useState(profile?.display_name ?? "");
  const [bio, setBio] = useState((profile as any)?.bio ?? "");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  // Lists
  const [followers, setFollowers] = useState<Follower[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [listLoading, setListLoading] = useState(false);

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

  // Load data when screen changes
  useEffect(() => {
    if (!user) return;
    if (screen === "audience") {
      setListLoading(true);
      supabase
        .from("follows")
        .select("follower:profiles!follower_id(id, display_name, handle, avatar_url, is_verified)")
        .eq("following_id", user.id)
        .limit(50)
        .then(({ data }) => {
          setFollowers(((data ?? []).map((r: any) => r.follower).filter(Boolean)) as Follower[]);
          setListLoading(false);
        })
        .catch(() => setListLoading(false));
    } else if (screen === "products") {
      setListLoading(true);
      supabase
        .from("products")
        .select("id, name, price, currency, image_url, is_active")
        .eq("seller_id", user.id)
        .order("created_at", { ascending: false })
        .limit(40)
        .then(({ data }) => {
          setProducts((data as Product[]) ?? []);
          setListLoading(false);
        })
        .catch(() => setListLoading(false));
    } else if (screen === "orders") {
      setListLoading(true);
      supabase
        .from("orders")
        .select("id, status, total, currency, created_at, buyer:profiles!buyer_id(display_name, handle)")
        .eq("seller_id", user.id)
        .order("created_at", { ascending: false })
        .limit(40)
        .then(({ data }) => {
          setOrders((data as any) ?? []);
          setListLoading(false);
        })
        .catch(() => setListLoading(false));
    }
  }, [screen, user]);

  function fmtNum(n: number) {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return n.toString();
  }

  const saveProfile = useCallback(async () => {
    if (!user) return;
    setSaving(true);
    setSaveMsg("");
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: displayName.trim(), bio: bio.trim() })
      .eq("id", user.id);
    setSaving(false);
    setSaveMsg(error ? "Failed to save." : "Saved!");
    setTimeout(() => setSaveMsg(""), 2500);
  }, [user, displayName, bio]);

  function renderHeader(title: string) {
    return (
      <View style={[styles.subHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => setScreen("home")} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={[styles.subTitle, { color: colors.text }]}>{title}</Text>
        <View style={{ width: 34 }} />
      </View>
    );
  }

  // ─── Edit Profile ────────────────────────────────────────────────────────
  if (screen === "edit-profile") {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        {renderHeader("Edit Profile")}
        <ScrollView contentContainerStyle={{ padding: 20, gap: 18 }}>
          <View style={styles.field}>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Display Name</Text>
            <TextInput
              style={[styles.fieldInput, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Your name"
              placeholderTextColor={colors.textMuted}
            />
          </View>
          <View style={styles.field}>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Bio</Text>
            <TextInput
              style={[styles.fieldInput, styles.bioInput, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]}
              value={bio}
              onChangeText={setBio}
              placeholder="Tell people about yourself…"
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={4}
            />
          </View>
          <Pressable
            onPress={saveProfile}
            style={[styles.saveBtn, { backgroundColor: accent, opacity: saving ? 0.7 : 1 }]}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.saveBtnText}>Save Changes</Text>
            )}
          </Pressable>
          {saveMsg ? <Text style={[styles.saveMsg, { color: saveMsg === "Saved!" ? "#34C759" : "#FF3B30" }]}>{saveMsg}</Text> : null}
        </ScrollView>
      </View>
    );
  }

  // ─── Audience (Followers) ────────────────────────────────────────────────
  if (screen === "audience") {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        {renderHeader(`Audience (${followerCount})`)}
        {listLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={accent} size="large" />
          </View>
        ) : followers.length === 0 ? (
          <View style={styles.center}>
            <Ionicons name="people-outline" size={48} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>No followers yet</Text>
          </View>
        ) : (
          <FlatList
            data={followers}
            keyExtractor={(f) => f.id}
            contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
            ItemSeparatorComponent={() => <View style={[styles.sep, { backgroundColor: colors.border, marginLeft: 72 }]} />}
            renderItem={({ item }) => (
              <View style={[styles.personRow, { backgroundColor: colors.surface }]}>
                <View style={[styles.personAvatar, { backgroundColor: accent + "22" }]}>
                  {item.avatar_url ? (
                    <Image source={{ uri: item.avatar_url }} style={styles.personAvatarImg} />
                  ) : (
                    <Ionicons name="person" size={20} color={accent} />
                  )}
                </View>
                <View style={styles.personInfo}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                    <Text style={[styles.personName, { color: colors.text }]} numberOfLines={1}>
                      {item.display_name ?? `@${item.handle}`}
                    </Text>
                    {item.is_verified ? <Ionicons name="checkmark-circle" size={13} color={accent} /> : null}
                  </View>
                  <Text style={[styles.personHandle, { color: colors.textMuted }]}>@{item.handle}</Text>
                </View>
              </View>
            )}
          />
        )}
      </View>
    );
  }

  // ─── Products ────────────────────────────────────────────────────────────
  if (screen === "products") {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        {renderHeader("Products")}
        {listLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={accent} size="large" />
          </View>
        ) : products.length === 0 ? (
          <View style={styles.center}>
            <Ionicons name="pricetag-outline" size={48} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>No products listed yet</Text>
          </View>
        ) : (
          <FlatList
            data={products}
            keyExtractor={(p) => p.id}
            contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: insets.bottom + 20 }}
            renderItem={({ item }) => (
              <View style={[styles.productRow, { backgroundColor: colors.surface }]}>
                <View style={[styles.productImg, { backgroundColor: colors.backgroundSecondary }]}>
                  {item.image_url ? (
                    <Image source={{ uri: item.image_url }} style={styles.productImgFill} resizeMode="cover" />
                  ) : (
                    <Ionicons name="cube-outline" size={24} color={colors.textMuted} />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.productName, { color: colors.text }]} numberOfLines={2}>{item.name}</Text>
                  <Text style={[styles.productPrice, { color: accent }]}>
                    {item.price.toLocaleString()} {item.currency}
                  </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: item.is_active ? "#34C75918" : "#FF3B3018" }]}>
                  <Text style={{ fontSize: 11, fontFamily: "Inter_500Medium", color: item.is_active ? "#34C759" : "#FF3B30" }}>
                    {item.is_active ? "Active" : "Inactive"}
                  </Text>
                </View>
              </View>
            )}
          />
        )}
      </View>
    );
  }

  // ─── Orders ──────────────────────────────────────────────────────────────
  if (screen === "orders") {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        {renderHeader("Orders")}
        {listLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={accent} size="large" />
          </View>
        ) : orders.length === 0 ? (
          <View style={styles.center}>
            <Ionicons name="receipt-outline" size={48} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>No orders yet</Text>
          </View>
        ) : (
          <FlatList
            data={orders}
            keyExtractor={(o) => o.id}
            contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: insets.bottom + 20 }}
            ItemSeparatorComponent={() => <View style={[styles.sep, { backgroundColor: colors.border }]} />}
            renderItem={({ item }) => (
              <View style={[styles.orderRow, { backgroundColor: colors.surface }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.orderId, { color: colors.textMuted }]}>#{item.id.slice(0, 8)}</Text>
                  <Text style={[styles.orderBuyer, { color: colors.text }]}>
                    {item.buyer?.display_name ?? `@${item.buyer?.handle}` ?? "Customer"}
                  </Text>
                  <Text style={[styles.orderDate, { color: colors.textMuted }]}>
                    {new Date(item.created_at).toLocaleDateString()}
                  </Text>
                </View>
                <View style={{ alignItems: "flex-end", gap: 4 }}>
                  <Text style={[styles.orderTotal, { color: accent }]}>
                    {item.total.toLocaleString()} {item.currency}
                  </Text>
                  <View style={[styles.statusBadge, {
                    backgroundColor: item.status === "completed" ? "#34C75918"
                      : item.status === "pending" ? "#FF950018"
                      : "#FF3B3018",
                  }]}>
                    <Text style={{
                      fontSize: 11, fontFamily: "Inter_500Medium",
                      color: item.status === "completed" ? "#34C759"
                        : item.status === "pending" ? "#FF9500"
                        : "#FF3B30",
                      textTransform: "capitalize",
                    }}>
                      {item.status}
                    </Text>
                  </View>
                </View>
              </View>
            )}
          />
        )}
      </View>
    );
  }

  // ─── Shop Overview (home of My Shop) ─────────────────────────────────────
  if (screen === "shop") {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        {renderHeader("My Shop")}
        <ScrollView contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: insets.bottom + 20 }}>
          <View style={[styles.shopStat, { backgroundColor: colors.surface }]}>
            <Ionicons name="pricetag" size={22} color="#FF3B30" />
            <View>
              <Text style={[styles.shopStatVal, { color: colors.text }]}>{products.length}</Text>
              <Text style={[styles.shopStatLabel, { color: colors.textMuted }]}>Products</Text>
            </View>
          </View>
          <View style={[styles.shopStat, { backgroundColor: colors.surface }]}>
            <Ionicons name="receipt" size={22} color="#1f95ff" />
            <View>
              <Text style={[styles.shopStatVal, { color: colors.text }]}>{orders.length}</Text>
              <Text style={[styles.shopStatLabel, { color: colors.textMuted }]}>Orders</Text>
            </View>
          </View>
          <Pressable
            onPress={() => setScreen("products")}
            style={[styles.shopBtn, { backgroundColor: accent }]}
          >
            <Text style={styles.shopBtnText}>Manage Products</Text>
          </Pressable>
          <Pressable
            onPress={() => setScreen("orders")}
            style={[styles.shopBtn, { backgroundColor: colors.surface }]}
          >
            <Text style={[styles.shopBtnText, { color: colors.text }]}>View Orders</Text>
          </Pressable>
        </ScrollView>
      </View>
    );
  }

  // ─── Home ─────────────────────────────────────────────────────────────────
  const stats = [
    { label: "Followers", value: fmtNum(followerCount), icon: "people" as const, color: "#007AFF" },
    { label: "Posts",     value: fmtNum(postCount),     icon: "grid"   as const, color: "#34C759" },
  ];

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: insets.bottom + 28 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Profile card */}
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
          <Pressable onPress={() => setScreen("edit-profile")} style={styles.editBtn}>
            <Text style={styles.editBtnText}>Edit</Text>
          </Pressable>
        </View>
        {!profile?.is_organization_verified ? (
          <View style={styles.verifyBanner}>
            <Ionicons name="shield-checkmark-outline" size={14} color="#FFCC00" />
            <Text style={styles.verifyText}>Verify your account to unlock business features</Text>
          </View>
        ) : null}
      </LinearGradient>

      {/* Stats */}
      <Text style={[styles.sectionTitle, { color: colors.textSecondary, paddingHorizontal: 16 }]}>OVERVIEW</Text>
      <View style={styles.statsGrid}>
        {stats.map((s) => (
          <GlassCard key={s.label} variant="medium" style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: s.color + "18" }]}>
              <Ionicons name={s.icon} size={18} color={s.color} />
            </View>
            <Text style={[styles.statValue, { color: colors.text }]}>{s.value}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>{s.label}</Text>
          </GlassCard>
        ))}
      </View>

      {/* Tools */}
      <Text style={[styles.sectionTitle, { color: colors.textSecondary, paddingHorizontal: 16, marginTop: 8 }]}>TOOLS</Text>
      <View style={styles.toolsGrid}>
        {TOOLS.map((t) => (
          <Pressable
            key={t.label}
            onPress={() => setScreen(t.screen)}
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
  profileCard: { margin: 16, borderRadius: 20, padding: 18, gap: 12 },
  profileRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  profileAvatar: { width: 52, height: 52, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  profileInfo: { flex: 1 },
  profileName: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
  profileHandle: { color: "rgba(255,255,255,0.6)", fontSize: 12, fontFamily: "Inter_400Regular" },
  editBtn: { borderWidth: 1, borderColor: "rgba(255,255,255,0.3)", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  editBtnText: { color: "#fff", fontSize: 12, fontFamily: "Inter_600SemiBold" },
  verifyBanner: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(255,204,0,0.12)", borderRadius: 8, padding: 10 },
  verifyText: { color: "#FFCC00", fontSize: 12, fontFamily: "Inter_400Regular", flex: 1 },
  sectionTitle: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.5, marginBottom: 10 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 12, gap: 10, marginBottom: 8 },
  statCard: { width: "46%", borderRadius: 14, padding: 14, gap: 4, marginHorizontal: 4 },
  statIcon: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  statValue: { fontSize: 20, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 12, fontFamily: "Inter_400Regular" },
  toolsGrid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 12, gap: 10 },
  toolCard: { width: "29%", borderRadius: 14, padding: 14, alignItems: "center", gap: 8, marginHorizontal: 4 },
  toolIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  toolLabel: { fontSize: 12, fontFamily: "Inter_500Medium", textAlign: "center" },
  // Sub-screens
  subHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    gap: 10,
  },
  backBtn: { padding: 4, width: 34 },
  subTitle: { flex: 1, fontSize: 16, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, padding: 40 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
  sep: { height: 0.5 },
  // Edit Profile
  field: { gap: 6 },
  fieldLabel: { fontSize: 12, fontFamily: "Inter_500Medium" },
  fieldInput: { borderWidth: 0.5, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, fontFamily: "Inter_400Regular" },
  bioInput: { height: 100, textAlignVertical: "top" },
  saveBtn: { borderRadius: 14, paddingVertical: 14, alignItems: "center" },
  saveBtnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },
  saveMsg: { textAlign: "center", fontSize: 13, fontFamily: "Inter_500Medium" },
  // Audience
  personRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  personAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  personAvatarImg: { width: 44, height: 44 },
  personInfo: { flex: 1 },
  personName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  personHandle: { fontSize: 12, fontFamily: "Inter_400Regular" },
  // Products
  productRow: { flexDirection: "row", alignItems: "center", borderRadius: 14, padding: 12, gap: 12 },
  productImg: { width: 56, height: 56, borderRadius: 10, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  productImgFill: { width: 56, height: 56 },
  productName: { fontSize: 13, fontFamily: "Inter_600SemiBold", lineHeight: 18 },
  productPrice: { fontSize: 13, fontFamily: "Inter_700Bold", marginTop: 2 },
  statusBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  // Orders
  orderRow: { flexDirection: "row", alignItems: "center", borderRadius: 14, padding: 14, gap: 10 },
  orderId: { fontSize: 11, fontFamily: "Inter_400Regular" },
  orderBuyer: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  orderDate: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  orderTotal: { fontSize: 14, fontFamily: "Inter_700Bold" },
  // Shop
  shopStat: { flexDirection: "row", alignItems: "center", gap: 14, padding: 16, borderRadius: 16 },
  shopStatVal: { fontSize: 22, fontFamily: "Inter_700Bold" },
  shopStatLabel: { fontSize: 13, fontFamily: "Inter_400Regular" },
  shopBtn: { borderRadius: 14, paddingVertical: 14, alignItems: "center" },
  shopBtnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
