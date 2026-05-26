/**
 * DesktopConversationArea
 *
 * Multi-tab conversation panel for the desktop two-pane chat layout.
 * Shows a tab bar at the top (one tab per open conversation) and renders
 * the active conversation below. When no tabs are open it shows a branded
 * empty-state placeholder.
 */

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Image as ExpoImage } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "@/components/ui/SafeGradient";
import { router } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/hooks/useTheme";
import { Avatar } from "@/components/ui/Avatar";
import VerifiedBadge from "@/components/ui/VerifiedBadge";

const BRAND = "#00BCD4";
const PAGE_SIZE = 40;

// ─── Types ────────────────────────────────────────────────────────────────────

export type OpenTab = {
  chatId: string;
  otherName: string;
  otherAvatar: string | null;
  isGroup: boolean;
  isChannel: boolean;
  otherId: string;
  chatName: string;
  chatAvatar: string | null;
  isVerified?: boolean;
  isOrgVerified?: boolean;
};

type Message = {
  id: string;
  chat_id: string;
  sender_id: string;
  encrypted_content: string;
  sent_at: string;
  reply_to_message_id: string | null;
  attachment_url: string | null;
  attachment_type: string | null;
  edited_at: string | null;
  _pending?: boolean;
  profiles: {
    display_name: string;
    avatar_url: string | null;
    handle: string;
  } | null;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 86400000) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (diff < 604800000) return ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][d.getDay()];
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function groupByDate(messages: Message[]) {
  const groups: { label: string; messages: Message[] }[] = [];
  let lastLabel = "";
  for (const msg of messages) {
    const d = new Date(msg.sent_at);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    let label = diff < 86400000
      ? "Today"
      : diff < 172800000
        ? "Yesterday"
        : d.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });
    if (label !== lastLabel) {
      groups.push({ label, messages: [] });
      lastLabel = label;
    }
    groups[groups.length - 1].messages.push(msg);
  }
  return groups;
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function ChatPlaceholder() {
  const { colors, isDark } = useTheme();
  const afuSymbol = require("@/assets/images/afu-symbol.png");
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32, backgroundColor: colors.background }}>
      <LinearGradient
        colors={[BRAND + "20", BRAND + "06"]}
        style={{ width: 120, height: 120, borderRadius: 60, alignItems: "center", justifyContent: "center", marginBottom: 20 }}
      >
        <Image
          source={afuSymbol}
          style={{ width: 72, height: 72 }}
          resizeMode="contain"
          tintColor={BRAND + "88"}
        />
      </LinearGradient>
      <Text style={{ fontSize: 22, fontFamily: "Inter_700Bold", color: colors.text, marginBottom: 8, textAlign: "center" }}>
        Your messages
      </Text>
      <Text style={{ fontSize: 14, color: colors.textSecondary, textAlign: "center", lineHeight: 21, maxWidth: 280 }}>
        Select a conversation from the list to start messaging, or compose a new one.
      </Text>
      <TouchableOpacity
        onPress={() => router.push("/chat/new" as any)}
        style={{ marginTop: 24, backgroundColor: BRAND, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 11, flexDirection: "row", alignItems: "center", gap: 7 }}
        activeOpacity={0.82}
      >
        <Ionicons name="create-outline" size={18} color="#fff" />
        <Text style={{ color: "#fff", fontSize: 14, fontFamily: "Inter_700Bold" }}>New Conversation</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Message bubble ───────────────────────────────────────────────────────────

