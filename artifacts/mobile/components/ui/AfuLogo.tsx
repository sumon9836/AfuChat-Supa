import React from "react";
import { Image as RNImage, Platform, StyleProp, useColorScheme, ViewStyle } from "react-native";
import { Image as ExpoImage } from "expo-image";

const API_BASE = (process.env.EXPO_PUBLIC_API_URL || "https://afuchat.com").replace(/\/$/, "");

/**
 * AfuChat brand logo — dark-mode aware.
 *
 * Native  (iOS / Android): SVG served from the API server — crisp at any size.
 * Web: SVG served from /public via relative URI.
 *
 * Automatically switches between light and dark variants using the
 * system colour-scheme. Pass `forceDark` to override.
 */
export function AfuLogo({
  size = 72,
  style,
  forceDark,
}: {
  size?: number;
  style?: StyleProp<ViewStyle>;
  forceDark?: boolean;
}) {
  const scheme = useColorScheme();
  const isDark = forceDark ?? scheme === "dark";

  if (Platform.OS === "web") {
    return (
      <RNImage
        source={{ uri: isDark ? "/logo-dark.svg" : "/logo.svg" }}
        style={[{ width: size, height: size }, style as any]}
        resizeMode="contain"
        accessibilityLabel="AfuChat logo"
      />
    );
  }

  return (
    <ExpoImage
      source={{ uri: `${API_BASE}/${isDark ? "logo-dark.svg" : "logo.svg"}` }}
      style={[{ width: size, height: size }, style as any]}
      contentFit="contain"
      accessibilityLabel="AfuChat logo"
      cachePolicy="disk"
    />
  );
}

export default AfuLogo;
