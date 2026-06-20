import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
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
import Colors from "@/constants/colors";
import { T } from "@/constants/theme";
import { ProfileSkeleton } from "@/components/ui/Skeleton";
import { getProfileCache, setProfileCache } from "@/lib/profileCache";
import { showAlert } from "@/lib/alert";
import { showToast } from "@/lib/toast";
import * as Haptics from "@/lib/haptics";

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

type GridPost = {
  id: string;
  media_urls: string[] | null;
  post_type: string | null;
};

type TabId = "posts" | "videos" | "saved";

// ─── Constants ────────────────────────────────────────────────────────────────

const SCREEN_W = Dimensions.get("window").width;
const GRID_GAP = 2;
const GRID_COLS = 3;
const CELL_W = (SCREEN_W - GRID_GAP * (GRID_COLS - 1)) / GRID_COLS;
const CELL_H = CELL_W; // square cells

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function formatLastSeen(ts: string | null, showOnline: boolean): { text: string; online: boolean } {
  if (!showOnline || !ts) return { text: "last seen recently", online: false };
  const diff = Date.now() - new Date(ts).getTime();
  if (diff < 2 * 60 * 1000) return { text: "Online now", online: true };
  if (diff < 60 * 60 * 1000) return { text: "last seen recently", online: false };
  if (diff < 24 * 60 * 60 * 1000) {
    const h = Math.floor(diff / 3600000);
    return { text: `last seen ${h}h ago`, online: false };
  }
  const d = Math.floor(diff / 86400000);
  return { text: `last seen ${d}d ago`, online: false };
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ContactScreen() {
  const { id, init_name, init_handle, init_avatar, init_verified, init_org_verified } =
    useLocalSearchParams<{
      id: string;
      init_name?: string;
      init_handle?: string;
      init_avatar?: string;
      init_verified?: string;
      init_org_verified?: string;
    }>();

  const { colors, accent, isDark } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const isSelf = user?.id === id;

  const cached = id ? getProfileCache(id) : null;
  const [profile, setProfile] = useState<FullProfile | null>(cached as FullProfile | null);
  const [counts, setCounts] = useState<Counts>({ followers: 0, following: 0, posts: 0 });
  const [loading, setLoading] = useState(!cached);
  const [notFound, setNotFound] = useState(false);

  const [isFollowing, setIsFollowing] = useState(false);
  const [theyFollowMe, setTheyFollowMe] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  const [gridPosts, setGridPosts] = useState<GridPost[]>([]);
  const [gridLoading, setGridLoading] = useState(false);

  const [activeTab, setActiveTab] = useState<TabId>("posts");

  // ── Load full profile ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!id) { setNotFound(true); setLoading(false); return; }

    async function load() {
      const [profileRes, followersRes, followingRes, postsRes, iFollowRes, theyFollowRes] =
        await Promise.all([
          supabase
            .from("profiles")
            .select(
              "id, display_name, handle, avatar_url, bio, is_verified, is_organization_verified, is_business_mode, is_private, country, website_url, xp, current_grade, acoin, last_seen, show_online_status, created_at"
            )
            .eq("id", id)
            .maybeSingle(),
          supabase.from("follows").select("id", { count: "exact", head: true }).eq("following_id", id),
          supabase.from("follows").select("id", { count: "exact", head: true }).eq("follower_id", id),
          supabase
            .from("posts")
            .select("id", { count: "exact", head: true })
            .eq("author_id", id)
            .in("visibility", ["public", "followers"]),
          user
            ? supabase
                .from("follows")
                .select("id")
                .eq("follower_id", user.id)
                .eq("following_id", id)
                .maybeSingle()
            : Promise.resolve({ data: null }),
          user
            ? supabase
                .from("follows")
                .select("id")
                .eq("follower_id", id)
                .eq("following_id", user.id)
                .maybeSingle()
            : Promise.resolve({ data: null }),
        ]);

      if (!profileRes.data) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      const p = profileRes.data as FullProfile;
      setProfile(p);
      setProfileCache(p.id, p as any);
      setCounts({
        followers: followersRes.count ?? 0,
        following: followingRes.count ?? 0,
        posts: postsRes.count ?? 0,
      });
      setIsFollowing(!!(iFollowRes as any)?.data);
      setTheyFollowMe(!!(theyFollowRes as any)?.data);
      setLoading(false);
    }

    load().catch(() => { setLoading(false); });
  }, [id, user?.id]);

  // ── Load grid posts ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!id || loading) return;

    async function loadGrid() {
      setGridLoading(true);
      try {
        let query = supabase
          .from("posts")
          .select("id, media_urls, post_type")
          .eq("author_id", id)
          .in("visibility", ["public", "followers"])
          .order("created_at", { ascending: false })
          .limit(30);

        if (activeTab === "videos") {
          query = query.eq("post_type", "video");
        } else {
          query = query.neq("post_type", "text");
        }

        const { data } = await query;
        setGridPosts((data as GridPost[]) ?? []);
      } catch {
        setGridPosts([]);
      } finally {
        setGridLoading(false);
      }
    }

    loadGrid();
  }, [id, loading, activeTab]);

  // ── Follow / Unfollow ──────────────────────────────────────────────────────
  const handleFollow = useCallback(async () => {
    if (!user || !id || followLoading || isSelf) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFollowLoading(true);
    try {
      if (isFollowing) {
        const { error } = await supabase
          .from("follows")
          .delete()
          .eq("follower_id", user.id)
          .eq("following_id", id);
        if (error) throw error;
        setIsFollowing(false);
        setCounts((c) => ({ ...c, followers: Math.max(0, c.followers - 1) }));
      } else {
        const { error } = await supabase
          .from("follows")
          .insert({ follower_id: user.id, following_id: id });
        if (error) throw error;
        setIsFollowing(true);
        setCounts((c) => ({ ...c, followers: c.followers + 1 }));
      }
    } catch {
      showToast("Could not update follow status", { type: "error" });
    } finally {
      setFollowLoading(false);
    }
  }, [user, id, isFollowing, followLoading, isSelf]);

  // ── Message ────────────────────────────────────────────────────────────────
  const handleMessage = useCallback(async () => {
    if (!user || !id) return;
    Haptics.selectionAsync();
    try {
      const { data: chatId, error } = await supabase.rpc("get_or_create_direct_chat", {
        other_user_id: id,
      });
      if (error || !chatId) throw new Error(error?.message || "Failed");
      router.push({ pathname: "/chat/[id]", params: { id: chatId } });
    } catch {
      showAlert("Error", "Could not start conversation. Please try again.");
    }
  }, [user, id]);

  // ── Render states ──────────────────────────────────────────────────────────

  if (loading && !profile) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <ProfileSkeleton />
      </View>
    );
  }

  if (notFound || !profile) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
        <ProfileNotFoundView handle={init_handle ?? id ?? "unknown"} />
      </View>
    );
  }

  if (profile.is_private && !isSelf && !isFollowing) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
        <ProfilePrivateView
          handle={profile.handle}
          displayName={profile.display_name}
          avatarUrl={profile.avatar_url ?? undefined}
          profileId={profile.id}
        />
      </View>
    );
  }

  const ls = formatLastSeen(profile.last_seen, profile.show_online_status);

  const followState: "follow" | "follow_back" | "following" | "friends" =
    isFollowing && theyFollowMe
      ? "friends"
      : !isFollowing && theyFollowMe
      ? "follow_back"
      : isFollowing
      ? "following"
      : "follow";

  const followBg =
    followState === "follow"
      ? accent
      : followState === "follow_back"
      ? "#FF9500"
      : colors.inputBg ?? colors.backgroundSecondary;

  const followBorderColor =
    followState === "friends" ? "#34C759" : followState === "following" ? colors.border : undefined;

  const followTextColor =
    followState === "follow" || followState === "follow_back"
      ? "#fff"
      : followState === "friends"
      ? "#34C759"
      : colors.textMuted;

  const followLabel =
    followState === "follow"
      ? "Follow"
      : followState === "follow_back"
      ? "Follow Back"
      : followState === "following"
      ? "Following"
      : "Friends";

  const followIcon: any =
    followState === "follow"
      ? "person-add-outline"
      : followState === "follow_back"
      ? "person-add"
      : followState === "following"
      ? "checkmark"
      : "heart";

  const TABS: { id: TabId; icon: string }[] = [
    { id: "posts", icon: "grid-outline" },
    { id: "videos", icon: "videocam-outline" },
    { id: "saved", icon: "bookmark-outline" },
  ];

  // ── Grid item ──────────────────────────────────────────────────────────────

  function GridCell({ item }: { item: GridPost }) {
    const thumb = item.media_urls?.[0];
    const isVideo = item.post_type === "video";
    return (
      <TouchableOpacity
        style={[s.gridCell, { width: CELL_W, height: CELL_H }]}
        activeOpacity={0.8}
        onPress={() => router.push({ pathname: "/post/[id]", params: { id: item.id } } as any)}
      >
        {thumb ? (
          <Image
            source={{ uri: thumb }}
            style={{ width: CELL_W, height: CELL_H }}
            contentFit="cover"
          />
        ) : (
          <View style={[s.gridPlaceholder, { backgroundColor: colors.backgroundSecondary }]}>
            <Ionicons name="image-outline" size={24} color={colors.textMuted} />
          </View>
        )}
        {isVideo && (
          <View style={s.videoOverlay}>
            <Ionicons name="play" size={14} color="#fff" />
          </View>
        )}
      </TouchableOpacity>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>

      {/* ── Minimal header ────────────────────────────────────────────────── */}
      <View style={[s.header, { paddingTop: insets.top + 6, backgroundColor: colors.background }]}>
        <TouchableOpacity
          style={s.headerBack}
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)/discover" as any))}
          hitSlop={{ top: 8, left: 8, right: 12, bottom: 8 }}
        >
          <Ionicons name="arrow-back" size={24} color={accent} />
        </TouchableOpacity>
        <Text style={[s.headerHandle, { color: colors.text }]} numberOfLines={1}>
          @{profile.handle}
        </Text>
        <View style={s.headerSide}>
          {!isSelf && (
            <TouchableOpacity
              hitSlop={{ top: 8, left: 8, right: 8, bottom: 8 }}
              onPress={() =>
                showAlert("Options", undefined, [
                  { text: "Report", style: "destructive", onPress: () => {} },
                  { text: "Block", style: "destructive", onPress: () => {} },
                  { text: "Cancel", style: "cancel" },
                ])
              }
            >
              <Ionicons name="ellipsis-horizontal" size={22} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
      >

        {/* ── Top row: avatar + stats ────────────────────────────────────── */}
        <View style={s.topRow}>
          {/* Avatar */}
          <View style={s.avatarWrap}>
            <Avatar
              uri={profile.avatar_url}
              name={profile.display_name}
              size={78}
              square={profile.is_organization_verified || profile.is_business_mode}
              premium={false}
            />
            {ls.online && (
              <View style={[s.onlineDot, { borderColor: colors.background }]} />
            )}
          </View>

          {/* Stats */}
          <View style={s.statsBlock}>
            {[
              { label: "Posts",     value: counts.posts,     onPress: () => router.push({ pathname: "/my-posts", params: { userId: id } } as any) },
              { label: "Followers", value: counts.followers, onPress: () => router.push({ pathname: "/followers", params: { userId: id, type: "followers", ownerHandle: profile.handle } } as any) },
              { label: "Following", value: counts.following, onPress: () => router.push({ pathname: "/followers", params: { userId: id, type: "following", ownerHandle: profile.handle } } as any) },
            ].map((stat) => (
              <TouchableOpacity key={stat.label} style={s.statCell} onPress={stat.onPress} activeOpacity={0.7}>
                <Text style={[s.statNum, { color: colors.text }]}>{fmtCount(stat.value)}</Text>
                <Text style={[s.statLabel, { color: colors.textMuted }]}>{stat.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Name + badge ──────────────────────────────────────────────── */}
        <View style={s.nameRow}>
          <Text style={[s.displayName, { color: colors.text }]}>{profile.display_name}</Text>
          <VerifiedBadge
            isVerified={profile.is_verified}
            isOrganizationVerified={profile.is_organization_verified}
            size={17}
          />
        </View>

        {/* Online status */}
        {profile.show_online_status && (
          <View style={s.statusRow}>
            <View style={[s.statusDot, { backgroundColor: ls.online ? "#34C759" : colors.textMuted }]} />
            <Text style={[s.statusText, { color: ls.online ? "#34C759" : colors.textMuted }]}>
              {ls.text}
            </Text>
          </View>
        )}

        {/* Bio */}
        {!!profile.bio && (
          <Text style={[s.bio, { color: colors.text }]} numberOfLines={3}>
            {profile.bio}
          </Text>
        )}

        {/* Meta: country + website + grade */}
        {(profile.country || profile.website_url || profile.current_grade) ? (
          <View style={s.metaBlock}>
            {profile.country ? (
              <View style={s.metaItem}>
                <Ionicons name="location-outline" size={13} color={colors.textMuted} />
                <Text style={[s.metaText, { color: colors.textMuted }]}>{profile.country}</Text>
              </View>
            ) : null}
            {profile.website_url ? (
              <View style={s.metaItem}>
                <Ionicons name="link-outline" size={13} color={accent} />
                <Text style={[s.metaText, { color: accent }]} numberOfLines={1}>
                  {profile.website_url.replace(/^https?:\/\//, "")}
                </Text>
              </View>
            ) : null}
            {profile.current_grade ? (
              <View style={s.metaItem}>
                <Ionicons name="flash-outline" size={13} color={colors.textMuted} />
                <Text style={[s.metaText, { color: colors.textMuted }]}>
                  {profile.current_grade} · {fmtCount(profile.xp ?? 0)} Nexa
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* ── Action buttons ────────────────────────────────────────────── */}
        {!isSelf && user ? (
          <View style={s.actionsRow}>
            <TouchableOpacity
              style={[
                s.pill,
                {
                  flex: 1,
                  backgroundColor: followBg,
                  borderColor: followBorderColor,
                  borderWidth: followBorderColor ? 1 : 0,
                },
              ]}
              onPress={handleFollow}
              activeOpacity={0.85}
              disabled={followLoading}
            >
              {followLoading ? (
                <ActivityIndicator size="small" color={followTextColor} />
              ) : (
                <>
                  <Ionicons name={followIcon} size={15} color={followTextColor} />
                  <Text style={[s.pillText, { color: followTextColor }]}>{followLabel}</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.pill, { flex: 1, backgroundColor: colors.backgroundSecondary, borderColor: colors.border, borderWidth: 1 }]}
              onPress={handleMessage}
              activeOpacity={0.85}
            >
              <Ionicons name="chatbubble-outline" size={15} color={colors.text} />
              <Text style={[s.pillText, { color: colors.text }]}>Message</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.pillIcon, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border, borderWidth: 1 }]}
              onPress={() =>
                router.push({ pathname: "/shop/[userId]", params: { userId: id } } as any)
              }
              activeOpacity={0.8}
            >
              <Ionicons name="storefront-outline" size={17} color={colors.text} />
            </TouchableOpacity>
          </View>
        ) : isSelf ? (
          <View style={s.actionsRow}>
            <TouchableOpacity
              style={[s.pill, { flex: 1, backgroundColor: colors.backgroundSecondary, borderColor: colors.border, borderWidth: 1 }]}
              onPress={() => router.push("/profile/edit")}
              activeOpacity={0.85}
            >
              <Ionicons name="create-outline" size={15} color={colors.text} />
              <Text style={[s.pillText, { color: colors.text }]}>Edit Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.pill, { flex: 1, backgroundColor: colors.backgroundSecondary, borderColor: colors.border, borderWidth: 1 }]}
              onPress={() => router.push("/settings")}
              activeOpacity={0.85}
            >
              <Ionicons name="settings-outline" size={15} color={colors.text} />
              <Text style={[s.pillText, { color: colors.text }]}>Settings</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* ── Info strip ────────────────────────────────────────────────── */}
        {!isSelf && user && (
          <View style={[s.infoStrip, { backgroundColor: colors.backgroundSecondary }]}>
            <Ionicons name="gift-outline" size={16} color={accent} />
            <TouchableOpacity
              onPress={() => router.push({ pathname: "/gifts/index", params: { recipientId: id } } as any)}
              activeOpacity={0.7}
            >
              <Text style={[s.infoStripText, { color: accent }]}>Send a Gift</Text>
            </TouchableOpacity>
            <View style={{ flex: 1 }} />
            <TouchableOpacity
              onPress={() => router.push({ pathname: "/followers", params: { userId: id, type: "followers", ownerHandle: profile.handle } } as any)}
              activeOpacity={0.7}
              style={s.infoStripMutual}
            >
              <Ionicons name="people-outline" size={14} color={colors.textMuted} />
              <Text style={[s.infoStripMeta, { color: colors.textMuted }]}>Followers</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Tab bar ───────────────────────────────────────────────────── */}
        <View style={[s.tabBar, { borderTopColor: colors.border, borderBottomColor: colors.border }]}>
          {TABS.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                style={[s.tabItem, active && { borderTopColor: accent, borderTopWidth: 1.5 }]}
                onPress={() => setActiveTab(tab.id)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={tab.icon as any}
                  size={22}
                  color={active ? accent : colors.textMuted}
                />
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Photo grid ────────────────────────────────────────────────── */}
        {gridLoading ? (
          <View style={s.gridLoading}>
            <ActivityIndicator color={accent} />
          </View>
        ) : gridPosts.length === 0 ? (
          <View style={s.gridEmpty}>
            <Ionicons name="image-outline" size={40} color={colors.textMuted} style={{ marginBottom: 8 }} />
            <Text style={[s.gridEmptyText, { color: colors.textMuted }]}>
              {activeTab === "videos" ? "No videos yet" : activeTab === "saved" ? "Nothing saved" : "No posts yet"}
            </Text>
          </View>
        ) : (
          <View style={s.grid}>
            {gridPosts.map((item, index) => (
              <GridCell key={item.id} item={item} />
            ))}
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
    paddingHorizontal: 12,
    paddingBottom: 10,
  },
  headerBack: { width: 40, height: 40, alignItems: "flex-start", justifyContent: "center" },
  headerHandle: { flex: 1, fontSize: 15, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  headerSide: { width: 40, alignItems: "flex-end", justifyContent: "center" },

  // Top row: avatar + stats
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
  },
  avatarWrap: { position: "relative" },
  onlineDot: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: "#34C759",
    borderWidth: 2,
  },
  statsBlock: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-around",
    marginLeft: 18,
  },
  statCell: { alignItems: "center", gap: 3 },
  statNum: { fontSize: 18, fontFamily: "Inter_700Bold", letterSpacing: -0.3 },
  statLabel: { fontSize: 12, fontFamily: "Inter_400Regular" },

  // Identity
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginHorizontal: 16,
    marginBottom: 4,
  },
  displayName: { fontSize: 15, fontFamily: "Inter_700Bold" },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 4, marginHorizontal: 16, marginBottom: 4 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  bio: {
    fontSize: 13.5,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
    marginHorizontal: 16,
    marginBottom: 6,
  },
  metaBlock: { marginHorizontal: 16, marginBottom: 10, gap: 3 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: 12.5, fontFamily: "Inter_400Regular" },

  // Action pills
  actionsRow: {
    flexDirection: "row",
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 12,
    marginTop: 4,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 36,
    borderRadius: 20,
  },
  pillText: { fontSize: 13.5, fontFamily: "Inter_600SemiBold" },
  pillIcon: {
    width: 36,
    height: 36,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },

  // Info strip
  infoStrip: {
    height: 36,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    gap: 8,
  },
  infoStripText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  infoStripMutual: { flexDirection: "row", alignItems: "center", gap: 4 },
  infoStripMeta: { fontSize: 12, fontFamily: "Inter_400Regular" },

  // Tab bar
  tabBar: {
    flexDirection: "row",
    height: 46,
    borderTopWidth: 0.5,
    borderBottomWidth: 0.5,
  },
  tabItem: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    borderTopWidth: 0,
    borderTopColor: "transparent",
  },

  // Photo grid
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: GRID_GAP,
    marginTop: GRID_GAP,
  },
  gridCell: {
    overflow: "hidden",
    backgroundColor: "#111",
  },
  gridPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  videoOverlay: {
    position: "absolute",
    top: 6,
    right: 6,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 10,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  gridLoading: {
    paddingVertical: 40,
    alignItems: "center",
  },
  gridEmpty: {
    paddingVertical: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  gridEmptyText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
});
