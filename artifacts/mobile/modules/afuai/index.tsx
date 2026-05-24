import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "@/components/ui/SafeGradient";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { getEdgeFnBase, edgeHeaders } from "@/lib/aiHelper";
import { buildNavigationContext, ACTION_ROUTES_GUIDE } from "@/lib/platformKnowledge";
import { useSuperApp } from "@/lib/superapp/SuperAppContext";
import { getCurrentPage, type PageInfo } from "@/lib/pageTracker";

type Role = "user" | "assistant" | "system";

type ChatMessage = {
  id: string;
  role: Role;
  content: string;
  ts: number;
  suggestions?: string[];
  actions?: { label: string; route: string }[];
  isThinking?: boolean;
  isPageNotice?: boolean;
};

const HOME_PATHNAME = "/";

const WELCOME: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "Hi! I'm **AfuAI** — your intelligent assistant inside AfuChat.\n\nI can help with writing, coding, math, translations, research, creative work, wallet questions, and anything AfuChat-related.\n\nWhat can I help you with?",
  ts: Date.now(),
  suggestions: [
    "Write a caption for my post",
    "What is my Nexa balance?",
    "How do I send ACoin?",
    "Translate to French",
  ],
};

function buildSystemPrompt(userCtx: string, page: PageInfo): string {
  const platform = buildNavigationContext();

  const pageCtx = page.pathname !== HOME_PATHNAME
    ? `\nCURRENT PAGE CONTEXT:\nThe user is currently viewing the "${page.name}" screen.\n${page.summary}\nIf the user asks "what is this page?", "what can I do here?", "tell me about this page", or any similar question, answer using this context.\n`
    : "";

  return `You are AfuAI, a capable and professional AI assistant built into AfuChat — a social super-app from Uganda. You can help with anything: writing, coding, math, advice, research, creative work, translations, general questions, and more.

You have access to the user's AfuChat account data below. Only reference it when the user asks about their account, balance, transactions, followers, or anything platform-related.

${userCtx}
${pageCtx}
PLATFORM KNOWLEDGE — use this to answer any question about how the app works, where to find features, or how to navigate:
${platform}

${ACTION_ROUTES_GUIDE}

FORMATTING — you can use rich text in your responses:
- **bold**, *italic*
- ## Heading, ### Subheading
- - bullet list items
- 1. numbered list items

SPECIAL TAGS — append these at the end of your response when relevant:
- [SUGGEST:Follow-up question] — add up to 3 natural follow-up suggestions
- [ACTION:Button label:/route] — add a tappable in-app navigation button

STRICT RULES:
- NEVER write raw route paths in your text body. If navigation is needed, use [ACTION:...] tags only.
- Answer like a knowledgeable professional — direct, clear, and genuinely helpful.
- Use formatting for structured answers. Keep conversational replies as plain prose.
- Keep your tone professional and warm. Never be dismissive or overly promotional.`;
}

function parseTags(raw: string): { text: string; suggestions: string[]; actions: { label: string; route: string }[] } {
  let text = raw;
  const suggestions: string[] = [];
  const actions: { label: string; route: string }[] = [];

  text = text.replace(/\[ACTION:([^\]:]+):([^\]]+)\]/g, (_, label, route) => {
    actions.push({ label: label.trim(), route: route.trim() });
    return "";
  });
  text = text.replace(/\[SUGGEST:([^\]]+)\]/g, (_, s) => {
    const t = s.trim();
    if (t && suggestions.length < 3) suggestions.push(t);
    return "";
  });
  text = text.replace(/\[[A-Z]+:[^\]]*\]/g, "").trim();

  return { text, suggestions, actions };
}

async function buildUserContext(userId: string, profile: any): Promise<string> {
  if (!userId || !profile) return "";
  try {
    const [fcRes, fgRes, postsRes] = await Promise.all([
      supabase.from("follows").select("id", { count: "exact", head: true }).eq("following_id", userId),
      supabase.from("follows").select("id", { count: "exact", head: true }).eq("follower_id", userId),
      supabase.from("posts").select("id", { count: "exact", head: true }).eq("author_id", userId),
    ]);
    return [
      `USER CONTEXT:`,
      `- Name: ${profile.display_name}`,
      `- Handle: @${profile.handle}`,
      `- Nexa (XP): ${profile.xp || 0}`,
      `- ACoin: ${profile.acoin || 0}`,
      `- Grade: ${profile.current_grade || "Newcomer"}`,
      `- Followers: ${fcRes.count || 0}, Following: ${fgRes.count || 0}, Posts: ${postsRes.count || 0}`,
    ].join("\n");
  } catch {
    return `USER CONTEXT:\n- Name: ${profile.display_name}\n- Handle: @${profile.handle}`;
  }
}

