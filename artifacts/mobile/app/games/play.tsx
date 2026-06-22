import React from "react";
import { useLocalSearchParams } from "expo-router";
import TriviaGame from "./trivia";
import WordChainGame from "./wordchain";
import MemoryFlipGame from "./memoryflip";
import EmojiQuizGame from "./emojiquiz";
import PredictionGame from "./prediction";
import { View, Text, StyleSheet } from "react-native";
import { GlassHeader } from "@/components/ui/GlassHeader";
import { useTheme } from "@/hooks/useTheme";

export default function PlayRouter() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();

  switch (id) {
    case "trivia":      return <TriviaGame />;
    case "wordchain":   return <WordChainGame />;
    case "memoryflip":  return <MemoryFlipGame />;
    case "emoji":       return <EmojiQuizGame />;
    case "prediction":  return <PredictionGame />;
    default:
      return (
        <View style={[s.root, { backgroundColor: colors.background }]}>
          <GlassHeader title="Game Not Found" showBack />
          <View style={s.center}>
            <Text style={{ fontSize: 48 }}>🎮</Text>
            <Text style={[s.title, { color: colors.text }]}>Game not found</Text>
            <Text style={[s.sub, { color: colors.textMuted }]}>"{id}" doesn't exist yet</Text>
          </View>
        </View>
      );
  }
}

const s = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  title: { fontSize: 20, fontFamily: "Inter_700Bold" },
  sub: { fontSize: 14, fontFamily: "Inter_400Regular" },
});