function MessageBubble({ msg, isMe, showAvatar, isGroup, colors, isDark }: {
  msg: Message;
  isMe: boolean;
  showAvatar: boolean;
  isGroup: boolean;
  colors: any;
  isDark: boolean;
}) {
  const bubbleBg = isMe
    ? BRAND
    : isDark ? "#2C2C2E" : "#F0F0F0";
  const textColor = isMe ? "#fff" : colors.text;
  const timeColor = isMe ? "rgba(255,255,255,0.65)" : colors.textMuted;

  return (
    <View style={{
      flexDirection: "row",
      alignItems: "flex-end",
      gap: 7,
      marginBottom: 2,
      justifyContent: isMe ? "flex-end" : "flex-start",
      paddingHorizontal: 16,
    }}>
      {/* Sender avatar (group chats, left side) */}
      {!isMe && isGroup && (
        <View style={{ width: 28, alignItems: "center" }}>
          {showAvatar && (
            <Avatar
              uri={msg.profiles?.avatar_url ?? null}
              name={msg.profiles?.display_name ?? "?"}
              size={28}
            />
          )}
        </View>
      )}

      <View style={{ maxWidth: "68%" }}>
        {/* Sender name in group chats */}
        {!isMe && isGroup && showAvatar && (
          <Text style={{ fontSize: 11, color: BRAND, fontFamily: "Inter_600SemiBold", marginBottom: 3, marginLeft: 4 }}>
            {msg.profiles?.display_name ?? "Unknown"}
          </Text>
        )}

        {/* Bubble */}
        <View style={{
          backgroundColor: bubbleBg,
          borderRadius: 18,
          borderBottomRightRadius: isMe ? 4 : 18,
          borderBottomLeftRadius: isMe ? 18 : 4,
          paddingHorizontal: 13,
          paddingVertical: 8,
          alignSelf: isMe ? "flex-end" : "flex-start",
        }}>
          {/* Attachment */}
          {msg.attachment_url && (
            <ExpoImage
              source={{ uri: msg.attachment_url }}
              style={{ width: 220, height: 160, borderRadius: 10, marginBottom: 6 }}
              contentFit="cover"
              cachePolicy="memory-disk"
            />
          )}

          {/* Text */}
          {!!msg.encrypted_content && (
            <Text style={{ color: textColor, fontSize: 14, lineHeight: 21 }}>
              {msg.encrypted_content}
            </Text>
          )}
        </View>

        {/* Timestamp */}
        <Text style={{
          fontSize: 10,
          color: timeColor,
          marginTop: 2,
          marginHorizontal: 4,
          alignSelf: isMe ? "flex-end" : "flex-start",
        }}>
          {fmtTime(msg.sent_at)}
          {msg._pending && " · sending…"}
          {msg.edited_at && " · edited"}
        </Text>
      </View>
    </View>
  );
}

// ─── Conversation pane ────────────────────────────────────────────────────────

