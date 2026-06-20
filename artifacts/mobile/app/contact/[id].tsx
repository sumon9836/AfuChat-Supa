import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
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

  const { colors, accent } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const isSelf = user?.id === id;

  // Seed from cache or route params for instant header render
  const cached = id ? getProfileCache(id) : null;
  const [profile, setProfile] = useState<FullProfile | null>(cached as FullProfile | null);
  const [counts, setCounts] = useState<Counts>({ followers: 0, following: 0, posts: 0 });
  const [loading, setLoading] = useState(!cached);
  const [notFound, setNotFound] = useState(false);

  const [isFollowing, setIsFollowing] = useState(false);
  const [theyFollowMe, setTheyFollowMe] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

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

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <View
        style={[
          s.header,
          {
            paddingTop: insets.top + 8,
            borderBottomColor: colors.separator ?? colors.border,
            backgroundColor: colors.background,
          },
        ]}
      >
        <TouchableOpacity
          style={s.headerBack}
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)/discover" as any))}
          hitSlop={{ top: 8, left: 8, right: 12, bottom: 8 }}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.brand} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: colors.text }]} numberOfLines={1}>
          {profile.display_name}
        </Text>
        <View style={s.headerSide} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>

        {/* ── Identity block ─────────────────────────────────────────────── */}
        <View style={[s.identityBlock, { borderBottomColor: colors.separator ?? colors.border }]}>

          {/* Avatar */}
          <View style={s.avatarWrap}>
            <Avatar
              uri={profile.avatar_url}
              name={profile.display_name}
              size={84}
              square={profile.is_organization_verified || profile.is_business_mode}
              premium={false}
            />
            {ls.online && (
              <View style={[s.onlineDot, { borderColor: colors.background }]} />
            )}
          </View>

          {/* Name + badge */}
          <View style={s.nameRow}>
            <Text style={[s.displayName, { color: colors.text }]}>{profile.display_name}</Text>
            <VerifiedBadge
              isVerified={profile.is_verified}
              isOrganizationVerified={profile.is_organization_verified}
              size={19}
            />
          </View>

          {/* Handle */}
          <Text style={[s.handleText, { color: colors.textMuted }]}>@{profile.handle}</Text>

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
            <Text style={[s.bio, { color: colors.textSecondary ?? colors.text }]} numberOfLines={4}>
              {profile.bio}
            </Text>
          )}

          {/* Meta: country + website */}
          {(profile.country || profile.website_url) && (
            <View style={s.metaRow}>
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
            </View>
          )}

          {/* Grade / XP */}
          {!!profile.current_grade && (
            <View style={s.metaItem}>
              <Ionicons name="flash-outline" size={13} color={colors.textMuted} />
              <Text style={[s.metaText, { color: colors.textMuted }]}>
                {profile.current_grade} · {profile.xp?.toLocaleString() ?? 0} Nexa
              </Text>
            </View>
          )}
        </View>

        {/* ── Stats row ─────────────────────────────────────────────────── */}
        <View style={[s.statsRow, { borderBottomColor: colors.separator ?? colors.border }]}>
          {[
            {
              label: "Posts",
              value: counts.posts,
              onPress: () =>
                router.push({
                  pathname: "/my-posts",
                  params: { userId: id },
                } as any),
            },
            {
              label: "Followers",
              value: counts.followers,
              onPress: () =>
                router.push({
                  pathname: "/followers",
                  params: { userId: id, type: "followers", ownerHandle: profile.handle },
                } as any),
            },
            {
              label: "Following",
              value: counts.following,
              onPress: () =>
                router.push({
                  pathname: "/followers",
                  params: { userId: id, type: "following", ownerHandle: profile.handle },
                } as any),
            },
          ].map((stat, i) => (
            <React.Fragment key={stat.label}>
              {i > 0 && <View style={[s.statSep, { backgroundColor: colors.separator ?? colors.border }]} />}
              <TouchableOpacity style={s.statCell} onPress={stat.onPress} activeOpacity={0.7}>
                <Text style={[s.statNum, { color: colors.text }]}>{fmtCount(stat.value)}</Text>
                <Text style={[s.statLabel, { color: colors.textMuted }]}>{stat.label}</Text>
              </TouchableOpacity>
            </React.Fragment>
          ))}
        </View>

        {/* ── Action buttons ────────────────────────────────────────────── */}
        {!isSelf && user && (
          <View style={[s.actionsBlock, { borderBottomColor: colors.separator ?? colors.border }]}>
            <TouchableOpacity
              style={[
                s.btnPrimary,
                {
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
                  <Ionicons name={followIcon} size={17} color={followTextColor} />
                  <Text style={[s.btnPrimaryText, { color: followTextColor }]}>{followLabel}</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.btnSecondary, { borderColor: colors.border }]}
              onPress={handleMessage}
              activeOpacity={0.85}
            >
              <Ionicons name="chatbubble-outline" size={17} color={colors.text} />
              <Text style={[s.btnSecondaryText, { color: colors.text }]}>Message</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Self-view quick actions ───────────────────────────────────── */}
        {isSelf && (
          <View style={[s.actionsBlock, { borderBottomColor: colors.separator ?? colors.border }]}>
            <TouchableOpacity
              style={[s.btnPrimary, { backgroundColor: accent }]}
              onPress={() => router.push("/profile/edit")}
              activeOpacity={0.85}
            >
              <Ionicons name="create-outline" size={17} color="#fff" />
              <Text style={[s.btnPrimaryText, { color: "#fff" }]}>Edit Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.btnSecondary, { borderColor: colors.border }]}
              onPress={() => router.push("/my-posts")}
              activeOpacity={0.85}
            >
              <Ionicons name="grid-outline" size={17} color={colors.text} />
              <Text style={[s.btnSecondaryText, { color: colors.text }]}>My Posts</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── More actions ──────────────────────────────────────────────── */}
        {!isSelf && user && (
          <View style={s.moreActions}>
            <TouchableOpacity
              style={[s.moreBtn, { backgroundColor: colors.surface ?? colors.backgroundSecondary }]}
              onPress={() =>
                router.push({
                  pathname: "/shop/[userId]",
                  params: { userId: id },
                } as any)
              }
              activeOpacity={0.8}
            >
              <Ionicons name="storefront-outline" size={19} color={accent} />
              <Text style={[s.moreBtnText, { color: colors.text }]}>Shop</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.moreBtn, { backgroundColor: colors.surface ?? colors.backgroundSecondary }]}
              onPress={() =>
                router.push({
                  pathname: "/gifts/index",
                  params: { recipientId: id },
                } as any)
              }
              activeOpacity={0.8}
            >
              <Ionicons name="gift-outline" size={19} color="#FF2D55" />
              <Text style={[s.moreBtnText, { color: colors.text }]}>Gift</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.moreBtn, { backgroundColor: colors.surface ?? colors.backgroundSecondary }]}
              onPress={() =>
                router.push({
                  pathname: "/followers",
                  params: { userId: id, type: "followers", ownerHandle: profile.handle },
                } as any)
              }
              activeOpacity={0.8}
            >
              <Ionicons name="people-outline" size={19} color={colors.text} />
              <Text style={[s.moreBtnText, { color: colors.text }]}>Followers</Text>
            </TouchableOpacity>
          </View>
        )}

      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
  },
  headerBack: { width: 40, height: 40, alignItems: "flex-start", justifyContent: "center" },
  headerTitle: { flex: 1, ...T.title, textAlign: "center" },
  headerSide: { width: 40 },

  identityBlock: {
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 24,
    gap: 4,
    borderBottomWidth: 0.5,
  },
  avatarWrap: { position: "relative", marginBottom: 8 },
  onlineDot: {
    position: "absolute",
    bottom: 4,
    right: 4,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#34C759",
    borderWidth: 2.5,
  },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 4 },
  displayName: { ...T.h2, textAlign: "center" },
  handleText: { ...T.caption, textAlign: "center", marginTop: 2 },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 4 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  bio: {
    ...T.body,
    textAlign: "center",
    marginTop: 10,
    lineHeight: 22,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginTop: 6,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 4 },
  metaText: { ...T.caption },

  statsRow: {
    flexDirection: "row",
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
  },
  statCell: { flex: 1, alignItems: "center", gap: 2 },
  statNum: { fontSize: 20, fontFamily: "Inter_700Bold", letterSpacing: -0.3 },
  statLabel: { ...T.caption, marginTop: 1 },
  statSep: { width: 0.5, marginVertical: 4 },

  actionsBlock: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 0.5,
  },
  btnPrimary: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
  },
  btnPrimaryText: { ...T.bodySemi },
  btnSecondary: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  btnSecondaryText: { ...T.bodySemi },

  moreActions: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 10,
  },
  moreBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
    borderRadius: 12,
  },
  moreBtnText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
});
