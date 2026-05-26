/**
 * VideoCommentsSheet — the exact comment sheet used in the video feed,
 * extracted here so it can be shared with the discover feed too.
 */
import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useAppAccent } from "@/context/AppAccentContext";
import { Avatar } from "@/components/ui/Avatar";
import { notifyPostReply } from "@/lib/notifyUser";
import * as Haptics from "@/lib/haptics";

// ─── Constants ────────────────────────────────────────────────────────────────

const USE_NATIVE = Platform.OS !== "web";
const VID_THREAD_COLORS = ["#00BCD4", "#5C6BC0", "#26A69A", "#EF6C00", "#8E24AA"];
const QUICK_EMOJIS = ["🔥", "❤️", "😂", "😮", "👏", "💯", "🙌", "😍"];

// ─── Types ────────────────────────────────────────────────────────────────────

export type Reply = {
  id: string; author_id: string; content: string; created_at: string;
  parent_reply_id: string | null; like_count: number;
  profile: { display_name: string; handle: string; avatar_url: string | null };
  children?: Reply[];
};

// ─── Utilities ────────────────────────────────────────────────────────────────

export function buildReplyTree(flat: Reply[]): Reply[] {
  const map = new Map<string, Reply>();
  const roots: Reply[] = [];
  for (const r of flat) map.set(r.id, { ...r, children: [] });
  for (const r of flat) {
    const node = map.get(r.id)!;
    if (r.parent_reply_id && map.has(r.parent_reply_id)) {
      map.get(r.parent_reply_id)!.children!.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function formatRelative(iso: string): string {
  const d = Date.now() - new Date(iso).getTime();
  if (d < 60000) return "now";
  if (d < 3600000) return `${Math.floor(d / 60000)}m`;
  if (d < 86400000) return `${Math.floor(d / 3600000)}h`;
  if (d < 2592000000) return `${Math.floor(d / 86400000)}d`;
  return `${Math.floor(d / 2592000000)}mo`;
}

function parseCommentText(text: string, accent: string): React.ReactNode {
  return text.split(/(@\w[\w.]*|#\w+)/g).map((p, i) => {
    if (/^@\w/.test(p)) return <Text key={i} style={{ color: accent, fontFamily: "Inter_600SemiBold" }}>{p}</Text>;
    if (/^#\w/.test(p)) return <Text key={i} style={{ color: accent + "BB" }}>{p}</Text>;
    return <Text key={i}>{p}</Text>;
  });
}

// ─── VideoReplyItem ───────────────────────────────────────────────────────────

function VideoReplyItem({ reply: r, depth, onReplyTo, isCreator, isNew, accent }: {
  reply: Reply; depth: number; onReplyTo: (r: Reply) => void;
  isCreator: boolean; isNew: boolean; accent: string;
}) {
  const indent = Math.min(depth, 4) * 20;
  const [liked, setLiked] = useState(false);
  const [localLikes, setLocalLikes] = useState(r.like_count);
  const [collapsed, setCollapsed] = useState(false);
  const likeScale = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(isNew ? 24 : 0)).current;
  const fadeAnim = useRef(new Animated.Value(isNew ? 0 : 1)).current;
  const threadColor = VID_THREAD_COLORS[depth % VID_THREAD_COLORS.length];
  const hasChildren = (r.children?.length ?? 0) > 0;
  const isTop = depth === 0;

  useEffect(() => {
    if (!isNew) return;
    Animated.parallel([
      Animated.spring(slideAnim, { toValue: 0, tension: 180, friction: 22, useNativeDriver: USE_NATIVE }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 280, useNativeDriver: USE_NATIVE }),
    ]).start();
  }, []);

  function handleLike() {
    const next = !liked;
    setLiked(next);
    setLocalLikes((c) => (next ? c + 1 : Math.max(0, c - 1)));
    Animated.sequence([
      Animated.spring(likeScale, { toValue: 1.5, tension: 350, friction: 7, useNativeDriver: USE_NATIVE }),
      Animated.spring(likeScale, { toValue: 1, tension: 350, friction: 7, useNativeDriver: USE_NATIVE }),
    ]).start();
  }

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateX: slideAnim }] }}>
      <View style={{ flexDirection: "row", paddingLeft: indent, paddingTop: isTop ? 14 : 8, paddingBottom: 2, position: "relative" }}>
        {depth > 0 && (
          <View style={{ position: "absolute", left: indent - 10, top: 0, bottom: 0, width: 2, borderRadius: 1, backgroundColor: threadColor + "40" }} />
        )}
        <View style={{ marginRight: 10, marginTop: 1 }}>
          <Avatar uri={r.profile.avatar_url} name={r.profile.display_name} size={isTop ? 36 : 26} />
        </View>
        <View style={{ flex: 1, paddingRight: 8 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 4, flexWrap: "wrap" }}>
            <Text style={{ color: "#fff", fontSize: 13, fontFamily: "Inter_700Bold" }}>{r.profile.display_name}</Text>
            {isCreator && (
              <View style={{ backgroundColor: accent + "22", borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1, borderWidth: 1, borderColor: accent + "55" }}>
                <Text style={{ color: accent, fontSize: 10, fontFamily: "Inter_700Bold" }}>Author</Text>
              </View>
            )}
            <Text style={{ color: "rgba(255,255,255,0.28)", fontSize: 11 }}>· {formatRelative(r.created_at)}</Text>
          </View>
          <Text style={{ color: "rgba(255,255,255,0.88)", fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 21 }}>
            {parseCommentText(r.content, accent)}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 18, marginTop: 8, marginBottom: 2 }}>
            <TouchableOpacity onPress={handleLike} activeOpacity={0.7} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Animated.View style={{ transform: [{ scale: likeScale }] }}>
                <Ionicons name={liked ? "heart" : "heart-outline"} size={14} color={liked ? "#FF2D55" : "rgba(255,255,255,0.3)"} />
              </Animated.View>
              <Text style={{ color: liked ? "#FF2D55" : "rgba(255,255,255,0.3)", fontSize: 11, fontFamily: "Inter_600SemiBold" }}>
                {localLikes > 0 ? localLikes : "Like"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onReplyTo(r)} activeOpacity={0.7} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Ionicons name="arrow-undo-outline" size={13} color="rgba(255,255,255,0.3)" />
              <Text style={{ color: "rgba(255,255,255,0.3)", fontSize: 11, fontFamily: "Inter_600SemiBold" }}>Reply</Text>
            </TouchableOpacity>
            {hasChildren && (
              <TouchableOpacity onPress={() => setCollapsed((c) => !c)} activeOpacity={0.7} style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                <Ionicons name={collapsed ? "chevron-down" : "chevron-up"} size={12} color={threadColor} />
                <Text style={{ color: threadColor, fontSize: 11, fontFamily: "Inter_600SemiBold" }}>
                  {collapsed ? `${r.children!.length} ${r.children!.length === 1 ? "reply" : "replies"}` : "Hide replies"}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
      {isTop && !hasChildren && (
        <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: "rgba(255,255,255,0.05)", marginLeft: indent + 46, marginTop: 4 }} />
      )}
      {!collapsed && r.children?.map((child) => (
        <VideoReplyItem key={child.id} reply={child} depth={depth + 1} onReplyTo={onReplyTo} isCreator={isCreator} isNew={false} accent={accent} />
      ))}
    </Animated.View>
  );
}

