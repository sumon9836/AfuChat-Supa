import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/hooks/useTheme";

type NotifType = "follow" | "like" | "mention" | "message" | "comment" | "gift";

interface Notification {
  id: string;
  user_id: string;
  type: NotifType;
  actor_id: string | null;
  actor_handle: string | null;
  actor_avatar: string | null;
  actor_name: string | null;
  entity_type: string | null;
  entity_id: string | null;
  data: Record<string, any>;
  read: boolean;
  created_at: string;
}

const TYPE_META: Record<NotifType, { icon: string; color: string; label: (n: Notification) => string }> = {
  follow:  { icon: "person-add",      color: "#007AFF", label: (n) => `${n.actor_name || n.actor_handle || "Someone"} started following you` },
  like:    { icon: "heart",           color: "#FF3B30", label: (n) => `${n.actor_name || n.actor_handle || "Someone"} liked your post` },
  mention: { icon: "at-circle",       color: "#5856D6", label: (n) => `${n.actor_name || n.actor_handle || "Someone"} mentioned you${n.data?.context ? `: "${n.data.context}"` : ""}` },
  message: { icon: "chatbubble",      color: "#34C759", label: (n) => `${n.actor_name || n.actor_handle || "Someone"} sent you a message${n.data?.preview ? `: "${n.data.preview}"` : ""}` },
  comment: { icon: "chatbubble-ellipses", color: "#FF9500", label: (n) => `${n.actor_name || n.actor_handle || "Someone"} commented on your post${n.data?.context ? `: "${n.data.context}"` : ""}` },
  gift:    { icon: "gift",            color: "#D4A853", label: (n) => `${n.actor_name || n.actor_handle || "Someone"} sent you a gift${n.data?.amount ? ` (${n.data.amount})` : ""}` },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(dateStr).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function NotifRow({ item, colors, accent, onPress }: { item: Notification; colors: any; accent: string; onPress: (n: Notification) => void }) {
  const meta = TYPE_META[item.type] ?? TYPE_META.message;
  const label = meta.label(item);

  return (
    <TouchableOpacity
      activeOpacity={0.72}
      onPress={() => onPress(item)}
      style={[
        st.row,
        { backgroundColor: item.read ? colors.surface : accent + "0C", borderBottomColor: colors.border },
      ]}
    >
      {/* Avatar / icon area */}
      <View style={st.avatarWrap}>
        {item.actor_avatar ? (
          <Image source={{ uri: item.actor_avatar }} style={st.avatar} />
        ) : (
          <View style={[st.avatarFallback, { backgroundColor: meta.color + "20" }]}>
            <Ionicons name={meta.icon as any} size={20} color={meta.color} />
          </View>
        )}
        <View style={[st.typeBadge, { backgroundColor: meta.color }]}>
          <Ionicons name={meta.icon as any} size={10} color="#fff" />
        </View>
      </View>

      {/* Content */}
      <View style={st.content}>
        <Text style={[st.label, { color: colors.text }]} numberOfLines={2}>{label}</Text>
        <Text style={[st.time, { color: colors.textMuted }]}>{timeAgo(item.created_at)}</Text>
      </View>

      {/* Unread dot */}
      {!item.read && <View style={[st.unreadDot, { backgroundColor: accent }]} />}
    </TouchableOpacity>
  );
}

export default function NotificationsScreen() {
  const { user } = useAuth();
  const { colors, accent } = useTheme();
  const insets = useSafeAreaInsets();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const loadNotifications = useCallback(async (silent = false) => {
    if (!user) return;
    if (!silent) setLoading(true);
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(60);
    if (!error && data) {
      setNotifications(data as Notification[]);
      setUnreadCount(data.filter((n) => !n.read).length);
    }
    if (!silent) setLoading(false);
  }, [user]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel("notifications-inbox")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (payload) => {
          setNotifications((prev) => [payload.new as Notification, ...prev]);
          setUnreadCount((c) => c + 1);
        }
      )
      .subscribe();
    channelRef.current = ch;
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  async function markAllRead() {
    if (!user || unreadCount === 0) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
    await supabase.from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false);
  }

  async function handleNotifPress(notif: Notification) {
    if (!notif.read) {
      setNotifications((prev) => prev.map((n) => n.id === notif.id ? { ...n, read: true } : n));
      setUnreadCount((c) => Math.max(0, c - 1));
      supabase.from("notifications").update({ read: true }).eq("id", notif.id).then(() => {});
    }
    if (notif.type === "follow" && notif.actor_handle) {
      router.push(`/@${notif.actor_handle}` as any);
    } else if (notif.type === "message" && notif.entity_id) {
      router.push({ pathname: "/chat/[id]", params: { id: notif.entity_id } });
    } else if ((notif.type === "like" || notif.type === "comment" || notif.type === "mention") && notif.entity_id) {
      router.push({ pathname: "/p/[id]", params: { id: notif.entity_id } } as any);
    } else if (notif.type === "gift" && notif.actor_handle) {
      router.push(`/@${notif.actor_handle}` as any);
    }
  }

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadNotifications(true);
    setRefreshing(false);
  }, [loadNotifications]);

  const topPad = Math.max(insets.top, 16);

  return (
    <View style={[st.root, { backgroundColor: colors.backgroundSecondary }]}>
      {/* Header */}
      <View style={[st.header, { paddingTop: topPad, backgroundColor: colors.backgroundSecondary, borderBottomColor: colors.border }]}>
        <Text style={[st.title, { color: colors.text }]}>Inbox</Text>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={markAllRead} activeOpacity={0.7} style={[st.markAllBtn, { borderColor: accent + "50" }]}>
            <Ionicons name="checkmark-done" size={13} color={accent} />
            <Text style={[st.markAllText, { color: accent }]}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={st.center}>
          <ActivityIndicator size="large" color={accent} />
        </View>
      ) : notifications.length === 0 ? (
        <View style={st.center}>
          <View style={[st.emptyIconWrap, { backgroundColor: accent + "12" }]}>
            <Ionicons name="notifications-outline" size={38} color={accent} />
          </View>
          <Text style={[st.emptyTitle, { color: colors.text }]}>All caught up</Text>
          <Text style={[st.emptySub, { color: colors.textMuted }]}>
            Notifications for likes, follows, mentions, and messages will appear here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={accent}
            />
          }
          ItemSeparatorComponent={() => <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.border }} />}
          renderItem={({ item }) => (
            <NotifRow item={item} colors={colors} accent={accent} onPress={handleNotifPress} />
          )}
          ListHeaderComponent={
            unreadCount > 0 ? (
              <View style={[st.unreadBanner, { backgroundColor: accent + "10", borderBottomColor: accent + "25" }]}>
                <View style={[st.unreadBadge, { backgroundColor: accent }]}>
                  <Text style={st.unreadBadgeText}>{unreadCount}</Text>
                </View>
                <Text style={[st.unreadBannerText, { color: colors.text }]}>
                  {unreadCount} unread notification{unreadCount !== 1 ? "s" : ""}
                </Text>
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.4,
  },
  markAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  markAllText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    paddingHorizontal: 36,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  emptySub: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
  },
  unreadBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  unreadBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  unreadBadgeText: {
    color: "#000",
    fontSize: 11,
    fontFamily: "Inter_700Bold",
  },
  unreadBannerText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 13,
    gap: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  avatarWrap: {
    position: "relative",
    width: 48,
    height: 48,
    flexShrink: 0,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarFallback: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  typeBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  content: {
    flex: 1,
    gap: 4,
  },
  label: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 19,
  },
  time: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  unreadDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    flexShrink: 0,
  },
});
