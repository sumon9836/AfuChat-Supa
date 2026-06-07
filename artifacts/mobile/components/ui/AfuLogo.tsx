import React from "react";
import { Image as RNImage, Platform, StyleProp, ViewStyle } from "react-native";
import { Image as ExpoImage } from "expo-image";

const LOCAL_LOGO = require("../../assets/images/logo.png");

/**
 * AfuChat brand logo — transparent, no background.
 * Uses the local asset on all platforms for instant, consistent rendering.
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
        source={LOCAL_LOGO}
        style={[{ width: size, height: size }, style as any]}
        resizeMode="contain"
        accessibilityLabel="AfuChat logo"
      />
    );
  }

  return (
    <ExpoImage
      source={LOCAL_LOGO}
      style={[{ width: size, height: size }, style as any]}
      contentFit="contain"
      accessibilityLabel="AfuChat logo"
      cachePolicy="memory-disk"
    />
  );
}

export default AfuLogo;
