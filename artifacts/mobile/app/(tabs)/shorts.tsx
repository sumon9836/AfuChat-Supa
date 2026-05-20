/**
 * Shorts tab — immediately enters the vertical video feed.
 * Navigates straight to /shorts on mount so the user never
 * sits on a skeleton screen.
 */
import React, { useEffect } from "react";
import { View, StatusBar } from "react-native";
import { router, Stack } from "expo-router";
import { useTheme } from "@/hooks/useTheme";

export default function ShortsTab() {
  const { isDark } = useTheme();

  useEffect(() => {
    router.navigate("/shorts" as any);
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />
    </View>
  );
}
