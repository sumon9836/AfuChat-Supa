import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { safeRouter } from "@/lib/navUtils";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "@/components/ui/SafeGradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "@/lib/haptics";
import { useSuperApp } from "@/lib/superapp/MiniAppRuntime";
import { useTheme } from "@/hooks/useTheme";
import OfflineBanner from "@/components/ui/OfflineBanner";
import { useAuth } from "@/context/AuthContext";
import { showAlert } from "@/lib/alert";
import { isOnline } from "@/lib/offlineStore";
import { showToast } from "@/lib/toast";

const USAGE_KEY = "afu_app_usage";
const COLS = 4;
const H_PAD = 16;

type AppItem = {
  id: string;
  label: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  gradient: [string, string];
  route: string;
  badge?: string;
  featuredSub?: string;
  orgOnly?: boolean;
  comingSoon?: boolean;
  miniApp?: boolean;
  nativeOnly?: boolean;
};

type Category = {
  id: string;
  title: string;
  apps: AppItem[];
};

const CATEGORIES: Category[] = [
  {
    id: "super",
    title: "Super Apps",
    apps: [
      {
        id: "afuai",
        label: "AfuAI",
        icon: "sparkles",
        gradient: ["#1f95ff", "#1a7fd4"],
        route: "/ai",
        badge: "AI",
        miniApp: true,
        featuredSub: "Your intelligent AI assistant. Ask anything, do everything.",
      },
      {
        id: "afupay",
        label: "AfuPay",
        icon: "wallet",
        gradient: ["#34C759", "#00C781"],
        route: "/wallet",
        miniApp: true,
        featuredSub: "Send, receive and manage your ACoins & Nexa.",
      },
      {
        id: "afumarket",
        label: "AfuMarket",
        icon: "storefront",
        gradient: ["#AF52DE", "#BF5AF2"],
        route: "/store",
        badge: "NEW",
        miniApp: true,
        featuredSub: "Shop from verified stores and sellers.",
      },
      {
        id: "afubusiness",
        label: "AfuBusiness",
        icon: "briefcase",
        gradient: ["#1C1C1E", "#3A3A3C"],
        route: "/business",
        miniApp: true,
        orgOnly: true,
        featuredSub: "Tools and analytics for your business.",
      },
      {
        id: "afugames",
        label: "AfuGames",
        icon: "game-controller",
        gradient: ["#FF3B30", "#FF6B35"],
        route: "/games",
        badge: "SOON",
        miniApp: true,
        comingSoon: true,
        featuredSub: "Play mini games and compete with friends.",
      },
    ],
  },
  {
    id: "ai",
    title: "Intelligence",
    apps: [
      {
        id: "afusearch",
        label: "Search",
        icon: "search",
        gradient: ["#5856D6", "#6E6CD3"],
        route: "/search",
        miniApp: true,
        featuredSub: "Find people, posts, channels, events and more.",
      },
      {
        id: "afulens",
        label: "AfuLab",
        icon: "scan",
        gradient: ["#FF6B35", "#FF3B00"],
        route: "/lab",
        badge: "AI",
        miniApp: true,
        nativeOnly: true,
        featuredSub: "Point your camera at anything and get instant AI-powered answers.",
      },
    ],
  },
  {
    id: "finance",
    title: "Finance",
    apps: [
      {
        id: "afuservices",
        label: "Services",
        icon: "card",
        gradient: ["#AF52DE", "#BF5AF2"],
        route: "/mini-programs",
        miniApp: true,
        featuredSub: "Pay bills, top up, and access local services.",
      },
      {
        id: "afufreelance",
        label: "Freelance",
        icon: "briefcase",
        gradient: ["#34C759", "#30D158"],
        route: "/freelance",
        badge: "NEW",
        miniApp: true,
        featuredSub: "Hire talent or find work on AfuFreelance.",
      },
    ],
  },
  {
    id: "entertainment",
    title: "Entertainment",
    apps: [
      {
        id: "afugifts",
        label: "Gifts",
        icon: "gift",
        gradient: ["#FF3B30", "#FF453A"],
        route: "/gifts",
        badge: "SOON",
        miniApp: true,
        featuredSub: "Send animated gifts to people you love.",
        comingSoon: true,
      },
    ],
  },
  {
    id: "tools",
    title: "Tools",
    apps: [
      {
        id: "afucollections",
        label: "Collections",
        icon: "albums",
        gradient: ["#BF5AF2", "#AF52DE"],
        route: "/collections",
        miniApp: true,
        featuredSub: "Curate and share themed collections.",
      },
    ],
  },
  {
    id: "community",
    title: "Community",
    apps: [
      {
        id: "afumatch",
        label: "AfuMatch",
        icon: "heart",
        gradient: ["#FF2D55", "#FF375F"],
        route: "/match",
        badge: "SOON",
        miniApp: true,
        featuredSub: "Meet new people and find meaningful connections.",
        comingSoon: true,
      },
      {
        id: "afuevents",
        label: "Events",
        icon: "calendar",
        gradient: ["#FF9500", "#FFCC00"],
        route: "/digital-events",
        miniApp: true,
        featuredSub: "Discover local and online events near you.",
      },
      {
        id: "afuusernames",
        label: "Usernames",
        icon: "at",
        gradient: ["#007AFF", "#5AC8FA"],
        route: "/username-market",
        miniApp: true,
        featuredSub: "Buy and sell premium @handles.",
      },
    ],
  },
];

const ALL_APPS = CATEGORIES.flatMap((c) => c.apps);

function resolveGradient(gradient: [string, string], accent: string): [string, string] {
  return gradient.map((c) => (c === "#1f95ff" ? accent : c)) as [string, string];
}

