import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
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
import { buildNavigationContext, ACTION_ROUTES_GUIDE, NAV_INTENT_MAP } from "@/lib/platformKnowledge";
import { useSuperApp } from "@/lib/superapp/SuperAppContext";
import { getCurrentPage, type PageInfo } from "@/lib/pageTracker";
import {
  AFUAI_BOT_ID,
  AFUAI_CONV_ID,
  loadAIHistory,
  saveAIMessage,
  updateAILastMessage,
  clearAIHistory,
  clearAIUnread,
  ensureAIChatExists,
} from "@/lib/aiChatStore";
import {
  saveMemory,
  loadMemories,
  formatMemoriesForPrompt,
  type AIMemory,
} from "@/lib/aiMemory";

type Role = "user" | "assistant";

type ActionButton = { label: string; route: string };
type DoAction = { type: string; params: string[] };

type ChatMessage = {
  id: string;
  role: Role;
  content: string;
  ts: number;
  suggestions?: string[];
  actions?: ActionButton[];
  isThinking?: boolean;
  isPageNotice?: boolean;
};

const HOME_PATHNAME = "/";

const WELCOME: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "Hi! I'm **AfuAI** — your intelligent assistant inside AfuChat.\n\nI can help with anything: writing, coding, math, research, translations, and everything AfuChat-related.\n\nI can also **take actions** — tap any action button I suggest to navigate, open features, or do things inside the app instantly.\n\nI also **remember things across sessions** — just say *\"remember I prefer dark themes\"* or *\"remember my shop is called X\"* and I'll keep it for all future chats.\n\nWhat can I help you with?",
  ts: Date.now(),
  suggestions: [
    "What's on the current page?",
    "What is my Nexa balance?",
    "How do I send ACoins?",
    "Write a caption for my post",
  ],
};

// ─── System prompt ────────────────────────────────────────────────────────────

