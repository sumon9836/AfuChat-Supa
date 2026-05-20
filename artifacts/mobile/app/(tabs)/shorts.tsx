/**
 * Shorts tab — entry point for the vertical video feed.
 * Fetches the most recent public video on mount and opens the
 * full-screen player. Shows a themed skeleton while loading.
 */
import React, { useEffect, useRef, useState } from "react";
import { View, StatusBar } from "react-native";
import { router, Stack } from "expo-router";
import { ShortsFeedSkeleton } from "@/components/ui/Skeleton";
import { useTheme } from "@/hooks/useTheme";
import { supabase } from "@/lib/supabase";

export default function ShortsTab() {
  const { colors, isDark } = useTheme();
  const navigated = useRef(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (navigated.current) return;
    navigated.current = true;

    (async () => {
      const { data } = await supabase
        .from("posts")
        .select("id")
        .eq("post_type", "video")
        .eq("visibility", "public")
        .not("video_url", "is", null)
        .order("created_at", { ascending: false })
        .limit(1);

      const firstId = data?.[0]?.id;
      if (firstId) {
        router.push({ pathname: "/video/[id]", params: { id: firstId } } as any);
      } else {
        setReady(true);
      }
    })();
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor="transparent"
        translucent
      />
      <ShortsFeedSkeleton dark={isDark} />
    </View>
  );
}
