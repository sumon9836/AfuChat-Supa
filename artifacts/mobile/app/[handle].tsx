/**
 * [handle].tsx — catch-all route for /@username and /username
 *
 * Rules:
 *  • /@username  → public profile page (no auth required, NOT a referral)
 *  • /username   → referral link: saves referrer_handle + sends to register
 *  • Any handle + logged-in user → navigate to /contact/[id]
 */

import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { router, useLocalSearchParams, useRootNavigationState } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/hooks/useTheme";
import { Avatar } from "@/components/ui/Avatar";
import VerifiedBadge from "@/components/ui/VerifiedBadge";
import NotFoundScreen from "@/app/+not-found";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Colors from "@/constants/colors";
import AfuLogo from "@/components/ui/AfuLogo";
import { T } from "@/constants/theme";

function safeNavigate(path: string, params?: Record<string, string>) {
  try {
    if (params) router.replace({ pathname: path as any, params });
    else router.replace(path as any);
  } catch {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      const url = params ? path.replace(/\[(\w+)\]/g, (_, k) => params[k] || "") : path;
      window.location.href = url;
    }
  }
}

// ─── Types ─────────────────────────────────────────────────────────────────────

type PubProfile = {
  id: string;
  display_name: string;
  handle: string;
  avatar_url: string | null;
  bio: string | null;
  is_verified: boolean;
  is_organization_verified: boolean;
  xp: number;
  current_grade: string;
  country: string | null;
};

type PubCounts = { followers: number; following: number; posts: number };

// ─── Public Profile (shown to unauthenticated visitors of /@username) ──────────