// ─── VideoCommentsSheet ───────────────────────────────────────────────────────

export function VideoCommentsSheet({ visible, onClose, postId, postAuthorId, onReplyCountChange }: {
  visible: boolean; onClose: () => void; postId: string; postAuthorId: string;
  onReplyCountChange: (postId: string, delta: number) => void;
}) {
  const { accent } = useAppAccent();
  const { user, profile } = useAuth();
  const insets = useSafeAreaInsets();
  const [replies, setReplies] = useState<Reply[]>([]);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Reply | null>(null);
  const [sortMode, setSortMode] = useState<"recent" | "top">("recent");
  const [newCommentIds, setNewCommentIds] = useState<Set<string>>(new Set());
  const [kbHeight, setKbHeight] = useState(0);
  const listRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);
  const sendScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (Platform.OS === "web") return;
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const show = Keyboard.addListener(showEvent, (e) => setKbHeight(e.endCoordinates.height));
    const hide = Keyboard.addListener(hideEvent, () => setKbHeight(0));
    return () => { show.remove(); hide.remove(); };
  }, []);

  const loadReplies = useCallback(() => {
    if (!postId) return;
    supabase
      .from("post_replies")
      .select("id, author_id, content, created_at, parent_reply_id, profiles!post_replies_author_id_fkey(display_name, handle, avatar_url)")
      .eq("post_id", postId)
      .order("created_at", { ascending: true })
      .limit(50)
      .then(({ data }) => {
        if (data) {
          setReplies(data.map((r: any) => ({
            id: r.id, author_id: r.author_id, content: r.content || "",
            created_at: r.created_at, parent_reply_id: r.parent_reply_id || null, like_count: 0,
            profile: {
              display_name: r.profiles?.display_name || "User",
              handle: r.profiles?.handle || "user",
              avatar_url: r.profiles?.avatar_url || null,
            },
          })));
        }
        setLoading(false);
      });
  }, [postId]);

  useEffect(() => {
    if (!visible || !postId) return;
    setReplies([]); setLoading(true); setText(""); setReplyingTo(null); setNewCommentIds(new Set());
    loadReplies();
  }, [visible, postId, loadReplies]);

  useEffect(() => {
    if (!visible || !postId) return;
    const ch = supabase
      .channel(`video-comments:${postId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "post_replies", filter: `post_id=eq.${postId}` }, loadReplies)
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "post_replies", filter: `post_id=eq.${postId}` }, loadReplies)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [visible, postId, loadReplies]);

  function handleReplyTo(reply: Reply) {
    setReplyingTo(reply);
    setText("");
    setTimeout(() => inputRef.current?.focus(), 100);
  }

  function getSortedTree(): Reply[] {
    const tree = buildReplyTree(replies);
    if (sortMode === "top") {
      return [...tree].sort((a, b) => {
        const aScore = (a.children?.length ?? 0) * 2 + a.like_count;
        const bScore = (b.children?.length ?? 0) * 2 + b.like_count;
        return bScore - aScore;
      });
    }
    return [...tree].reverse();
  }

  async function sendReply() {
    if (!user || !text.trim()) return;
    setSending(true);
    Animated.sequence([
      Animated.spring(sendScale, { toValue: 0.78, tension: 400, friction: 8, useNativeDriver: USE_NATIVE }),
      Animated.spring(sendScale, { toValue: 1, tension: 400, friction: 8, useNativeDriver: USE_NATIVE }),
    ]).start();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const payload: any = { post_id: postId, author_id: user.id, content: text.trim() };
    if (replyingTo) payload.parent_reply_id = replyingTo.id;
    const { data, error } = await supabase.from("post_replies").insert(payload).select("id, author_id, content, created_at, parent_reply_id").single();
    if (!error && data) {
      const newReply: Reply = {
        id: data.id, author_id: data.author_id, content: data.content,
        created_at: data.created_at, parent_reply_id: data.parent_reply_id || null, like_count: 0,
        profile: { display_name: profile?.display_name || "You", handle: profile?.handle || "you", avatar_url: profile?.avatar_url || null },
      };
      setReplies((prev) => [...prev, newReply]);
      setNewCommentIds((prev) => new Set([...prev, data.id]));
      onReplyCountChange(postId, 1);
      if (replyingTo && replyingTo.author_id !== user.id) {
        notifyPostReply({ postAuthorId: replyingTo.author_id, replierName: profile?.display_name || "Someone", replierUserId: user.id, postId, replyPreview: data.content });
      }
      const wasThreaded = !!replyingTo;
      setText(""); setReplyingTo(null);
      if (!wasThreaded) setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 150);
    } else if (error) {
      Alert.alert(
        "Comment failed",
        "Your comment could not be posted. If this keeps happening, check the Status page under Settings → Help & About.",
        [{ text: "OK" }],
      );
    }
    setSending(false);
  }

  const sortedTree = getSortedTree();
  const charLeft = 500 - text.length;
  const { height: sheetH } = useWindowDimensions();
  const sheetMaxH = Math.min(sheetH * 0.88, 680);
  const listMaxH = Math.max(sheetMaxH - 210 - Math.max(insets.bottom, 16), 80);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={cStyles.kavFull}>
        <Pressable style={cStyles.overlay} onPress={onClose}>
          <Pressable onPress={() => {}} style={[cStyles.container, {
            paddingBottom: Math.max(insets.bottom, 16),
            marginBottom: kbHeight,
            maxHeight: kbHeight > 0 ? sheetH - kbHeight - 20 : sheetMaxH,
          }]}>
            <View style={[StyleSheet.absoluteFill, { backgroundColor: "#111115", borderTopLeftRadius: 20, borderTopRightRadius: 20 }]} />
            <View style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, borderTopLeftRadius: 20, borderTopRightRadius: 20, borderTopWidth: StyleSheet.hairlineWidth, borderLeftWidth: StyleSheet.hairlineWidth, borderRightWidth: StyleSheet.hairlineWidth, borderColor: "rgba(255,255,255,0.12)" }} pointerEvents="none" />
            <View style={cStyles.handle} />

            <View style={cStyles.header}>
              <View style={{ flex: 1 }}>
                <Text style={cStyles.title}>
                  Comments{replies.length > 0 && <Text style={cStyles.titleCount}> {formatCount(replies.length)}</Text>}
                </Text>
              </View>
              <View style={cStyles.sortRow}>
                {(["recent", "top"] as const).map((mode) => (
                  <TouchableOpacity key={mode} onPress={() => setSortMode(mode)} activeOpacity={0.7}
                    style={[cStyles.sortTab, sortMode === mode && { backgroundColor: accent + "22", borderColor: accent + "55" }]}>
                    <Text style={[cStyles.sortTabText, { color: sortMode === mode ? accent : "rgba(255,255,255,0.45)" }]}>
                      {mode === "recent" ? "Recent" : "Top"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity onPress={onClose} hitSlop={12}>
                <Ionicons name="close" size={22} color="rgba(255,255,255,0.5)" />
              </TouchableOpacity>
            </View>

            <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: "rgba(255,255,255,0.1)" }} />

            {loading ? (
              <View style={{ padding: 32, alignItems: "center" }}>
                <ActivityIndicator color={accent} />
              </View>
            ) : sortedTree.length === 0 ? (
              <View style={cStyles.emptyBox}>
                <Ionicons name="chatbubble-outline" size={32} color="rgba(255,255,255,0.2)" />
                <Text style={cStyles.emptyText}>No comments yet</Text>
                <Text style={cStyles.emptySub}>Be the first to comment</Text>
              </View>
            ) : (
              <FlatList
                ref={listRef}
                data={sortedTree}
                keyExtractor={(r) => r.id}
                style={{ flexShrink: 1, minHeight: 80, maxHeight: listMaxH }}
                contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 8 }}
                showsVerticalScrollIndicator={false}
                renderItem={({ item: r }) => (
                  <VideoReplyItem
                    reply={r} depth={0} onReplyTo={handleReplyTo}
                    isCreator={r.author_id === postAuthorId}
                    isNew={newCommentIds.has(r.id)} accent={accent}
                  />
                )}
              />
            )}

            {replyingTo && (
              <View style={[cStyles.replyingTo, { borderTopColor: "rgba(255,255,255,0.08)" }]}>
                <Text style={cStyles.replyingToText}>
                  Replying to <Text style={{ color: accent }}>@{replyingTo.profile.handle}</Text>
                </Text>
                <TouchableOpacity onPress={() => setReplyingTo(null)} hitSlop={8}>
                  <Ionicons name="close-circle" size={16} color="rgba(255,255,255,0.4)" />
                </TouchableOpacity>
              </View>
            )}

            <View style={[cStyles.emojiBar, { borderTopColor: "rgba(255,255,255,0.08)" }]}>
              {QUICK_EMOJIS.map((e) => (
                <TouchableOpacity key={e} onPress={() => setText((t) => t + e)} style={cStyles.emojiBtn} activeOpacity={0.6}>
                  <Text style={cStyles.emojiText}>{e}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {user ? (
              <View style={[cStyles.inputRow, { borderTopColor: "rgba(255,255,255,0.08)" }]}>
                <Avatar uri={profile?.avatar_url} name={profile?.display_name || "You"} size={32} />
                <View style={{ flex: 1, position: "relative" }}>
                  <TextInput
                    ref={inputRef}
                    style={cStyles.input}
                    placeholder="Add a comment…"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    value={text}
                    onChangeText={setText}
                    multiline
                    maxLength={500}
                  />
                  {text.length > 400 && (
                    <Text style={[cStyles.charCounter, { color: charLeft < 20 ? "#FF453A" : "rgba(255,255,255,0.3)" }]}>
                      {charLeft}
                    </Text>
                  )}
                </View>
                <Animated.View style={{ transform: [{ scale: sendScale }] }}>
                  <TouchableOpacity
                    onPress={sendReply}
                    disabled={!text.trim() || sending}
                    style={[cStyles.sendBtn, { backgroundColor: text.trim() ? accent : "rgba(255,255,255,0.12)" }]}
                  >
                    {sending
                      ? <ActivityIndicator size={14} color="#fff" />
                      : <Ionicons name="arrow-up" size={16} color="#fff" />
                    }
                  </TouchableOpacity>
                </Animated.View>
              </View>
            ) : (
              <TouchableOpacity
                style={{ paddingVertical: 14, alignItems: "center" }}
                onPress={() => { onClose(); router.push("/(auth)/login"); }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 18, paddingVertical: 9, borderRadius: 20, borderWidth: 1, borderColor: accent + "50", backgroundColor: accent + "18" }}>
                  <Ionicons name="person-circle-outline" size={16} color={accent} />
                  <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: accent }}>Sign in to comment</Text>
                </View>
              </TouchableOpacity>
            )}
          </Pressable>
        </Pressable>
      </View>
    </Modal>
  );
}

const cStyles = StyleSheet.create({
  kavFull: { flex: 1 },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end", paddingHorizontal: 8 },
  container: { borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: "hidden" },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.2)", alignSelf: "center", marginVertical: 12 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 12, gap: 10 },
  title: { color: "#fff", fontSize: 16, fontFamily: "Inter_700Bold" },
  titleCount: { color: "rgba(255,255,255,0.4)", fontFamily: "Inter_400Regular", fontSize: 14 },
  sortRow: { flexDirection: "row", gap: 6 },
  sortTab: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: "transparent" },
  sortTabText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  emptyBox: { padding: 32, alignItems: "center", gap: 8 },
  emptyText: { color: "rgba(255,255,255,0.5)", fontSize: 15, fontFamily: "Inter_600SemiBold" },
  emptySub: { color: "rgba(255,255,255,0.3)", fontSize: 13, fontFamily: "Inter_400Regular" },
  replyingTo: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 8, borderTopWidth: StyleSheet.hairlineWidth },
  replyingToText: { color: "rgba(255,255,255,0.5)", fontSize: 12, fontFamily: "Inter_400Regular" },
  emojiBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 6, borderTopWidth: StyleSheet.hairlineWidth, gap: 2 },
  emojiBtn: { flex: 1, alignItems: "center", paddingVertical: 6 },
  emojiText: { fontSize: 20 },
  inputRow: { flexDirection: "row", alignItems: "flex-end", paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth, gap: 10 },
  input: { flex: 1, color: "#fff", fontFamily: "Inter_400Regular", fontSize: 14, maxHeight: 100, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.08)" },
  sendBtn: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  charCounter: { position: "absolute", right: 14, bottom: 10, fontSize: 10, fontFamily: "Inter_500Medium" },
});
