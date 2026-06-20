import React from "react";
import {
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";
import { GlassHeader } from "@/components/ui/GlassHeader";
import Colors from "@/constants/colors";
import { T } from "@/constants/theme";
import Constants from "expo-constants";

const VERSION = Constants.expoConfig?.version ?? "2.2.5";
const BUILD   = (Constants.expoConfig?.android as any)?.versionCode
  ? String((Constants.expoConfig?.android as any).versionCode)
  : "232";

type LinkRow = {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  subtitle?: string;
  onPress: () => void;
};

export default function AboutScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const links: LinkRow[] = [
    {
      icon: "document-text-outline",
      label: "Terms of Service",
      onPress: () => router.push("/terms" as any),
    },
    {
      icon: "shield-outline",
      label: "Privacy Policy",
      onPress: () => router.push("/privacy" as any),
    },
    {
      icon: "help-buoy-outline",
      label: "Support Center",
      onPress: () => router.push("/support" as any),
    },
    {
      icon: "globe-outline",
      label: "Visit afuchat.com",
      onPress: () => Linking.openURL("https://afuchat.com").catch(() => {}),
    },
  ];

  return (
    <View style={[s.root, { backgroundColor: colors.background }]}>
      <GlassHeader
        title="About AfuChat"
        onBack={() => (router.canGoBack() ? router.back() : router.replace("/settings" as any))}
      />

      <ScrollView
        contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Logo block ─────────────────────────────────────────────── */}
        <View style={s.hero}>
          <View style={[s.logoRing, { borderColor: Colors.brand + "33" }]}>
            <Ionicons name="chatbubbles" size={48} color={Colors.brand} />
          </View>
          <View style={{ flexDirection: "row", alignItems: "baseline", gap: 0 }}>
            <Text style={[s.brandAfu, { color: colors.textMuted }]}>Afu</Text>
            <Text style={[s.brandChat, { color: Colors.brand }]}>Chat</Text>
          </View>
          <Text style={[s.version, { color: colors.textMuted }]}>
            Version {VERSION}  (Build {BUILD})
          </Text>
          <Text style={[s.tagline, { color: colors.textSecondary }]}>
            Connect · Discover · Create
          </Text>
        </View>

        {/* ── Links ──────────────────────────────────────────────────── */}
        <View style={[s.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {links.map((item, i) => (
            <React.Fragment key={item.label}>
              {i > 0 && <View style={[s.sep, { backgroundColor: colors.separator }]} />}
              <TouchableOpacity style={s.row} onPress={item.onPress} activeOpacity={0.7}>
                <View style={[s.iconBox, { backgroundColor: Colors.brand + "18" }]}>
                  <Ionicons name={item.icon} size={20} color={Colors.brand} />
                </View>
                <Text style={[s.rowLabel, { color: colors.text }]}>{item.label}</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            </React.Fragment>
          ))}
        </View>

        {/* ── Legal footer ───────────────────────────────────────────── */}
        <Text style={[s.legal, { color: colors.textMuted }]}>
          © {new Date().getFullYear()} AfuChat. All rights reserved.
        </Text>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root:    { flex: 1 },
  content: { paddingHorizontal: T.pageH, paddingTop: 24 },

  hero: {
    alignItems: "center",
    gap: 6,
    paddingVertical: 32,
  },
  logoRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  brandAfu:  { fontSize: 28, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  brandChat: { fontSize: 28, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  version:   { ...T.caption, marginTop: 2 },
  tagline:   { ...T.caption, marginTop: 4 },

  section: {
    borderRadius: 14,
    borderWidth: 0.5,
    overflow: "hidden",
    marginBottom: 24,
  },
  sep:  { height: 0.5, marginLeft: 56 },
  row:  {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  rowLabel: { flex: 1, ...T.body },

  legal: { ...T.caption, textAlign: "center", paddingVertical: 12 },
});
