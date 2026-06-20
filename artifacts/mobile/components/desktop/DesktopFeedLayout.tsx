import React from "react";
import { View } from "react-native";

export const FEED_COLUMN_MAX_WIDTH = 680;

export function DesktopFeedLayout({ children }: { children: React.ReactNode }) {
  return <View style={{ flex: 1 }}>{children}</View>;
}
