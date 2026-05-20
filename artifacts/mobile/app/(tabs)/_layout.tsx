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
  { route: "/(tabs)",          label: "Chats",    sfOn: "message.fill",        sfOff: "message",         mdOn: "chatbubble",  mdOff: "chatbubble-outline" },
  { route: "/(tabs)/discover", label: "Discover", sfOn: "safari.fill",          sfOff: "safari",          mdOn: "compass",     mdOff: "compass-outline"    },
  { route: "/(tabs)/search",   label: "Search",   sfOn: "magnifyingglass.circle.fill", sfOff: "magnifyingglass.circle", mdOn: "search", mdOff: "search-outline" },
  { route: "/(tabs)/apps",     label: "Apps",     sfOn: "square.grid.2x2.fill", sfOff: "square.grid.2x2", mdOn: "grid",        mdOff: "grid-outline"       },
  { route: "/(tabs)/me",       label: "Profile",  sfOn: "person.circle.fill",   sfOff: "person.circle",   mdOn: "person",      mdOff: "person-outline"     },
] as const;

function normalizeTabPath(p: string): string {
  if (p === "/" || p === "/(tabs)" || p === "/(tabs)/index") return "/(tabs)";
  if (p === "/discover"  || p === "/(tabs)/discover")  return "/(tabs)/discover";
  if (p === "/search"    || p === "/(tabs)/search")    return "/(tabs)/search";
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
  const isIOS           = Platform.OS === "ios";
  const isAndroid       = Platform.OS === "android";

  const barBg = isDark ? "rgba(18,22,28,0.96)" : "rgba(255,255,255,0.96)";

  // Use boxShadow on web (shadow* props are deprecated there); native shadow on iOS/Android.
  const shadow = Platform.select({
    web: {
      boxShadow: isDark
        ? "0 12px 36px rgba(0,0,0,0.60), 0 4px 12px rgba(0,0,0,0.32)"
        : "0 6px 24px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.07)",
    },
    default: isDark
      ? {
          shadowColor: "#000",
          shadowOpacity: 0.55,
          shadowRadius: 28,
          shadowOffset: { width: 0, height: 10 },
          elevation: 24,
        }
      : {
          shadowColor: "#000",
          shadowOpacity: 0.12,
          shadowRadius: 20,
          shadowOffset: { width: 0, height: 5 },
          elevation: 16,
        },
  });

  // Edge-to-edge on Android can set insets.bottom to 0 on gesture-nav devices.
  // Always guarantee at least 8dp above the gesture handle bar.
  const bottomPos = Math.max(insets.bottom, isAndroid ? 8 : 10) + 6;

  // Brand-tinted ripple — subtle so it doesn't fight with the focused highlight.
  const ripple = { color: colors.accent + "28", borderless: false } as const;

  function handleTabPress(route: typeof TABS[number]["route"]) {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(
        isAndroid
          ? Haptics.ImpactFeedbackStyle.Light
          : Haptics.ImpactFeedbackStyle.Rigid,
      ).catch(() => {});
    }
    router.navigate(route as any);
  }

  return (
    <View
      style={[bar.container, { bottom: bottomPos, pointerEvents: "box-none" }]}
    >
      <View style={[bar.pill, shadow, { backgroundColor: barBg }]}>
        {TABS.map((tab) => {
          const focused   = active === tab.route;
          const iconColor = focused
            ? colors.accent
            : isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.38)";
          const isChats   = tab.route === "/(tabs)";
          const isProfile = tab.route === "/(tabs)/me";

          return (
            <View key={tab.route} style={bar.item}>
              {/*
               * Two-layer pill structure for Android:
               *   1. pillClip  — borderRadius + overflow:hidden clips the ripple
               *   2. Pressable — receives android_ripple and the touch event
               * The focused highlight colour lives on pillClip so it renders
               * underneath the ripple overlay (correct stacking order).
               */}
              <View
                style={[
                  bar.pillClip,
                  focused && { backgroundColor: colors.accent + "1C" },
                ]}
              >
                <Pressable
                  android_ripple={ripple}
                  style={({ pressed }) => [
                    bar.pressable,
                    !isAndroid && pressed ? { opacity: 0.72 } : null,
                  ]}
                  onPress={() => handleTabPress(tab.route)}
                  accessibilityRole="button"
                  accessibilityLabel={tab.label}
                  accessibilityState={{ selected: focused }}
                  // Expand touch target to 48 dp minimum (Material guideline).
                  hitSlop={
                    isAndroid
                      ? { top: 8, bottom: 8, left: 4, right: 4 }
                      : undefined
                  }
                >
                  <View style={bar.iconWrap}>
                    {isProfile && avatarUrl ? (
                      <Image
                        source={{ uri: avatarUrl }}
                        style={[
                          bar.avatar,
                          focused
                            ? { borderColor: colors.accent, borderWidth: 2 }
                            : { borderColor: "transparent", borderWidth: 2 },
                        ]}
                      />
                    ) : isChats ? (
                      <Image
                        source={afuSymbol}
                        style={{ width: 22, height: 22 }}
                        resizeMode="contain"
                        tintColor={iconColor}
                      />
                    ) : isIOS && SymbolView ? (
                      <SymbolView
                        name={focused ? tab.sfOn : tab.sfOff}
                        tintColor={iconColor}
                        size={22}
                      />
                    ) : (
                      <Ionicons
                        name={(focused ? tab.mdOn : tab.mdOff) as any}
                        size={22}
                        color={iconColor}
                      />
                    )}
                    <Text
                      style={[
                        bar.label,
                        { color: iconColor },
                        focused && { fontFamily: "Inter_700Bold" },
                      ]}
                      numberOfLines={1}
                    >
                      {tab.label}
                    </Text>
                  </View>
                </Pressable>
              </View>

              {/* Unread badge — floats above the pill */}
              {isChats && totalUnread > 0 && (
                <View
                  style={[
                    bar.badge,
                    { backgroundColor: colors.accent, borderColor: barBg },
                  ]}
                >
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
    paddingVertical: 8,
    paddingHorizontal: 8,
    overflow: "visible",
    alignSelf: "center",
  },
  item: {
    alignItems: "center",
    justifyContent: "center",
  },
  pillClip: {
    borderRadius: 999,
    overflow: "hidden",
  },
  pressable: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
  },
  iconWrap: {
    width: 52,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  label: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    letterSpacing: 0.1,
    lineHeight: 13,
  },
  avatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
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
    paddingHorizontal: 3,
    borderWidth: 2,
    zIndex: 10,
  },
  badgeText: {
    color: "#fff",
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
      {isLoggedIn && (<NativeTabs.Trigger name="search"><NativeTabsIcon sf={{ default: "magnifyingglass.circle", selected: "magnifyingglass.circle.fill" }} /><NativeTabsLabel>Search</NativeTabsLabel></NativeTabs.Trigger>)}
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
      <Tabs.Screen name="search"      options={{ href: isLoggedIn ? undefined : null }} />
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
        {isLoggedIn && (
          <CompactTabBar
            userId={user?.id}
            avatarUrl={profile?.avatar_url}
          />
        )}
      </View>
    </TabSwipeProvider>
  );
}
