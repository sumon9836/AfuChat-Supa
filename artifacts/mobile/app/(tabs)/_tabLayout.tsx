import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image as ExpoImage } from "expo-image";
import { router, usePathname } from "expo-router";
import { safeRouter } from "@/lib/navUtils";
import type { Session } from "@supabase/supabase-js";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/hooks/useTheme";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import { TabSwipeProvider } from "@/context/TabSwipeContext";
import { getLocalConversations } from "@/lib/storage/localConversations";
import { supabase } from "@/lib/supabase";
import { emitShortsRefresh } from "@/lib/shortsRefresh";
import { getTotalUnread, subscribeUnread } from "@/lib/chatUnreadEvents";
import AfuLogo from "@/components/ui/AfuLogo";

const TABS = [
  { route: "/(tabs)/chats",         label: "Chats",    mdOn: "chatbubble",       mdOff: "chatbubble-outline"       },
  { route: "/(tabs)/discover",      label: "Discover", mdOn: "compass",          mdOff: "compass-outline"          },
  { route: "/(tabs)/shorts",        label: "Shorts",   mdOn: "play-circle",      mdOff: "play-circle-outline"      },
  { route: "/(tabs)/apps",          label: "Apps",     mdOn: "grid",             mdOff: "grid-outline"             },
  { route: "/(tabs)/me",            label: "Profile",  mdOn: "person",           mdOff: "person-outline"           },
] as const;

function normalizeTabPath(p: string): string {
  if (p === "/" || p === "/(tabs)" || p === "/(tabs)/index" || p === "/chats" || p === "/(tabs)/chats") return "/(tabs)/chats";
  if (p === "/discover"       || p === "/(tabs)/discover")       return "/(tabs)/discover";
  if (p === "/shorts"         || p === "/(tabs)/shorts")         return "/(tabs)/shorts";
  if (p === "/notifications"  || p === "/(tabs)/notifications")  return "/(tabs)/notifications";
  if (p === "/apps"           || p === "/(tabs)/apps")           return "/(tabs)/apps";
  if (p === "/me"             || p === "/(tabs)/me")             return "/(tabs)/me";
  return p;
}

function useTotalUnread(userId: string | undefined): number {
  // Initialise from the in-memory store so there is no flash of zero on mount.
  const [total, setTotal] = useState(() => getTotalUnread());

  useEffect(() => {
    if (!userId) return;

    // Primary path: ChatsScreen pushes the latest count into the shared store
    // every time its `chats` state changes. This gives us zero-delay updates.
    const unsubStore = subscribeUnread(setTotal);

    // Fallback path: if ChatsScreen is not mounted (user is on another tab and
    // has never visited Chats this session), subscribe to message_status inserts
    // so the badge still updates when the chat page receives a message and
    // writes a delivered/read row.
    const fallbackRefresh = async () => {
      const convs = await getLocalConversations();
      setTotal(convs.reduce((s, c) => s + (c.unread_count ?? 0), 0));
    };
    const ch = supabase
      .channel("tab-bar-unread")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "message_status", filter: `user_id=eq.${userId}` }, fallbackRefresh)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "message_status", filter: `user_id=eq.${userId}` }, fallbackRefresh)
      .subscribe();

    return () => {
      unsubStore();
      supabase.removeChannel(ch);
    };
  }, [userId]);

  return total;
}


