import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";
import { SmartSheet } from "@/components/ui/SmartSheet";

export type DismissReason =
  | "not_interested"
  | "already_seen"
  | "mute_author"
  | "not_relevant"
  | "spam";

type Props = {
  visible: boolean;
  authorHandle: string;
  onSelect: (reason: DismissReason) => void;
  onClose: () => void;
};

const REASONS: { key: DismissReason; label: string; icon: string; desc: string }[] = [
  { key: "not_interested",  label: "Not interested in this",         icon: "thumbs-down-outline",  desc: "We'll show fewer posts like this" },
  { key: "not_relevant",   label: "Not relevant to me",              icon: "funnel-outline",        desc: "Help us improve your feed" },
  { key: "already_seen",   label: "I've already seen this",          icon: "eye-off-outline",       desc: "Keeps your feed feeling fresh" },
  { key: "mute_author",    label: "Too many posts from this person", icon: "volume-mute-outline",   desc: "Temporarily reduce their posts" },
  { key: "spam",           label: "It looks like spam",              icon: "alert-circle-outline",  desc: "Helps keep AfuChat safe" },
];

export function DismissSheet({ visible, authorHandle, onSelect, onClose }: Props) {
  const { colors } = useTheme();

  return (
    <SmartSheet
      visible={visible}
      onClose={onClose}
      backgroundColor={colors.surface}
      handleColor={colors.border}
      peekFraction={0.62}
    >
      <Text style={[styles.title, { color: colors.text }]}>
        Why don't you want to see this?
      </Text>
      <Text style={[styles.sub, { color: colors.textSecondary }]}>
        Your feedback helps us improve your For You feed.
      </Text>

      <View style={styles.list}>
        {REASONS.map((r) => (
          <TouchableOpacity
            key={r.key}
            style={[styles.row, { borderBottomColor: colors.border }]}
            onPress={() => onSelect(r.key)}
            activeOpacity={0.7}
          >
            <View style={[styles.iconBox, { backgroundColor: colors.accent + "15" }]}>
              <Ionicons name={r.icon as any} size={20} color={colors.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowLabel, { color: colors.text }]}>{r.label}</Text>
              <Text style={[styles.rowDesc, { color: colors.textMuted }]}>{r.desc}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        ))}
      </View>
    </SmartSheet>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
    paddingHorizontal: 24,
    marginBottom: 4,
    marginTop: 4,
  },
  sub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  list: { paddingHorizontal: 16 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  rowLabel: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 2,
  },
  rowDesc: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
});