export default function AfuAIApp() {
  const { colors, accent } = useTheme();
  const { user, profile } = useAuth();
  const insets = useSafeAreaInsets();
  const { activeAppId } = useSuperApp();

  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  // Page tracking
  const [activePage, setActivePage] = useState<PageInfo>(() => getCurrentPage());
  const prevPathnameRef = useRef<string>("");

  const listRef = useRef<FlatList>(null);
  const userCtxRef = useRef<string>("");

  const scrollToEnd = useCallback((animated = true) => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated }), 100);
  }, []);

  // ── Page tracking: fire when this mini app becomes active ─────────────────
  useEffect(() => {
    if (activeAppId !== "afuai") return;

    const page = getCurrentPage();
    setActivePage(page);

    // If user navigated to a different page while AI was minimised, inject
    // a friendly page-notice message into the chat.
    if (
      prevPathnameRef.current &&
      prevPathnameRef.current !== page.pathname &&
      page.pathname !== HOME_PATHNAME
    ) {
      const notice: ChatMessage = {
        id: `${Date.now()}-nav`,
        role: "assistant",
        content: `📍 You're now on **${page.name}**.\n${page.summary}`,
        ts: Date.now(),
        isPageNotice: true,
        suggestions: [
          `What can I do on this page?`,
          `Tell me more about ${page.name}`,
        ],
      };
      setMessages((prev) => [...prev, notice]);
      setTimeout(() => scrollToEnd(), 150);
    }

    prevPathnameRef.current = page.pathname;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeAppId]);

  // ── Send message ──────────────────────────────────────────────────────────
  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || loading) return;
      setInput("");

      const page = getCurrentPage();
      setActivePage(page);

      const userMsg: ChatMessage = {
        id: `${Date.now()}-user`,
        role: "user",
        content: trimmed,
        ts: Date.now(),
      };
      const thinkingId = `${Date.now()}-thinking`;
      const thinkingMsg: ChatMessage = {
        id: thinkingId,
        role: "assistant",
        content: "",
        ts: Date.now(),
        isThinking: true,
      };

      setMessages((prev) => [...prev, userMsg, thinkingMsg]);
      setLoading(true);
      scrollToEnd();

      try {
        if (!userCtxRef.current && user && profile) {
          userCtxRef.current = await buildUserContext(user.id, profile);
        }

        // Rebuild system prompt each send so page context is always fresh
        const systemPrompt = buildSystemPrompt(userCtxRef.current, page);

        setMessages((prev) => {
          const history = prev
            .filter((m) => !m.isThinking && m.id !== "welcome" && !m.isPageNotice && (m.role === "user" || m.role === "assistant"))
            .slice(-10)
            .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

          (async () => {
            try {
              const res = await fetch(`${getEdgeFnBase()}/afu-ai-reply`, {
                method: "POST",
                headers: edgeHeaders(),
                body: JSON.stringify({
                  messages: [
                    { role: "system", content: systemPrompt },
                    ...history,
                    { role: "user", content: trimmed },
                  ],
                  max_tokens: 800,
                }),
              });

              const rawReply: string = res.ok
                ? ((await res.json()).reply || "Sorry, I couldn't process that. Please try again.").trim()
                : "Sorry, I couldn't connect to AfuAI right now. Please try again.";

              const parsed = parseTags(rawReply);

              const aiMsg: ChatMessage = {
                id: `${Date.now()}-ai`,
                role: "assistant",
                content: parsed.text,
                ts: Date.now(),
                suggestions: parsed.suggestions,
                actions: parsed.actions,
              };

              setMessages((p) => [...p.filter((m) => m.id !== thinkingId), aiMsg]);
            } catch {
              setMessages((p) => [
                ...p.filter((m) => m.id !== thinkingId),
                {
                  id: `${Date.now()}-err`,
                  role: "assistant",
                  content: "Something went wrong. Please check your connection and try again.",
                  ts: Date.now(),
                },
              ]);
            } finally {
              setLoading(false);
              scrollToEnd();
            }
          })();

          return prev;
        });
      } catch {
        setMessages((prev) => [
          ...prev.filter((m) => m.id !== thinkingId),
          {
            id: `${Date.now()}-err`,
            role: "assistant",
            content: "Something went wrong. Please try again.",
            ts: Date.now(),
          },
        ]);
        setLoading(false);
        scrollToEnd();
      }
    },
    [loading, user, profile, scrollToEnd]
  );

  const clearHistory = useCallback(() => {
    setMessages([WELCOME]);
    userCtxRef.current = "";
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: ChatMessage }) => {
      const isUser = item.role === "user";
      if (item.isThinking) return <ThinkingBubble colors={colors} accent={accent} />;

      // Page-notice pill — a compact contextual announcement, not a full bubble
      if (item.isPageNotice) {
        return (
          <View style={[styles.pageNoticePill, { borderLeftColor: accent, backgroundColor: accent + "0D" }]}>
            <Ionicons name="location-outline" size={12} color={accent} />
            <View style={{ flex: 1 }}>
              <SimpleMarkdown text={item.content} color={colors.text} />
            </View>
            {item.suggestions && item.suggestions.length > 0 && (
              <View style={[styles.suggestionRow, { marginTop: 8 }]}>
                {item.suggestions.map((s) => (
                  <Pressable
                    key={s}
                    onPress={() => sendMessage(s)}
                    style={[styles.suggestionChip, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}
                  >
                    <Ionicons name="sparkles-outline" size={11} color={accent} />
                    <Text style={[styles.suggestionText, { color: colors.text }]}>{s}</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        );
      }

      return (
        <View style={styles.bubbleWrap}>
          <View
            style={[
              styles.bubble,
              isUser
                ? [styles.bubbleUser, { backgroundColor: accent }]
                : [styles.bubbleAI, { backgroundColor: colors.surface }],
            ]}
          >
            {!isUser && (
              <LinearGradient
                colors={["#6C47FF", "#00BCD4"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.aiBadge}
              >
                <Ionicons name="sparkles" size={9} color="#fff" />
              </LinearGradient>
            )}
            <View style={styles.bubbleBody}>
              <SimpleMarkdown text={item.content} color={isUser ? "#fff" : colors.text} />
            </View>
          </View>

          {item.suggestions && item.suggestions.length > 0 && (
            <View style={styles.suggestionRow}>
              {item.suggestions.map((s) => (
                <Pressable
                  key={s}
                  onPress={() => sendMessage(s)}
                  style={[styles.suggestionChip, { backgroundColor: colors.surface, borderColor: colors.border }]}
                >
                  <Ionicons name="sparkles-outline" size={11} color={accent} />
                  <Text style={[styles.suggestionText, { color: colors.text }]}>{s}</Text>
                </Pressable>
              ))}
            </View>
          )}

          {item.actions && item.actions.length > 0 && (
            <View style={styles.actionRow}>
              {item.actions.map((a) => (
                <TouchableOpacity
                  key={a.label}
                  style={[styles.actionBtn, { backgroundColor: accent + "18", borderColor: accent + "55" }]}
                  activeOpacity={0.7}
                >
                  <Ionicons name="arrow-forward-circle-outline" size={13} color={accent} />
                  <Text style={[styles.actionBtnText, { color: accent }]}>{a.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      );
    },
    [colors, accent, sendMessage]
  );

  const isOnPage = activePage.pathname !== HOME_PATHNAME;

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <LinearGradient
          colors={["#6C47FF", "#00BCD4"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerIcon}
        >
          <Ionicons name="sparkles" size={16} color="#fff" />
        </LinearGradient>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>AfuAI</Text>
          {isOnPage ? (
            <View style={styles.pageTagRow}>
              <Ionicons name="location-outline" size={10} color={accent} />
              <Text style={[styles.pageTag, { color: accent }]} numberOfLines={1}>
                {activePage.name}
              </Text>
            </View>
          ) : (
            <Text style={[styles.headerSub, { color: colors.textMuted }]}>
              {loading ? "Thinking…" : "Your intelligent assistant"}
            </Text>
          )}
        </View>

        {/* "What's on this page?" quick button — only shown when on a non-home page */}
        {isOnPage && (
          <Pressable
            onPress={() => sendMessage(`What can I do on the ${activePage.name} page?`)}
            style={[styles.pageBtn, { backgroundColor: accent + "18", borderColor: accent + "40" }]}
            hitSlop={6}
          >
            <Ionicons name="help-circle-outline" size={13} color={accent} />
            <Text style={[styles.pageBtnText, { color: accent }]}>This page</Text>
          </Pressable>
        )}

        <Pressable
          onPress={clearHistory}
          style={[styles.clearBtn, { backgroundColor: colors.backgroundSecondary }]}
          hitSlop={8}
        >
          <Ionicons name="refresh-outline" size={17} color={colors.textMuted} />
        </Pressable>
      </View>

      {/* Messages */}
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        renderItem={renderItem}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 12 }]}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        keyboardDismissMode="on-drag"
      />

      {/* Input bar */}
      <View
        style={[
          styles.inputRow,
          {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
            paddingBottom: Math.max(insets.bottom, 10),
          },
        ]}
      >
        <TextInput
          style={[
            styles.input,
            { backgroundColor: colors.backgroundSecondary, color: colors.text },
          ]}
          placeholder={isOnPage ? `Ask about ${activePage.name}…` : "Ask AfuAI anything…"}
          placeholderTextColor={colors.textMuted}
          value={input}
          onChangeText={setInput}
          multiline
          maxLength={2000}
          returnKeyType="send"
          blurOnSubmit={false}
          onSubmitEditing={() => { if (input.trim()) sendMessage(input); }}
        />
        <Pressable
          onPress={() => sendMessage(input)}
          disabled={!input.trim() || loading}
          style={[
            styles.sendBtn,
            { backgroundColor: input.trim() && !loading ? accent : colors.backgroundSecondary },
          ]}
        >
          {loading ? (
            <ActivityIndicator size="small" color={colors.textMuted} />
          ) : (
            <Ionicons name="arrow-up" size={18} color={input.trim() ? "#fff" : colors.textMuted} />
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function ThinkingBubble({ colors, accent }: { colors: any; accent: string }) {
  return (
    <View style={styles.bubbleWrap}>
      <View style={[styles.bubble, styles.bubbleAI, { backgroundColor: colors.surface }]}>
        <LinearGradient
          colors={["#6C47FF", "#00BCD4"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.aiBadge}
        >
          <Ionicons name="sparkles" size={9} color="#fff" />
        </LinearGradient>
        <View style={styles.thinkingDots}>
          <View style={[styles.dot, { backgroundColor: accent }]} />
          <View style={[styles.dot, { backgroundColor: accent, opacity: 0.6 }]} />
          <View style={[styles.dot, { backgroundColor: accent, opacity: 0.3 }]} />
        </View>
      </View>
    </View>
  );
}

function SimpleMarkdown({ text, color }: { text: string; color: string }) {
  const lines = text.split("\n");
  return (
    <View style={{ gap: 2 }}>
      {lines.map((line, li) => {
        if (line.startsWith("## "))
          return <Text key={li} style={[styles.mdH2, { color }]}>{line.slice(3)}</Text>;
        if (line.startsWith("### "))
          return <Text key={li} style={[styles.mdH3, { color }]}>{line.slice(4)}</Text>;
        if (line.startsWith("- ") || line.startsWith("• "))
          return (
            <View key={li} style={styles.mdBulletRow}>
              <Text style={[styles.mdBulletDot, { color }]}>•</Text>
              <Text style={[styles.mdBody, { color, flex: 1 }]}>{inlineFormat(line.slice(2), color)}</Text>
            </View>
          );
        if (/^\d+\.\s/.test(line)) {
          const m = line.match(/^(\d+)\.\s(.*)/);
          if (m)
            return (
              <View key={li} style={styles.mdBulletRow}>
                <Text style={[styles.mdBulletDot, { color }]}>{m[1]}.</Text>
                <Text style={[styles.mdBody, { color, flex: 1 }]}>{inlineFormat(m[2], color)}</Text>
              </View>
            );
        }
        if (line.trim() === "") return <View key={li} style={{ height: 4 }} />;
        return <Text key={li} style={[styles.mdBody, { color }]}>{inlineFormat(line, color)}</Text>;
      })}
    </View>
  );
}

function inlineFormat(text: string, color: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**"))
      return <Text key={i} style={{ fontFamily: "Inter_700Bold", color }}>{part.slice(2, -2)}</Text>;
    if (part.startsWith("*") && part.endsWith("*"))
      return <Text key={i} style={{ fontFamily: "Inter_400Regular", fontStyle: "italic", color }}>{part.slice(1, -1)}</Text>;
    if (part.startsWith("`") && part.endsWith("`"))
      return <Text key={i} style={[styles.inlineCode, { color }]}>{part.slice(1, -1)}</Text>;
    return <Text key={i} style={{ fontFamily: "Inter_400Regular", color }}>{part}</Text>;
  });
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerIcon: {
    width: 34, height: 34, borderRadius: 17,
    alignItems: "center", justifyContent: "center",
  },
  headerTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  headerSub: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },
  pageTagRow: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 2 },
  pageTag: { fontSize: 11, fontFamily: "Inter_600SemiBold", flexShrink: 1 },
  pageBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    borderWidth: 1, borderRadius: 12,
    paddingHorizontal: 8, paddingVertical: 5,
  },
  pageBtnText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  clearBtn: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: "center", justifyContent: "center",
  },

  list: { padding: 12, gap: 4 },

  pageNoticePill: {
    flexDirection: "column",
    gap: 4,
    marginHorizontal: 12,
    marginVertical: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    borderLeftWidth: 3,
    backgroundColor: "transparent",
  },

  bubbleWrap: { marginBottom: 6 },
  bubble: {
    maxWidth: "85%",
    borderRadius: 18,
    padding: 12,
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-start",
  },
  bubbleUser: { alignSelf: "flex-end", borderBottomRightRadius: 4 },
  bubbleAI: { alignSelf: "flex-start", borderBottomLeftRadius: 4 },
  bubbleBody: { flex: 1 },
  aiBadge: {
    width: 18, height: 18, borderRadius: 9,
    alignItems: "center", justifyContent: "center",
    marginTop: 1, flexShrink: 0,
  },
  thinkingDots: {
    flexDirection: "row", gap: 5, alignItems: "center",
    paddingVertical: 4, paddingHorizontal: 2,
  },
  dot: { width: 7, height: 7, borderRadius: 4 },
  suggestionRow: {
    flexDirection: "row", flexWrap: "wrap", gap: 6,
    marginTop: 6, paddingLeft: 4,
  },
  suggestionChip: {
    flexDirection: "row", alignItems: "center", gap: 4,
    borderWidth: 1, borderRadius: 16,
    paddingHorizontal: 10, paddingVertical: 6,
  },
  suggestionText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  actionRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6, paddingLeft: 4 },
  actionBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    borderWidth: 1, borderRadius: 12,
    paddingHorizontal: 10, paddingVertical: 6,
  },
  actionBtnText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  inputRow: {
    flexDirection: "row", alignItems: "flex-end",
    gap: 10, paddingHorizontal: 12, paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1, borderRadius: 22,
    paddingHorizontal: 16, paddingVertical: 10,
    fontSize: 15, fontFamily: "Inter_400Regular",
    maxHeight: 120,
  },
  sendBtn: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: "center", justifyContent: "center",
  },
  mdH2: { fontSize: 16, fontFamily: "Inter_700Bold", lineHeight: 22, marginTop: 4 },
  mdH3: { fontSize: 14, fontFamily: "Inter_700Bold", lineHeight: 20, marginTop: 2 },
  mdBody: { fontSize: 15, fontFamily: "Inter_400Regular", lineHeight: 22 },
  mdBulletRow: { flexDirection: "row", gap: 6, alignItems: "flex-start" },
  mdBulletDot: { fontSize: 15, fontFamily: "Inter_400Regular", marginTop: 1, width: 14 },
  inlineCode: {
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    fontSize: 13, backgroundColor: "#00000010", borderRadius: 4,
    paddingHorizontal: 4,
  },
});
