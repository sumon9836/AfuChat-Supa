import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router, usePathname } from "expo-router";
import type { Session } from "@supabase/supabase-js";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/hooks/useTheme";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import { TabSwipeProvider } from "@/context/TabSwipeContext";
import { getLocalConversations } from "@/lib/storage/localConversations";
import { supabase } from "@/lib/supabase";
import { emitShortsRefresh } from "@/lib/shortsRefresh";

let isLiquidGlassAvailable: () => boolean = () => false;
try {
  isLiquidGlassAvailable = require("expo-glass-effect").isLiquidGlassAvailable;
} catch (_) {}

// expo-router/unstable-native-tabs requires a native module (NativeTabsView)
// that is NOT bundled in Expo Go — loading it causes an immediate native crash.
// We only need it on iOS 26+ Liquid Glass builds (custom EAS build, not Expo Go).
// Guard it behind a Platform check + try-catch so the native module is never
// initialised on devices that don't have it.
let NativeTabs: any = null;
let NativeTabsIcon: any = null;
let NativeTabsLabel: any = null;
if (Platform.OS === "ios") {
  try {
    const nt = require("expo-router/unstable-native-tabs");
    NativeTabs = nt.NativeTabs;
    NativeTabsIcon = nt.Icon;
    NativeTabsLabel = nt.Label;
  } catch (_) {}
}

// expo-symbols is also iOS-only (SF Symbols). Guard the same way.
let SymbolView: React.ComponentType<{ name: string; tintColor?: string; size?: number }> | null = null;
if (Platform.OS === "ios") {
  try {
    SymbolView = require("expo-symbols").SymbolView;
  } catch (_) {}
}

const afuSymbol = require("@/assets/images/afu-symbol.png");

const TABS = [
  { route: "/(tabs)",          label: "Chats",    sfOn: "message.fill",              sfOff: "message",                       mdOn: "chatbubble",     mdOff: "chatbubble-outline"  },
  { route: "/(tabs)/discover", label: "Discover", sfOn: "safari.fill",               sfOff: "safari",                        mdOn: "compass",        mdOff: "compass-outline"     },
  { route: "/(tabs)/shorts",   label: "Shorts",   sfOn: "play.rectangle.fill",       sfOff: "play.rectangle",                mdOn: "play-circle",    mdOff: "play-circle-outline" },
  { route: "/(tabs)/apps",     label: "Apps",     sfOn: "square.grid.2x2.fill",      sfOff: "square.grid.2x2",               mdOn: "grid",           mdOff: "grid-outline"        },
  { route: "/(tabs)/me",       label: "Profile",  sfOn: "person.circle.fill",        sfOff: "person.circle",                 mdOn: "person",         mdOff: "person-outline"      },
] as const;

function normalizeTabPath(p: string): string {
  if (p === "/" || p === "/(tabs)" || p === "/(tabs)/index") return "/(tabs)";
  if (p === "/discover"  || p === "/(tabs)/discover")  return "/(tabs)/discover";
  if (p === "/shorts"    || p === "/(tabs)/shorts")    return "/(tabs)/shorts";
  if (p === "/apps"      || p === "/(tabs)/apps")      return "/(tabs)/apps";
  if (p === "/me"        || p === "/(tabs)/me")        return "/(tabs)/me";
  return p;
}

