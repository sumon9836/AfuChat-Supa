import React, { useState } from "react";
import { Image as RNImage, Platform, StyleProp, ViewStyle } from "react-native";
import { Image as ExpoImage } from "expo-image";

const API_BASE = (process.env.EXPO_PUBLIC_API_URL || "https://afuchat.com").replace(/\/$/, "");

const LOCAL_ICON = require("../../assets/images/icon.png");

export function AfuLogo({
  size = 72,
  style,
}: {
  size?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const [svgFailed, setSvgFailed] = useState(false);

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

  if (svgFailed) {
    return (
      <ExpoImage
        source={LOCAL_ICON}
        style={[{ width: size, height: size, borderRadius: size * 0.22 }, style as any]}
        contentFit="contain"
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
      onError={() => setSvgFailed(true)}
    />
  );
}

export default AfuLogo;
