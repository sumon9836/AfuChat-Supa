import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Linking,
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
import { T } from "@/constants/theme";
import { ProfileSkeleton } from "@/components/ui/Skeleton";
import { getProfileCache, setProfileCache } from "@/lib/profileCache";
import { showAlert } from "@/lib/alert";
import { showToast } from "@/lib/toast";
import * as Haptics from "@/lib/haptics";
import { getPrestigeTier } from "@/lib/prestige";

// ─── Types ────────────────────────────────────────────────────────────────────

type FullProfile = {
  id: string;
  display_name: string;
  handle: string;
  avatar_url: string | null;
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
type GridPost = { id: string; media_urls: string[] | null; post_type: string | null };
type MutualUser = { id: string; handle: string; avatar_url: string | null };
type TabId = "posts" | "articles" | "videos";

// ─── Constants ────────────────────────────────────────────────────────────────

const SCREEN_W = Dimensions.get("window").width;
const GRID_GAP = 2;
const CELL_SIZE = Math.floor((SCREEN_W - GRID_GAP * 2) / 3);

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

// XP grade thresholds — used for progress bar only
const XP_GRADES: { name: string; min: number; max: number; color: string }[] = [
  { name: "Rookie",     min: 0,          max: 500,       color: "#8E8E93" },
  { name: "Starter",    min: 500,        max: 2_000,     color: "#34C759" },
  { name: "Active",     min: 2_000,      max: 8_000,     color: "#007AFF" },
  { name: "Achiever",   min: 8_000,      max: 25_000,    color: "#5856D6" },
  { name: "Rising",     min: 25_000,     max: 75_000,    color: "#FF9500" },
  { name: "Elite",      min: 75_000,     max: 200_000,   color: "#FF3B30" },
  { name: "Expert",     min: 200_000,    max: 500_000,   color: "#AF52DE" },
  { name: "Master",     min: 500_000,    max: 1_000_000, color: "#D4A853" },
  { name: "Legend",     min: 1_000_000,  max: 2_500_000, color: "#FF9500" },
  { name: "Mythic",     min: 2_500_000,  max: Infinity,  color: "#FF2D55" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function joinedLabel(createdAt: string | null): string {
  if (!createdAt) return "";
  const d = new Date(createdAt);
  return `Joined ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function xpGradeInfo(xp: number, gradeName: string | null) {
  const grade = XP_GRADES.find(g => g.name === gradeName) ?? XP_GRADES[0];
  const progress = grade.max === Infinity
    ? 1
    : Math.min(1, Math.max(0, (xp - grade.min) / (grade.max - grade.min)));
  const pct = Math.round(progress * 100);
  return { grade, progress, pct };
}

function formatLastSeen(ts: string | null, showOnline: boolean): { text: string; online: boolean } {
  if (!showOnline || !ts) return { text: "", online: false };
  const diff = Date.now() - new Date(ts).getTime();
  if (diff < 2 * 60 * 1000) return { text: "Online now", online: true };
  if (diff < 60 * 60 * 1000) return { text: "last seen recently", online: false };
  if (diff < 24 * 60 * 60 * 1000) return { text: `last seen ${Math.floor(diff / 3600000)}h ago`, online: false };
  return { text: `last seen ${Math.floor(diff / 86400000)}d ago`, online: false };
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

  // ── Profile state ──────────────────────────────────────────────────────────
  const cached = id ? getProfileCache(id) : null;
  const [profile,      setProfile]      = useState<FullProfile | null>(cached as FullProfile | null);
  const [counts,       setCounts]       = useState<Counts>({ followers: 0, following: 0, posts: 0 });
  const [loading,      setLoading]      = useState(!cached);
  const [notFound,     setNotFound]     = useState(false);
  const [isFollowing,  setIsFollowing]  = useState(false);
  const [theyFollowMe, setTheyFollowMe] = useState(false);
  const [followLoading,setFollowLoading]= useState(false);

  // ── Extra profile data ─────────────────────────────────────────────────────
  const [aliases,  setAliases]  = useState<string[]>([]);
  const [mutuals,  setMutuals]  = useState<MutualUser[]>([]);
  const [mutualTotal, setMutualTotal] = useState(0);

  // ── Grid ──────────────────────────────────────────────────────────────────
  const [gridPosts,   setGridPosts]   = useState<GridPost[]>([]);
  const [gridLoading, setGridLoading] = useState(false);
  const [activeTab,   setActiveTab]   = useState<TabId>("posts");

  // ── XP bar animation ──────────────────────────────────────────────────────
  const barAnim = useRef(new Animated.Value(0)).current;

  // ── Load profile ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!id) { setNotFound(true); setLoading(false); return; }
    async function load() {
      const [profileRes, followersRes, followingRes, postsRes, iFollowRes, theyFollowRes] =
        await Promise.all([
          supabase.from("profiles")
            .select("id,display_name,handle,avatar_url,bio,is_verified,is_organization_verified,is_business_mode,is_private,country,website_url,xp,current_grade,acoin,last_seen,show_online_status,created_at")
            .eq("id", id).maybeSingle(),
          supabase.from("follows").select("id",{count:"exact",head:true}).eq("following_id",id),
          supabase.from("follows").select("id",{count:"exact",head:true}).eq("follower_id",id),
          supabase.from("posts").select("id",{count:"exact",head:true}).eq("author_id",id).in("visibility",["public","followers"]),
          user ? supabase.from("follows").select("id").eq("follower_id",user.id).eq("following_id",id).maybeSingle() : Promise.resolve({data:null}),
          user ? supabase.from("follows").select("id").eq("follower_id",id).eq("following_id",user.id).maybeSingle() : Promise.resolve({data:null}),
        ]);

      if (!profileRes.data) { setNotFound(true); setLoading(false); return; }

      const p = profileRes.data as FullProfile;
      setProfile(p);
      setProfileCache(p.id, p as any);
      setCounts({ followers: followersRes.count ?? 0, following: followingRes.count ?? 0, posts: postsRes.count ?? 0 });
      setIsFollowing(!!(iFollowRes as any)?.data);
      setTheyFollowMe(!!(theyFollowRes as any)?.data);
      setLoading(false);
    }
    load().catch(() => setLoading(false));
  }, [id, user?.id]);

  // ── Load aliases + mutuals once profile is ready ───────────────────────────
  useEffect(() => {
    if (!id || loading) return;
    async function loadExtras() {
      // Owned usernames (aliases)
      const { data: aliasData } = await supabase
        .from("owned_usernames").select("handle").eq("owner_id", id).limit(8);
      const primaryHandle = profile?.handle ?? "";
      setAliases((aliasData ?? []).map((a: any) => a.handle).filter((h: string) => h !== primaryHandle));

      // Mutual followers (only if logged in and not self)
      if (user && !isSelf) {
        const { data: myFollowingData } = await supabase
          .from("follows").select("following_id").eq("follower_id", user.id);
        const myFollowingIds = (myFollowingData ?? []).map((f: any) => f.following_id);
        if (myFollowingIds.length > 0) {
          const { data: mutualData } = await supabase
            .from("follows")
            .select("follower_id, profiles!follows_follower_id_fkey(id, handle, avatar_url)")
            .eq("following_id", id)
            .in("follower_id", myFollowingIds)
            .limit(4);
          const list: MutualUser[] = (mutualData ?? []).map((m: any) => {
            const p = m.profiles;
            return { id: m.follower_id, handle: p?.handle ?? "", avatar_url: p?.avatar_url ?? null };
          }).filter((m: MutualUser) => m.handle);
          setMutuals(list.slice(0, 3));
          setMutualTotal(list.length);
        }
      }
    }
    loadExtras().catch(() => {});
  }, [id, loading, user?.id, isSelf, profile?.handle]);

  // ── Load grid posts ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!id || loading) return;
    setGridLoading(true);
    let query = supabase.from("posts")
      .select("id, media_urls, post_type")
      .eq("author_id", id)
      .in("visibility", ["public", "followers"])
      .order("created_at", { ascending: false })
      .limit(30);
    if (activeTab === "videos")   query = (query as any).eq("post_type", "video");
    else if (activeTab === "articles") query = (query as any).eq("post_type", "article");
    else query = (query as any).neq("post_type", "text");
    query.then(({ data }) => { setGridPosts((data as GridPost[]) ?? []); setGridLoading(false); })
         .catch(() => { setGridPosts([]); setGridLoading(false); });
  }, [id, loading, activeTab]);

  // ── Animate XP bar ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!profile) return;
    const { progress } = xpGradeInfo(profile.xp ?? 0, profile.current_grade);
    Animated.timing(barAnim, { toValue: progress, duration: 900, delay: 300, useNativeDriver: false })
      .start();
  }, [profile?.xp, profile?.current_grade]);

  // ── Follow / Unfollow ──────────────────────────────────────────────────────
  const handleFollow = useCallback(async () => {
    if (!user || !id || followLoading || isSelf) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFollowLoading(true);
    try {
      if (isFollowing) {
        const { error } = await supabase.from("follows").delete().eq("follower_id", user.id).eq("following_id", id);
        if (error) throw error;
        setIsFollowing(false);
        setCounts(c => ({ ...c, followers: Math.max(0, c.followers - 1) }));
      } else {
        const { error } = await supabase.from("follows").insert({ follower_id: user.id, following_id: id });
        if (error) throw error;
        setIsFollowing(true);
        setCounts(c => ({ ...c, followers: c.followers + 1 }));
      }
    } catch { showToast("Could not update follow status", { type: "error" }); }
    finally { setFollowLoading(false); }
  }, [user, id, isFollowing, followLoading, isSelf]);

  // ── Message ────────────────────────────────────────────────────────────────
  const handleMessage = useCallback(async () => {
    if (!user || !id) return;
    Haptics.selectionAsync();
    try {
      const { data: chatId, error } = await supabase.rpc("get_or_create_direct_chat", { other_user_id: id });
      if (error || !chatId) throw new Error(error?.message || "Failed");
      router.push({ pathname: "/chat/[id]", params: { id: chatId } });
    } catch { showAlert("Error", "Could not start conversation. Please try again."); }
  }, [user, id]);

  // ── Render states ──────────────────────────────────────────────────────────
  if (loading && !profile) return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ProfileSkeleton />
    </View>
  );
  if (notFound || !profile) return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      <ProfileNotFoundView handle={init_handle ?? id ?? "unknown"} />
    </View>
  );
  if (profile.is_private && !isSelf && !isFollowing) return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      <ProfilePrivateView
        handle={profile.handle} displayName={profile.display_name}
        avatarUrl={profile.avatar_url ?? undefined} profileId={profile.id}
      />
    </View>
  );

  const ls = formatLastSeen(profile.last_seen, profile.show_online_status);
  const prestige = getPrestigeTier(profile.acoin ?? 0);
  const { grade: xpGrade, pct: xpPct } = xpGradeInfo(profile.xp ?? 0, profile.current_grade);

  // Follow button state
  const followState = isFollowing && theyFollowMe ? "friends"
    : !isFollowing && theyFollowMe ? "follow_back"
    : isFollowing ? "following" : "follow";
  const followBtnBg =
    followState === "follow" ? accent
    : followState === "follow_back" ? "#FF9500"
    : "transparent";
  const followBtnBorder =
    followState === "friends" ? "#34C759"
    : followState === "following" ? colors.border
    : followState === "follow_back" ? "#FF9500"
    : accent;
  const followBtnText =
    followState === "follow" || followState === "follow_back" ? "#fff"
    : followState === "friends" ? "#34C759" : colors.text;
  const followLabel =
    followState === "friends" ? "Friends"
    : followState === "follow_back" ? "Follow Back"
    : followState === "following" ? "Following" : "Follow";
  const followIcon: any =
    followState === "friends" ? "heart" : followState === "follow_back" ? "person-add"
    : followState === "following" ? "checkmark" : "person-add-outline";

  const TABS: { id: TabId; icon: string }[] = [
    { id: "posts",    icon: "grid-outline" },
    { id: "articles", icon: "document-text-outline" },
    { id: "videos",   icon: "videocam-outline" },
  ];

  const barWidth = barAnim.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] });

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <View style={[s.header, { paddingTop: insets.top + 6, backgroundColor: colors.background }]}>
        <TouchableOpacity style={s.headerBtn}
          onPress={() => router.canGoBack() ? router.back() : router.replace("/(tabs)/discover" as any)}
          hitSlop={{ top: 8, left: 8, right: 12, bottom: 8 }}>
          <Ionicons name="arrow-back" size={24} color={accent} />
        </TouchableOpacity>
        <Text style={[s.headerHandle, { color: colors.text }]} numberOfLines={1}>
          @{profile.handle}
        </Text>
        <TouchableOpacity style={s.headerBtn}
          onPress={() => !isSelf && showAlert("Options", undefined, [
            { text: "Report", style: "destructive", onPress: () => {} },
            { text: "Block",  style: "destructive", onPress: () => {} },
            { text: "Cancel", style: "cancel" },
          ])}>
          <Ionicons name="ellipsis-horizontal" size={22} color={isSelf ? "transparent" : colors.textMuted} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>

        {/* ── Avatar + Stats ────────────────────────────────────────────── */}
        <View style={s.topRow}>
          <View style={s.avatarWrap}>
            <Avatar
              uri={profile.avatar_url}
              name={profile.display_name}
              size={80}
              square={profile.is_organization_verified || profile.is_business_mode}
              premium={false}
            />
            {ls.online && (
              <View style={[s.onlineDot, { borderColor: colors.background }]} />
            )}
          </View>

          <View style={s.statsBlock}>
            <TouchableOpacity style={s.statCell}
              onPress={() => router.push({ pathname: "/my-posts", params: { userId: id } } as any)}
              activeOpacity={0.7}>
              <Text style={[s.statNum, { color: colors.text }]}>{fmtCount(counts.posts)}</Text>
              <Text style={[s.statLabel, { color: colors.textMuted }]}>Posts</Text>
            </TouchableOpacity>

            <TouchableOpacity style={s.statCell}
              onPress={() => router.push({ pathname: "/followers", params: { userId: id, type: "followers", ownerHandle: profile.handle } } as any)}
              activeOpacity={0.7}>
              <Text style={[s.statNum, { color: colors.text }]}>{fmtCount(counts.followers)}</Text>
              <Text style={[s.statLabel, { color: colors.textMuted }]}>Followers</Text>
            </TouchableOpacity>

            <TouchableOpacity style={s.statCell}
              onPress={() => !profile.is_private && router.push({ pathname: "/followers", params: { userId: id, type: "following", ownerHandle: profile.handle } } as any)}
              activeOpacity={profile.is_private ? 1 : 0.7}>
              {profile.is_private ? (
                <>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                    <Ionicons name="lock-closed" size={12} color={colors.textMuted} />
                    <Text style={[s.statNum, { color: colors.textMuted }]}>—</Text>
                  </View>
                  <Text style={[s.statLabel, { color: colors.textMuted }]}>Following</Text>
                </>
              ) : (
                <>
                  <Text style={[s.statNum, { color: colors.text }]}>{fmtCount(counts.following)}</Text>
                  <Text style={[s.statLabel, { color: colors.textMuted }]}>Following</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Name + verified + prestige badge ──────────────────────────── */}
        <View style={s.nameRow}>
          <Text style={[s.displayName, { color: colors.text }]} numberOfLines={1}>
            {profile.display_name}
          </Text>
          <VerifiedBadge
            isVerified={profile.is_verified}
            isOrganizationVerified={profile.is_organization_verified}
            size={17}
          />
          <View style={[s.prestigeBadge, { backgroundColor: prestige.color + "22", borderColor: prestige.color + "55", borderWidth: 1 }]}>
            <Text style={s.prestigeEmoji}>{prestige.emoji}</Text>
            <Text style={[s.prestigeLabel, { color: prestige.color }]}>{prestige.label}</Text>
          </View>
        </View>

        {/* Online status */}
        {ls.text !== "" && (
          <View style={s.statusRow}>
            <View style={[s.statusDot, { backgroundColor: ls.online ? "#34C759" : colors.textMuted }]} />
            <Text style={[s.statusText, { color: ls.online ? "#34C759" : colors.textMuted }]}>{ls.text}</Text>
          </View>
        )}

        {/* ── Bio ──────────────────────────────────────────────────────── */}
        {!!profile.bio && (
          <Text style={[s.bio, { color: colors.text }]} numberOfLines={5}>
            {profile.bio}
          </Text>
        )}

        {/* ── Meta: joined + country ────────────────────────────────────── */}
        {(profile.created_at || profile.country) && (
          <View style={s.metaRow}>
            {profile.created_at && (
              <View style={s.metaItem}>
                <Ionicons name="calendar-outline" size={13} color={colors.textMuted} />
                <Text style={[s.metaText, { color: colors.textMuted }]}>{joinedLabel(profile.created_at)}</Text>
              </View>
            )}
            {profile.country && (
              <View style={s.metaItem}>
                <Ionicons name="location-outline" size={13} color={colors.textMuted} />
                <Text style={[s.metaText, { color: colors.textMuted }]}>{profile.country}</Text>
              </View>
            )}
          </View>
        )}

        {/* ── Website ──────────────────────────────────────────────────── */}
        {!!profile.website_url && (
          <TouchableOpacity style={s.metaRow}
            onPress={() => Linking.openURL(profile.website_url!).catch(() => {})}
            activeOpacity={0.7}>
            <Ionicons name="link-outline" size={13} color={accent} />
            <Text style={[s.metaText, s.link, { color: accent }]} numberOfLines={1}>
              {profile.website_url.replace(/^https?:\/\//, "")}
            </Text>
          </TouchableOpacity>
        )}

        {/* ── Also known as ─────────────────────────────────────────────── */}
        {aliases.length > 0 && (
          <View style={s.metaRow}>
            <Ionicons name="at-circle-outline" size={13} color={colors.textMuted} />
            <Text style={[s.metaText, { color: colors.textMuted }]}>
              {"Also known as: "}
              {aliases.map((a, i) => (
                <Text key={a} style={{ color: accent }}>@{a}{i < aliases.length - 1 ? "  " : ""}</Text>
              ))}
            </Text>
          </View>
        )}

        {/* ── Mutual followers ──────────────────────────────────────────── */}
        {!isSelf && mutuals.length > 0 && (
          <TouchableOpacity style={[s.mutualsRow, { backgroundColor: colors.backgroundSecondary }]}
            onPress={() => router.push({ pathname: "/followers", params: { userId: id, type: "followers", ownerHandle: profile.handle } } as any)}
            activeOpacity={0.8}>
            <View style={s.mutualsAvatars}>
              {mutuals.map((m, i) => (
                <View key={m.id} style={[s.mutualAvatar, { marginLeft: i > 0 ? -10 : 0, zIndex: 10 - i }]}>
                  <Avatar uri={m.avatar_url} name={m.handle} size={24} />
                </View>
              ))}
            </View>
            <Text style={[s.mutualsText, { color: colors.textMuted }]} numberOfLines={2}>
              {mutuals.slice(0, 2).map(m => `@${m.handle}`).join(", ")}
              {mutualTotal > 2 ? ` and ${mutualTotal - 2} other${mutualTotal > 3 ? "s" : ""} you follow...` : " follow them..."}
            </Text>
            <Ionicons name="chevron-forward" size={14} color={colors.textMuted} style={{ marginLeft: "auto" }} />
          </TouchableOpacity>
        )}

        {/* ── Action buttons ────────────────────────────────────────────── */}
        {!isSelf && user ? (
          <View style={s.actionsRow}>
            <TouchableOpacity
              style={[s.pill, { flex: 1, backgroundColor: followBtnBg, borderColor: followBtnBorder }]}
              onPress={handleFollow} activeOpacity={0.85} disabled={followLoading}>
              {followLoading
                ? <ActivityIndicator size="small" color={followBtnText} />
                : <><Ionicons name={followIcon} size={14} color={followBtnText} /><Text style={[s.pillText, { color: followBtnText }]}>{followLabel}</Text></>}
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.pill, { flex: 1, backgroundColor: "transparent", borderColor: accent }]}
              onPress={handleMessage} activeOpacity={0.85}>
              <Ionicons name="chatbubble-outline" size={14} color={accent} />
              <Text style={[s.pillText, { color: accent }]}>Message</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.pill, { flex: 0.7, backgroundColor: "transparent", borderColor: colors.border }]}
              onPress={() => showToast("Profile saved", { type: "success" })} activeOpacity={0.85}>
              <Ionicons name="person-add-outline" size={14} color={colors.text} />
              <Text style={[s.pillText, { color: colors.text }]}>Save</Text>
            </TouchableOpacity>
          </View>
        ) : isSelf ? (
          <View style={s.actionsRow}>
            <TouchableOpacity
              style={[s.pill, { flex: 1, backgroundColor: "transparent", borderColor: colors.border }]}
              onPress={() => router.push("/profile/edit")} activeOpacity={0.85}>
              <Ionicons name="create-outline" size={14} color={colors.text} />
              <Text style={[s.pillText, { color: colors.text }]}>Edit Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.pill, { flex: 1, backgroundColor: "transparent", borderColor: colors.border }]}
              onPress={() => showToast("Share link copied", { type: "info" })} activeOpacity={0.85}>
              <Ionicons name="share-outline" size={14} color={colors.text} />
              <Text style={[s.pillText, { color: colors.text }]}>Share Profile</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* ── XP Progress bar ───────────────────────────────────────────── */}
        <View style={[s.xpBar, { backgroundColor: colors.backgroundSecondary }]}>
          <Ionicons name="flash" size={14} color="#FFB800" />
          <Text style={[s.xpLabel, { color: colors.text }]}>
            {profile.current_grade ?? xpGrade.name}
            {"  ·  "}
            <Text style={{ color: colors.textMuted }}>{fmtCount(profile.xp ?? 0)} XP</Text>
          </Text>
          <View style={[s.xpTrack, { backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)" }]}>
            <Animated.View style={[s.xpFill, { width: barWidth, backgroundColor: xpGrade.color }]} />
          </View>
          <Text style={[s.xpPct, { color: colors.textMuted }]}>{xpPct}%</Text>
        </View>

        {/* ── Tab bar ───────────────────────────────────────────────────── */}
        <View style={[s.tabBar, { borderTopColor: colors.border, borderBottomColor: colors.border }]}>
          {TABS.map(tab => {
            const active = activeTab === tab.id;
            return (
              <TouchableOpacity key={tab.id}
                style={[s.tabItem, active && { borderTopColor: accent, borderTopWidth: 1.5 }]}
                onPress={() => setActiveTab(tab.id)} activeOpacity={0.7}>
                <Ionicons name={tab.icon as any} size={22} color={active ? accent : colors.textMuted} />
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Photo grid ────────────────────────────────────────────────── */}
        {gridLoading ? (
          <View style={s.gridCenter}><ActivityIndicator color={accent} /></View>
        ) : gridPosts.length === 0 ? (
          <View style={s.gridCenter}>
            <Ionicons name="images-outline" size={38} color={colors.textMuted} style={{ marginBottom: 8 }} />
            <Text style={[s.emptyText, { color: colors.textMuted }]}>
              {activeTab === "videos" ? "No videos yet" : activeTab === "articles" ? "No articles yet" : "No posts yet"}
            </Text>
          </View>
        ) : (
          <View style={s.grid}>
            {gridPosts.map(item => {
              const thumb = item.media_urls?.[0];
              const isVid = item.post_type === "video";
              return (
                <TouchableOpacity key={item.id}
                  style={[s.gridCell, { width: CELL_SIZE, height: CELL_SIZE }]}
                  activeOpacity={0.85}
                  onPress={() => router.push({ pathname: "/post/[id]", params: { id: item.id } } as any)}>
                  {thumb
                    ? <Image source={{ uri: thumb }} style={{ width: CELL_SIZE, height: CELL_SIZE }} contentFit="cover" />
                    : <View style={[s.gridPlaceholder, { backgroundColor: colors.backgroundSecondary }]}>
                        <Ionicons name="image-outline" size={22} color={colors.textMuted} />
                      </View>}
                  {isVid && (
                    <View style={s.videoTag}>
                      <Ionicons name="play" size={11} color="#fff" />
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

const s = StyleSheet.create({
  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 4,
    paddingBottom: 8,
  },
  headerBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  headerHandle: { flex: 1, fontSize: 16, fontFamily: "Inter_600SemiBold", textAlign: "center" },

  // Top row
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 16,
  },
  avatarWrap: { position: "relative" },
  onlineDot: {
    position: "absolute", bottom: 2, right: 2,
    width: 13, height: 13, borderRadius: 7,
    backgroundColor: "#34C759", borderWidth: 2,
  },
  statsBlock: { flex: 1, flexDirection: "row", justifyContent: "space-around", marginLeft: 20 },
  statCell: { alignItems: "center", gap: 3, paddingHorizontal: 4 },
  statNum: { fontSize: 20, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  statLabel: { fontSize: 12, fontFamily: "Inter_400Regular" },

  // Name row
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
    marginHorizontal: 16,
    marginBottom: 5,
  },
  displayName: { fontSize: 17, fontFamily: "Inter_700Bold" },
  prestigeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 20,
  },
  prestigeEmoji: { fontSize: 11 },
  prestigeLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold" },

  // Status
  statusRow: { flexDirection: "row", alignItems: "center", gap: 4, marginHorizontal: 16, marginBottom: 4 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 12, fontFamily: "Inter_400Regular" },

  // Bio + meta
  bio: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20, marginHorizontal: 16, marginBottom: 7 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 5, marginHorizontal: 16, marginBottom: 5, flexWrap: "wrap" },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4, marginRight: 12 },
  metaText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  link: { textDecorationLine: "underline" },

  // Mutuals
  mutualsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 12,
    marginTop: 4,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  mutualsAvatars: { flexDirection: "row", alignItems: "center" },
  mutualAvatar: { borderRadius: 12, overflow: "hidden" },
  mutualsText: { flex: 1, fontSize: 12.5, fontFamily: "Inter_400Regular", lineHeight: 17 },

  // Action buttons
  actionsRow: { flexDirection: "row", gap: 8, marginHorizontal: 16, marginBottom: 12 },
  pill: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 5, height: 36, borderRadius: 20, borderWidth: 1,
  },
  pillText: { fontSize: 13.5, fontFamily: "Inter_600SemiBold" },

  // XP bar
  xpBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginHorizontal: 16,
    marginBottom: 4,
    marginTop: 2,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  xpLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold", flexShrink: 1 },
  xpTrack: { flex: 1, height: 6, borderRadius: 3, overflow: "hidden" },
  xpFill: { height: 6, borderRadius: 3 },
  xpPct: { fontSize: 12, fontFamily: "Inter_500Medium", minWidth: 34, textAlign: "right" },

  // Tab bar
  tabBar: {
    flexDirection: "row",
    height: 46,
    borderTopWidth: 0.5,
    borderBottomWidth: 0.5,
    marginTop: 8,
  },
  tabItem: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    borderTopWidth: 0,
    borderTopColor: "transparent",
  },

  // Grid
  grid: { flexDirection: "row", flexWrap: "wrap", gap: GRID_GAP, marginTop: GRID_GAP },
  gridCell: { overflow: "hidden", backgroundColor: "#1c1c1e" },
  gridPlaceholder: { flex: 1, alignItems: "center", justifyContent: "center" },
  videoTag: {
    position: "absolute", top: 5, right: 5,
    backgroundColor: "rgba(0,0,0,0.6)", borderRadius: 10,
    paddingHorizontal: 5, paddingVertical: 2,
  },
  gridCenter: { paddingVertical: 50, alignItems: "center" },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
});