function buildSystemPrompt(userCtx: string, page: PageInfo, recentHistory: string, memoriesText?: string): string {
  const platform = buildNavigationContext();

  const pageCtx = page.pathname !== HOME_PATHNAME
    ? `
CURRENT PAGE — THE USER IS LOOKING AT THIS RIGHT NOW:
• Page name: "${page.name}"
• What it does: ${page.summary}
${page.actions && page.actions.length > 0
  ? `• Available actions on this page:\n${page.actions.map(a => `  - ${a}`).join("\n")}`
  : ""}

If the user asks "what is this page?", "what can I do here?", "explain this screen", or anything similar,
give a helpful breakdown using the above context. You know exactly what screen they are on.
`
    : "";

  const memoriesSection = memoriesText
    ? `\n═══ USER LONG-TERM MEMORY (preferences & facts the user has asked you to remember) ═══\n${memoriesText}\nAlways apply these memories naturally — e.g. if the user said they prefer dark themes, lean that way in design suggestions. Never explicitly announce that you're using a memory unless the user asks.\n`
    : "";

  return `You are AfuAI — a highly capable, accurate AI assistant built directly into AfuChat, a social super-app from Uganda.

You are NOT just a chatbot. You can take real in-app actions for the user by outputting [ACTION] buttons. When the user wants to navigate, open a feature, or do something in the app, ALWAYS provide the matching [ACTION] button — they are tappable and will immediately take the user there.

═══ USER ACCOUNT DATA (reference only when user asks) ═══
${userCtx || "Not loaded yet — user has not asked about their account."}
${memoriesSection}
═══ CURRENT SCREEN ═══
${pageCtx || "User is on the Home Feed."}

═══ PLATFORM KNOWLEDGE ═══
${platform}

${ACTION_ROUTES_GUIDE}

═══ HOW TO USE ACTIONS ═══
• ALWAYS add [ACTION:Go to Wallet:/wallet] if the user asks about balance, ACoins, payments
• ALWAYS add [ACTION:Top Up:/wallet/topup] if user wants to add credits
• ALWAYS add [ACTION:New Message:/chat/new] if user wants to message someone
• ALWAYS add [ACTION:Search:/search] if user wants to find people or content
• ALWAYS add [ACTION:Edit Profile:/profile/edit] if user wants to change their profile
• ALWAYS add [ACTION:Post:/moments/create] if user wants to create content
• ALWAYS add [ACTION:View Profile:/@{handle}] when mentioning a specific user
• For any navigation request, provide the matching [ACTION] button — never just describe where to go
• You can include up to 3 action buttons per response

═══ FORMATTING ═══
Use rich text for structured answers:
• **bold** for emphasis, *italic* for secondary, ## Heading, ### Subheading
• - bullet lists, 1. numbered lists, \`inline code\`
Keep conversational answers as plain prose. Use formatting only when it genuinely helps.

═══ SPECIAL RESPONSE TAGS (append at end, never mid-text) ═══
• [SUGGEST:Follow-up question] — up to 3 natural follow-ups (never the same as what was just asked)
• [ACTION:Button Label:/route] — tappable in-app navigation button (minimizes this mini app, opens the route)
• [NAV:/route] — instantly auto-navigate WITHOUT a button (use sparingly when user says "take me to…" or "open…")
• [DO:follow:@handle] — follow a user on the user's behalf (only when user explicitly asks)
• [DO:unfollow:@handle] — unfollow a user on the user's behalf
• [DO:post:text content] — publish a text post as the user (only when user explicitly asks to post)
• [DO:msg:@handle:message text] — open a DM to a user
• [MEMORY:key:value] — save a preference or fact to long-term memory ONLY when the user explicitly says "remember…" or "don't forget…" (e.g. "remember I prefer dark themes" → [MEMORY:theme preference:dark themes]; "remember my shop is called AfuTech" → [MEMORY:shop name:AfuTech]). Use a short descriptive key (max 50 chars). Never save memories speculatively.

═══ RULES ═══
1. NEVER write raw route paths (/wallet, /chat/new) in your prose — use [ACTION] tags only
2. Be direct, accurate, and genuinely helpful. Never be vague or evasive.
3. If the user asks about a page, feature, or how to do something — give a specific, actionable answer
4. Use the platform knowledge to give accurate answers about AfuChat features
5. You can tell the user about specific costs, features, and how things work
6. Always be warm and professional — you represent AfuChat
7. [ACTION] buttons auto-minimize this panel and open the destination — always use them for in-app navigation
8. Only emit [DO] tags when the user EXPLICITLY asks you to perform that action — never speculatively act
9. When using a [DO] tag, tell the user in your response text what action you are performing`;
}

// ─── Response parser ──────────────────────────────────────────────────────────

type MemoryTag = { key: string; value: string };

function parseResponse(raw: string): {
  text: string;
  suggestions: string[];
  actions: ActionButton[];
  autoNav?: string;
  doActions: DoAction[];
  memoryTags: MemoryTag[];
} {
  let text = raw;
  const suggestions: string[] = [];
  const actions: ActionButton[] = [];
  const doActions: DoAction[] = [];
  const memoryTags: MemoryTag[] = [];
  let autoNav: string | undefined;

  // Parse [ACTION:Label:/route]
  text = text.replace(/\[ACTION:([^\]:]+):([^\]]+)\]/g, (_, label, route) => {
    const trimmedRoute = route.trim();
    if (actions.length < 3) actions.push({ label: label.trim(), route: trimmedRoute });
    return "";
  });

  // Parse [SUGGEST:text]
  text = text.replace(/\[SUGGEST:([^\]]+)\]/g, (_, s) => {
    const t = s.trim();
    if (t && suggestions.length < 3) suggestions.push(t);
    return "";
  });

  // Parse [NAV:/route] for instant auto-navigation (no button, just navigate)
  text = text.replace(/\[NAV:([^\]]+)\]/g, (_, route) => {
    if (!autoNav) autoNav = route.trim();
    return "";
  });

  // Parse [DO:type:params] for write actions (follow, post, message, etc.)
  text = text.replace(/\[DO:([^\]:]+):([^\]]*)\]/g, (_, type, rest) => {
    const colonIdx = rest.indexOf(":");
    const params = colonIdx >= 0
      ? [rest.slice(0, colonIdx).trim(), rest.slice(colonIdx + 1).trim()]
      : [rest.trim()];
    doActions.push({ type: type.trim().toLowerCase(), params });
    return "";
  });

  // Parse [MEMORY:key:value] for long-term memory saves
  text = text.replace(/\[MEMORY:([^\]:]{1,120}):([^\]]{1,500})\]/g, (_, key, value) => {
    const k = key.trim();
    const v = value.trim();
    if (k && v) memoryTags.push({ key: k, value: v });
    return "";
  });

  // Strip any unknown tags
  text = text.replace(/\[[A-Z_]+:[^\]]*\]/g, "").trim();

  return { text, suggestions, actions, autoNav, doActions, memoryTags };
}

