import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/hooks/useTheme";
import { Avatar } from "@/components/ui/Avatar";
import VerifiedBadge from "@/components/ui/VerifiedBadge";
import { ProfileNotFoundView } from "@/app/profile-not-found";
import { ProfilePrivateView } from "@/app/profile-private";
import { ProfileSkeleton } from "@/components/ui/Skeleton";
import { getProfileCache, setProfileCache } from "@/lib/profileCache";
import { showAlert } from "@/lib/alert";
import { showToast } from "@/lib/toast";
import * as Haptics from "@/lib/haptics";
import { getPrestigeTier } from "@/lib/prestige";
import { LinearGradient } from "@/components/ui/SafeGradient";

// ─── Types ────────────────────────────────────────────────────────────────────

type FullProfile = {
  id: string;
  display_name: string;
  handle: string;
  avatar_url: string | null;
  banner_url: string | null;
  bio: string | null;
  is_verified: boolean;
  is_organization_verified: boolean;
  is_business_mode: boolean;
  is_private: boolean;
  country: string | null;
  website_url: string | null;
  xp: number;
  current_grade: string | null;
  acoin: number;
  last_seen: string | null;
  show_online_status: boolean;
  created_at: string | null;
};

type Counts = { followers: number; following: number; posts: number };
type GridPost = { id: string; media_urls: string[] | null; post_type: string | null; content?: string | null };
type MutualUser = { id: string; handle: string; avatar_url: string | null };
type TabId = "posts" | "articles" | "videos";

// ─── Constants ────────────────────────────────────────────────────────────────

const { width: SW } = Dimensions.get("window");
const BANNER_H   = 100;
const AVATAR_SIZE = 80;
const AVATAR_OFFSET = 16; // how far avatar sticks below banner
const CELL = Math.floor((SW - 3) / 3);

const MONTHS = ["January","February","March","April","May","June",
                "July","August","September","October","November","December"];