function AppTile({
  app,
  tileWidth,
  usageCount,
  onTap,
  openApp,
}: {
  app: AppItem;
  tileWidth: number;
  usageCount?: number;
  onTap: (id: string) => void;
  openApp: (id: string) => void;
}) {
  const { colors, accent } = useTheme();
  const scale = useRef(new Animated.Value(1)).current;

  function handlePressIn() {
    Animated.spring(scale, { toValue: 0.88, useNativeDriver: Platform.OS !== "web", speed: 50, bounciness: 0 }).start();
  }
  function handlePressOut() {
    Animated.spring(scale, { toValue: 1, useNativeDriver: Platform.OS !== "web", speed: 30, bounciness: 8 }).start();
  }
  function handlePress() {
    Haptics.selectionAsync();
    if (app.comingSoon) {
      showAlert(`${app.label} — Coming Soon`, "This feature is not available yet. Stay tuned!");
      return;
    }
    // Show a soft offline warning for mini apps that require network.
    // AfuAI (id: "afuai") has local SQLite memory so we allow it through.
    const needsNetwork = app.miniApp && app.id !== "afuai";
    if (needsNetwork && !isOnline()) {
      showToast(`${app.label} requires an internet connection`, { type: "info", icon: "wifi-outline" });
    }
    onTap(app.id);
    if (app.miniApp && Platform.OS !== "web") {
      openApp(app.id);
    } else {
      safeRouter.push(app.route as any);
    }
  }

  return (
    <Animated.View style={[{ transform: [{ scale }], width: tileWidth, alignItems: "center" }]}>
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={styles.tilePressable}
      >
        <View style={styles.iconWrapper}>
          <LinearGradient
            colors={resolveGradient(app.gradient, accent)}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.iconGradient}
          >
            <Ionicons name={app.icon} size={22} color="#fff" />
          </LinearGradient>
          {app.badge ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{app.badge}</Text>
            </View>
          ) : null}
        </View>
        <Text style={[styles.tileLabel, { color: colors.textMuted }]} numberOfLines={1}>
          {app.label}
        </Text>
        {usageCount && usageCount > 0 ? (
          <Text style={[styles.usageText, { color: colors.textMuted }]}>
            {usageCount > 99 ? "99+" : usageCount}
            {"x"}
          </Text>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

function AppGrid({
  apps,
  tileWidth,
  usageCounts,
  onTap,
  openApp,
}: {
  apps: AppItem[];
  tileWidth: number;
  usageCounts: Record<string, number>;
  onTap: (id: string) => void;
  openApp: (id: string) => void;
}) {
  const padCount = apps.length % COLS === 0 ? 0 : COLS - (apps.length % COLS);
  return (
    <View style={styles.grid}>
      {apps.map((app) => (
        <AppTile
          key={app.id}
          app={app}
          tileWidth={tileWidth}
          usageCount={usageCounts[app.id]}
          onTap={onTap}
          openApp={openApp}
        />
      ))}
      {Array.from({ length: padCount }).map((_, i) => (
        <View key={"pad-" + i} style={{ width: tileWidth }} />
      ))}
    </View>
  );
}

export default function AppsScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width: SW } = useWindowDimensions();
  const [usageCounts, setUsageCounts] = useState<Record<string, number>>({});
  const { isPremium, profile } = useAuth();
  const isOrgVerified = !!profile?.is_organization_verified;
  const { openApp } = useSuperApp();

  const tileWidth = Math.floor((SW - H_PAD * 2) / COLS);

  useEffect(() => {
    AsyncStorage.getItem(USAGE_KEY).then((raw) => {
      if (raw) {
        try {
          setUsageCounts(JSON.parse(raw));
        } catch (_) {}
      }
    });
  }, []);

  function trackTap(appId: string) {
    setUsageCounts((prev) => {
      const updated = { ...prev, [appId]: (prev[appId] ?? 0) + 1 };
      AsyncStorage.setItem(USAGE_KEY, JSON.stringify(updated)).catch(() => {});
      return updated;
    });
  }

  const isWeb = Platform.OS === "web";
  function isVisible(a: AppItem) {
    if (a.nativeOnly && isWeb) return false;
    if (a.orgOnly && !isOrgVerified) return false;
    return true;
  }

  const visibleApps = ALL_APPS.filter(isVisible);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <OfflineBanner />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{
          paddingTop: insets.top + 8,
          paddingBottom: insets.bottom + 100,
          paddingHorizontal: H_PAD,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{"Apps"}</Text>
          {isPremium ? (
            <View style={[styles.premiumPill, { backgroundColor: colors.backgroundSecondary }]}>
              <Ionicons name="diamond" size={11} color="#FFD60A" />
              <Text style={styles.premiumPillText}>{"Premium"}</Text>
            </View>
          ) : null}
        </View>

        <AppGrid
          apps={visibleApps}
          tileWidth={tileWidth}
          usageCounts={usageCounts}
          onTap={trackTap}
          openApp={openApp}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 34,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
  },
  premiumPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  premiumPillText: {
    color: "#FFD60A",
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  tilePressable: {
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 2,
    width: "100%",
  },
  iconWrapper: {
    position: "relative",
    marginBottom: 6,
  },
  iconGradient: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -6,
    backgroundColor: "#FF3B30",
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderWidth: 1.5,
    borderColor: "#fff",
  },
  badgeText: {
    color: "#fff",
    fontSize: 8,
    fontFamily: "Inter_700Bold",
  },
  tileLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
    maxWidth: 62,
  },
  usageText: {
    fontSize: 9,
    fontFamily: "Inter_400Regular",
    marginTop: 1,
  },
});
