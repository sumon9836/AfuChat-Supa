import React from "react";
import { Image as RNImage, Platform, StyleProp, ViewStyle } from "react-native";
import { Image as ExpoImage } from "expo-image";

const API_BASE = (process.env.EXPO_PUBLIC_API_URL || "https://afuchat.com").replace(/\/$/, "");

/**
 * AfuChat brand logo — always the official light-theme logo.
 *
 * Native  (iOS / Android): SVG served from the API server — crisp at any size.
 * Web: SVG served from /public via relative URI.
 */
export function AfuLogo({
  size = 72,
  style,
}: {
  size?: number;
  style?: StyleProp<ViewStyle>;
}) {
  if (Platform.OS === "web") {
    return (
      <RNImage
        source={{ uri: "/logo.svg" }}
        style={[{ width: size, height: size }, style as any]}
        resizeMode="contain"
        accessibilityLabel="AfuChat logo"
      />
    );
  }

  return (
    <ExpoImage
      source={{ uri: `${API_BASE}/logo.svg` }}
      style={[{ width: size, height: size }, style as any]}
      contentFit="contain"
      accessibilityLabel="AfuChat logo"
      cachePolicy="disk"
    />
  );
}

export default AfuLogo;
