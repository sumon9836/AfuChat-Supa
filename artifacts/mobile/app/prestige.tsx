import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { LinearGradient } from "@/components/ui/SafeGradient";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "@/lib/haptics";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/hooks/useTheme";
import { supabase } from "@/lib/supabase";
import Colors from "@/constants/colors";
import { showAlert } from "@/lib/alert";
import { PRESTIGE_TIERS, getPrestigeTier, getNextPrestigeTier, prestigeProgress } from "@/lib/prestige";
import { Avatar } from "@/components/ui/Avatar";
import { ListRowSkeleton } from "@/components/ui/Skeleton";

const { width: SCREEN_W } = Dimensions.get("window");

type RichUser = { id: string; display_name: string; handle: string; acoin: number; avatar_url: string | null };
type Purchase = { id: string; good_id: string; good_name: string; good_emoji: string; acoin_cost: number; tier_required: string; equipped: boolean; created_at: string };
type PrestigeTx = { id: string; amount: number; label: string; icon: string; color: string; created_at: string; metadata?: Record<string, any> };

const STATUS_GOODS = [
  { id: "sg1", name: "Crown Aura",     emoji: "👑", description: "Animated crown floating above your avatar in all chats", acoin: 50000, tier: "legend" },
  { id: "sg2", name: "Obsidian Frame", emoji: "⬛", description: "Dark chromatic border with void particle effects",              acoin: 20000, tier: "obsidian" },
  { id: "sg3", name: "Diamond Halo",   emoji: "💎", description: "Ice-blue halo ring visible on profile and in conversations", acoin: 8000,  tier: "diamond" },
  { id: "sg4", name: "Gold Nameplate", emoji: "🥇", description: "Your name displays in gold in every conversation",              acoin: 2500,  tier: "gold" },
  { id: "sg5", name: "Verified Star",  emoji: "⭐", description: "Gold star badge next to your name everywhere",                 acoin: 1500,  tier: "silver" },
  { id: "sg6", name: "Founder's Seal", emoji: "🔏", description: "One-time exclusive for early believers. Lifetime status.",      acoin: 100000, tier: "legend" },
  { id: "sg7", name: "Royalty Title",  emoji: "🎖️", description: "'Royalty of AfuChat' custom title shown on your profile",    acoin: 30000,  tier: "obsidian" },
  { id: "sg8", name: "Status Glow",    emoji: "✨", description: "Soft prestige-colored glow on all your messages",              acoin: 3000,  tier: "gold" },
];

const CHALLENGES = [
  { id: "c1", emoji: "💬", title: "Send 50 messages today",      reward: 100,  progress: 0.6,  type: "daily" },
  { id: "c2", emoji: "❤️", title: "React to 20 posts",          reward: 50,   progress: 0.85, type: "daily" },
  { id: "c3", emoji: "👥", title: "Add 3 new friends",          reward: 200,  progress: 0.33, type: "weekly" },
  { id: "c4", emoji: "📸", title: "Post 5 stories",             reward: 150,  progress: 1.0,  type: "weekly" },
  { id: "c5", emoji: "🏆", title: "Reach top 50 on Rich List",  reward: 500,  progress: 0.0,  type: "milestone" },
  { id: "c6", emoji: "🎁", title: "Send 10 gifts this week",    reward: 300,  progress: 0.2,  type: "weekly" },
];

const TIER_ID_ORDER = ["bronze", "silver", "gold", "diamond", "obsidian", "legend"];
function tierIndex(id: string) { return TIER_ID_ORDER.indexOf(id); }

type Tab = "collection" | "shop" | "challenges" | "history" | "leaderboard";