function PublicProfileScreen({ handle }: { handle: string }) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<PubProfile | null>(null);
  const [counts, setCounts] = useState<PubCounts>({ followers: 0, following: 0, posts: 0 });
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function load() {
      let profileData: PubProfile | null = null;

      const { data: primary } = await supabase
        .from("profiles")
        .select("id, display_name, handle, avatar_url, bio, is_verified, is_organization_verified, xp, current_grade, country")
        .eq("handle", handle)
        .maybeSingle();

      if (primary) {
        profileData = primary as PubProfile;
      } else {
        const { data: alias } = await supabase
          .from("owned_usernames")
          .select("owner_id")
          .eq("handle", handle)
          .maybeSingle();
        if (alias?.owner_id) {
          const { data: byId } = await supabase
            .from("profiles")
            .select("id, display_name, handle, avatar_url, bio, is_verified, is_organization_verified, xp, current_grade, country")
            .eq("id", alias.owner_id)
            .maybeSingle();
          profileData = byId as PubProfile | null;
        }
      }

      if (!profileData) { setNotFound(true); setLoading(false); return; }
      setProfile(profileData);
      const data = profileData;

      const [{ count: followers }, { count: following }, { count: posts }] = await Promise.all([
        supabase.from("follows").select("id", { count: "exact", head: true }).eq("following_id", data.id),
        supabase.from("follows").select("id", { count: "exact", head: true }).eq("follower_id", data.id),
        supabase.from("posts").select("id", { count: "exact", head: true }).eq("author_id", data.id),
      ]);
      setCounts({ followers: followers || 0, following: following || 0, posts: posts || 0 });
      setLoading(false);
    }
    load();
  }, [handle]);

  if (loading) {
    return (
      <View style={[pub.root, pub.centered, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <ActivityIndicator color={Colors.brand} size="large" />
      </View>
    );
  }
  if (notFound || !profile) return <NotFoundScreen />;

  return (
    <View style={[pub.root, { backgroundColor: colors.background }]}>

      {/* ── Flat header ─────────────────────────────────────────────────── */}
      <View style={[pub.header, { paddingTop: insets.top, borderBottomColor: colors.separator }]}>
        <TouchableOpacity
          style={pub.headerBack}
          onPress={() => {
            if (Platform.OS === "web" && typeof window !== "undefined") {
              window.history.back();
            } else {
              router.back();
            }
          }}
          hitSlop={{ top: 8, left: 8, right: 12, bottom: 8 }}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.brand} />
        </TouchableOpacity>
        <Text style={[pub.headerTitle, { color: colors.text }]} numberOfLines={1}>
          {profile.display_name}
        </Text>
        <View style={pub.headerSide} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 130 }}>

        {/* ── Identity block ────────────────────────────────────────────── */}
        <View style={[pub.identityBlock, { borderBottomColor: colors.separator }]}>
          <Avatar
            uri={profile.avatar_url}
            name={profile.display_name}
            size={80}
            style={{ marginBottom: 14 }}
          />
          <View style={pub.nameRow}>
            <Text style={[pub.displayName, { color: colors.text }]}>{profile.display_name}</Text>
            {(profile.is_verified || profile.is_organization_verified) && (
              <VerifiedBadge size={19} />
            )}
          </View>
          <Text style={[pub.handleText, { color: colors.textMuted }]}>@{profile.handle}</Text>

          {profile.bio ? (
            <Text style={[pub.bio, { color: colors.textSecondary }]} numberOfLines={4}>
              {profile.bio}
            </Text>
          ) : null}

          {profile.country ? (
            <View style={pub.metaRow}>
              <Ionicons name="location-outline" size={13} color={colors.textMuted} />
              <Text style={[pub.metaText, { color: colors.textMuted }]}>{profile.country}</Text>
            </View>
          ) : null}

          {profile.current_grade ? (
            <View style={pub.metaRow}>
              <Ionicons name="flash-outline" size={13} color={colors.textMuted} />
              <Text style={[pub.metaText, { color: colors.textMuted }]}>
                {profile.current_grade} · {profile.xp.toLocaleString()} Nexa
              </Text>
            </View>
          ) : null}
        </View>

        {/* ── Stats ─────────────────────────────────────────────────────── */}
        <View style={[pub.statsRow, { borderBottomColor: colors.separator }]}>
          {[
            { label: "Posts",     value: counts.posts },
            { label: "Followers", value: counts.followers },
            { label: "Following", value: counts.following },
          ].map((s, i) => (
            <React.Fragment key={s.label}>
              {i > 0 && <View style={[pub.statSep, { backgroundColor: colors.separator }]} />}
              <View style={pub.statCell}>
                <Text style={[pub.statNum, { color: colors.text }]}>{s.value.toLocaleString()}</Text>
                <Text style={[pub.statLabel, { color: colors.textMuted }]}>{s.label}</Text>
              </View>
            </React.Fragment>
          ))}
        </View>

        {/* ── Actions ───────────────────────────────────────────────────── */}
        <View style={[pub.actionsBlock, { borderBottomColor: colors.separator }]}>
          <TouchableOpacity
            style={[pub.btnPrimary, { backgroundColor: Colors.brand }]}
            onPress={() => router.push("/(auth)/login" as any)}
            activeOpacity={0.85}
          >
            <Ionicons name="person-add-outline" size={17} color="#fff" />
            <Text style={pub.btnPrimaryText}>Follow</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[pub.btnSecondary, { borderColor: colors.border }]}
            onPress={() => router.push("/(auth)/login" as any)}
            activeOpacity={0.85}
          >
            <Ionicons name="chatbubble-outline" size={17} color={colors.text} />
            <Text style={[pub.btnSecondaryText, { color: colors.text }]}>Message</Text>
          </TouchableOpacity>
        </View>

        {/* ── Join AfuChat prompt ───────────────────────────────────────── */}
        <View style={[pub.joinBlock, { borderBottomColor: colors.separator }]}>
          <AfuLogo size={30} style={{ flexShrink: 0 }} />
          <View style={{ flex: 1 }}>
            <Text style={[pub.joinTitle, { color: colors.text }]}>
              Join AfuChat
            </Text>
            <Text style={[pub.joinSub, { color: colors.textMuted }]}>
              Connect with @{profile.handle} and millions of others
            </Text>
          </View>
          <TouchableOpacity
            style={[pub.joinBtn, { backgroundColor: Colors.brand }]}
            onPress={() => router.push("/(auth)/register" as any)}
            activeOpacity={0.85}
          >
            <Text style={pub.joinBtnText}>Sign up</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>

      {/* ── Sticky bottom sign-in bar ─────────────────────────────────────── */}
      <View
        style={[
          pub.bottomBar,
          {
            backgroundColor: colors.background,
            borderTopColor: colors.separator,
            paddingBottom: Math.max(insets.bottom, 16),
          },
        ]}
      >
        <View style={pub.bottomBarInner}>
          <View style={{ flex: 1 }}>
            <Text style={[pub.bottomBarTitle, { color: colors.text }]}>
              Sign in to follow or message
            </Text>
            <Text style={[pub.bottomBarSub, { color: colors.textMuted }]}>
              Join AfuChat to connect with @{profile.handle}
            </Text>
          </View>
        </View>
        <View style={pub.bottomBtnRow}>
          <TouchableOpacity
            style={[pub.bottomBtn, { backgroundColor: Colors.brand }]}
            onPress={() => router.push("/(auth)/login" as any)}
            activeOpacity={0.85}
          >
            <Text style={pub.bottomBtnText}>Sign In</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[pub.bottomBtn, pub.bottomBtnOutline, { borderColor: Colors.brand }]}
            onPress={() => router.push("/(auth)/register" as any)}
            activeOpacity={0.85}
          >
            <Text style={[pub.bottomBtnText, { color: Colors.brand }]}>Create Account</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// ─── Router / Splash (handles redirect logic) ──────────────────────────────────

