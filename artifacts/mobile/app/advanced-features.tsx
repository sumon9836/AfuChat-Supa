import React from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/hooks/useTheme";
import { GlassHeader } from "@/components/ui/GlassHeader";
import { GlassMenuSection, GlassMenuItem, GlassMenuSeparator } from "@/components/ui/GlassMenuItem";
import { T } from "@/constants/theme";

export default function AdvancedFeaturesScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[s.root, { backgroundColor: colors.background }]}>
      <GlassHeader
        title="Advanced Features"
        onBack={() => (router.canGoBack() ? router.back() : router.replace("/settings" as any))}
      />

      <ScrollView
        contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── FEED & CONTENT ─────────────────────────────────────────── */}
        <GlassMenuSection title="FEED & CONTENT">
          <GlassMenuItem
            icon="eye-off-outline"
            label="Not Interested"
            subtitle="Manage muted authors and suppressed topics"
            onPress={() => router.push("/settings/not-interested" as any)}
          />
          <GlassMenuSeparator />
          <GlassMenuItem
            icon="bookmark-outline"
            label="Saved Posts"
            subtitle="All posts you've bookmarked"
            onPress={() => router.push("/saved-posts" as any)}
          />
          <GlassMenuSeparator />
          <GlassMenuItem
            icon="time-outline"
            label="Watch History"
            subtitle="Videos you've watched"
            onPress={() => router.push("/watch-history" as any)}
          />
        </GlassMenuSection>

        {/* ── CHAT ───────────────────────────────────────────────────── */}
        <GlassMenuSection title="CHAT">
          <GlassMenuItem
            icon="chatbubble-ellipses-outline"
            label="Chat Settings"
            subtitle="Bubble style, read receipts, media auto-download"
            onPress={() => router.push("/settings/chat" as any)}
          />
          <GlassMenuSeparator />
          <GlassMenuItem
            icon="folder-outline"
            label="Offline Videos"
            subtitle="Manage downloaded videos"
            onPress={() => router.push("/settings/offline-videos" as any)}
          />
        </GlassMenuSection>

        {/* ── CONNECTIVITY ───────────────────────────────────────────── */}
        <GlassMenuSection title="CONNECTIVITY">
          <GlassMenuItem
            icon="globe-outline"
            label="Language"
            subtitle="App display language"
            onPress={() => router.push("/language-settings" as any)}
          />
          <GlassMenuSeparator />
          <GlassMenuItem
            icon="notifications-outline"
            label="Notification Settings"
            subtitle="Sounds, banners, and per-chat overrides"
            onPress={() => router.push("/settings/notifications" as any)}
          />
        </GlassMenuSection>

        {/* ── STORAGE ────────────────────────────────────────────────── */}
        <GlassMenuSection title="STORAGE & DATA">
          <GlassMenuItem
            icon="server-outline"
            label="Storage Manager"
            subtitle="Cache, media, and database usage"
            onPress={() => router.push("/settings/storage" as any)}
          />
        </GlassMenuSection>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root:    { flex: 1 },
  content: { paddingTop: 12, paddingBottom: 40 },
});
