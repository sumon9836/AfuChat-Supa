import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";

export default function GamesIndex() {
  const { colors } = useTheme();
  return (
    <View style={[s.root, { backgroundColor: colors.background }]}>
      <Ionicons name="game-controller-outline" size={64} color={colors.textMuted} />
      <Text style={[s.title, { color: colors.text }]}>Games</Text>
      <Text style={[s.sub, { color: colors.textMuted }]}>Coming soon</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  title: { fontSize: 22, fontWeight: "700" },
  sub: { fontSize: 15 },
});
