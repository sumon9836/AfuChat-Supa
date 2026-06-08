import React from "react";
import { Image as RNImage, Platform, StyleProp, ViewStyle } from "react-native";
import { Image as ExpoImage } from "expo-image";

const LOGO = require("../../assets/images/icon.png");

/**
 * AfuChat brand logo — shows the app icon as a rounded square.
 * Uses the local asset on all platforms for instant, consistent rendering.
 */
export function AfuLogo({
  size = 72,
  style,
}: {
  size?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const radius = size * 0.22;

  if (Platform.OS === "web") {
    return (
      <RNImage
        source={LOGO}
        style={[{ width: size, height: size, borderRadius: radius }, style as any]}
        resizeMode="cover"
        accessibilityLabel="AfuChat logo"
      />
    );
  }

  return (
    <ExpoImage
      source={LOGO}
      style={[{ width: size, height: size, borderRadius: radius }, style as any]}
      contentFit="cover"
      accessibilityLabel="AfuChat logo"
      cachePolicy="memory-disk"
    />
  );
}

export default AfuLogo;