const XP_GRADES: { name: string; min: number; max: number; color: string }[] = [
  { name: "Rookie",   min: 0,         max: 500,       color: "#8E8E93" },
  { name: "Starter",  min: 500,       max: 2_000,     color: "#34C759" },
  { name: "Active",   min: 2_000,     max: 8_000,     color: "#007AFF" },
  { name: "Achiever", min: 8_000,     max: 25_000,    color: "#5856D6" },
  { name: "Rising",   min: 25_000,    max: 75_000,    color: "#FF9500" },
  { name: "Elite",    min: 75_000,    max: 200_000,   color: "#FF3B30" },
  { name: "Expert",   min: 200_000,   max: 500_000,   color: "#AF52DE" },
  { name: "Master",   min: 500_000,   max: 1_000_000, color: "#D4A853" },
  { name: "Legend",   min: 1_000_000, max: 2_500_000, color: "#FF9500" },
  { name: "Mythic",   min: 2_500_000, max: Infinity,  color: "#FF2D55" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function joinedLabel(ts: string | null) {
  if (!ts) return "";
  const d = new Date(ts);
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function xpInfo(xp: number, gradeName: string | null) {
  const g = XP_GRADES.find(g => g.name === gradeName) ?? XP_GRADES[0];
  const progress = g.max === Infinity ? 1 : Math.min(1, Math.max(0, (xp - g.min) / (g.max - g.min)));
  return { grade: g, progress, pct: Math.round(progress * 100) };
}

function lastSeenLabel(ts: string | null, showOnline: boolean) {
  if (!showOnline || !ts) return { text: "", online: false };
  const ms = Date.now() - new Date(ts).getTime();
  if (ms < 2 * 60_000)  return { text: "Online now", online: true };
  if (ms < 3_600_000)   return { text: "last seen recently", online: false };
  if (ms < 86_400_000)  return { text: `last seen ${Math.floor(ms / 3_600_000)}h ago`, online: false };
  return { text: `last seen ${Math.floor(ms / 86_400_000)}d ago`, online: false };
}

function hex2rgba(hex: string, alpha: number) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ContactScreen() {
  const { id, init_handle } = useLocalSearchParams<{
    id: string; init_name?: string; init_handle?: string;
    init_avatar?: string; init_verified?: string; init_org_verified?: string;
  }>();
  const { colors, accent, isDark } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const isSelf = user?.id === id;

  // ── State ─────────────────────────────────────────────────────────────────
  const cached = id ? getProfileCache(id) : null;
  const [profile,       setProfile]       = useState<FullProfile | null>(cached as FullProfile | null);
  const [counts,        setCounts]        = useState<Counts>({ followers: 0, following: 0, posts: 0 });
  const [loading,       setLoading]       = useState(!cached);
  const [notFound,      setNotFound]      = useState(false);
  const [isFollowing,   setIsFollowing]   = useState(false);
  const [theyFollowMe,  setTheyFollowMe]  = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [aliases,       setAliases]       = useState<string[]>([]);
  const [mutuals,       setMutuals]       = useState<MutualUser[]>([]);
  const [mutualTotal,   setMutualTotal]   = useState(0);
  const [gridPosts,     setGridPosts]     = useState<GridPost[]>([]);
  const [gridLoading,   setGridLoading]   = useState(false);
  const [activeTab,         setActiveTab]         = useState<TabId>("posts");
  const [avatarModalVisible, setAvatarModalVisible] = useState(false);
  const barAnim = useRef(new Animated.Value(0)).current;

  // ── Load profile ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!id) { setNotFound(true); setLoading(false); return; }
    (async () => {
      const [pRes, flrRes, flgRes, psRes, iFlwRes, theyRes] = await Promise.all([
        supabase.from("profiles")
          .select("id,display_name,handle,avatar_url,banner_url,bio,is_verified,is_organization_verified,is_business_mode,is_private,country,website_url,xp,current_grade,acoin,last_seen,show_online_status,created_at")
          .eq("id", id).maybeSingle(),
        supabase.from("follows").select("id",{count:"exact",head:true}).eq("following_id", id),
        supabase.from("follows").select("id",{count:"exact",head:true}).eq("follower_id", id),
        supabase.from("posts").select("id",{count:"exact",head:true}).eq("author_id", id).in("visibility",["public","followers"]),
        user ? supabase.from("follows").select("id").eq("follower_id", user.id).eq("following_id", id).maybeSingle() : { data: null },
        user ? supabase.from("follows").select("id").eq("follower_id", id).eq("following_id", user.id).maybeSingle() : { data: null },
      ]);
      if (!pRes.data) { setNotFound(true); setLoading(false); return; }
      const p = pRes.data as FullProfile;
      setProfile(p); setProfileCache(p.id, p as any);
      setCounts({ followers: flrRes.count ?? 0, following: flgRes.count ?? 0, posts: psRes.count ?? 0 });
      setIsFollowing(!!(iFlwRes as any)?.data);
      setTheyFollowMe(!!(theyRes as any)?.data);
      setLoading(false);
    })().catch(() => setLoading(false));
  }, [id, user?.id]);

  // ── Load aliases + mutuals ────────────────────────────────────────────────
  useEffect(() => {
    if (!id || loading) return;
    (async () => {
      const { data: aliasData } = await supabase.from("owned_usernames")
        .select("handle").eq("owner_id", id).limit(8);
      setAliases((aliasData ?? []).map((a: any) => a.handle).filter((h: string) => h !== profile?.handle));
      if (user && !isSelf) {
        const { data: myFlwData } = await supabase.from("follows").select("following_id").eq("follower_id", user.id);
        const myIds = (myFlwData ?? []).map((f: any) => f.following_id);
        if (myIds.length > 0) {
          const { data: mData } = await supabase.from("follows")
            .select("follower_id, profiles!follows_follower_id_fkey(id,handle,avatar_url)")
            .eq("following_id", id).in("follower_id", myIds).limit(4);
          const list: MutualUser[] = (mData ?? []).map((m: any) => ({
            id: m.follower_id, handle: m.profiles?.handle ?? "", avatar_url: m.profiles?.avatar_url ?? null,
          })).filter((m: MutualUser) => m.handle);
          setMutuals(list.slice(0, 3)); setMutualTotal(list.length);
        }
      }
    })().catch(() => {});
  }, [id, loading, user?.id, isSelf, profile?.handle]);

  // ── Load grid ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!id || loading) return;
    setGridLoading(true);
    let q = supabase.from("posts").select("id,media_urls,post_type,content")
      .eq("author_id", id).in("visibility",["public","followers"])
      .order("created_at", { ascending: false }).limit(30);
    if (activeTab === "videos")        q = (q as any).eq("post_type","video");
    else if (activeTab === "articles") q = (q as any).in("post_type",["article","text"]);
    q.then(({ data }) => { setGridPosts((data as GridPost[]) ?? []); setGridLoading(false); })
     .catch(() => { setGridPosts([]); setGridLoading(false); });
  }, [id, loading, activeTab]);

  // ── XP bar animation ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!profile) return;
    const { progress } = xpInfo(profile.xp ?? 0, profile.current_grade);
    Animated.timing(barAnim, { toValue: progress, duration: 1000, delay: 400, useNativeDriver: false }).start();
  }, [profile?.xp, profile?.current_grade]);

  // ── Follow ────────────────────────────────────────────────────────────────
  const handleFollow = useCallback(async () => {
    if (!user || !id || followLoading || isSelf) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFollowLoading(true);
    try {
      if (isFollowing) {
        await supabase.from("follows").delete().eq("follower_id", user.id).eq("following_id", id);
        setIsFollowing(false); setCounts(c => ({ ...c, followers: Math.max(0, c.followers - 1) }));
      } else {
        await supabase.from("follows").insert({ follower_id: user.id, following_id: id });
        setIsFollowing(true); setCounts(c => ({ ...c, followers: c.followers + 1 }));
      }
    } catch { showToast("Could not update follow status", { type: "error" }); }
    finally { setFollowLoading(false); }
  }, [user, id, isFollowing, followLoading, isSelf]);

  // ── Message ───────────────────────────────────────────────────────────────
  const handleMessage = useCallback(async () => {
    if (!user || !id) return;
    Haptics.selectionAsync();
    try {
      const { data: chatId, error } = await supabase.rpc("get_or_create_direct_chat", { other_user_id: id });
      if (error || !chatId) throw new Error();
      router.push({ pathname: "/chat/[id]", params: { id: chatId } });
    } catch { showAlert("Error", "Could not start conversation. Please try again."); }
  }, [user, id]);

  // ── Guard states ──────────────────────────────────────────────────────────
  if (loading && !profile) return (
    <View style={{ flex: 1, backgroundColor: colors.background }}><ProfileSkeleton /></View>
  );
  if (notFound || !profile) return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      <ProfileNotFoundView handle={init_handle ?? id ?? "unknown"} />
    </View>
  );
  if (profile.is_private && !isSelf && !isFollowing) return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      <ProfilePrivateView handle={profile.handle} displayName={profile.display_name}
        avatarUrl={profile.avatar_url ?? undefined} profileId={profile.id} />
    </View>
  );

  // ── Derived values ────────────────────────────────────────────────────────
  const prestige = getPrestigeTier(profile.acoin ?? 0);
  const { grade: xpGrade, pct: xpPct } = xpInfo(profile.xp ?? 0, profile.current_grade);
  const ls = lastSeenLabel(profile.last_seen, profile.show_online_status);

  const followState = isFollowing && theyFollowMe ? "friends"
    : !isFollowing && theyFollowMe ? "follow_back"
    : isFollowing ? "following" : "follow";
  const isFollowFilled = followState === "follow" || followState === "follow_back";
  const followBg    = followState === "follow" ? accent : followState === "follow_back" ? "#FF9500" : "transparent";
  const followBrd   = followState === "friends" ? "#34C759" : followState === "following" ? colors.border : followBg;
  const followTxt   = isFollowFilled ? "#fff" : followState === "friends" ? "#34C759" : colors.text;
  const followLabel = followState === "friends" ? "Friends" : followState === "follow_back" ? "Follow Back"
    : followState === "following" ? "Following" : "Follow";
  const followIcon: any = followState === "friends" ? "heart" : followState === "following" ? "checkmark-circle"
    : "person-add-outline";

  const bannerColor1 = prestige.ringColors[0];
  const bannerColor2 = prestige.ringColors[1];
  const barFill = barAnim.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] });

  const TABS: { id: TabId; icon: string; label: string }[] = [
    { id: "posts",    icon: "grid-outline",           label: "Posts"    },
    { id: "articles", icon: "document-text-outline",  label: "Articles" },
    { id: "videos",   icon: "videocam-outline",       label: "Videos"   },
  ];

  const isOrg = profile.is_organization_verified || profile.is_business_mode;

  return (
    <View style={[s.root, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>

        {/* ══════════════════════════════════════════════════════════════ */}
        {/* COVER PHOTO (short + rectangular)                             */}
        {/* ══════════════════════════════════════════════════════════════ */}
        <View style={[s.coverWrap, { height: BANNER_H }]}>
          {profile.banner_url ? (
            <Image source={{ uri: profile.banner_url }}
              style={StyleSheet.absoluteFill} contentFit="cover" />
          ) : (
            <LinearGradient
              colors={[bannerColor1, bannerColor2] as any}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
          )}
          <LinearGradient
            colors={["rgba(0,0,0,0.42)", "transparent"] as any}
            start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
            style={[StyleSheet.absoluteFill, { height: 60 }]}
          />
          {/* Nav row: back (left) + more (right) */}
          <View style={[s.navRow, { top: insets.top + 6 }]}>
            <TouchableOpacity style={s.navBtn}
              onPress={() => router.canGoBack() ? router.back() : router.replace("/(tabs)/discover" as any)}
              hitSlop={{ top: 8, left: 8, right: 10, bottom: 8 }}>
              <Ionicons name="arrow-back" size={20} color="#fff" />
            </TouchableOpacity>
            {!isSelf && (
              <TouchableOpacity style={s.navBtn}
                onPress={() => showAlert("Options", undefined, [
                  { text: "Report", style: "destructive", onPress: () => {} },
                  { text: "Block",  style: "destructive", onPress: () => {} },
                  { text: "Cancel", style: "cancel" },
                ])}
                hitSlop={{ top: 8, left: 10, right: 8, bottom: 8 }}>
                <Ionicons name="ellipsis-horizontal" size={20} color="#fff" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* ══════════════════════════════════════════════════════════════ */}
        {/* IDENTITY BAND                                                  */}
        {/* Left col: avatar (overlaps banner) + name/handle below        */}
        {/* Right col: action buttons aligned to the right                */}
        {/* ══════════════════════════════════════════════════════════════ */}
        <View style={s.identityBand}>

          {/* ── Left: avatar + name stack ─────────────────────────────── */}
          <View style={s.identityLeft}>
            <TouchableOpacity
              onPress={() => setAvatarModalVisible(true)}
              activeOpacity={0.88}
              style={[s.avatarShell, { borderColor: colors.background, marginTop: -(AVATAR_SIZE / 2 + 4) }]}>
              <Avatar uri={profile.avatar_url} name={profile.display_name}
                size={AVATAR_SIZE} square={isOrg} premium={false} />
              {ls.online && <View style={[s.onlineDot, { borderColor: colors.background }]} />}
            </TouchableOpacity>

            {/* Name + verified badge */}
            <View style={s.nameRow}>
              <Text style={[s.displayName, { color: colors.text }]} numberOfLines={1}>
                {profile.display_name}
              </Text>
              <VerifiedBadge isVerified={profile.is_verified}
                isOrganizationVerified={profile.is_organization_verified} size={16} />
            </View>

            {/* Handle + online status (only show dot+label when actively online) */}
            <View style={s.handleRow}>
              <Text style={[s.handle, { color: colors.textMuted }]}>@{profile.handle}</Text>
              {ls.online && (
                <>
                  <View style={[s.statusDot, { backgroundColor: "#34C759" }]} />
                  <Text style={[s.statusText, { color: "#34C759" }]}>Online</Text>
                </>
              )}
            </View>

            {/* Prestige pill */}
            <View style={[s.prestigePill, { backgroundColor: prestige.color + "1A", borderColor: prestige.color + "44" }]}>
              <Text style={s.prestigeEmoji}>{prestige.emoji}</Text>
              <Text style={[s.prestigeText, { color: prestige.color }]}>{prestige.label}</Text>
            </View>
          </View>

          {/* ── Right: action buttons ─────────────────────────────────── */}
          <View style={s.identityRight}>
            {/* Follow / Edit */}
            {!isSelf && user && (
              <TouchableOpacity
                style={[s.primaryBtn, { backgroundColor: followBg, borderColor: followBrd }]}
                onPress={handleFollow} activeOpacity={0.85} disabled={followLoading}>
                {followLoading
                  ? <ActivityIndicator size="small" color={followTxt} />
                  : <><Ionicons name={followIcon} size={13} color={followTxt} />
                      <Text style={[s.primaryBtnText, { color: followTxt }]}>{followLabel}</Text></>}
              </TouchableOpacity>
            )}
            {isSelf && (
              <TouchableOpacity
                style={[s.primaryBtn, { backgroundColor: "transparent", borderColor: colors.border }]}
                onPress={() => router.push("/profile/edit")} activeOpacity={0.85}>
                <Ionicons name="create-outline" size={13} color={colors.text} />
                <Text style={[s.primaryBtnText, { color: colors.text }]}>Edit</Text>
              </TouchableOpacity>
            )}

            {/* Quick icon buttons */}
            <View style={s.quickIconRow}>
              {!isSelf && user && (
                <TouchableOpacity
                  style={[s.quickIconBtn, { backgroundColor: accent + "18" }]}
                  onPress={handleMessage} activeOpacity={0.8}>
                  <Ionicons name="chatbubble-outline" size={16} color={accent} />
                </TouchableOpacity>
              )}
              {!isSelf && user && (
                <TouchableOpacity
                  style={[s.quickIconBtn, { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)" }]}
                  onPress={() => showAlert("More", undefined, [
                    { text: "Gift",         onPress: () => router.push({ pathname: "/gifts/index", params: { recipientId: id } } as any) },
                    { text: "Store",        onPress: () => router.push({ pathname: "/shop/[userId]", params: { userId: id } } as any) },
                    { text: "Share Profile",onPress: () => showToast("Link copied", { type: "info" }) },
                    { text: "Add to Contacts", onPress: () => showToast("Saved", { type: "success" }) },
                    { text: "Report",       style: "destructive", onPress: () => {} },
                    { text: "Block",        style: "destructive", onPress: () => {} },
                    { text: "Cancel",       style: "cancel" },
                  ])} activeOpacity={0.8}>
                  <Ionicons name="ellipsis-horizontal" size={16} color={colors.text} />
                </TouchableOpacity>
              )}
              {isSelf && (
                <TouchableOpacity
                  style={[s.quickIconBtn, { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)" }]}
                  onPress={() => router.push("/settings")} activeOpacity={0.8}>
                  <Ionicons name="settings-outline" size={16} color={colors.text} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        {/* ══════════════════════════════════════════════════════════════ */}
        {/* AVATAR FULLSCREEN MODAL                                       */}
        {/* ══════════════════════════════════════════════════════════════ */}
        <Modal
          visible={avatarModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setAvatarModalVisible(false)}>
          <TouchableOpacity
            style={s.avatarModalBg}
            activeOpacity={1}
            onPress={() => setAvatarModalVisible(false)}>
            {profile.avatar_url ? (
              <Image
                source={{ uri: profile.avatar_url }}
                style={s.avatarModalImg}
                contentFit="contain"
              />
            ) : (
              <View style={[s.avatarModalPlaceholder, { backgroundColor: isDark ? "#333" : "#eee" }]}>
                <Text style={{ fontSize: 64 }}>
                  {profile.display_name.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <TouchableOpacity
              style={[s.avatarModalClose, { backgroundColor: "rgba(0,0,0,0.6)" }]}
              onPress={() => setAvatarModalVisible(false)}>
              <Ionicons name="close" size={22} color="#fff" />
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>

        {/* ══════════════════════════════════════════════════════════════ */}
        {/* STATS CARD — elevated, no plain border                        */}
        {/* ══════════════════════════════════════════════════════════════ */}
        <View style={[s.statsCard, { backgroundColor: colors.background, borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)" }]}>
          {[
            { label: "Posts",     value: counts.posts,     onPress: () => router.push({ pathname: "/my-posts", params: { userId: id } } as any) },
            { label: "Followers", value: counts.followers, onPress: () => router.push({ pathname: "/followers", params: { userId: id, type: "followers", ownerHandle: profile.handle } } as any) },
            { label: "Following", value: counts.following, locked: profile.is_private,
              onPress: () => !profile.is_private && router.push({ pathname: "/followers", params: { userId: id, type: "following", ownerHandle: profile.handle } } as any) },
          ].map((stat, i) => (
            <React.Fragment key={stat.label}>
              {i > 0 && <View style={[s.statDivider, { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)" }]} />}
              <TouchableOpacity style={s.statCell} onPress={stat.onPress} activeOpacity={stat.locked ? 1 : 0.65}>
                {stat.locked
                  ? <View style={s.lockedStat}>
                      <Ionicons name="lock-closed" size={11} color={colors.textMuted} />
                      <Text style={[s.statNum, { color: colors.textMuted }]}>—</Text>
                    </View>
                  : <Text style={[s.statNum, { color: accent }]}>{fmtCount(stat.value)}</Text>}
                <Text style={[s.statLabel, { color: colors.textMuted }]}>{stat.label}</Text>
              </TouchableOpacity>
            </React.Fragment>
          ))}
        </View>

        {/* ══════════════════════════════════════════════════════════════ */}
        {/* BIO                                                            */}
        {/* ══════════════════════════════════════════════════════════════ */}
        {!!profile.bio && (
          <Text style={[s.bio, { color: colors.text }]} numberOfLines={6}>{profile.bio}</Text>
        )}

        {/* ══════════════════════════════════════════════════════════════ */}
        {/* META CHIPS                                                     */}
        {/* ══════════════════════════════════════════════════════════════ */}
        <View style={s.metaStrip}>
          {profile.created_at && (
            <View style={[s.metaChip, { backgroundColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)" }]}>
              <Ionicons name="calendar-outline" size={11} color={colors.textMuted} />
              <Text style={[s.metaChipText, { color: colors.textMuted }]}>Joined {joinedLabel(profile.created_at)}</Text>
            </View>
          )}
          {profile.country && (
            <View style={[s.metaChip, { backgroundColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)" }]}>
              <Ionicons name="location-outline" size={11} color={colors.textMuted} />
              <Text style={[s.metaChipText, { color: colors.textMuted }]}>{profile.country}</Text>
            </View>
          )}
          {!!profile.website_url && (
            <TouchableOpacity style={[s.metaChip, { backgroundColor: accent + "18" }]}
              onPress={() => Linking.openURL(profile.website_url!).catch(() => {})} activeOpacity={0.75}>
              <Ionicons name="link-outline" size={11} color={accent} />
              <Text style={[s.metaChipText, { color: accent }]} numberOfLines={1}>
                {profile.website_url.replace(/^https?:\/\//, "")}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Also known as */}
        {aliases.length > 0 && (
          <View style={s.metaRow}>
            <Ionicons name="at-circle-outline" size={13} color={colors.textMuted} />
            <Text style={[s.metaBodyText, { color: colors.textMuted }]}>
              {"Also known as  "}
              {aliases.map((a, i) => (
                <Text key={a} style={{ color: accent, fontFamily: "Inter_500Medium" }}>
                  @{a}{i < aliases.length - 1 ? "  " : ""}
                </Text>
              ))}
            </Text>
          </View>
        )}

        {/* ══════════════════════════════════════════════════════════════ */}
        {/* MUTUAL FOLLOWERS — social proof card                          */}
        {/* ══════════════════════════════════════════════════════════════ */}
        {!isSelf && mutuals.length > 0 && (
          <TouchableOpacity
            style={[s.mutualsRow, { backgroundColor: colors.background, borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)" }]}
            onPress={() => router.push({ pathname: "/followers", params: { userId: id, type: "followers", ownerHandle: profile.handle } } as any)}
            activeOpacity={0.8}>
            <View style={s.mutualsAvatars}>
              {mutuals.map((m, i) => (
                <View key={m.id} style={[s.mutualAvatar, { marginLeft: i > 0 ? -8 : 0, zIndex: 10 - i }]}>
                  <Avatar uri={m.avatar_url} name={m.handle} size={24} />
                </View>
              ))}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.mutualsLabel, { color: colors.textMuted }]}>Followed by</Text>
              <Text style={[s.mutualsText, { color: colors.text }]} numberOfLines={1}>
                {mutuals.slice(0, 2).map(m => `@${m.handle}`).join(", ")}
                {mutualTotal > 2 ? ` +${mutualTotal - 2} more` : ""}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
          </TouchableOpacity>
        )}

        {/* ══════════════════════════════════════════════════════════════ */}
        {/* ACTION BUTTONS                                                 */}
        {/* ══════════════════════════════════════════════════════════════ */}
        {!isSelf && user && (
          <View style={s.actionRow}>
            <TouchableOpacity
              style={[s.actionIconBtn, { backgroundColor: accent + "18" }]}
              onPress={handleMessage} activeOpacity={0.8}>
              <Ionicons name="chatbubble-outline" size={18} color={accent} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.actionIconBtn, { backgroundColor: "#FF2D5518" }]}
              onPress={() => router.push({ pathname: "/gifts/index", params: { recipientId: id } } as any)}
              activeOpacity={0.8}>
              <Ionicons name="gift-outline" size={18} color="#FF2D55" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.actionIconBtn, { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)" }]}
              onPress={() => router.push({ pathname: "/shop/[userId]", params: { userId: id } } as any)}
              activeOpacity={0.8}>
              <Ionicons name="storefront-outline" size={18} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.actionIconBtn, { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)" }]}
              onPress={() => showAlert("More", undefined, [
                { text: "Share Profile", onPress: () => showToast("Link copied", { type: "info" }) },
                { text: "Add to Contacts", onPress: () => showToast("Saved", { type: "success" }) },
                { text: "Cancel", style: "cancel" },
              ])} activeOpacity={0.8}>
              <Ionicons name="ellipsis-horizontal" size={18} color={colors.text} />
            </TouchableOpacity>
          </View>
        )}
        {isSelf && (
          <View style={s.actionRow}>
            <TouchableOpacity
              style={[s.selfBtn, { flex: 1, backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)" }]}
              onPress={() => router.push("/profile/edit")} activeOpacity={0.8}>
              <Ionicons name="create-outline" size={16} color={colors.text} />
              <Text style={[s.selfBtnText, { color: colors.text }]}>Edit Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.selfBtn, { flex: 1, backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)" }]}
              onPress={() => showToast("Share link copied", { type: "info" })} activeOpacity={0.8}>
              <Ionicons name="share-outline" size={16} color={colors.text} />
              <Text style={[s.selfBtnText, { color: colors.text }]}>Share</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.actionIconBtn, { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)" }]}
              onPress={() => router.push("/settings")} activeOpacity={0.8}>
              <Ionicons name="settings-outline" size={18} color={colors.text} />
            </TouchableOpacity>
          </View>
        )}

        {/* ══════════════════════════════════════════════════════════════ */}
        {/* XP CARD — tinted glass style                                  */}
        {/* ══════════════════════════════════════════════════════════════ */}
        <View style={[s.xpCard, { backgroundColor: hex2rgba(xpGrade.color, isDark ? 0.12 : 0.07) }]}>
          <View style={s.xpTopRow}>
            <View style={[s.xpIconBox, { backgroundColor: xpGrade.color + "28" }]}>
              <Ionicons name="flash" size={14} color={xpGrade.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.xpGradeName, { color: colors.text }]}>
                {profile.current_grade ?? xpGrade.name}
              </Text>
              <Text style={[s.xpAmount, { color: colors.textMuted }]}>
                {fmtCount(profile.xp ?? 0)} XP total
              </Text>
            </View>
            <Text style={[s.xpPct, { color: xpGrade.color }]}>{xpPct}%</Text>
          </View>
          <View style={[s.xpTrack, { backgroundColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)" }]}>
            <Animated.View style={[s.xpFill, { width: barFill }]}>
              <LinearGradient
                colors={[xpGrade.color, hex2rgba(xpGrade.color, 0.6)] as any}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
            </Animated.View>
          </View>
        </View>

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* TAB BAR                                                          */}
        {/* ════════════════════════════════════════════════════════════════ */}
        <View style={[s.tabBar, { borderTopColor: colors.border, borderBottomColor: colors.border }]}>
          {TABS.map(tab => {
            const active = activeTab === tab.id;
            return (
              <TouchableOpacity key={tab.id} style={s.tabItem} onPress={() => setActiveTab(tab.id)} activeOpacity={0.7}>
                <Ionicons name={tab.icon as any} size={20} color={active ? accent : colors.textMuted} />
                <Text style={[s.tabLabel, { color: active ? accent : colors.textMuted }]}>{tab.label}</Text>
                {active && <View style={[s.tabIndicator, { backgroundColor: accent }]} />}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* PHOTO GRID                                                       */}
        {/* ════════════════════════════════════════════════════════════════ */}
        {gridLoading ? (
          <View style={s.gridCenter}><ActivityIndicator color={accent} size="large" /></View>
        ) : gridPosts.length === 0 ? (
          <View style={s.gridCenter}>
            <View style={[s.emptyIcon, { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)" }]}>
              <Ionicons name={activeTab === "videos" ? "videocam-outline" : activeTab === "articles" ? "document-text-outline" : "images-outline"}
                size={32} color={colors.textMuted} />
            </View>
            <Text style={[s.emptyTitle, { color: colors.text }]}>
              {activeTab === "videos" ? "No videos yet" : activeTab === "articles" ? "No articles yet" : "No posts yet"}
            </Text>
            <Text style={[s.emptyBody, { color: colors.textMuted }]}>
              {isSelf ? "Share something to get started" : "Nothing posted here yet"}
            </Text>
          </View>
        ) : (
          <View style={s.grid}>
            {gridPosts.map(item => {
              const thumb = item.media_urls?.[0];
              const isVid = item.post_type === "video";
              return (
                <TouchableOpacity key={item.id}
                  style={[s.gridCell, { width: CELL, height: CELL }]}
                  activeOpacity={0.88}
                  onPress={() => router.push({ pathname: "/post/[id]", params: { id: item.id } } as any)}>
                  {thumb
                    ? <Image source={{ uri: thumb }} style={{ width: CELL, height: CELL }} contentFit="cover" />
                    : item.content
                      ? <View style={[s.gridTextCard, { backgroundColor: isDark ? "#1c1c1e" : "#f2f2f7" }]}>
                          <Ionicons name="text" size={12} color={colors.textMuted} style={{ marginBottom: 4 }} />
                          <Text style={[s.gridTextPreview, { color: colors.text }]} numberOfLines={4}>
                            {item.content}
                          </Text>
                        </View>
                      : <View style={[s.gridPlaceholder, { backgroundColor: colors.backgroundSecondary }]}>
                          <Ionicons name="image-outline" size={20} color={colors.textMuted} />
                        </View>}
                  {isVid && (
                    <View style={s.videoTag}>
                      <Ionicons name="play-circle" size={20} color="#fff" />
                    </View>
                  )}
                  {(item.media_urls?.length ?? 0) > 1 && (
                    <View style={s.multiTag}>
                      <Ionicons name="copy-outline" size={12} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const cardShadow = Platform.select({
  web:     { boxShadow: "0 2px 16px rgba(0,0,0,0.10)" } as any,
  ios:     { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.10, shadowRadius: 12 },
  android: { elevation: 3 },
  default: {},
});
const cardShadowDark = Platform.select({
  web:     { boxShadow: "0 2px 16px rgba(0,0,0,0.40)" } as any,
  ios:     { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.40, shadowRadius: 12 },
  android: { elevation: 4 },
  default: {},
});

const s = StyleSheet.create({
  root: { flex: 1 },

  // Cover photo (short + rectangular)
  coverWrap: { width: "100%", overflow: "hidden" },

  // Floating back button inside cover
  navRow: {
    position: "absolute", left: 12, right: 12,
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between",
  },
  navBtn: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.35)",
  },

  // Identity band — left avatar col + right action col
  // NOTE: no marginTop here — only the avatarShell gets the negative margin
  identityBand: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 14,
    paddingBottom: 12,
    gap: 10,
  },
  identityLeft: {
    flex: 1,
    gap: 4,
  },
  identityRight: {
    alignItems: "flex-end",
    justifyContent: "flex-end",
    // push buttons down so they sit below the cover boundary
    paddingTop: (AVATAR_SIZE / 2 + 4) + 6,
    gap: 8,
  },
  avatarShell: {
    width: AVATAR_SIZE + 6,
    height: AVATAR_SIZE + 6,
    borderRadius: AVATAR_SIZE / 2 + 3,
    borderWidth: 3,
    overflow: "hidden",
  },
  onlineDot: {
    position: "absolute", bottom: 5, right: 5,
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: "#34C759", borderWidth: 2,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 2,
  },
  quickIconRow: {
    flexDirection: "row",
    gap: 8,
  },
  quickIconBtn: {
    width: 34, height: 34, borderRadius: 17,
    alignItems: "center", justifyContent: "center",
  },

  displayName: { fontSize: 17, fontFamily: "Inter_700Bold", letterSpacing: -0.2, flexShrink: 1 },
  prestigePill: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 20, borderWidth: 1,
  },
  prestigeEmoji: { fontSize: 11 },
  prestigeText: { fontSize: 10.5, fontFamily: "Inter_600SemiBold" },

  primaryBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1.5,
  },
  primaryBtnText: { fontSize: 12.5, fontFamily: "Inter_600SemiBold" },

  handleRow: {
    flexDirection: "row", alignItems: "center", gap: 5, flexWrap: "wrap",
  },
  handle: { fontSize: 12.5, fontFamily: "Inter_400Regular" },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11.5, fontFamily: "Inter_400Regular" },

  // Avatar fullscreen modal
  avatarModalBg: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.92)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarModalImg: {
    width: SW - 32,
    height: SW - 32,
    borderRadius: 16,
  },
  avatarModalPlaceholder: {
    width: SW - 32, height: SW - 32,
    borderRadius: 16,
    alignItems: "center", justifyContent: "center",
  },
  avatarModalClose: {
    position: "absolute", top: 56, right: 16,
    width: 36, height: 36, borderRadius: 18,
    alignItems: "center", justifyContent: "center",
  },

  // Stats — flat with hairline borders
  statsCard: {
    flexDirection: "row",
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: 10,
  },
  statCell: { flex: 1, alignItems: "center", gap: 2 },
  statNum: { fontSize: 22, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  statLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  statDivider: { width: 0.5, marginVertical: 8 },
  lockedStat: { flexDirection: "row", alignItems: "center", gap: 3 },

  // Bio + meta
  bio: {
    fontSize: 14, fontFamily: "Inter_400Regular",
    lineHeight: 21, marginHorizontal: 16, marginBottom: 8,
  },
  metaStrip: {
    flexDirection: "row", flexWrap: "wrap", gap: 6,
    marginHorizontal: 16, marginBottom: 6,
  },
  metaChip: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 9, paddingVertical: 5, borderRadius: 20,
  },
  metaChipText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  metaRow: {
    flexDirection: "row", alignItems: "center",
    gap: 5, marginHorizontal: 16, marginBottom: 6, flexWrap: "wrap",
  },
  metaBodyText: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1 },

  // Mutual followers card — elevated
  mutualsRow: {
    flexDirection: "row", alignItems: "center",
    gap: 10, marginHorizontal: 16, marginBottom: 8,
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 11,
  },
  mutualsAvatars: { flexDirection: "row", alignItems: "center" },
  mutualAvatar: { borderRadius: 12, overflow: "hidden" },
  mutualsLabel: { fontSize: 10.5, fontFamily: "Inter_400Regular", marginBottom: 1 },
  mutualsText: { fontSize: 12.5, fontFamily: "Inter_500Medium" },

  // Action buttons — no border, tinted backgrounds
  actionRow: {
    flexDirection: "row", gap: 8,
    marginHorizontal: 16, marginBottom: 8,
  },
  actionIconBtn: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: "center", justifyContent: "center",
  },
  selfBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, height: 40, borderRadius: 20,
  },
  selfBtnText: { fontSize: 13.5, fontFamily: "Inter_600SemiBold" },

  // XP card — glassy tinted
  xpCard: {
    marginHorizontal: 16, marginBottom: 0,
    borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12,
    gap: 8,
  },
  xpTopRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  xpIconBox: {
    width: 32, height: 32, borderRadius: 10,
    alignItems: "center", justifyContent: "center",
  },
  xpGradeName: { fontSize: 13.5, fontFamily: "Inter_700Bold" },
  xpAmount: { fontSize: 11.5, fontFamily: "Inter_400Regular", marginTop: 1 },
  xpPct: { fontSize: 13, fontFamily: "Inter_700Bold", minWidth: 36, textAlign: "right" },
  xpTrack: { height: 7, borderRadius: 4, overflow: "hidden" },
  xpFill: { height: 7, borderRadius: 4, overflow: "hidden" },

  // Tab bar
  tabBar: {
    flexDirection: "row",
    borderTopWidth: 0.5, borderBottomWidth: 0.5,
    marginTop: 8,
  },
  tabItem: {
    flex: 1, alignItems: "center", justifyContent: "center",
    paddingVertical: 9, gap: 2, position: "relative",
  },
  tabLabel: { fontSize: 10, fontFamily: "Inter_500Medium" },
  tabIndicator: {
    position: "absolute", bottom: 0,
    left: "15%", right: "15%", height: 2, borderRadius: 2,
  },

  // Grid
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 1, marginTop: 1 },
  gridCell: { overflow: "hidden", backgroundColor: "#111" },
  gridPlaceholder: { flex: 1, alignItems: "center", justifyContent: "center" },
  gridTextCard: {
    flex: 1, padding: 8, justifyContent: "center", alignItems: "flex-start",
  },
  gridTextPreview: { fontSize: 11, fontFamily: "Inter_400Regular", lineHeight: 15 },
  videoTag: {
    position: "absolute", inset: 0, alignItems: "center", justifyContent: "center",
  } as any,
  multiTag: {
    position: "absolute", top: 6, right: 6,
    backgroundColor: "rgba(0,0,0,0.55)", borderRadius: 4,
    padding: 3,
  },

  // Empty state
  gridCenter: {
    alignItems: "center", paddingTop: 48, paddingBottom: 32, gap: 10,
  },
  emptyIcon: {
    width: 64, height: 64, borderRadius: 20,
    alignItems: "center", justifyContent: "center", marginBottom: 4,
  },
  emptyTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  emptyBody: { fontSize: 13, fontFamily: "Inter_400Regular" },
});
