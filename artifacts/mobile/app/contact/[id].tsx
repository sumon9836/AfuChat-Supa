import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Linking,
  Modal,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Contacts from "expo-contacts";
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
import Colors from "@/constants/colors";

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
const BANNER_H    = 120;
const AVATAR_SIZE = 88;
const CELL        = Math.floor((SW - 3) / 3);

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

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
  if (ms < 3_600_000)   return { text: "Active recently", online: false };
  if (ms < 86_400_000)  return { text: `Active ${Math.floor(ms / 3_600_000)}h ago`, online: false };
  return { text: `Active ${Math.floor(ms / 86_400_000)}d ago`, online: false };
}

function cleanUrl(url: string) {
  return url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
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

  const cached = id ? getProfileCache(id) : null;
  const [profile,            setProfile]            = useState<FullProfile | null>(cached as FullProfile | null);
  const [counts,             setCounts]             = useState<Counts>({ followers: 0, following: 0, posts: 0 });
  const [loading,            setLoading]            = useState(!cached);
  const [notFound,           setNotFound]           = useState(false);
  const [isFollowing,        setIsFollowing]        = useState(false);
  const [theyFollowMe,       setTheyFollowMe]       = useState(false);
  const [followLoading,      setFollowLoading]      = useState(false);
  const [aliases,            setAliases]            = useState<string[]>([]);
  const [mutuals,            setMutuals]            = useState<MutualUser[]>([]);
  const [mutualTotal,        setMutualTotal]        = useState(0);
  const [gridPosts,          setGridPosts]          = useState<GridPost[]>([]);
  const [gridLoading,        setGridLoading]        = useState(false);
  const [activeTab,          setActiveTab]          = useState<TabId>("posts");
  const [avatarModalVisible, setAvatarModalVisible] = useState(false);
  const [savingContact,      setSavingContact]      = useState(false);
  const barAnim = useRef(new Animated.Value(0)).current;

  // ── Load profile ────────────────────────────────────────────────────────────
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

  // ── Load aliases + mutuals ──────────────────────────────────────────────────
  useEffect(() => {
    if (!id || loading) return;
    (async () => {
      const { data: aliasData } = await supabase.from("owned_usernames")
        .select("handle").eq("owner_id", id).limit(8);
      setAliases((aliasData ?? []).map((a: any) => a.handle).filter((h: string) => h !== profile?.handle));
      // Only show people I follow who ALSO follow this user
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

  // ── Load grid ───────────────────────────────────────────────────────────────
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

  // ── XP bar animation ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!profile) return;
    const { progress } = xpInfo(profile.xp ?? 0, profile.current_grade);
    Animated.timing(barAnim, { toValue: progress, duration: 1000, delay: 400, useNativeDriver: false }).start();
  }, [profile?.xp, profile?.current_grade]);

  // ── Follow ──────────────────────────────────────────────────────────────────
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

  // ── Message ─────────────────────────────────────────────────────────────────
  const handleMessage = useCallback(async () => {
    if (!user || !id) return;
    Haptics.selectionAsync();
    try {
      const { data: chatId, error } = await supabase.rpc("get_or_create_direct_chat", { other_user_id: id });
      if (error || !chatId) throw new Error();
      router.push({ pathname: "/chat/[id]", params: { id: chatId } });
    } catch { showAlert("Error", "Could not start conversation. Please try again."); }
  }, [user, id]);

  // ── Save Contact ─────────────────────────────────────────────────────────────
  const handleSaveContact = useCallback(async () => {
    if (!profile || savingContact) return;
    setSavingContact(true);
    Haptics.selectionAsync();
    try {
      if (Platform.OS === "web") {
        // Web: generate a vCard download
        const vcard = [
          "BEGIN:VCARD",
          "VERSION:3.0",
          `FN:${profile.display_name}`,
          `NICKNAME:${profile.handle}`,
          profile.website_url ? `URL:${profile.website_url}` : null,
          profile.bio ? `NOTE:${profile.bio.replace(/\n/g, "\\n")}` : null,
          `X-SOCIALPROFILE;type=afuchat:@${profile.handle}`,
          "END:VCARD",
        ].filter(Boolean).join("\r\n");
        const blob = new Blob([vcard], { type: "text/vcard" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${profile.handle}.vcf`;
        a.click();
        URL.revokeObjectURL(url);
        showToast("Contact saved!", { type: "success" });
      } else {
        const { status } = await Contacts.requestPermissionsAsync();
        if (status !== "granted") {
          showAlert("Permission Needed", "Please allow contact access in your device settings to save this contact.");
          return;
        }
        const contact: Contacts.Contact = {
          contactType: Contacts.ContactTypes.Person,
          name: profile.display_name,
          nickname: profile.handle,
          note: profile.bio ?? undefined,
          urlAddresses: profile.website_url
            ? [{ url: profile.website_url, label: "Website" }]
            : undefined,
          socialProfiles: [{ service: "AfuChat", username: profile.handle, label: "AfuChat" }],
        } as any;
        await Contacts.addContactAsync(contact);
        showToast(`${profile.display_name} saved to contacts`, { type: "success" });
      }
    } catch (e: any) {
      showAlert("Error", e?.message || "Could not save contact. Please try again.");
    } finally {
      setSavingContact(false);
    }
  }, [profile, savingContact]);

  // ── Share Profile ─────────────────────────────────────────────────────────────
  const handleShare = useCallback(async () => {
    if (!profile) return;
    Haptics.selectionAsync();
    try {
      await Share.share({
        message: `Check out @${profile.handle} on AfuChat!\nhttps://afuchat.com/@${profile.handle}`,
        url: `https://afuchat.com/@${profile.handle}`,
        title: `${profile.display_name} on AfuChat`,
      });
    } catch {}
  }, [profile]);

  // ── More options ──────────────────────────────────────────────────────────────
  const handleMore = useCallback(() => {
    Haptics.selectionAsync();
    showAlert("Options", undefined, [
      { text: savingContact ? "Saving…" : "Save Contact", onPress: handleSaveContact },
      { text: "Share Profile", onPress: handleShare },
      { text: "Report User", style: "destructive", onPress: () => showToast("Report submitted", { type: "info" }) },
      { text: "Block User",  style: "destructive", onPress: () => showToast("User blocked", { type: "info" }) },
      { text: "Cancel", style: "cancel" },
    ]);
  }, [handleSaveContact, handleShare, savingContact]);

  // ── Guard states ─────────────────────────────────────────────────────────────
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

  // ── Derived ──────────────────────────────────────────────────────────────────
  const prestige = getPrestigeTier(profile.acoin ?? 0);
  const { grade: xpGrade, pct: xpPct } = xpInfo(profile.xp ?? 0, profile.current_grade);
  const ls = lastSeenLabel(profile.last_seen, profile.show_online_status);
  const isOrg = profile.is_organization_verified || profile.is_business_mode;

  const followState = isFollowing && theyFollowMe ? "friends"
    : !isFollowing && theyFollowMe ? "follow_back"
    : isFollowing ? "following" : "follow";
  const followBg  = followState === "follow" ? accent : followState === "follow_back" ? "#FF9500"
    : followState === "following" ? "transparent" : "transparent";
  const followBrd = followState === "friends" ? "#34C759" : followState === "following" ? colors.border : followBg;
  const followTxt = (followState === "follow" || followState === "follow_back") ? "#fff"
    : followState === "friends" ? "#34C759" : colors.text;
  const followLabel = followState === "friends" ? "Friends"
    : followState === "follow_back" ? "Follow Back"
    : followState === "following" ? "Following" : "Follow";
  const followIcon: any = followState === "friends" ? "heart"
    : followState === "following" ? "checkmark-circle" : "person-add-outline";

  const barFill = barAnim.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] });

  const bannerColor1 = prestige.ringColors[0];
  const bannerColor2 = prestige.ringColors[1];

  const sep = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)";

  const TABS: { id: TabId; icon: string; label: string }[] = [
    { id: "posts",    icon: "grid-outline",          label: "Posts"    },
    { id: "articles", icon: "document-text-outline", label: "Articles" },
    { id: "videos",   icon: "videocam-outline",      label: "Videos"   },
  ];

  return (
    <View style={[s.root, { backgroundColor: colors.background }]}>

      {/* ── Avatar fullscreen modal ─────────────────────────────────── */}
      <Modal visible={avatarModalVisible} transparent animationType="fade"
        onRequestClose={() => setAvatarModalVisible(false)}>
        <TouchableOpacity style={s.avatarModalBg} activeOpacity={1}
          onPress={() => setAvatarModalVisible(false)}>
          {profile.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }}
              style={s.avatarModalImg} contentFit="contain" />
          ) : (
            <View style={[s.avatarModalPlaceholder, { backgroundColor: isDark ? "#333" : "#eee" }]}>
              <Text style={{ fontSize: 64 }}>{profile.display_name.charAt(0).toUpperCase()}</Text>
            </View>
          )}
          <TouchableOpacity style={[s.avatarModalClose, { backgroundColor: "rgba(0,0,0,0.6)" }]}
            onPress={() => setAvatarModalVisible(false)}>
            <Ionicons name="close" size={22} color="#fff" />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <ScrollView showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>

        {/* ══ BANNER ══════════════════════════════════════════════════ */}
        <View style={[s.banner, { height: BANNER_H }]}>
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
          {/* Scrim so back button is always readable */}
          <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.18)" }]} />
          {/* Nav row */}
          <View style={[s.navRow, { top: insets.top + 6 }]}>
            <TouchableOpacity style={s.navBtn}
              onPress={() => router.canGoBack() ? router.back() : router.replace("/(tabs)/discover" as any)}
              hitSlop={{ top: 8, left: 8, right: 10, bottom: 8 }}>
              <Ionicons name="arrow-back" size={20} color="#fff" />
            </TouchableOpacity>
            {!isSelf && (
              <TouchableOpacity style={s.navBtn} onPress={handleMore}
                hitSlop={{ top: 8, left: 8, right: 10, bottom: 8 }}>
                <Ionicons name="ellipsis-horizontal" size={20} color="#fff" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* ══ IDENTITY — centred avatar + name block ══════════════════ */}
        <View style={s.identityBlock}>
          {/* Avatar centred, overlapping banner */}
          <TouchableOpacity
            style={[s.avatarRing, { borderColor: colors.background, marginTop: -(AVATAR_SIZE / 2 + 4) }]}
            onPress={() => setAvatarModalVisible(true)}
            activeOpacity={0.9}>
            <Avatar uri={profile.avatar_url} name={profile.display_name}
              size={AVATAR_SIZE} square={isOrg} premium={false} />
            {ls.online && (
              <View style={[s.onlineDot, { borderColor: colors.background }]} />
            )}
          </TouchableOpacity>

          {/* Display name + verified badge */}
          <View style={s.nameRow}>
            <Text style={[s.displayName, { color: colors.text }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
              {profile.display_name}
            </Text>
            <VerifiedBadge
              isVerified={profile.is_verified}
              isOrganizationVerified={profile.is_organization_verified}
              size={18}
            />
          </View>

          {/* Handle */}
          <Text style={[s.handle, { color: colors.textMuted }]} numberOfLines={1}>
            @{profile.handle}
          </Text>

          {/* Online status */}
          {ls.text !== "" && (
            <View style={s.onlineRow}>
              <View style={[s.onlineIndicator, { backgroundColor: ls.online ? "#34C759" : colors.textMuted }]} />
              <Text style={[s.onlineText, { color: ls.online ? "#34C759" : colors.textMuted }]}>
                {ls.text}
              </Text>
            </View>
          )}

          {/* Prestige pill */}
          <View style={[s.prestigePill, { backgroundColor: prestige.color + "1A", borderColor: prestige.color + "44" }]}>
            <Text style={s.prestigeEmoji}>{prestige.emoji}</Text>
            <Text style={[s.prestigeText, { color: prestige.color }]}>{prestige.label}</Text>
          </View>

          {/* Bio */}
          {!!profile.bio && (
            <Text style={[s.bio, { color: colors.textSecondary }]} numberOfLines={4}>
              {profile.bio}
            </Text>
          )}

          {/* Meta strip — location, joined, website */}
          <View style={s.metaStrip}>
            {!!profile.country && (
              <View style={s.metaItem}>
                <Ionicons name="location-outline" size={12} color={colors.textMuted} />
                <Text style={[s.metaText, { color: colors.textMuted }]} numberOfLines={1}>
                  {profile.country}
                </Text>
              </View>
            )}
            {!!profile.created_at && (
              <View style={s.metaItem}>
                <Ionicons name="calendar-outline" size={12} color={colors.textMuted} />
                <Text style={[s.metaText, { color: colors.textMuted }]} numberOfLines={1}>
                  Joined {joinedLabel(profile.created_at)}
                </Text>
              </View>
            )}
            {!!profile.website_url && (
              <TouchableOpacity style={s.metaItem} activeOpacity={0.75}
                onPress={() => {
                  const url = profile.website_url!;
                  const full = url.startsWith("http") ? url : `https://${url}`;
                  Linking.openURL(full).catch(() => showToast("Could not open link", { type: "error" }));
                }}>
                <Ionicons name="link-outline" size={12} color={accent} />
                <Text style={[s.metaText, { color: accent }]} numberOfLines={1}>
                  {cleanUrl(profile.website_url)}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Aliases */}
          {aliases.length > 0 && (
            <View style={s.aliasRow}>
              <Text style={[s.aliasLabel, { color: colors.textMuted }]}>Also: </Text>
              <Text style={[s.aliasText, { color: accent }]} numberOfLines={1}>
                {aliases.map(a => `@${a}`).join("  ")}
              </Text>
            </View>
          )}
        </View>

        {/* ══ DIVIDER ══════════════════════════════════════════════════ */}
        <View style={[s.hairline, { backgroundColor: sep }]} />

        {/* ══ STATS — compact flat row ═════════════════════════════════ */}
        <View style={s.statsRow}>
          {[
            {
              label: "Posts", value: counts.posts,
              onPress: () => router.push({ pathname: "/my-posts", params: { userId: id } } as any),
            },
            {
              label: "Followers", value: counts.followers,
              onPress: () => router.push({ pathname: "/followers", params: { userId: id, type: "followers", ownerHandle: profile.handle } } as any),
            },
            {
              label: "Following", value: counts.following, locked: profile.is_private && !isSelf,
              onPress: () => !profile.is_private && router.push({ pathname: "/followers", params: { userId: id, type: "following", ownerHandle: profile.handle } } as any),
            },
          ].map((stat, i) => (
            <React.Fragment key={stat.label}>
              {i > 0 && <View style={[s.statDivider, { backgroundColor: sep }]} />}
              <TouchableOpacity style={s.statCell} onPress={stat.onPress}
                activeOpacity={(stat as any).locked ? 1 : 0.65}>
                {(stat as any).locked
                  ? <View style={s.lockedStat}>
                      <Ionicons name="lock-closed" size={10} color={colors.textMuted} />
                      <Text style={[s.statNum, { color: colors.textMuted }]}>—</Text>
                    </View>
                  : <Text style={[s.statNum, { color: colors.text }]}>{fmtCount(stat.value)}</Text>
                }
                <Text style={[s.statLabel, { color: colors.textMuted }]}>{stat.label}</Text>
              </TouchableOpacity>
            </React.Fragment>
          ))}
        </View>

        {/* ══ DIVIDER ══════════════════════════════════════════════════ */}
        <View style={[s.hairline, { backgroundColor: sep }]} />

        {/* ══ ACTION BUTTONS — row of labelled icon+text buttons ═══════ */}
        {!isSelf && user && (
          <View style={s.actionRow}>

            {/* Follow */}
            <TouchableOpacity
              style={[s.actionBtn, { backgroundColor: followBg, borderColor: followBrd, borderWidth: 1.5 }]}
              onPress={handleFollow} activeOpacity={0.82} disabled={followLoading}>
              {followLoading
                ? <ActivityIndicator size="small" color={followTxt} />
                : <Ionicons name={followIcon} size={16} color={followTxt} />
              }
              {!followLoading && (
                <Text style={[s.actionBtnLabel, { color: followTxt }]}>{followLabel}</Text>
              )}
            </TouchableOpacity>

            {/* Message / Chat */}
            <TouchableOpacity
              style={[s.actionBtn, { backgroundColor: accent + "18", borderColor: accent + "30", borderWidth: 1.5 }]}
              onPress={handleMessage} activeOpacity={0.82}>
              <Ionicons name="chatbubble-outline" size={16} color={accent} />
              <Text style={[s.actionBtnLabel, { color: accent }]}>Chat</Text>
            </TouchableOpacity>

            {/* Gift */}
            <TouchableOpacity
              style={[s.actionBtn, { backgroundColor: "#FF2D5514", borderColor: "#FF2D5530", borderWidth: 1.5 }]}
              onPress={() => router.push({ pathname: "/gifts/index", params: { recipientId: id } } as any)}
              activeOpacity={0.82}>
              <Ionicons name="gift-outline" size={16} color="#FF2D55" />
              <Text style={[s.actionBtnLabel, { color: "#FF2D55" }]}>Gift</Text>
            </TouchableOpacity>

            {/* Store */}
            <TouchableOpacity
              style={[s.actionBtn, { backgroundColor: Colors.gold + "14", borderColor: Colors.gold + "30", borderWidth: 1.5 }]}
              onPress={() => router.push({ pathname: "/shop/[userId]", params: { userId: id } } as any)}
              activeOpacity={0.82}>
              <Ionicons name="storefront-outline" size={16} color={Colors.gold} />
              <Text style={[s.actionBtnLabel, { color: Colors.gold }]}>Store</Text>
            </TouchableOpacity>

            {/* More */}
            <TouchableOpacity
              style={[s.actionBtn, { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)", borderColor: colors.border, borderWidth: 1.5 }]}
              onPress={handleMore} activeOpacity={0.82}>
              <Ionicons name="ellipsis-horizontal" size={16} color={colors.text} />
              <Text style={[s.actionBtnLabel, { color: colors.text }]}>More</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Self action row */}
        {isSelf && (
          <View style={s.selfRow}>
            <TouchableOpacity
              style={[s.selfBtn, { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)", borderColor: colors.border }]}
              onPress={() => router.push("/profile/edit")} activeOpacity={0.8}>
              <Ionicons name="create-outline" size={16} color={colors.text} />
              <Text style={[s.selfBtnText, { color: colors.text }]}>Edit Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.selfBtn, { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)", borderColor: colors.border }]}
              onPress={handleShare} activeOpacity={0.8}>
              <Ionicons name="share-outline" size={16} color={colors.text} />
              <Text style={[s.selfBtnText, { color: colors.text }]}>Share</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ══ DIVIDER ══════════════════════════════════════════════════ */}
        <View style={[s.hairline, { backgroundColor: sep }]} />

        {/* ══ MUTUAL FOLLOWERS — flat, no card ════════════════════════ */}
        {!isSelf && mutuals.length > 0 && (
          <TouchableOpacity
            style={s.mutualsRow}
            onPress={() => router.push({ pathname: "/followers", params: { userId: id, type: "followers", ownerHandle: profile.handle } } as any)}
            activeOpacity={0.75}>
            <View style={s.mutualsAvatars}>
              {mutuals.map((m, i) => (
                <View key={m.id} style={[s.mutualAvatar, { marginLeft: i > 0 ? -8 : 0, zIndex: 10 - i }]}>
                  <Avatar uri={m.avatar_url} name={m.handle} size={22} />
                </View>
              ))}
            </View>
            <Text style={[s.mutualsText, { color: colors.textMuted }]} numberOfLines={1}>
              <Text style={{ fontFamily: "Inter_500Medium" }}>Followed by </Text>
              {mutuals.slice(0, 2).map((m, i) => (
                <React.Fragment key={m.id}>
                  <Text style={{ color: colors.text, fontFamily: "Inter_600SemiBold" }}>@{m.handle}</Text>
                  {i < Math.min(2, mutuals.length) - 1 && ", "}
                </React.Fragment>
              ))}
              {mutualTotal > 2 && ` +${mutualTotal - 2} more`}
            </Text>
            <Ionicons name="chevron-forward" size={13} color={colors.textMuted} />
          </TouchableOpacity>
        )}

        {/* ══ XP STRIP — flat ════════════════════════════════════════ */}
        <View style={[s.xpStrip, { borderTopColor: sep, borderBottomColor: sep }]}>
          <View style={[s.xpIconBox, { backgroundColor: xpGrade.color + "22" }]}>
            <Ionicons name="flash" size={13} color={xpGrade.color} />
          </View>
          <View style={{ flex: 1, gap: 5 }}>
            <View style={s.xpTopRow}>
              <Text style={[s.xpGrade, { color: colors.text }]}>
                {profile.current_grade ?? xpGrade.name}
              </Text>
              <Text style={[s.xpAmount, { color: colors.textMuted }]}>
                {fmtCount(profile.xp ?? 0)} XP
              </Text>
              <Text style={[s.xpPct, { color: xpGrade.color }]}>{xpPct}%</Text>
            </View>
            <View style={[s.xpTrack, { backgroundColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)" }]}>
              <Animated.View style={[s.xpFill, { width: barFill, backgroundColor: xpGrade.color }]} />
            </View>
          </View>
        </View>

        {/* ══ TAB BAR ════════════════════════════════════════════════ */}
        <View style={[s.tabBar, { borderBottomColor: sep }]}>
          {TABS.map(tab => {
            const active = activeTab === tab.id;
            return (
              <TouchableOpacity key={tab.id} style={s.tabItem}
                onPress={() => setActiveTab(tab.id)} activeOpacity={0.7}>
                <Ionicons name={tab.icon as any} size={18} color={active ? accent : colors.textMuted} />
                <Text style={[s.tabLabel, { color: active ? accent : colors.textMuted }]}>{tab.label}</Text>
                {active && <View style={[s.tabIndicator, { backgroundColor: accent }]} />}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ══ GRID ═══════════════════════════════════════════════════ */}
        {gridLoading ? (
          <View style={s.gridCenter}><ActivityIndicator color={accent} size="large" /></View>
        ) : gridPosts.length === 0 ? (
          <View style={s.gridCenter}>
            <View style={[s.emptyIcon, { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)" }]}>
              <Ionicons
                name={activeTab === "videos" ? "videocam-outline" : activeTab === "articles" ? "document-text-outline" : "images-outline"}
                size={30} color={colors.textMuted} />
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
                        </View>
                  }
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

// ─── Styles ──────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1 },

  // Banner
  banner: { width: "100%", overflow: "hidden" },
  navRow: {
    position: "absolute", left: 12, right: 12,
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between",
  },
  navBtn: {
    width: 34, height: 34, borderRadius: 17,
    alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.32)",
  },

  // Identity — centred
  identityBlock: {
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 6,
  },
  avatarRing: {
    borderWidth: 3,
    borderRadius: (AVATAR_SIZE + 6) / 2,
    overflow: "hidden",
    position: "relative",
  },
  onlineDot: {
    position: "absolute", bottom: 4, right: 4,
    width: 13, height: 13, borderRadius: 6.5,
    backgroundColor: "#34C759", borderWidth: 2,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 10,
    maxWidth: "100%",
  },
  displayName: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.4,
    flexShrink: 1,
  },
  handle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    marginTop: -2,
  },
  onlineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  onlineIndicator: {
    width: 7, height: 7, borderRadius: 3.5,
  },
  onlineText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  prestigePill: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 20, borderWidth: 1,
    marginTop: 2,
  },
  prestigeEmoji: { fontSize: 12 },
  prestigeText: { fontSize: 11.5, fontFamily: "Inter_600SemiBold" },
  bio: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 21,
    textAlign: "center",
    marginTop: 4,
  },
  metaStrip: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 12,
    marginTop: 4,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    maxWidth: 180,
  },
  metaText: {
    fontSize: 12.5,
    fontFamily: "Inter_400Regular",
    flexShrink: 1,
  },
  aliasRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "nowrap",
    maxWidth: "90%",
  },
  aliasLabel: { fontSize: 12, fontFamily: "Inter_400Regular" },
  aliasText: { fontSize: 12, fontFamily: "Inter_500Medium", flexShrink: 1 },

  // Divider
  hairline: { height: StyleSheet.hairlineWidth, marginBottom: 0 },

  // Stats — compact flat
  statsRow: {
    flexDirection: "row",
    paddingVertical: 14,
  },
  statCell: {
    flex: 1,
    alignItems: "center",
    gap: 1,
  },
  statNum: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.3,
  },
  statLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  statDivider: { width: StyleSheet.hairlineWidth, marginVertical: 6 },
  lockedStat: { flexDirection: "row", alignItems: "center", gap: 3 },

  // Action buttons — labelled, equal-width
  actionRow: {
    flexDirection: "row",
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  actionBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 9,
    borderRadius: 10,
    minWidth: 0,
  },
  actionBtnLabel: {
    fontSize: 10.5,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
  },

  // Self row
  selfRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  selfBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingVertical: 11,
    borderRadius: 10,
    borderWidth: 1,
  },
  selfBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },

  // Mutuals — flat
  mutualsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  mutualsAvatars: { flexDirection: "row", alignItems: "center" },
  mutualAvatar: { borderRadius: 11, overflow: "hidden" },
  mutualsText: {
    flex: 1,
    fontSize: 12.5,
    fontFamily: "Inter_400Regular",
  },

  // XP strip — flat with top/bottom border
  xpStrip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  xpIconBox: {
    width: 30, height: 30, borderRadius: 9,
    alignItems: "center", justifyContent: "center",
  },
  xpTopRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
  },
  xpGrade: { fontSize: 13, fontFamily: "Inter_700Bold" },
  xpAmount: { fontSize: 11, fontFamily: "Inter_400Regular", flex: 1 },
  xpPct: { fontSize: 12, fontFamily: "Inter_700Bold" },
  xpTrack: { height: 5, borderRadius: 3, overflow: "hidden" },
  xpFill: { height: 5, borderRadius: 3 },

  // Tab bar
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginTop: 4,
  },
  tabItem: {
    flex: 1, alignItems: "center", justifyContent: "center",
    paddingVertical: 10, gap: 2, position: "relative",
  },
  tabLabel: { fontSize: 10.5, fontFamily: "Inter_500Medium" },
  tabIndicator: {
    position: "absolute", bottom: 0,
    left: "20%", right: "20%", height: 2, borderRadius: 2,
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
    width: 60, height: 60, borderRadius: 18,
    alignItems: "center", justifyContent: "center", marginBottom: 4,
  },
  emptyTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  emptyBody: { fontSize: 13, fontFamily: "Inter_400Regular" },

  // Avatar modal
  avatarModalBg: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.92)",
    alignItems: "center", justifyContent: "center",
  },
  avatarModalImg: {
    width: SW - 32, height: SW - 32, borderRadius: 16,
  },
  avatarModalPlaceholder: {
    width: SW - 32, height: SW - 32, borderRadius: 16,
    alignItems: "center", justifyContent: "center",
  },
  avatarModalClose: {
    position: "absolute", top: 56, right: 16,
    width: 36, height: 36, borderRadius: 18,
    alignItems: "center", justifyContent: "center",
  },
});
