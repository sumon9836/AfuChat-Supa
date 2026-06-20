import React from "react";
import { StyleProp, ViewStyle, useColorScheme } from "react-native";
import { Image as ExpoImage } from "expo-image";

const LOGO_DARK = require("../../assets/images/logo_white.png");
const LOGO_LIGHT = require("../../assets/images/logo_black.png");

/**
 * AfuChat brand logo — theme-aware.
 * • Dark theme  → white glowing logo (visible on dark backgrounds)
 * • Light theme → black logo (visible on light backgrounds)
 * • forceTheme  → override system theme ("dark" = white logo, "light" = black logo)
 */
export function AfuLogo({
  size = 72,
  style,
  forceTheme,
}: {
  size?: number;
  style?: StyleProp<ViewStyle>;
  forceTheme?: "dark" | "light";
}) {
  const scheme = useColorScheme();
  const resolved = forceTheme ?? scheme;
  const source = resolved === "dark" ? LOGO_DARK : LOGO_LIGHT;

  return (
    <ExpoImage
      source={source}
      style={[{ width: size, height: size }, style as any]}
      contentFit="contain"
      accessibilityLabel="AfuChat logo"
      cachePolicy="memory-disk"
    />
  );
}

export default AfuLogo;
