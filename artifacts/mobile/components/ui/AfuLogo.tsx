import React from "react";
import { Image, Platform, StyleProp, useColorScheme, ViewStyle } from "react-native";

const LIGHT_PNG = require("@/assets/images/afuchat-logo-light.png");
const DARK_PNG  = require("@/assets/images/afuchat-logo-dark.png");

/**
 * AfuChat brand logo — dark-mode aware.
 *
 * Native  (iOS / Android): pre-converted PNG (light or dark) — avoids
 *   react-native-svg bridging costs with 496 complex vector paths.
 * Web: SVG served from /public via Image URI for crisp vector output.
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
      <Image
        source={{ uri: isDark ? "/logo-dark.svg" : "/logo.svg" }}
        style={[{ width: size, height: size }, style as any]}
        resizeMode="contain"
        accessibilityLabel="AfuChat logo"
      />
    );
  }

  return (
    <Image
      source={isDark ? DARK_PNG : LIGHT_PNG}
      style={[{ width: size, height: size }, style as any]}
      resizeMode="contain"
      accessibilityLabel="AfuChat logo"
    />
  );
}

export default AfuLogo;