export default function PrestigeScreen() {
  const { user, profile, refreshProfile } = useAuth();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const [richList,      setRichList]      = useState<RichUser[]>([]);
  const [loadingList,   setLoadingList]   = useState(true);
  const [aheadCount,    setAheadCount]    = useState<number | null>(null);
  const [purchases,     setPurchases]     = useState<Purchase[]>([]);
  const [transactions,  setTransactions]  = useState<PrestigeTx[]>([]);
  const [purchasing,    setPurchasing]    = useState<string | null>(null);
  const [refreshing,    setRefreshing]    = useState(false);
  const [activeTab,     setActiveTab]     = useState<Tab>("shop");

  const progressAnim  = useRef(new Animated.Value(0)).current;
  const pulseAnim     = useRef(new Animated.Value(1)).current;
  const glowAnim      = useRef(new Animated.Value(0)).current;
  const shimmerAnim   = useRef(new Animated.Value(0)).current;
  const floatAnim     = useRef(new Animated.Value(0)).current;

  const acoin    = profile?.acoin || 0;
  const tier     = getPrestigeTier(acoin);
  const nextTier = getNextPrestigeTier(acoin);
  const progress = prestigeProgress(acoin);

  const ownedIds    = new Set(purchases.map((p) => p.good_id));
  const equippedIds = new Set(purchases.filter((p) => p.equipped).map((p) => p.good_id));

  // ── Animations ──────────────────────────────────────────────────────────────
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 1400,
      delay: 400,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 1800, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
        Animated.timing(pulseAnim, { toValue: 1.0,  duration: 1800, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 2200, useNativeDriver: false, easing: Easing.inOut(Easing.ease) }),
        Animated.timing(glowAnim, { toValue: 0, duration: 2200, useNativeDriver: false, easing: Easing.inOut(Easing.ease) }),
      ])
    ).start();

    Animated.loop(
      Animated.timing(shimmerAnim, { toValue: 1, duration: 1600, useNativeDriver: false, easing: Easing.linear })
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: -6, duration: 2400, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
        Animated.timing(floatAnim, { toValue: 0,  duration: 2400, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
      ])
    ).start();
  }, []);

  const loadData = useCallback(async () => {
    if (!user) return;
    const [richRes, aheadRes, purchaseRes, txRes] = await Promise.all([
      supabase.from("profiles").select("id, display_name, handle, acoin, avatar_url").order("acoin", { ascending: false }).limit(25),
      supabase.from("profiles").select("id", { count: "exact", head: true }).gt("acoin", acoin),
      supabase.from("status_goods_purchases").select("id, good_id, good_name, good_emoji, acoin_cost, tier_required, equipped, created_at").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("acoin_transactions").select("id, amount, transaction_type, created_at, metadata").eq("user_id", user.id).in("transaction_type", ["status_good_purchase", "conversion", "topup", "subscription"]).order("created_at", { ascending: false }).limit(30),
    ]);

    if (richRes.data)    setRichList(richRes.data as RichUser[]);
    setAheadCount(aheadRes.count ?? 0);
    if (purchaseRes.data) setPurchases(purchaseRes.data as Purchase[]);

    const txList: PrestigeTx[] = (txRes.data || []).map((t: any) => {
      const isPos = t.amount > 0;
      let label = t.transaction_type.replace(/_/g, " ");
      let icon  = "diamond";
      let color = isPos ? "#34C759" : "#FF9500";
      if (t.transaction_type === "status_good_purchase") {
        label = `${t.metadata?.good_emoji || ""} ${t.metadata?.good_name || "Status Good"}`; icon = "star"; color = "#AF52DE";
      } else if (t.transaction_type === "conversion") {
        label = "Nexa → ACoin"; icon = "swap-horizontal"; color = "#FF9500";
      } else if (t.transaction_type === "topup") {
        label = "ACoin Top-Up"; icon = "card"; color = "#34C759";
      } else if (t.transaction_type === "subscription") {
        label = `Premium ${t.metadata?.plan_name || ""}`; icon = "diamond"; color = "#FF9500";
      }
      return { id: t.id, amount: t.amount, label, icon, color, created_at: t.created_at, metadata: t.metadata };
    });
    setTransactions(txList);
    setLoadingList(false);
    setRefreshing(false);
  }, [user, acoin]);

  useEffect(() => { loadData(); }, [loadData]);

  async function purchaseGood(item: typeof STATUS_GOODS[0]) {
    if (!user || !profile) return;
    if (ownedIds.has(item.id)) { showAlert("Already Owned", `You already own ${item.emoji} ${item.name}.`); return; }
    if (acoin < item.acoin)    { showAlert("Insufficient ACoin", `You need ${item.acoin.toLocaleString()} ACoin but only have ${acoin.toLocaleString()}.`); return; }
    showAlert(
      `Buy ${item.emoji} ${item.name}`,
      `${item.acoin.toLocaleString()} ACoin\n\nBalance: ${acoin.toLocaleString()} → ${(acoin - item.acoin).toLocaleString()} ACoin`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Purchase",
          onPress: async () => {
            setPurchasing(item.id);
            const { data, error } = await supabase.rpc("purchase_status_good", {
              p_user_id: user.id, p_good_id: item.id, p_good_name: item.name,
              p_good_emoji: item.emoji, p_acoin_cost: item.acoin, p_tier_required: item.tier,
            });
            if (error) { showAlert("Error", error.message); setPurchasing(null); return; }
            const result = data as { ok: boolean; error?: string };
            if (!result.ok) { showAlert("Error", result.error || "Purchase failed."); setPurchasing(null); return; }
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            showAlert("Purchased!", `${item.emoji} ${item.name} is now yours!`);
            setPurchasing(null);
            refreshProfile();
            loadData();
          },
        },
      ],
    );
  }

  async function toggleEquip(p: Purchase) {
    const next = !p.equipped;
    const { error } = await supabase.from("status_goods_purchases").update({ equipped: next }).eq("id", p.id);
    if (error) { showAlert("Error", error.message); return; }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPurchases((prev) => prev.map((pp) => pp.id === p.id ? { ...pp, equipped: next } : pp));
  }

  const glowOpacity = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.75] });
  const glowRadius  = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [24, 40] });

  const TABS: { id: Tab; label: string; icon: string }[] = [
    { id: "shop",        label: "Shop",       icon: "storefront-outline" },
    { id: "collection",  label: "Collection", icon: "layers-outline" },
    { id: "challenges",  label: "Challenges", icon: "flame-outline" },
    { id: "history",     label: "History",    icon: "receipt-outline" },
    { id: "leaderboard", label: "Ranks",      icon: "trophy-outline" },
  ];

  return (
    <View style={[s.root, { backgroundColor: colors.backgroundSecondary }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor={tier.color} />
        }
        contentContainerStyle={{ paddingBottom: insets.bottom + 50 }}
      >

        {/* ── Hero ──────────────────────────────────────────────────────────── */}
        <View style={{ position: "relative", overflow: "hidden" }}>
          <LinearGradient
            colors={[tier.ringColors[0], tier.ringColors[1], isDark ? "#000" : "#1a1a2e"]}
            locations={[0, 0.55, 1]}
            style={[s.hero, { paddingTop: insets.top + 10 }]}
          >
            {/* Decorative orbs */}
            <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
              <View style={[s.orb, { top: -40, right: -40, width: 160, height: 160, backgroundColor: tier.color + "25" }]} />
              <View style={[s.orb, { bottom: 30, left: -30, width: 100, height: 100, backgroundColor: tier.ringColors[1] + "20" }]} />
            </View>

            {/* Nav row */}
            <View style={s.heroNav}>
              <TouchableOpacity style={s.heroNavBtn} onPress={() => router.back()} hitSlop={12}>
                <Ionicons name="chevron-back" size={22} color="#fff" />
              </TouchableOpacity>
              <Text style={s.heroNavTitle}>Prestige</Text>
              <TouchableOpacity style={s.heroNavBtn} onPress={() => router.push("/wallet")} hitSlop={12}>
                <Ionicons name="wallet-outline" size={20} color="#fff" />
              </TouchableOpacity>
            </View>

            {/* Tier emoji with glow ring */}
            <View style={s.emojiWrap}>
              <Animated.View
                style={[
                  s.glowRing,
                  {
                    borderColor: tier.color,
                    shadowColor: tier.glowColor,
                    shadowOpacity: glowOpacity as any,
                    shadowRadius: glowRadius as any,
                    transform: [{ scale: pulseAnim }],
                  },
                ]}
              />
              <Animated.View style={{ transform: [{ translateY: floatAnim }] }}>
                <Text style={s.heroEmoji}>{tier.emoji}</Text>
              </Animated.View>
            </View>

            {/* Tier name + desc */}
            <Text style={s.heroTierLabel}>{tier.label}</Text>
            <Text style={s.heroTierDesc}>{tier.description}</Text>

            {/* ACoin balance */}
            <View style={s.acoinRow}>
              <View style={[s.acoinPill, { backgroundColor: "rgba(0,0,0,0.3)", borderColor: "rgba(255,255,255,0.15)" }]}>
                <Text style={s.acoinEmoji}>🪙</Text>
                <Text style={s.acoinValue}>{acoin.toLocaleString()}</Text>
                <Text style={s.acoinLabel}>ACoin</Text>
              </View>
              {aheadCount != null && (
                <View style={[s.rankPill, { backgroundColor: "rgba(0,0,0,0.3)", borderColor: "rgba(255,255,255,0.15)" }]}>
                  <Ionicons name="trophy" size={12} color={Colors.gold} />
                  <Text style={s.rankText}>#{aheadCount + 1} Rank</Text>
                </View>
              )}
            </View>

            {/* Progress bar */}
            {nextTier ? (
              <View style={s.progressWrap}>
                <View style={s.progressLabels}>
                  <Text style={s.progressFrom}>{tier.emoji} {tier.label}</Text>
                  <Text style={s.progressGap}>{(nextTier.minAcoin - acoin).toLocaleString()} to go</Text>
                  <Text style={s.progressTo}>{nextTier.emoji} {nextTier.label}</Text>
                </View>
                <View style={s.progressTrack}>
                  <Animated.View
                    style={[
                      s.progressFill,
                      {
                        width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }),
                        backgroundColor: "#fff",
                      },
                    ]}
                  />
                  <View style={[s.progressGlow, { shadowColor: "#fff" }]} />
                </View>
                <View style={s.progressAmounts}>
                  <Text style={s.progressAmount}>{acoin.toLocaleString()}</Text>
                  <Text style={s.progressAmount}>{nextTier.minAcoin.toLocaleString()}</Text>
                </View>
              </View>
            ) : (
              <View style={s.maxBadge}>
                <Text style={s.maxText}>👑 Maximum Prestige Achieved</Text>
              </View>
            )}

            {/* Stats strip */}
            <View style={s.statsStrip}>
              {[
                { label: "Owned",    value: `${purchases.length}/${STATUS_GOODS.length}`, icon: "cube-outline" },
                { label: "Equipped", value: String(equippedIds.size),                     icon: "sparkles-outline" },
                { label: "Tier",     value: tier.label,                                   icon: "medal-outline" },
              ].map((stat, i) => (
                <React.Fragment key={stat.label}>
                  {i > 0 && <View style={s.statsDivider} />}
                  <View style={s.statItem}>
                    <Text style={s.statValue}>{stat.value}</Text>
                    <Text style={s.statLabel}>{stat.label}</Text>
                  </View>
                </React.Fragment>
              ))}
            </View>
          </LinearGradient>
        </View>

        {/* ── Tier Roadmap ──────────────────────────────────────────────────── */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.roadmapRow}>
          {PRESTIGE_TIERS.map((t, idx) => {
            const isActive   = t.id === tier.id;
            const isUnlocked = acoin >= t.minAcoin;
            const isLast     = idx === PRESTIGE_TIERS.length - 1;
            return (
              <View key={t.id} style={{ flexDirection: "row", alignItems: "center" }}>
                <View style={[s.roadmapChip, {
                  borderColor: isActive ? t.color : isUnlocked ? t.color + "60" : colors.border,
                  backgroundColor: isActive ? t.color + "18" : colors.surface,
                  shadowColor: isActive ? t.glowColor : "transparent",
                  shadowOpacity: isActive ? 0.6 : 0,
                  shadowRadius: 8,
                  elevation: isActive ? 4 : 0,
                }]}>
                  <Text style={[s.roadmapEmoji, { opacity: isUnlocked ? 1 : 0.4 }]}>{t.emoji}</Text>
                  <Text style={[s.roadmapLabel, { color: isActive ? t.color : isUnlocked ? colors.textSecondary : colors.textMuted }]}>
                    {t.label}
                  </Text>
                  <Text style={[s.roadmapMin, { color: isActive ? t.color + "CC" : colors.textMuted }]}>
                    {t.minAcoin >= 1000 ? `${t.minAcoin / 1000}K` : t.minAcoin === 0 ? "Free" : t.minAcoin}
                  </Text>
                  {isActive && <View style={[s.activeIndicator, { backgroundColor: t.color }]} />}
                  {!isUnlocked && (
                    <View style={s.lockOverlay}>
                      <Ionicons name="lock-closed" size={10} color={colors.textMuted} />
                    </View>
                  )}
                </View>
                {!isLast && (
                  <View style={[s.roadmapLine, { backgroundColor: isUnlocked ? tier.color + "40" : colors.border }]} />
                )}
              </View>
            );
          })}
        </ScrollView>

        {/* ── Tab Bar ───────────────────────────────────────────────────────── */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabScroll}>
          {TABS.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                style={[s.tab, active && { backgroundColor: tier.color + "18", borderColor: tier.color }]}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setActiveTab(tab.id); }}
                activeOpacity={0.75}
              >
                <Ionicons name={tab.icon as any} size={14} color={active ? tier.color : colors.textMuted} />
                <Text style={[s.tabLabel, { color: active ? tier.color : colors.textMuted }]}>{tab.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ── SHOP ──────────────────────────────────────────────────────────── */}
        {activeTab === "shop" && (
          <View style={s.section}>
            <SectionHeader title="STATUS GOODS" subtitle="Exclusive items for prestige holders" colors={colors} />
            <View style={s.goodsGrid}>
              {STATUS_GOODS.map((item) => {
                const itemTier     = PRESTIGE_TIERS.find((t) => t.id === item.tier)!;
                const canAfford    = acoin >= item.acoin;
                const tierUnlocked = tierIndex(tier.id) >= tierIndex(item.tier);
                const owned        = ownedIds.has(item.id);
                return (
                  <View
                    key={item.id}
                    style={[
                      s.goodCard,
                      {
                        backgroundColor: colors.surface,
                        borderColor: owned ? itemTier.color + "55" : tierUnlocked ? colors.border : colors.border,
                        opacity: tierUnlocked ? 1 : 0.5,
                        shadowColor: owned ? itemTier.glowColor : "transparent",
                        shadowOpacity: 0.3,
                        shadowRadius: 8,
                        elevation: owned ? 3 : 0,
                      },
                    ]}
                  >
                    {/* Owned ribbon */}
                    {owned && (
                      <View style={[s.ownedRibbon, { backgroundColor: itemTier.color }]}>
                        <Text style={s.ownedRibbonText}>OWNED</Text>
                      </View>
                    )}

                    <Text style={s.goodCardEmoji}>{item.emoji}</Text>
                    <Text style={[s.goodCardName, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
                    <Text style={[s.goodCardDesc, { color: colors.textMuted }]} numberOfLines={2}>{item.description}</Text>

                    <View style={[s.tierChip, { backgroundColor: itemTier.color + "20" }]}>
                      <Text style={[s.tierChipText, { color: itemTier.color }]}>{itemTier.emoji} {itemTier.label}+</Text>
                    </View>

                    <View style={s.goodCardBottom}>
                      <Text style={[s.goodCardPrice, { color: Colors.gold }]}>🪙 {item.acoin >= 1000 ? `${(item.acoin / 1000).toFixed(item.acoin % 1000 === 0 ? 0 : 1)}K` : item.acoin}</Text>
                      {owned ? (
                        <View style={[s.buyBtn, { backgroundColor: "#34C75922" }]}>
                          <Ionicons name="checkmark-circle" size={14} color="#34C759" />
                          <Text style={[s.buyBtnText, { color: "#34C759" }]}>Owned</Text>
                        </View>
                      ) : !tierUnlocked ? (
                        <View style={[s.buyBtn, { backgroundColor: colors.backgroundSecondary }]}>
                          <Ionicons name="lock-closed" size={12} color={colors.textMuted} />
                        </View>
                      ) : (
                        <TouchableOpacity
                          style={[s.buyBtn, { backgroundColor: canAfford ? tier.color : colors.backgroundSecondary }]}
                          onPress={() => purchaseGood(item)}
                          disabled={purchasing === item.id}
                        >
                          {purchasing === item.id ? (
                            <ActivityIndicator size="small" color={canAfford ? "#fff" : colors.textMuted} />
                          ) : (
                            <Text style={[s.buyBtnText, { color: canAfford ? "#fff" : colors.textMuted }]}>
                              {canAfford ? "Buy" : "Fund"}
                            </Text>
                          )}
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>

            {/* Perks */}
            <SectionHeader title={`YOUR ${tier.label.toUpperCase()} PERKS`} subtitle="Active benefits for your tier" colors={colors} style={{ marginTop: 8 }} />
            <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {tier.perks.map((perk, i) => (
                <View key={i}>
                  {i > 0 && <View style={[s.sep, { backgroundColor: colors.border }]} />}
                  <View style={s.perkRow}>
                    <View style={[s.perkDot, { backgroundColor: tier.color }]} />
                    <Text style={[s.perkText, { color: colors.text }]}>{perk}</Text>
                    <Ionicons name="checkmark-circle" size={16} color={tier.color} />
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── COLLECTION ────────────────────────────────────────────────────── */}
        {activeTab === "collection" && (
          <View style={s.section}>
            {purchases.length === 0 ? (
              <View style={s.empty}>
                <Text style={{ fontSize: 52 }}>🧺</Text>
                <Text style={[s.emptyTitle, { color: colors.text }]}>Collection is empty</Text>
                <Text style={[s.emptySub, { color: colors.textMuted }]}>Purchase Status Goods from the Shop tab to fill your collection</Text>
                <TouchableOpacity
                  style={[s.emptyBtn, { backgroundColor: tier.color }]}
                  onPress={() => setActiveTab("shop")}
                >
                  <Text style={s.emptyBtnText}>Browse Shop</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <SectionHeader title="MY COLLECTION" subtitle={`${purchases.length} item${purchases.length !== 1 ? "s" : ""} owned`} colors={colors} />
                <View style={s.goodsGrid}>
                  {purchases.map((p) => {
                    const good = STATUS_GOODS.find((g) => g.id === p.good_id);
                    const isEquipped = equippedIds.has(p.good_id);
                    return (
                      <View
                        key={p.id}
                        style={[
                          s.goodCard,
                          {
                            backgroundColor: colors.surface,
                            borderColor: isEquipped ? tier.color : colors.border,
                            shadowColor: isEquipped ? tier.glowColor : "transparent",
                            shadowOpacity: 0.35,
                            shadowRadius: 8,
                            elevation: isEquipped ? 4 : 0,
                          },
                        ]}
                      >
                        {isEquipped && (
                          <View style={[s.ownedRibbon, { backgroundColor: tier.color }]}>
                            <Text style={s.ownedRibbonText}>ACTIVE</Text>
                          </View>
                        )}
                        <Text style={s.goodCardEmoji}>{p.good_emoji}</Text>
                        <Text style={[s.goodCardName, { color: colors.text }]} numberOfLines={1}>{p.good_name}</Text>
                        <Text style={[s.goodCardDesc, { color: colors.textMuted }]} numberOfLines={2}>
                          {good?.description || "Status good"}
                        </Text>
                        <Text style={[s.goodCardPrice, { color: colors.textMuted, marginTop: 4 }]}>
                          {new Date(p.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                        </Text>
                        <TouchableOpacity
                          style={[
                            s.equipToggle,
                            { backgroundColor: isEquipped ? tier.color : colors.backgroundSecondary, borderColor: isEquipped ? tier.color : colors.border },
                          ]}
                          onPress={() => toggleEquip(p)}
                        >
                          {isEquipped && <Ionicons name="checkmark" size={12} color="#fff" />}
                          <Text style={[s.equipToggleText, { color: isEquipped ? "#fff" : colors.textMuted }]}>
                            {isEquipped ? "Equipped" : "Equip"}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
              </>
            )}
          </View>
        )}

        {/* ── CHALLENGES ────────────────────────────────────────────────────── */}
        {activeTab === "challenges" && (
          <View style={s.section}>
            <SectionHeader title="EARN ACOIN" subtitle="Complete challenges to earn ACoins" colors={colors} />

            {(["daily", "weekly", "milestone"] as const).map((type) => {
              const group = CHALLENGES.filter((c) => c.type === type);
              const typeLabel = type === "daily" ? "⚡ Daily" : type === "weekly" ? "📅 Weekly" : "🏆 Milestones";
              const typeColor = type === "daily" ? "#34C759" : type === "weekly" ? "#1f95ff" : Colors.gold;
              return (
                <View key={type} style={{ gap: 8 }}>
                  <View style={s.challengeGroupHeader}>
                    <Text style={[s.challengeGroupLabel, { color: typeColor }]}>{typeLabel}</Text>
                    {type !== "milestone" && (
                      <Text style={[s.challengeGroupReset, { color: colors.textMuted }]}>
                        Resets in {type === "daily" ? "8h 42m" : "3d 15h"}
                      </Text>
                    )}
                  </View>
                  <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    {group.map((c, i) => (
                      <View key={c.id}>
                        {i > 0 && <View style={[s.sep, { backgroundColor: colors.border }]} />}
                        <View style={s.challengeRow}>
                          <View style={[s.challengeIconBox, { backgroundColor: typeColor + "18" }]}>
                            <Text style={{ fontSize: 20 }}>{c.emoji}</Text>
                          </View>
                          <View style={{ flex: 1, gap: 6 }}>
                            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                              <Text style={[s.challengeTitle, { color: colors.text }]} numberOfLines={1}>{c.title}</Text>
                              <View style={[s.rewardBadge, { backgroundColor: Colors.gold + "22" }]}>
                                <Text style={[s.rewardText, { color: Colors.gold }]}>+{c.reward} 🪙</Text>
                              </View>
                            </View>
                            <View style={s.challengeTrack}>
                              <View
                                style={[
                                  s.challengeFill,
                                  {
                                    width: `${c.progress * 100}%`,
                                    backgroundColor: c.progress >= 1 ? "#34C759" : typeColor,
                                  },
                                ]}
                              />
                            </View>
                            <Text style={[s.challengePct, { color: colors.textMuted }]}>
                              {c.progress >= 1 ? "✓ Completed" : `${Math.round(c.progress * 100)}% complete`}
                            </Text>
                          </View>
                          {c.progress >= 1 && (
                            <TouchableOpacity style={[s.claimBtn, { backgroundColor: "#34C759" }]}>
                              <Text style={s.claimBtnText}>Claim</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              );
            })}

            {/* How to earn more */}
            <SectionHeader title="MORE WAYS TO EARN" subtitle="Boost your ACoin balance" colors={colors} style={{ marginTop: 8 }} />
            <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {[
                { emoji: "💸", label: "Top-Up ACoin",        sub: "Buy directly from the wallet",    action: "/wallet" },
                { emoji: "🔄", label: "Convert Nexa",        sub: "Turn your XP into ACoins",        action: "/wallet" },
                { emoji: "🎁", label: "Send & Receive Gifts", sub: "Gift economy rewards senders",    action: "/gifts" },
              ].map((row, i) => (
                <View key={row.label}>
                  {i > 0 && <View style={[s.sep, { backgroundColor: colors.border }]} />}
                  <TouchableOpacity style={s.earnRow} onPress={() => router.push(row.action as any)}>
                    <Text style={{ fontSize: 24 }}>{row.emoji}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.earnLabel, { color: colors.text }]}>{row.label}</Text>
                      <Text style={[s.earnSub, { color: colors.textMuted }]}>{row.sub}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── HISTORY ───────────────────────────────────────────────────────── */}
        {activeTab === "history" && (
          <View style={s.section}>
            <SectionHeader title="TRANSACTION HISTORY" subtitle={`${transactions.length} recent transactions`} colors={colors} />
            {transactions.length === 0 ? (
              <View style={s.empty}>
                <Ionicons name="receipt-outline" size={48} color={colors.textMuted} />
                <Text style={[s.emptyTitle, { color: colors.text }]}>No transactions yet</Text>
                <Text style={[s.emptySub, { color: colors.textMuted }]}>Purchase Status Goods or convert Nexa to see activity</Text>
              </View>
            ) : (
              <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                {transactions.map((tx, i) => (
                  <View key={tx.id}>
                    {i > 0 && <View style={[s.sep, { backgroundColor: colors.border }]} />}
                    <View style={s.txRow}>
                      <View style={[s.txIcon, { backgroundColor: tx.color + "20" }]}>
                        <Ionicons name={tx.icon as any} size={18} color={tx.color} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[s.txLabel, { color: colors.text }]} numberOfLines={1}>{tx.label}</Text>
                        <Text style={[s.txTime, { color: colors.textMuted }]}>
                          {new Date(tx.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                        </Text>
                      </View>
                      <View style={{ alignItems: "flex-end" }}>
                        <Text style={[s.txAmount, { color: tx.amount > 0 ? "#34C759" : "#FF3B30" }]}>
                          {tx.amount > 0 ? "+" : ""}{tx.amount.toLocaleString()}
                        </Text>
                        <Text style={[s.txUnit, { color: colors.textMuted }]}>ACoin</Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* ── LEADERBOARD ───────────────────────────────────────────────────── */}
        {activeTab === "leaderboard" && (
          <View style={s.section}>
            <SectionHeader title="RICH LIST" subtitle="Top ACoin holders on AfuChat" colors={colors} />

            {/* Podium — top 3 */}
            {!loadingList && richList.length >= 3 && (
              <View style={s.podiumWrap}>
                {/* 2nd */}
                <PodiumCard user={richList[1]} rank={2} isMe={richList[1]?.handle === profile?.handle} myTier={tier} colors={colors} onPress={() => router.push(`/@${richList[1].handle}` as any)} />
                {/* 1st */}
                <PodiumCard user={richList[0]} rank={1} isMe={richList[0]?.handle === profile?.handle} myTier={tier} colors={colors} onPress={() => router.push(`/@${richList[0].handle}` as any)} />
                {/* 3rd */}
                <PodiumCard user={richList[2]} rank={3} isMe={richList[2]?.handle === profile?.handle} myTier={tier} colors={colors} onPress={() => router.push(`/@${richList[2].handle}` as any)} />
              </View>
            )}

            {/* Rest of list */}
            {loadingList ? (
              <View style={{ gap: 8 }}>{[1,2,3,4,5].map((k) => <ListRowSkeleton key={k} />)}</View>
            ) : (
              <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                {richList.slice(3).map((u, idx) => {
                  const uTier = getPrestigeTier(u.acoin || 0);
                  const isMe  = u.handle === profile?.handle;
                  return (
                    <View key={u.handle}>
                      {idx > 0 && <View style={[s.sep, { backgroundColor: colors.border }]} />}
                      <TouchableOpacity
                        style={[s.richRow, isMe && { backgroundColor: tier.color + "0A" }]}
                        onPress={() => router.push(`/@${u.handle}` as any)}
                        activeOpacity={0.75}
                      >
                        <Text style={[s.richRank, { color: colors.textMuted }]}>#{idx + 4}</Text>
                        <Avatar uri={u.avatar_url} name={u.display_name} size={38} />
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                            <Text style={[s.richName, { color: isMe ? tier.color : colors.text }]} numberOfLines={1}>{u.display_name}</Text>
                            {isMe && <View style={[s.youPill, { backgroundColor: tier.color + "22", borderColor: tier.color + "55" }]}><Text style={[s.youText, { color: tier.color }]}>You</Text></View>}
                          </View>
                          <Text style={[s.richHandle, { color: colors.textMuted }]}>@{u.handle}</Text>
                        </View>
                        <View style={{ alignItems: "flex-end", gap: 2 }}>
                          <Text style={{ fontSize: 18 }}>{uTier.emoji}</Text>
                          <Text style={[s.richAcoin, { color: Colors.gold }]}>{(u.acoin || 0).toLocaleString()} 🪙</Text>
                        </View>
                      </TouchableOpacity>
                    </View>
                  );
                })}
                {richList.length === 0 && (
                  <Text style={[s.emptyTitle, { color: colors.textMuted, textAlign: "center", paddingVertical: 32 }]}>No users yet</Text>
                )}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function SectionHeader({ title, subtitle, colors, style }: { title: string; subtitle?: string; colors: any; style?: any }) {
  return (
    <View style={[{ gap: 2, marginBottom: 4 }, style]}>
      <Text style={[s.sectionTitle, { color: colors.textMuted }]}>{title}</Text>
      {subtitle && <Text style={[s.sectionSub, { color: colors.textMuted }]}>{subtitle}</Text>}
    </View>
  );
}

const PODIUM_HEIGHTS = [100, 130, 80];
const PODIUM_MEDALS  = ["🥇", "🥈", "🥉"];
const PODIUM_COLORS  = ["#D4A853", "#C0C0C0", "#CD7F32"];

function PodiumCard({ user, rank, isMe, myTier, colors, onPress }: { user: RichUser; rank: number; isMe: boolean; myTier: any; colors: any; onPress: () => void }) {
  const uTier  = getPrestigeTier(user.acoin || 0);
  const idx    = rank - 1;
  const height = PODIUM_HEIGHTS[idx];
  const medal  = PODIUM_MEDALS[idx];
  const color  = PODIUM_COLORS[idx];
  return (
    <TouchableOpacity style={[s.podiumCard, { flex: rank === 1 ? 1.2 : 1 }]} onPress={onPress} activeOpacity={0.8}>
      <Text style={{ fontSize: rank === 1 ? 28 : 22, textAlign: "center" }}>{uTier.emoji}</Text>
      <Avatar uri={user.avatar_url} name={user.display_name} size={rank === 1 ? 52 : 40} />
      <Text style={[s.podiumName, { color: isMe ? myTier.color : colors.text, fontSize: rank === 1 ? 13 : 11 }]} numberOfLines={1}>{user.display_name}</Text>
      <Text style={[s.podiumAcoin, { color: Colors.gold, fontSize: rank === 1 ? 12 : 10 }]}>{(user.acoin || 0) >= 1000 ? `${((user.acoin || 0) / 1000).toFixed(1)}K` : user.acoin} 🪙</Text>
      <View style={[s.podiumBase, { height, backgroundColor: color + "22", borderColor: color + "55" }]}>
        <Text style={[s.podiumMedal, { color, fontSize: rank === 1 ? 28 : 22 }]}>{medal}</Text>
        <Text style={[s.podiumRank, { color }]}>#{rank}</Text>
      </View>
    </TouchableOpacity>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1 },

  // Hero
  hero: { paddingHorizontal: 20, paddingBottom: 24 },
  orb: { position: "absolute", borderRadius: 999 },
  heroNav: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24 },
  heroNavBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(0,0,0,0.22)", alignItems: "center", justifyContent: "center" },
  heroNavTitle: { fontSize: 17, fontFamily: "Inter_700Bold", color: "#fff", letterSpacing: -0.3 },

  emojiWrap: { alignItems: "center", justifyContent: "center", marginBottom: 16, height: 110 },
  glowRing: {
    position: "absolute",
    width: 100, height: 100, borderRadius: 50,
    borderWidth: 2,
    shadowOffset: { width: 0, height: 0 },
  },
  heroEmoji: { fontSize: 68 },

  heroTierLabel: { fontSize: 30, fontFamily: "Inter_700Bold", color: "#fff", textAlign: "center", letterSpacing: -0.5 },
  heroTierDesc:  { fontSize: 13, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.72)", textAlign: "center", marginTop: 4, marginBottom: 18 },

  acoinRow: { flexDirection: "row", justifyContent: "center", gap: 10, marginBottom: 22 },
  acoinPill: { flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 16, paddingVertical: 9, borderRadius: 24, borderWidth: 1 },
  acoinEmoji: { fontSize: 16 },
  acoinValue: { fontSize: 18, fontFamily: "Inter_700Bold", color: "#fff" },
  acoinLabel: { fontSize: 12, fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.65)" },
  rankPill: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 24, borderWidth: 1 },
  rankText: { fontSize: 13, fontFamily: "Inter_700Bold", color: "#fff" },

  progressWrap: { gap: 6, marginBottom: 20 },
  progressLabels: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  progressFrom: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "rgba(255,255,255,0.8)" },
  progressGap:  { fontSize: 11, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.6)" },
  progressTo:   { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "rgba(255,255,255,0.8)" },
  progressTrack: { height: 8, borderRadius: 4, backgroundColor: "rgba(0,0,0,0.3)", overflow: "hidden" },
  progressFill:  { height: "100%", borderRadius: 4 },
  progressGlow:  { position: "absolute", right: 0, top: 0, bottom: 0, width: 16, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 4 },
  progressAmounts: { flexDirection: "row", justifyContent: "space-between" },
  progressAmount: { fontSize: 10, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.5)" },

  maxBadge: { backgroundColor: "rgba(0,0,0,0.25)", borderRadius: 14, paddingHorizontal: 18, paddingVertical: 10, alignSelf: "center", marginBottom: 20 },
  maxText:  { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#FFD700" },

  statsStrip: { flexDirection: "row", backgroundColor: "rgba(0,0,0,0.22)", borderRadius: 16, padding: 14 },
  statItem: { flex: 1, alignItems: "center", gap: 2 },
  statsDivider: { width: 0.5, backgroundColor: "rgba(255,255,255,0.2)", marginHorizontal: 8 },
  statValue: { fontSize: 18, fontFamily: "Inter_700Bold", color: "#fff" },
  statLabel: { fontSize: 10, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.6)" },

  // Roadmap
  roadmapRow: { paddingHorizontal: 16, paddingVertical: 14, flexDirection: "row", alignItems: "center" },
  roadmapChip: { alignItems: "center", paddingHorizontal: 12, paddingVertical: 10, borderRadius: 14, borderWidth: 1.5, minWidth: 70, gap: 3, position: "relative" },
  roadmapEmoji: { fontSize: 20 },
  roadmapLabel: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  roadmapMin: { fontSize: 9, fontFamily: "Inter_400Regular" },
  roadmapLine: { width: 18, height: 2, marginHorizontal: 2 },
  activeIndicator: { position: "absolute", bottom: -6, width: 6, height: 6, borderRadius: 3 },
  lockOverlay: { position: "absolute", top: 4, right: 4 },

  // Tabs
  tabScroll: { paddingHorizontal: 14, paddingBottom: 14, gap: 8, flexDirection: "row" },
  tab: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 22, borderWidth: 1, borderColor: "transparent" },
  tabLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold" },

  // Section
  section: { paddingHorizontal: 14, gap: 10 },
  sectionTitle: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.8 },
  sectionSub: { fontSize: 11, fontFamily: "Inter_400Regular" },
  card: { borderRadius: 16, borderWidth: 0.5, overflow: "hidden" },
  sep: { height: 0.5, marginLeft: 16 },

  // Goods grid
  goodsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  goodCard: {
    width: (SCREEN_W - 28 - 10) / 2,
    borderRadius: 18, borderWidth: 1,
    padding: 14, gap: 6,
    position: "relative", overflow: "hidden",
    shadowOffset: { width: 0, height: 4 },
  },
  ownedRibbon: { position: "absolute", top: 10, right: -18, paddingHorizontal: 20, paddingVertical: 3, transform: [{ rotate: "38deg" }] },
  ownedRibbonText: { fontSize: 8, fontFamily: "Inter_700Bold", color: "#fff", letterSpacing: 0.5 },
  goodCardEmoji: { fontSize: 36, marginBottom: 4 },
  goodCardName: { fontSize: 13, fontFamily: "Inter_700Bold" },
  goodCardDesc: { fontSize: 11, fontFamily: "Inter_400Regular", lineHeight: 15 },
  tierChip: { alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  tierChipText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  goodCardPrice: { fontSize: 12, fontFamily: "Inter_700Bold" },
  goodCardBottom: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 },
  buyBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  buyBtnText: { fontSize: 12, fontFamily: "Inter_700Bold" },

  // Perks
  perkRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 12 },
  perkDot: { width: 6, height: 6, borderRadius: 3 },
  perkText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular" },

  // Collection equip
  equipToggle: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, borderWidth: 1, alignSelf: "flex-start", marginTop: 4 },
  equipToggleText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },

  // Challenges
  challengeGroupHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  challengeGroupLabel: { fontSize: 13, fontFamily: "Inter_700Bold" },
  challengeGroupReset: { fontSize: 11, fontFamily: "Inter_400Regular" },
  challengeRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
  challengeIconBox: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  challengeTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold", flex: 1 },
  challengeTrack: { height: 5, borderRadius: 3, backgroundColor: "rgba(128,128,128,0.2)", overflow: "hidden" },
  challengeFill: { height: "100%", borderRadius: 3 },
  challengePct: { fontSize: 10, fontFamily: "Inter_400Regular" },
  rewardBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  rewardText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  claimBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  claimBtnText: { fontSize: 12, fontFamily: "Inter_700Bold", color: "#fff" },

  // Earn rows
  earnRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 13 },
  earnLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  earnSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },

  // Transactions
  txRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
  txIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  txLabel: { fontSize: 14, fontFamily: "Inter_500Medium" },
  txTime: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  txAmount: { fontSize: 15, fontFamily: "Inter_700Bold" },
  txUnit: { fontSize: 10, fontFamily: "Inter_400Regular" },

  // Leaderboard / Podium
  podiumWrap: { flexDirection: "row", alignItems: "flex-end", gap: 8, marginBottom: 8 },
  podiumCard: { alignItems: "center", gap: 4 },
  podiumName: { fontFamily: "Inter_600SemiBold", textAlign: "center" },
  podiumAcoin: { fontFamily: "Inter_700Bold", textAlign: "center" },
  podiumBase: { width: "100%", borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center", gap: 2, marginTop: 4 },
  podiumMedal: { fontFamily: "Inter_700Bold" },
  podiumRank: { fontSize: 12, fontFamily: "Inter_700Bold" },

  richRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 11 },
  richRank: { fontSize: 12, fontFamily: "Inter_700Bold", width: 28, textAlign: "center" },
  richName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  richHandle: { fontSize: 12, fontFamily: "Inter_400Regular" },
  richAcoin: { fontSize: 11, fontFamily: "Inter_700Bold" },
  youPill: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10, borderWidth: 1 },
  youText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },

  // Empty states
  empty: { alignItems: "center", gap: 12, paddingVertical: 52 },
  emptyTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  emptySub: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", maxWidth: 260, lineHeight: 19 },
  emptyBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14, marginTop: 4 },
  emptyBtnText: { fontSize: 14, fontFamily: "Inter_700Bold", color: "#fff" },
});