export default function HandleScreen() {
  const { handle: rawHandle } = useLocalSearchParams<{ handle: string }>();
  const { session, loading: authLoading } = useAuth();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const navigationState = useRootNavigationState();
  const hasNavigated = useRef(false);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [profileNotFound, setProfileNotFound] = useState(false);
  const [dataReady, setDataReady] = useState(false);

  const isAtHandle = (rawHandle || "").startsWith("@");
  const cleanHandle = (rawHandle || "").replace(/^@/, "").toLowerCase();
  const isValidHandle = /^[a-zA-Z0-9_]+$/.test(cleanHandle);

  useEffect(() => {
    if (isAtHandle && !authLoading && !session) return;
    if (!cleanHandle || !isValidHandle) { setDataReady(true); return; }

    async function resolve() {
      const { data: primary } = await supabase
        .from("profiles")
        .select("id")
        .eq("handle", cleanHandle)
        .maybeSingle();

      if (primary?.id) { setProfileId(primary.id); setDataReady(true); return; }

      const { data: alias } = await supabase
        .from("owned_usernames")
        .select("owner_id")
        .eq("handle", cleanHandle)
        .maybeSingle();

      if (alias?.owner_id) { setProfileId(alias.owner_id); setDataReady(true); return; }

      setProfileNotFound(true);
      setDataReady(true);
    }
    resolve();
  }, [cleanHandle, isValidHandle, isAtHandle, authLoading, session]);

  useEffect(() => {
    if (hasNavigated.current) return;
    if (!dataReady) return;
    if (authLoading) return;
    if (!navigationState?.key) return;
    if (profileNotFound || !cleanHandle || !isValidHandle) return;
    if (isAtHandle && !session) return;

    hasNavigated.current = true;

    if (session) {
      if (profileId) safeNavigate("/contact/[id]", { id: profileId });
    } else {
      if (profileId) {
        if (!isAtHandle) {
          AsyncStorage.setItem("referrer_handle", cleanHandle).catch(() => {});
        }
        safeNavigate("/(auth)/register");
      }
    }
  }, [dataReady, authLoading, navigationState?.key, cleanHandle, isValidHandle, profileId, profileNotFound, session, isAtHandle]);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    if (hasNavigated.current) return;
    if (session) return; // logged-in users navigate via the main effect
    if (isAtHandle) return; // unauthenticated @handle shows PublicProfileScreen directly
    const timeout = setTimeout(() => {
      if (hasNavigated.current) return;
      if (!dataReady) return;
      if (profileNotFound) return;
      hasNavigated.current = true;
      if (typeof window !== "undefined") window.location.href = "/login";
      else router.replace("/(auth)/login");
    }, 8000);
    return () => clearTimeout(timeout);
  }, [dataReady, session, profileNotFound, isAtHandle]);

  // Logged-in user — never show the splash; render transparent and navigate
  // as soon as the profile ID is resolved (contact page shows its own skeleton).
  if (session) {
    if (dataReady && (profileNotFound || !isValidHandle)) return <NotFoundScreen />;
    return null;
  }

  // Unauthenticated @-handle → public profile page
  if (isAtHandle) {
    if (!isValidHandle) return <NotFoundScreen />;
    return <PublicProfileScreen handle={cleanHandle} />;
  }

  // Unauthenticated plain handle → invite / referral splash
  if (dataReady && (profileNotFound || !isValidHandle)) return <NotFoundScreen />;

  return (
    <View style={[splash.container, { backgroundColor: Colors.brand, paddingTop: insets.top }]}>
      <AfuLogo size={96} style={{ marginBottom: 16 }} />
      <Text style={splash.brandText}>AfuChat</Text>
      <ActivityIndicator size="small" color="#fff" style={splash.loader} />
      <Text style={splash.subText}>Processing invite…</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const pub = StyleSheet.create({
  root: { flex: 1 },
  centered: { alignItems: "center", justifyContent: "center" },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: T.pageH,
    paddingBottom: 12,
    paddingTop: 8,
  },
  headerBack: {
    width: 40,
    height: 40,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    ...T.title,
    textAlign: "center",
  },
  headerSide: { width: 40 },

  // Identity block — centered, no card
  identityBlock: {
    alignItems: "center",
    paddingHorizontal: T.pageH,
    paddingTop: 28,
    paddingBottom: 24,
    gap: 4,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 4,
  },
  displayName: { ...T.h2, textAlign: "center" },
  handleText: { ...T.caption, textAlign: "center", marginTop: 2 },
  bio: {
    ...T.body,
    textAlign: "center",
    marginTop: 12,
    lineHeight: 22,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 8,
  },
  metaText: { ...T.caption },

  // Stats — inline row, no card
  statsRow: {
    flexDirection: "row",
    paddingVertical: 20,
    paddingHorizontal: T.pageH,
  },
  statCell: { flex: 1, alignItems: "center", gap: 2 },
  statNum: { fontSize: 20, fontFamily: "Inter_700Bold", letterSpacing: -0.3 },
  statLabel: { ...T.caption, marginTop: 1 },
  statSep: { width: 0.5, marginVertical: 4 },

  // Action buttons
  actionsBlock: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: T.pageH,
    paddingVertical: 16,
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
  btnPrimaryText: {
    color: "#fff",
    ...T.bodySemi,
  },
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

  // Join AfuChat row
  joinBlock: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: T.pageH,
    paddingVertical: 16,
    
  },
  joinTitle: { ...T.bodyMed, marginBottom: 1 },
  joinSub: { ...T.caption, lineHeight: 17 },
  joinBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  joinBtnText: { color: "#fff", ...T.captionMed, fontFamily: "Inter_600SemiBold" },

  // Bottom sticky bar
  bottomBar: {
    
    paddingHorizontal: T.pageH,
    paddingTop: 14,
  },
  bottomBarInner: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  bottomBarTitle: { ...T.bodyMed, marginBottom: 2 },
  bottomBarSub: { ...T.caption, lineHeight: 18 },
  bottomBtnRow: { flexDirection: "row", gap: 10 },
  bottomBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 10,
  },
  bottomBtnOutline: {
    borderWidth: 1.5,
    backgroundColor: "transparent",
  },
  bottomBtnText: {
    color: "#fff",
    ...T.bodySemi,
  },
});

const splash = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center" },
  brandText: { color: "#fff", fontSize: 24, fontFamily: "Inter_700Bold", marginTop: 12 },
  loader: { marginTop: 24 },
  subText: { color: "rgba(255,255,255,0.7)", ...T.caption, marginTop: 8 },
});