function ConversationPane({ tab, onClose }: { tab: OpenTab; onClose: () => void }) {
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [isOnline, setIsOnline] = useState(false);
  const listRef = useRef<FlatList<any>>(null);
  const typingRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const channelRef = useRef<any>(null);
  const myTypingRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const chatId = tab.chatId;
  const displayName = tab.isGroup ? (tab.chatName || tab.otherName) : tab.otherName;
  const avatarUrl = tab.isGroup ? tab.chatAvatar : tab.otherAvatar;

  // ── Load messages ────────────────────────────────────────────────────────
  const loadMessages = useCallback(async () => {
    if (!chatId) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from("messages")
        .select("id, chat_id, sender_id, encrypted_content, sent_at, reply_to_message_id, attachment_url, attachment_type, edited_at, profiles!messages_sender_id_fkey(display_name, avatar_url, handle)")
        .eq("chat_id", chatId)
        .order("sent_at", { ascending: true })
        .limit(PAGE_SIZE);
      if (data) setMessages(data as any);
    } finally {
      setLoading(false);
    }
  }, [chatId]);

  useEffect(() => { loadMessages(); }, [loadMessages]);

  // ── Realtime subscription ─────────────────────────────────────────────────
  useEffect(() => {
    if (!chatId || !user?.id) return;

    channelRef.current = supabase
      .channel(`desktop-chat-${chatId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `chat_id=eq.${chatId}`,
      }, async (payload: any) => {
        const newMsg = payload.new as Message;
        if (!newMsg.profiles) {
          const { data: p } = await supabase
            .from("profiles")
            .select("display_name, avatar_url, handle")
            .eq("id", newMsg.sender_id)
            .single();
          (newMsg as any).profiles = p;
        }
        setMessages((prev) => {
          if (prev.some((m) => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
        setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
      })
      .on("broadcast", { event: "typing" }, ({ payload }: any) => {
        if (payload?.user_id === user.id) return;
        const name = payload?.display_name || "Someone";
        setTypingUsers((prev) => {
          if (prev.includes(name)) return prev;
          return [...prev, name];
        });
        if (typingRef.current) clearTimeout(typingRef.current);
        typingRef.current = setTimeout(() => setTypingUsers([]), 3000);
      })
      .subscribe();

    // Presence for online status
    const presenceChannel = supabase.channel(`presence-${tab.otherId}`)
      .on("presence", { event: "sync" }, () => {
        const state = presenceChannel.presenceState();
        setIsOnline(Object.keys(state).length > 0);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channelRef.current);
      supabase.removeChannel(presenceChannel);
      if (typingRef.current) clearTimeout(typingRef.current);
      if (myTypingRef.current) clearTimeout(myTypingRef.current);
    };
  }, [chatId, user?.id, tab.otherId]);

  // Auto-scroll on new messages
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: false }), 50);
    }
  }, [chatId]);

  // ── Send message ──────────────────────────────────────────────────────────
  const sendMessage = useCallback(async () => {
    const text = inputText.trim();
    if (!text || !user?.id || sending) return;
    setInputText("");
    setSending(true);

    const tempId = `temp-${Date.now()}`;
    const tempMsg: Message = {
      id: tempId,
      chat_id: chatId,
      sender_id: user.id,
      encrypted_content: text,
      sent_at: new Date().toISOString(),
      reply_to_message_id: null,
      attachment_url: null,
      attachment_type: null,
      edited_at: null,
      _pending: true,
      profiles: null,
    };
    setMessages((prev) => [...prev, tempMsg]);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);

    try {
      const { data } = await supabase
        .from("messages")
        .insert({
          chat_id: chatId,
          sender_id: user.id,
          encrypted_content: text,
          sent_at: new Date().toISOString(),
        })
        .select("id, chat_id, sender_id, encrypted_content, sent_at, reply_to_message_id, attachment_url, attachment_type, edited_at")
        .single();

      if (data) {
        setMessages((prev) =>
          prev.map((m) => m.id === tempId ? { ...data, profiles: null } as Message : m)
        );
      }
    } catch (_) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    } finally {
      setSending(false);
    }
  }, [inputText, user?.id, chatId, sending]);

  // Broadcast typing indicator
  const broadcastTyping = useCallback(() => {
    if (!channelRef.current || !user?.id) return;
    channelRef.current.send({
      type: "broadcast",
      event: "typing",
      payload: { user_id: user.id, display_name: user.user_metadata?.display_name || "Someone" },
    });
  }, [user]);

  // ── Render ────────────────────────────────────────────────────────────────
  const groups = groupByDate(messages);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>

      {/* ── Header ── */}
      <View style={[s.convHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => router.push({ pathname: "/chat/[id]", params: { id: chatId, otherName: displayName, otherAvatar: avatarUrl || "", otherId: tab.otherId, isGroup: tab.isGroup ? "true" : "false", isChannel: tab.isChannel ? "true" : "false", chatName: tab.chatName, chatAvatar: tab.chatAvatar || "" } } as any)}
          style={{ marginRight: 10, opacity: 0.6 }}
          activeOpacity={0.7}
        >
          <Ionicons name="expand-outline" size={16} color={colors.textMuted} />
        </TouchableOpacity>

        <View style={{ position: "relative" }}>
          <Avatar uri={avatarUrl} name={displayName} size={36} />
          {!tab.isGroup && isOnline && (
            <View style={{ position: "absolute", bottom: 0, right: 0, width: 10, height: 10, borderRadius: 5, backgroundColor: "#34C759", borderWidth: 1.5, borderColor: colors.surface }} />
          )}
        </View>

        <View style={{ flex: 1, marginLeft: 10 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
            <Text style={{ fontSize: 15, fontFamily: "Inter_700Bold", color: colors.text }} numberOfLines={1}>
              {displayName}
            </Text>
            {(tab.isVerified || tab.isOrgVerified) && (
              <VerifiedBadge size={14} isOrg={tab.isOrgVerified} />
            )}
          </View>
          <Text style={{ fontSize: 11, color: isOnline && !tab.isGroup ? "#34C759" : colors.textMuted, fontFamily: "Inter_500Medium" }}>
            {typingUsers.length > 0
              ? `${typingUsers[0]} is typing…`
              : tab.isGroup
                ? "Group conversation"
                : isOnline ? "Online" : "Tap to open full chat"}
          </Text>
        </View>

        {/* Actions */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <TouchableOpacity
            style={[s.headerBtn, { backgroundColor: colors.backgroundSecondary }]}
            onPress={() => router.push(`/call?type=video&id=${tab.otherId}` as any)}
            activeOpacity={0.7}
          >
            <Ionicons name="videocam-outline" size={17} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.headerBtn, { backgroundColor: colors.backgroundSecondary }]}
            onPress={() => router.push(`/call?type=audio&id=${tab.otherId}` as any)}
            activeOpacity={0.7}
          >
            <Ionicons name="call-outline" size={17} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.headerBtn, { backgroundColor: colors.backgroundSecondary }]}
            onPress={() => router.push({ pathname: "/chat/[id]", params: { id: chatId, otherName: displayName, otherAvatar: avatarUrl || "", otherId: tab.otherId, isGroup: tab.isGroup ? "true" : "false", isChannel: tab.isChannel ? "true" : "false", chatName: tab.chatName, chatAvatar: tab.chatAvatar || "" } } as any)}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-forward-circle-outline" size={17} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Messages ── */}
      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={BRAND} />
        </View>
      ) : messages.length === 0 ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32 }}>
          <Ionicons name="chatbubble-ellipses-outline" size={48} color={colors.textMuted} />
          <Text style={{ color: colors.textMuted, fontSize: 14, marginTop: 12, textAlign: "center" }}>
            No messages yet.{"\n"}Say hello! 👋
          </Text>
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={groups}
          keyExtractor={(g) => g.label}
          renderItem={({ item: group }) => (
            <View>
              {/* Date divider */}
              <View style={{ alignItems: "center", paddingVertical: 10 }}>
                <View style={{ backgroundColor: colors.surface, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border }}>
                  <Text style={{ fontSize: 11, color: colors.textMuted, fontFamily: "Inter_500Medium" }}>{group.label}</Text>
                </View>
              </View>
              {/* Messages in this group */}
              {group.messages.map((msg, i) => {
                const isMe = msg.sender_id === user?.id;
                const nextMsg = group.messages[i + 1];
                const showAvatar = !isMe && (!nextMsg || nextMsg.sender_id !== msg.sender_id);
                return (
                  <MessageBubble
                    key={msg.id}
                    msg={msg}
                    isMe={isMe}
                    showAvatar={showAvatar}
                    isGroup={tab.isGroup}
                    colors={colors}
                    isDark={isDark}
                  />
                );
              })}
            </View>
          )}
          contentContainerStyle={{ paddingVertical: 12, paddingBottom: 8 }}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        />
      )}

      {/* ── Input bar ── */}
      <View style={[s.inputRow, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        <TouchableOpacity style={s.inputAction} activeOpacity={0.7}>
          <Ionicons name="attach" size={20} color={colors.textMuted} />
        </TouchableOpacity>

        <View style={[s.inputWrap, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
          <TextInput
            style={[s.input, { color: colors.text }]}
            placeholder="Message…"
            placeholderTextColor={colors.textMuted}
            value={inputText}
            onChangeText={(t) => {
              setInputText(t);
              broadcastTyping();
            }}
            onSubmitEditing={sendMessage}
            blurOnSubmit={false}
            multiline
            maxLength={4000}
          />
        </View>

        <TouchableOpacity
          style={[s.sendBtn, { backgroundColor: inputText.trim() ? BRAND : colors.backgroundSecondary }]}
          onPress={sendMessage}
          disabled={!inputText.trim() || sending}
          activeOpacity={0.8}
        >
          <Ionicons name="send" size={17} color={inputText.trim() ? "#fff" : colors.textMuted} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Tab bar ──────────────────────────────────────────────────────────────────

function TabBar({
  tabs,
  activeTabId,
  onTabChange,
  onTabClose,
}: {
  tabs: OpenTab[];
  activeTabId: string | null;
  onTabChange: (id: string) => void;
  onTabClose: (id: string) => void;
}) {
  const { colors, isDark } = useTheme();

  if (tabs.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ flexShrink: 0, backgroundColor: colors.surface, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }}
      contentContainerStyle={{ paddingHorizontal: 8, paddingTop: 6, gap: 4, alignItems: "flex-end" }}
    >
      {tabs.map((tab) => {
        const active = tab.chatId === activeTabId;
        const displayName = tab.isGroup ? (tab.chatName || tab.otherName) : tab.otherName;
        const avatarUrl = tab.isGroup ? tab.chatAvatar : tab.otherAvatar;

        return (
          <TouchableOpacity
            key={tab.chatId}
            onPress={() => onTabChange(tab.chatId)}
            activeOpacity={0.8}
            style={[
              s.tab,
              {
                backgroundColor: active
                  ? (isDark ? "#2C2C2E" : "#ffffff")
                  : "transparent",
                borderWidth: active ? StyleSheet.hairlineWidth : 0,
                borderColor: colors.border,
                borderBottomWidth: active ? 0 : 0,
                borderBottomColor: "transparent",
                shadowColor: active ? "#000" : "transparent",
                shadowOffset: { width: 0, height: -1 },
                shadowOpacity: active ? 0.06 : 0,
                shadowRadius: 2,
              },
            ]}
          >
            <Avatar uri={avatarUrl} name={displayName} size={18} />
            <Text
              style={{
                fontSize: 12.5,
                fontFamily: active ? "Inter_600SemiBold" : "Inter_400Regular",
                color: active ? colors.text : colors.textMuted,
                maxWidth: 110,
              }}
              numberOfLines={1}
            >
              {displayName}
            </Text>
            <TouchableOpacity
              onPress={(e) => { e.stopPropagation(); onTabClose(tab.chatId); }}
              hitSlop={8}
              activeOpacity={0.6}
              style={{ marginLeft: 2 }}
            >
              <Ionicons name="close" size={13} color={active ? colors.textMuted : colors.textMuted + "88"} />
            </TouchableOpacity>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

// ─── Main export ─────────────────────────────────────────────────────────────

export function DesktopConversationArea({
  openTabs,
  activeTabId,
  onTabChange,
  onTabClose,
}: {
  openTabs: OpenTab[];
  activeTabId: string | null;
  onTabChange: (id: string) => void;
  onTabClose: (id: string) => void;
}) {
  const activeTab = openTabs.find((t) => t.chatId === activeTabId) ?? null;

  return (
    <View style={{ flex: 1, flexDirection: "column" }}>
      {openTabs.length > 0 && (
        <TabBar
          tabs={openTabs}
          activeTabId={activeTabId}
          onTabChange={onTabChange}
          onTabClose={onTabClose}
        />
      )}

      {activeTab ? (
        <ConversationPane
          key={activeTab.chatId}
          tab={activeTab}
          onClose={() => onTabClose(activeTab.chatId)}
        />
      ) : (
        <ChatPlaceholder />
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  convHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexShrink: 0,
    ...Platform.select({
      web: { boxShadow: "0 1px 0 rgba(0,0,0,0.06)" } as any,
    }),
  },
  headerBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexShrink: 0,
  },
  inputAction: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  inputWrap: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === "web" ? 6 : 8,
    minHeight: 38,
    maxHeight: 120,
  },
  input: {
    fontSize: 14,
    lineHeight: 20,
    padding: 0,
    outlineStyle: "none" as any,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
});
