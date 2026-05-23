import React, { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  ts: number;
};

const WELCOME: Message = {
  id: "welcome",
  role: "assistant",
  content:
    "Hi! I'm AfuAI — your intelligent assistant inside AfuChat. I can help you write, translate, answer questions, summarise content, brainstorm ideas, and more.\n\nWhat can I do for you?",
  ts: Date.now(),
};

const QUICK_PROMPTS = [
  "Write a caption for my post",
  "Translate to French",
  "Summarise this text",
  "Give me content ideas",
];

export default function AfuAIApp() {
  const { colors, accent } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const listRef = useRef<FlatList>(null);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || loading) return;
      setInput("");
      const userMsg: Message = {
        id: Date.now() + "-user",
        role: "user",
        content: trimmed,
        ts: Date.now(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setLoading(true);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);

      try {
        const { data, error } = await supabase.functions.invoke("afu-ai-chat", {
          body: { message: trimmed, userId: user?.id },
        });
        const reply: Message = {
          id: Date.now() + "-ai",
          role: "assistant",
          content:
            error || !data?.reply
              ? "Sorry, I couldn't process that right now. Please try again."
              : data.reply,
          ts: Date.now(),
        };
        setMessages((prev) => [...prev, reply]);
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now() + "-err",
            role: "assistant",
            content: "Something went wrong. Please try again.",
            ts: Date.now(),
          },
        ]);
      } finally {
        setLoading(false);
        setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
      }
    },
    [loading, user]
  );

  const renderItem = useCallback(
    ({ item }: { item: Message }) => {
      const isUser = item.role === "user";
      return (
        <View
          style={[
            styles.bubble,
            isUser
              ? [styles.bubbleUser, { backgroundColor: accent }]
              : [styles.bubbleAI, { backgroundColor: colors.surface }],
          ]}
        >
          {!isUser && (
            <View style={[styles.aiDot, { backgroundColor: accent }]}>
              <Ionicons name="sparkles" size={9} color="#fff" />
            </View>
          )}
          <Text
            style={[
              styles.bubbleText,
              { color: isUser ? "#fff" : colors.text },
            ]}
          >
            {item.content}
          </Text>
        </View>
      );
    },
    [colors, accent]
  );

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={0}
    >
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        renderItem={renderItem}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: insets.bottom + 16 },
        ]}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() =>
          listRef.current?.scrollToEnd({ animated: false })
        }
      />

      {/* Quick prompts */}
      {messages.length <= 1 && (
        <View style={styles.quickWrap}>
          {QUICK_PROMPTS.map((q) => (
            <Pressable
              key={q}
              onPress={() => sendMessage(q)}
              style={[
                styles.quickChip,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.quickText, { color: colors.text }]}>{q}</Text>
            </Pressable>
          ))}
        </View>
      )}

      {/* Input bar */}
      <View
        style={[
          styles.inputRow,
          {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
            paddingBottom: Math.max(insets.bottom, 12),
          },
        ]}
      >
        <TextInput
          style={[
            styles.input,
            { backgroundColor: colors.backgroundSecondary, color: colors.text },
          ]}
          placeholder="Ask AfuAI anything…"
          placeholderTextColor={colors.textMuted}
          value={input}
          onChangeText={setInput}
          multiline
          maxLength={2000}
          returnKeyType="send"
          onSubmitEditing={() => sendMessage(input)}
        />
        <Pressable
          onPress={() => sendMessage(input)}
          disabled={!input.trim() || loading}
          style={[
            styles.sendBtn,
            {
              backgroundColor:
                input.trim() && !loading ? accent : colors.backgroundSecondary,
            },
          ]}
        >
          {loading ? (
            <ActivityIndicator size="small" color={colors.textMuted} />
          ) : (
            <Ionicons
              name="arrow-up"
              size={18}
              color={input.trim() ? "#fff" : colors.textMuted}
            />
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  list: { padding: 16, gap: 10 },
  bubble: {
    maxWidth: "82%",
    borderRadius: 16,
    padding: 12,
    flexDirection: "row",
    gap: 6,
    alignItems: "flex-start",
  },
  bubbleUser: { alignSelf: "flex-end", borderBottomRightRadius: 4 },
  bubbleAI: { alignSelf: "flex-start", borderBottomLeftRadius: 4 },
  aiDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
    flexShrink: 0,
  },
  bubbleText: { fontSize: 15, fontFamily: "Inter_400Regular", lineHeight: 22, flex: 1 },
  quickWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  quickChip: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  quickText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    paddingHorizontal: 14,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    maxHeight: 120,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
});
