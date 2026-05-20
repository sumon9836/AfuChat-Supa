/**
 * Shorts tab — navigates to the video feed whenever this tab is focused.
 * Uses useFocusEffect so it fires at the right time in the navigation
 * lifecycle (not during mount before the navigator is ready).
 */
import React, { useCallback, useState } from "react";
import { View, Text, StatusBar, StyleSheet } from "react-native";
import { router, Stack, useFocusEffect } from "expo-router";
import { useTheme } from "@/hooks/useTheme";
import { supabase } from "@/lib/supabase";

export default function ShortsTab() {
  const { colors, isDark } = useTheme();
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setError(null);

      (async () => {
        try {
          const { data, error: dbErr } = await supabase
            .from("posts")
            .select("id")
            .eq("post_type", "video")
            .eq("visibility", "public")
            .not("video_url", "is", null)
            .order("created_at", { ascending: false })
            .limit(1);

          if (cancelled) return;

          if (dbErr) {
            setError("Could not load Shorts. Check your connection and try again.");
            return;
          }

          const firstId = data?.[0]?.id;
          if (!firstId) {
            setError("No videos yet — check back soon.");
            return;
          }

          router.push({ pathname: "/video/[id]", params: { id: firstId } } as any);
        } catch {
          if (!cancelled) setError("Could not load Shorts.");
        }
      })();

      return () => { cancelled = true; };
    }, []),
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor="transparent"
        translucent
      />
      {error && (
        <View style={styles.errorWrap}>
          <Text style={[styles.errorText, { color: colors.textSecondary }]}>
            {error}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  errorWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  errorText: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
  },
});
