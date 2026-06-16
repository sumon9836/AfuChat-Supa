import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "@/hooks/useTheme";
import { T } from "@/constants/theme";

type Variant = "error" | "accent" | "success" | "warning" | "info";

type Props = {
  count: number;
  variant?: Variant;
  color?: string;       // override background
  textColor?: string;   // override text
};

export function Badge({ count, variant = "error", color, textColor }: Props) {
  const { colors } = useTheme();
  if (count <= 0) return null;
  const label = count > 99 ? "99+" : String(count);

  const bg = color ?? (
    variant === "accent"  ? colors.accent   :
    variant === "success" ? colors.success  :
    variant === "warning" ? colors.warning  :
    variant === "info"    ? colors.info     :
    colors.badgeBg
  );
  const fg = textColor ?? colors.badgeText;

  return (
    <View style={[styles.badge, { backgroundColor: bg }, label.length > 2 && styles.wide]}>
      <Text style={[styles.text, { color: fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    minWidth: 18,
    height: 18,
    borderRadius: T.radius.pill,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: T.space.xs,
  },
  wide: { borderRadius: 10 },
  text: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    lineHeight: 13,
  },
});