// ─── Write action executor ─────────────────────────────────────────────────────

async function handleDoAction(
  da: DoAction,
  userId: string,
  navOutside: (route: string, params?: Record<string, string>) => void,
): Promise<void> {
  const { type, params } = da;

  if (type === "follow" || type === "unfollow") {
    const handle = (params[0] || "").replace(/^@/, "").trim();
    if (!handle) return;
    const { data: target } = await supabase
      .from("profiles")
      .select("id")
      .eq("handle", handle)
      .maybeSingle();
    if (!target) return;
    if (type === "follow") {
      await supabase.from("follows").upsert(
        { follower_id: userId, following_id: target.id },
        { onConflict: "follower_id,following_id" },
      );
    } else {
      await supabase.from("follows")
        .delete()
        .eq("follower_id", userId)
        .eq("following_id", target.id);
    }
    return;
  }

  if (type === "post") {
    const content = params.join(":").trim();
    if (!content) return;
    await supabase.from("posts").insert({ author_id: userId, content, type: "text" });
    return;
  }

  if (type === "msg" || type === "message") {
    navOutside("/chat/new");
    return;
  }
}

// ─── User context builder ─────────────────────────────────────────────────────

async function buildUserContext(userId: string, profile: any): Promise<string> {
  if (!userId || !profile) return "";
  try {
    const [fcRes, fgRes, postsRes, walletRes] = await Promise.all([
      supabase.from("follows").select("id", { count: "exact", head: true }).eq("following_id", userId),
      supabase.from("follows").select("id", { count: "exact", head: true }).eq("follower_id", userId),
      supabase.from("posts").select("id", { count: "exact", head: true }).eq("author_id", userId),
      supabase.from("wallets").select("acoin_balance, xp").eq("user_id", userId).maybeSingle(),
    ]);
    const wallet = walletRes.data;
    return [
      `Name: ${profile.display_name}`,
      `Handle: @${profile.handle}`,
      `Nexa (XP): ${wallet?.xp ?? profile.xp ?? 0}`,
      `ACoin Balance: ${wallet?.acoin_balance ?? profile.acoin ?? 0}`,
      `Grade: ${profile.current_grade || "Newcomer"}`,
      `Followers: ${fcRes.count ?? 0}`,
      `Following: ${fgRes.count ?? 0}`,
      `Total Posts: ${postsRes.count ?? 0}`,
    ].join(" | ");
  } catch {
    return `Name: ${profile.display_name} | Handle: @${profile.handle}`;
  }
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AfuAIApp() {
  const { colors, accent } = useTheme();
  const { user, profile } = useAuth();
  const insets = useSafeAreaInsets();
  const { activeAppId, navigateOutside } = useSuperApp();

  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  // Page tracking
  const [activePage, setActivePage] = useState<PageInfo>(() => getCurrentPage());
  const prevPathnameRef = useRef<string>("");

  const listRef = useRef<FlatList>(null);
  const userCtxRef = useRef<string>("");
  const memoriesRef = useRef<string>("");

  const scrollToEnd = useCallback((animated = true) => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated }), 80);
  }, []);

  // ── Load history + memories from SQLite on first mount ───────────────────
  useEffect(() => {
    if (historyLoaded || !user) return;
    (async () => {
      const [history, memories] = await Promise.all([
        loadAIHistory(80),
        loadMemories(),
      ]);
      if (history.length > 0) {
        const loaded: ChatMessage[] = history.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          ts: new Date(m.sent_at).getTime(),
        }));
        setMessages([WELCOME, ...loaded]);
      }
      memoriesRef.current = formatMemoriesForPrompt(memories);
      setHistoryLoaded(true);
    })();
  }, [user, historyLoaded]);

  // ── Page tracking: fires when this mini app becomes active ─────────────────
  useEffect(() => {
    if (activeAppId !== "afuai") return;

    const page = getCurrentPage();
    setActivePage(page);
    clearAIUnread().catch(() => {});

    if (
      prevPathnameRef.current &&
      prevPathnameRef.current !== page.pathname &&
      page.pathname !== HOME_PATHNAME
    ) {
      const noticeId = `${Date.now()}-nav`;
      const notice: ChatMessage = {
        id: noticeId,
        role: "assistant",
        content: `📍 You're now on **${page.name}**.\n${page.summary}`,
        ts: Date.now(),
        isPageNotice: true,
        suggestions: [
          `What can I do on ${page.name}?`,
          `Help me with something on this page`,
        ],
      };
      setMessages((prev) => [...prev, notice]);
      setTimeout(() => scrollToEnd(), 150);
    }

    prevPathnameRef.current = page.pathname;
  }, [activeAppId, scrollToEnd]);

  // ── Send message ──────────────────────────────────────────────────────────
  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || loading) return;
      setInput("");

      const page = getCurrentPage();
      setActivePage(page);

      const now = new Date().toISOString();
      const userMsgId = `${Date.now()}-user`;
      const thinkingId = `${Date.now()}-thinking`;

      const userMsg: ChatMessage = {
        id: userMsgId,
        role: "user",
        content: trimmed,
        ts: Date.now(),
      };
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

      // Save user message to SQLite
      if (user) {
        saveAIMessage({ id: userMsgId, role: "user", content: trimmed, sentAt: now, userId: user.id }).catch(() => {});
        updateAILastMessage(trimmed, now, true).catch(() => {});
      }

      // Build user context if not loaded
      if (!userCtxRef.current && user && profile) {
        userCtxRef.current = await buildUserContext(user.id, profile);
      }

      // Build system prompt fresh with current page context + memories
      const systemPrompt = buildSystemPrompt(userCtxRef.current, page, "", memoriesRef.current || undefined);

      // Collect conversation history for the API (last 12 exchanges)
      setMessages((prev) => {
        const history = prev
          .filter((m) => !m.isThinking && m.id !== "welcome" && !m.isPageNotice)
          .filter((m) => m.role === "user" || m.role === "assistant")
          .slice(-12)
          .map((m) => ({ role: m.role, content: m.content }));

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
                max_tokens: 900,
              }),
            });

            const rawReply: string = res.ok
              ? ((await res.json()).reply || "Sorry, I had trouble processing that. Please try again.").trim()
              : "I couldn't connect right now. Please check your connection and try again.";

            const parsed = parseResponse(rawReply);
            const aiMsgId = `${Date.now()}-ai`;
            const aiSentAt = new Date().toISOString();

            const aiMsg: ChatMessage = {
              id: aiMsgId,
              role: "assistant",
              content: parsed.text,
              ts: Date.now(),
              suggestions: parsed.suggestions,
              actions: parsed.actions,
            };

            setMessages((p) => [...p.filter((m) => m.id !== thinkingId), aiMsg]);

            // Save AI response to SQLite
            if (user) {
              saveAIMessage({
                id: aiMsgId,
                role: "assistant",
                content: parsed.text,
                sentAt: aiSentAt,
                userId: user.id,
              }).catch(() => {});
              updateAILastMessage(parsed.text, aiSentAt, false).catch(() => {});
            }

            // Auto-navigate if the AI returned a [NAV:] tag — minimize mini app first
            if (parsed.autoNav) {
              navigateOutside(parsed.autoNav);
            }

            // Persist any memories the AI emitted
            if (parsed.memoryTags && parsed.memoryTags.length > 0) {
              for (const { key, value } of parsed.memoryTags) {
                saveMemory(key, value).catch(() => {});
              }
              // Refresh the in-memory cache so the next message sees the new memories
              loadMemories().then((mems) => {
                memoriesRef.current = formatMemoriesForPrompt(mems);
              }).catch(() => {});
            }

            // Execute any write actions the AI returned
            if (parsed.doActions && parsed.doActions.length > 0 && user) {
              for (const da of parsed.doActions) {
                handleDoAction(da, user.id, navigateOutside).catch(() => {});
              }
            }
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
    },
    [loading, user, profile, scrollToEnd, navigateOutside]
  );

  // ── Handle action button tap — minimize mini app first, then navigate ────
  const handleAction = useCallback((action: ActionButton) => {
    navigateOutside(action.route);
  }, [navigateOutside]);

  const clearHistory = useCallback(async () => {
    setMessages([WELCOME]);
    userCtxRef.current = "";
    await clearAIHistory();
    // Note: memories are intentionally NOT cleared with chat history —
    // they are long-term preferences that should survive conversation resets.
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: ChatMessage }) => {
      const isUser = item.role === "user";
      if (item.isThinking) return <ThinkingBubble colors={colors} accent={accent} />;

      if (item.isPageNotice) {
        return (
          <View style={[styles.pageNoticePill, { borderLeftColor: accent, backgroundColor: accent + "0D" }]}>
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
                colors={["#6C47FF", "#1f95ff"]}
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

          {/* Suggestion chips */}
          {!isUser && item.suggestions && item.suggestions.length > 0 && (
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

          {/* Action buttons — these actually navigate */}
          {!isUser && item.actions && item.actions.length > 0 && (
            <View style={styles.actionRow}>
              {item.actions.map((a) => (
                <TouchableOpacity
                  key={a.label}
                  onPress={() => handleAction(a)}
                  style={[styles.actionBtn, { backgroundColor: accent + "18", borderColor: accent + "55" }]}
                  activeOpacity={0.7}
                >
                  <Ionicons name="arrow-forward-circle" size={13} color={accent} />
                  <Text style={[styles.actionBtnText, { color: accent }]}>{a.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      );
    },
    [colors, accent, sendMessage, handleAction]
  );

  const isOnPage = activePage.pathname !== HOME_PATHNAME;

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.background }]}
      behavior="height"
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <LinearGradient
          colors={["#6C47FF", "#1f95ff"]}
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

        {/* "This page" quick button */}
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

// ─── Sub-components ─────────────────────────────────────────────────────────────

function ThinkingBubble({ colors, accent }: { colors: any; accent: string }) {
  return (
    <View style={styles.bubbleWrap}>
      <View style={[styles.bubble, styles.bubbleAI, { backgroundColor: colors.surface }]}>
        <LinearGradient
          colors={["#6C47FF", "#1f95ff"]}
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

// ─── Styles ─────────────────────────────────────────────────────────────────────

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
    flexDirection: "column", gap: 4,
    marginHorizontal: 4, marginVertical: 6,
    paddingHorizontal: 12, paddingVertical: 10,
    borderRadius: 14, borderLeftWidth: 3,
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
  bubbleAI:  { alignSelf: "flex-start", borderBottomLeftRadius: 4 },
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
  suggestionRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6, paddingLeft: 4 },
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
    paddingHorizontal: 10, paddingVertical: 7,
  },
  actionBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
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
    fontFamily: "monospace",
    fontSize: 13, backgroundColor: "#00000010",
    borderRadius: 4, paddingHorizontal: 4,
  },
});