function CompactTabBar({
  userId,
  avatarUrl,
}: {
  userId: string | undefined;
  avatarUrl: string | null | undefined;
}) {
  const pathname        = usePathname();
  const insets          = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const totalUnread     = useTotalUnread(userId);
  const active          = normalizeTabPath(pathname);
  const isAndroid       = Platform.OS === "android";

  const lastShortsTapRef = useRef<number>(0);

  // ── Sliding pill highlight ──────────────────────────────────────────────────
  const ITEM_W  = 64;
  const PILL_W  = 56;
  const PILL_H  = 32;
  const BAR_PAD = 6;

  const pillX        = useRef(new Animated.Value(0)).current;
  const didInitRef   = useRef(false);

  useEffect(() => {
    const idx = TABS.findIndex(t => t.route === active);
    if (idx === -1) return;
    const toValue = idx * ITEM_W;
    if (!didInitRef.current) {
      pillX.setValue(toValue);
      didInitRef.current = true;
      return;
    }
    Animated.spring(pillX, {
      toValue,
      damping: 20,
      stiffness: 180,
      useNativeDriver: Platform.OS !== "web",
    }).start();
  }, [active]);

  const bottomPos = Math.max(insets.bottom, isAndroid ? 4 : 6) + 6;

  const barBg      = isDark ? "rgba(28,28,30,0.97)" : "rgba(255,255,255,0.97)";
  const borderColor = isDark ? "rgba(44,44,46,1)"   : "rgba(221,215,201,1)";

  const shadow = Platform.select({
    web: {
      boxShadow: isDark
        ? "0 12px 40px rgba(0,0,0,0.55), 0 4px 14px rgba(0,0,0,0.30)"
        : "0 8px 32px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.06)",
    },
    default: isDark
      ? {
          shadowColor: "#000",
          shadowOpacity: 0.50,
          shadowRadius: 24,
          shadowOffset: { width: 0, height: 8 },
          elevation: 20,
        }
      : {
          shadowColor: "#000",
          shadowOpacity: 0.08,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 4 },
          elevation: 12,
        },
  });

  const ripple = { color: colors.accent + "22", borderless: false } as const;

  function handleTabPress(route: typeof TABS[number]["route"]) {
    // Shorts double-tap refreshes the feed — handle before the nav lock
    // so a quick re-tap on the active Shorts tab still works.
    if (route === "/(tabs)/shorts" && active === "/(tabs)/shorts") {
      const now = Date.now();
      if (now - lastShortsTapRef.current < 400) {
        emitShortsRefresh();
        lastShortsTapRef.current = 0;
        return;
      }
      lastShortsTapRef.current = now;
    }

    // Global nav lock — silently drop any tap that arrives while a
    // navigation from a previous tap is still in the cooldown window.
    if (Platform.OS !== "web") {
      Haptics.impactAsync(
        isAndroid
          ? Haptics.ImpactFeedbackStyle.Light
          : Haptics.ImpactFeedbackStyle.Rigid,
      ).catch(() => {});
    }
    safeRouter.navigate(route as any);
  }

  return (
    <View style={[
      bar.container,
      { bottom: bottomPos, pointerEvents: "box-none" },
      Platform.OS === "web" ? { position: "fixed" as any } : null,
    ]}>
      <View style={[bar.pill, shadow, { backgroundColor: barBg, borderColor }]}>

        {/* ── Sliding accent highlight ──────────────────────────────────── */}
        <Animated.View
          style={[
            bar.highlight,
            {
              width: PILL_W,
              height: PILL_H,
              borderRadius: PILL_H / 2,
              backgroundColor: colors.accent + "40",
              left: BAR_PAD + (ITEM_W - PILL_W) / 2,
              transform: [{ translateX: pillX }],
            },
          ]}
        />

        {TABS.map((tab) => {
          const focused   = active === tab.route;
          const iconColor = focused
            ? colors.accent
            : isDark ? "rgba(95,93,105,1)" : "rgba(110,108,118,1)";
          const isChats   = tab.route === "/(tabs)/chats";
          const isProfile = tab.route === "/(tabs)/me";

          return (
            <View key={tab.route} style={bar.item}>
              <Pressable
                android_ripple={ripple}
                style={({ pressed }) => [
                  bar.pressable,
                  !isAndroid && pressed ? { opacity: 0.68 } : null,
                ]}
                onPress={() => handleTabPress(tab.route)}
                accessibilityRole="button"
                accessibilityLabel={tab.label}
                accessibilityState={{ selected: focused }}
              >
                <View style={bar.iconChip}>
                  {isProfile && avatarUrl ? (
                    <ExpoImage
                      source={{ uri: avatarUrl }}
                      style={[
                        bar.avatar,
                        focused
                          ? { borderColor: colors.accent, borderWidth: 2.5 }
                          : { borderColor: "rgba(128,128,128,0.22)", borderWidth: 2 },
                      ]}
                      contentFit="cover"
                      cachePolicy="memory-disk"
                    />
                  ) : isChats ? (
                    <AfuLogo size={40} />
                  ) : (
                    <Ionicons
                      name={(focused ? tab.mdOn : tab.mdOff) as any}
                      size={22}
                      color={iconColor}
                    />
                  )}
                </View>
                <Text
                  style={[
                    bar.label,
                    { color: iconColor },
                    focused && bar.labelActive,
                  ]}
                  numberOfLines={1}
                >
                  {tab.label}
                </Text>
              </Pressable>

              {isChats && totalUnread > 0 && (
                <View style={[bar.badge, { backgroundColor: colors.accent }]}>
                  <Text style={bar.badgeText} numberOfLines={1}>
                    {totalUnread > 99 ? "99+" : String(totalUnread)}
                  </Text>
                </View>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const bar = StyleSheet.create({
  container: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 100,
  },
  pill: {
    flexDirection: "row",
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 5,
    borderWidth: 1,
    alignSelf: "center",
    overflow: "hidden",
  },
  highlight: {
    position: "absolute",
    top: 9,
    zIndex: 0,
  },
  item: {
    alignItems: "center",
    justifyContent: "center",
    width: 64,
    zIndex: 1,
  },
  pressable: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    paddingVertical: 2,
    width: 64,
  },
  iconChip: {
    width: 64,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 10.5,
    fontFamily: "Inter_700Bold",
    fontWeight: Platform.OS === "android" ? "700" : undefined,
    letterSpacing: 0.1,
    lineHeight: 14,
    textAlign: "center",
  },
  labelActive: {
    fontSize: Platform.OS === "android" ? 11.5 : 11,
    fontFamily: "Inter_700Bold",
    fontWeight: Platform.OS === "android" ? "900" : "bold",
    letterSpacing: 0.15,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  badge: {
    position: "absolute",
    top: 2,
    right: 2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    zIndex: 10,
  },
  badgeText: {
    color: "#000",
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    lineHeight: 12,
  },
});

function ClassicTabLayout({ isLoggedIn }: { isLoggedIn: boolean }) {
  const { colors } = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        lazy: false,
        freezeOnBlur: true,
        sceneStyle: { backgroundColor: "transparent" },
        tabBarStyle: { display: "none", backgroundColor: "transparent", elevation: 0, ...(Platform.OS !== "web" ? { shadowOpacity: 0 } : {}), borderTopWidth: 0 },
        tabBarBackground: () => null,
      }}
    >
      <Tabs.Screen name="index"         options={{ href: null }} />
      <Tabs.Screen name="chats"         options={{ href: isLoggedIn ? undefined : null }} />
      <Tabs.Screen name="discover"      options={{ href: isLoggedIn ? undefined : null }} />
      <Tabs.Screen name="shorts"        options={{ href: isLoggedIn ? undefined : null, lazy: true }} />
      <Tabs.Screen name="notifications" options={{ href: isLoggedIn ? undefined : null }} />
      <Tabs.Screen name="search"        options={{ href: null }} />
      <Tabs.Screen name="contacts"      options={{ href: null }} />
      <Tabs.Screen name="communities"   options={{ href: null }} />
      <Tabs.Screen name="apps"          options={{ href: isLoggedIn ? undefined : null }} />
      <Tabs.Screen name="me"            options={{ href: isLoggedIn ? undefined : null }} />
    </Tabs>
  );
}

export default function TabLayout() {
  const { session, profile, loading, user } = useAuth();
  const { isDesktop } = useIsDesktop();
  const isLoggedIn     = !!session;
  const prevSessionRef = useRef<Session | null>(null);

  useEffect(() => {
    if (loading) return;
    const hadSession = prevSessionRef.current !== null;
    const hasSession = session !== null;
    if (hadSession && !hasSession) router.replace("/discover");
    prevSessionRef.current = session;
  }, [session, loading]);

  useEffect(() => {
    if (loading) return;
    if (session && profile && !profile.onboarding_completed) {
      router.replace({ pathname: "/onboarding", params: { userId: session.user.id } });
    }
  }, [session, profile, loading]);

  return (
    <TabSwipeProvider>
      <View style={{ flex: 1 }}>
        <ClassicTabLayout isLoggedIn={isLoggedIn} />
        {isLoggedIn && (Platform.OS !== "web" || !isDesktop) && (
          <CompactTabBar
            userId={user?.id}
            avatarUrl={profile?.avatar_url}
          />
        )}
      </View>
    </TabSwipeProvider>
  );
}