function useTotalUnread(userId: string | undefined): number {
  const [total, setTotal] = useState(0);

  const refresh = useCallback(async () => {
    const convs = await getLocalConversations();
    setTotal(convs.reduce((s, c) => s + (c.unread_count ?? 0), 0));
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    if (!userId) return;
    const ch = supabase
      .channel("tab-bar-unread")
      .on("postgres_changes", { event: "INSERT",  schema: "public", table: "messages" },         refresh)
      .on("postgres_changes", { event: "UPDATE",  schema: "public", table: "message_receipts" }, refresh)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [userId, refresh]);

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

  const bottomPos = Math.max(insets.bottom, isAndroid ? 8 : 10) + 14;

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
    if (Platform.OS !== "web") {
      Haptics.impactAsync(
        isAndroid
          ? Haptics.ImpactFeedbackStyle.Light
          : Haptics.ImpactFeedbackStyle.Rigid,
      ).catch(() => {});
    }
    if (route === "/(tabs)/shorts") {
      const now = Date.now();
      if (active === "/(tabs)/shorts" && now - lastShortsTapRef.current < 400) {
        emitShortsRefresh();
        lastShortsTapRef.current = 0;
        return;
      }
      lastShortsTapRef.current = now;
    }
    router.navigate(route as any);
  }

  return (
    <View style={[
      bar.container,
      { bottom: bottomPos, pointerEvents: "box-none" },
      Platform.OS === "web" ? { position: "fixed" as any } : null,
    ]}>
      <View style={[bar.pill, shadow, { backgroundColor: barBg, borderColor }]}>
        {TABS.map((tab) => {
          const focused   = active === tab.route;
          const iconColor = focused
            ? colors.accent
            : isDark ? "rgba(95,93,105,1)" : "rgba(110,108,118,1)";
          const isChats   = tab.route === "/(tabs)";
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
                    <Image
                      source={{ uri: avatarUrl }}
                      style={[
                        bar.avatar,
                        focused
                          ? { borderColor: colors.accent, borderWidth: 2.5 }
                          : { borderColor: "rgba(128,128,128,0.22)", borderWidth: 2 },
                      ]}
                    />
                  ) : isChats ? (
                    <Image
                      source={afuSymbol}
                      style={{ width: 44, height: 44 }}
                      resizeMode="contain"
                      tintColor={iconColor}
                    />
                  ) : (
                    <Ionicons
                      name={(focused ? tab.mdOn : tab.mdOff) as any}
                      size={24}
                      color={iconColor}
                    />
                  )}
                </View>
                <Text style={[bar.label, { color: iconColor }]} numberOfLines={1}>
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
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderWidth: 1,
    alignSelf: "center",
  },
  item: {
    alignItems: "center",
    justifyContent: "center",
    width: 54,
  },
  pressable: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    paddingVertical: 2,
    width: 54,
  },
  iconChip: {
    width: 54,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 10.5,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.04,
    lineHeight: 14,
    textAlign: "center",
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

function NativeTabLayout({ isLoggedIn }: { isLoggedIn: boolean }) {
  if (!NativeTabs) return null;
  return (
    <NativeTabs>
      {isLoggedIn && (<NativeTabs.Trigger name="index"><NativeTabsIcon sf={{ default: "message.fill", selected: "message.fill" }} /><NativeTabsLabel>Chats</NativeTabsLabel></NativeTabs.Trigger>)}
      {isLoggedIn && (<NativeTabs.Trigger name="discover"><NativeTabsIcon sf={{ default: "safari", selected: "safari.fill" }} /><NativeTabsLabel>Discover</NativeTabsLabel></NativeTabs.Trigger>)}
      {isLoggedIn && (<NativeTabs.Trigger name="shorts"><NativeTabsIcon sf={{ default: "play.rectangle", selected: "play.rectangle.fill" }} /><NativeTabsLabel>Shorts</NativeTabsLabel></NativeTabs.Trigger>)}
      {isLoggedIn && (<NativeTabs.Trigger name="apps"><NativeTabsIcon sf={{ default: "square.grid.2x2", selected: "square.grid.2x2.fill" }} /><NativeTabsLabel>Apps</NativeTabsLabel></NativeTabs.Trigger>)}
      {isLoggedIn && (<NativeTabs.Trigger name="me"><NativeTabsIcon sf={{ default: "person.circle", selected: "person.circle.fill" }} /><NativeTabsLabel>Profile</NativeTabsLabel></NativeTabs.Trigger>)}
    </NativeTabs>
  );
}

function ClassicTabLayout({ isLoggedIn }: { isLoggedIn: boolean }) {
  const { colors } = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        lazy: false,
        freezeOnBlur: true,
        ...(({ contentStyle: { backgroundColor: colors.background } }) as any),
        tabBarStyle: { display: "none" },
      }}
    >
      <Tabs.Screen name="index"       options={{ href: isLoggedIn ? undefined : null }} />
      <Tabs.Screen name="discover"    options={{ href: isLoggedIn ? undefined : null }} />
      <Tabs.Screen name="shorts"      options={{ href: isLoggedIn ? undefined : null, lazy: true }} />
      <Tabs.Screen name="search"      options={{ href: null }} />
      <Tabs.Screen name="contacts"    options={{ href: null }} />
      <Tabs.Screen name="communities" options={{ href: null }} />
      <Tabs.Screen name="apps"        options={{ href: isLoggedIn ? undefined : null }} />
      <Tabs.Screen name="me"          options={{ href: isLoggedIn ? undefined : null }} />
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

  if (isLiquidGlassAvailable()) {
    return (
      <TabSwipeProvider>
        <NativeTabLayout isLoggedIn={isLoggedIn} />
      </TabSwipeProvider>
    );
  }

  return (
    <TabSwipeProvider>
      <View style={{ flex: 1 }}>
        <ClassicTabLayout isLoggedIn={isLoggedIn} />
        {isLoggedIn && Platform.OS !== "web" && (
          <CompactTabBar
            userId={user?.id}
            avatarUrl={profile?.avatar_url}
          />
        )}
      </View>
    </TabSwipeProvider>
  );
}
