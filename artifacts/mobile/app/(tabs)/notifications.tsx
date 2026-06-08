import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Image as ExpoImage } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/hooks/useTheme";
import { safeRouter } from "@/lib/navUtils";

// ── Types ─────────────────────────────────────────────────────────────────────

type NotifType =
  | "follow"
  | "new_follower"
  | "like"
  | "mention"
  | "message"
  | "comment"
  | "gift"
  | "order_update"
  | "order_shipped"
  | "incoming_call";

interface Notification {
  id: string;
  user_id: string;
  type: NotifType;
  actor_id: string | null;
  entity_id: string | null;
  entity_type: string | null;
  data: Record<string, any>;
  read: boolean;
  created_at: string;
  actor_name: string | null;
  actor_handle: string | null;
  actor_avatar: string | null;
}

interface RawNotification {
  id: string;
  user_id: string;
  type: string;
  actor_id: string | null;
  entity_id: string | null;
  entity_type: string | null;
  data: Record<string, any>;
  read: boolean;
  created_at: string;
  actor_name: string | null;
  actor_handle: string | null;
  actor_avatar: string | null;
}

// ── Category filter tabs ──────────────────────────────────────────────────────

type Category = "all" | "follow" | "like" | "comment" | "mention" | "message" | "gift" | "orders" | "calls";

const CATEGORIES: { key: Category; label: string; icon: string; types?: NotifType[] }[] = [
  { key: "all",     label: "All",      icon: "notifications-outline" },
  { key: "follow",  label: "Follows",  icon: "person-add-outline",      types: ["follow", "new_follower"] },
  { key: "like",    label: "Likes",    icon: "heart-outline",           types: ["like"] },
  { key: "comment", label: "Comments", icon: "chatbubble-ellipses-outline", types: ["comment"] },
  { key: "mention", label: "Mentions", icon: "at-circle-outline",       types: ["mention"] },
  { key: "message", label: "Messages", icon: "chatbubble-outline",      types: ["message"] },
  { key: "gift",    label: "Gifts",    icon: "gift-outline",            types: ["gift"] },
  { key: "orders",  label: "Orders",   icon: "cube-outline",            types: ["order_update", "order_shipped"] },
  { key: "calls",   label: "Calls",    icon: "call-outline",            types: ["incoming_call"] },
];

// ── Notification type display meta ────────────────────────────────────────────

const TYPE_META: Record<string, { icon: string; color: string; label: (n: Notification) => string }> = {
  follow:        { icon: "person-add",             color: "#007AFF", label: (n) => `${actor(n)} started following you` },
  new_follower:  { icon: "person-add",             color: "#007AFF", label: (n) => `${actor(n)} started following you` },
  like:          { icon: "heart",                  color: "#FF3B30", label: (n) => `${actor(n)} liked your post` },
  mention:       { icon: "at-circle",              color: "#5856D6", label: (n) => `${actor(n)} mentioned you${ctx(n)}` },
  message:       { icon: "chatbubble",             color: "#34C759", label: (n) => `${actor(n)} sent you a message${preview(n)}` },
  comment:       { icon: "chatbubble-ellipses",    color: "#FF9500", label: (n) => `${actor(n)} commented on your post${ctx(n)}` },
  gift:          { icon: "gift",                   color: "#D4A853", label: (n) => `${actor(n)} sent you a gift${n.data?.amount ? ` (${n.data.amount})` : ""}` },
  order_update:  { icon: "cube",                   color: "#5AC8FA", label: (n) => n.data?.status ? `Order update: ${n.data.status}` : "Your order has been updated" },
  order_shipped: { icon: "airplane",               color: "#30B0C7", label: (n) => `Your order has shipped${n.data?.carrier ? ` via ${n.data.carrier}` : ""}` },
  incoming_call: { icon: "call",                   color: "#4CD964", label: (n) => `${actor(n)} is calling you` },
};

const DEFAULT_META = TYPE_META.message;

function actor(n: Notification) {
  return n.actor_name || (n.actor_handle ? `@${n.actor_handle}` : "Someone");
}
function ctx(n: Notification) {
  return n.data?.context ? `: "${n.data.context}"` : "";
}
function preview(n: Notification) {
  return n.data?.preview ? `: "${n.data.preview}"` : "";
}

// ── Helpers ───────────────────────────────────────────────────────────────────

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

// ── NotifRow ──────────────────────────────────────────────────────────────────

function NotifRow({
  item,
  colors,
  accent,
  onPress,
}: {
  item: Notification;
  colors: any;
  accent: string;
  onPress: (n: Notification) => void;
}) {
  const meta = TYPE_META[item.type] ?? DEFAULT_META;
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
      <View style={st.avatarWrap}>
        {item.actor_avatar ? (
          <ExpoImage source={{ uri: item.actor_avatar }} style={st.avatar} contentFit="cover" cachePolicy="memory-disk" />
        ) : (
          <View style={[st.avatarFallback, { backgroundColor: meta.color + "20" }]}>
            <Ionicons name={meta.icon as any} size={20} color={meta.color} />
          </View>
        )}
        <View style={[st.typeBadge, { backgroundColor: meta.color }]}>
          <Ionicons name={meta.icon as any} size={10} color="#fff" />
        </View>
      </View>

      <View style={st.content}>
        <Text style={[st.label, { color: colors.text }]} numberOfLines={2}>
          {label}
        </Text>
        <Text style={[st.time, { color: colors.textMuted }]}>{timeAgo(item.created_at)}</Text>
      </View>

      {!item.read && <View style={[st.unreadDot, { backgroundColor: accent }]} />}
    </TouchableOpacity>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function NotificationsScreen() {
  const { user } = useAuth();
  const { colors, accent } = useTheme();
  const insets = useSafeAreaInsets();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeCategory, setActiveCategory] = useState<Category>("all");
  const [fetchError, setFetchError] = useState<string | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // ── Data loading ───────────────────────────────────────────────────────────

  const loadNotifications = useCallback(async (silent = false) => {
    if (!user) return;
    if (!silent) { setLoading(true); setFetchError(null); }

    // 1. Fetch rows with real column names
    const { data: rows, error } = await supabase
      .from("notifications")
      .select("id, user_id, type, actor_id, entity_id, entity_type, actor_handle, actor_avatar, actor_name, data, read, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      console.warn("[Notifications] query error (table may need migration):", error.message);
      if (!silent) { setFetchError(error.message ?? "Failed to load notifications"); setLoading(false); }
      return;
    }

    if (!rows) {
      if (!silent) { setFetchError("No data returned"); setLoading(false); }
      return;
    }

    // 2. Enrich actor info from profiles for rows where columns are null
    const needsProfile = (rows as RawNotification[]).filter(
      (r) => r.actor_id && (!r.actor_name && !r.actor_handle && !r.actor_avatar)
    );
    const actorIds = [...new Set(needsProfile.map((r) => r.actor_id).filter(Boolean))] as string[];
    let profileMap: Record<string, { display_name: string | null; handle: string | null; avatar_url: string | null }> = {};

    if (actorIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, handle, avatar_url")
        .in("id", actorIds);
      if (profiles) {
        for (const p of profiles) {
          profileMap[p.id] = { display_name: p.display_name, handle: p.handle, avatar_url: p.avatar_url };
        }
      }
    }

    // 3. Merge — prefer DB columns, fall back to profile join
    const merged: Notification[] = (rows as RawNotification[]).map((row) => {
      const profile = row.actor_id && !row.actor_name && !row.actor_handle ? profileMap[row.actor_id] : null;
      return {
        ...row,
        data: row.data ?? {},
        type: row.type as NotifType,
        actor_name:   row.actor_name   ?? profile?.display_name ?? null,
        actor_handle: row.actor_handle ?? profile?.handle       ?? null,
        actor_avatar: row.actor_avatar ?? profile?.avatar_url   ?? null,
      };
    });

    setNotifications(merged);
    setUnreadCount(merged.filter((n) => !n.read).length);
    setFetchError(null);
    if (!silent) setLoading(false);
  }, [user]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // ── Realtime subscription ──────────────────────────────────────────────────

  useEffect(() => {
    if (!user) return;

    const ch = supabase
      .channel("notifications-inbox-v3")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        async (payload) => {
          const raw = payload.new as RawNotification;

          let actor_name   = raw.actor_name   ?? null;
          let actor_handle = raw.actor_handle ?? null;
          let actor_avatar = raw.actor_avatar ?? null;

          if (raw.actor_id && !actor_name && !actor_handle) {
            const { data: p } = await supabase
              .from("profiles")
              .select("display_name, handle, avatar_url")
              .eq("id", raw.actor_id)
              .single();
            if (p) { actor_name = p.display_name; actor_handle = p.handle; actor_avatar = p.avatar_url; }
          }

          const notif: Notification = {
            ...raw,
            data: raw.data ?? {},
            type: raw.type as NotifType,
            actor_name,
            actor_handle,
            actor_avatar,
          };

          setNotifications((prev) => [notif, ...prev]);
          setUnreadCount((c) => c + 1);
        }
      )
      .subscribe();

    channelRef.current = ch;
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  // ── Actions ────────────────────────────────────────────────────────────────

  async function markAllRead() {
    if (!user || unreadCount === 0) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
    await supabase.from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false).then(() => {}).catch(() => {});
  }

  async function handleNotifPress(notif: Notification) {
    if (!notif.read) {
      setNotifications((prev) => prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n)));
      setUnreadCount((c) => Math.max(0, c - 1));
      supabase.from("notifications").update({ read: true }).eq("id", notif.id).then(() => {}).catch(() => {});
    }

    const entityId = notif.entity_id;
    const handle   = notif.actor_handle;

    switch (notif.type) {
      case "follow":
      case "new_follower":
        if (handle) safeRouter.push(`/@${handle}` as any);
        else if (notif.actor_id) safeRouter.push({ pathname: "/contact/[id]", params: { id: notif.actor_id } } as any);
        break;
      case "message":
        if (entityId) safeRouter.push({ pathname: "/chat/[id]", params: { id: entityId } });
        break;
      case "like":
      case "comment":
      case "mention":
        if (entityId) safeRouter.push({ pathname: "/p/[id]", params: { id: entityId } } as any);
        break;
      case "gift":
        if (handle) safeRouter.push(`/@${handle}` as any);
        break;
      case "order_update":
      case "order_shipped":
        if (entityId) safeRouter.push({ pathname: "/shop/order/[id]", params: { id: entityId } } as any);
        else safeRouter.push("/shop/my-orders" as any);
        break;
      case "incoming_call":
        if (handle) safeRouter.push(`/@${handle}` as any);
        break;
    }
  }

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadNotifications(true);
    setRefreshing(false);
  }, [loadNotifications]);

  // ── Filtering ──────────────────────────────────────────────────────────────

  const catDef = CATEGORIES.find((c) => c.key === activeCategory)!;
  const filtered =
    activeCategory === "all"
      ? notifications
      : notifications.filter((n) => catDef.types?.includes(n.type));

  const filteredUnread = filtered.filter((n) => !n.read).length;

  // ── Render ─────────────────────────────────────────────────────────────────

  const topPad = Math.max(insets.top, 16);

  return (
    <View style={[st.root, { backgroundColor: colors.backgroundSecondary }]}>
      {/* ── Header ── */}
      <View
        style={[
          st.header,
          { paddingTop: topPad, backgroundColor: colors.backgroundSecondary, borderBottomColor: colors.border },
        ]}
      >
        <Text style={[st.title, { color: colors.text }]}>Inbox</Text>
        {unreadCount > 0 && (
          <TouchableOpacity
            onPress={markAllRead}
            activeOpacity={0.7}
            style={[st.markAllBtn, { borderColor: accent + "50" }]}
          >
            <Ionicons name="checkmark-done" size={13} color={accent} />
            <Text style={[st.markAllText, { color: accent }]}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Category pills ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[st.pillBar, { borderBottomColor: colors.border }]}
        contentContainerStyle={st.pillBarContent}
      >
        {CATEGORIES.map((cat) => {
          const isActive = activeCategory === cat.key;
          const catUnread =
            cat.key === "all"
              ? unreadCount
              : notifications.filter((n) => !n.read && cat.types?.includes(n.type)).length;

          return (
            <TouchableOpacity
              key={cat.key}
              activeOpacity={0.72}
              onPress={() => setActiveCategory(cat.key)}
              style={[
                st.pill,
                isActive
                  ? { backgroundColor: accent }
                  : { backgroundColor: colors.backgroundTertiary ?? colors.surface },
              ]}
            >
              <Ionicons
                name={cat.icon as any}
                size={13}
                color={isActive ? "#fff" : colors.textMuted}
              />
              <Text style={[st.pillText, { color: isActive ? "#fff" : colors.textMuted }]}>
                {cat.label}
              </Text>
              {catUnread > 0 && (
                <View style={[st.pillBadge, { backgroundColor: isActive ? "rgba(255,255,255,0.35)" : accent }]}>
                  <Text style={st.pillBadgeText}>{catUnread > 99 ? "99+" : catUnread}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ── Body ── */}
      {loading ? (
        <View style={st.center}>
          <ActivityIndicator size="large" color={accent} />
        </View>
      ) : fetchError ? (
        <View style={st.center}>
          <View style={[st.emptyIconWrap, { backgroundColor: "#FF3B3012" }]}>
            <Ionicons name="cloud-offline-outline" size={38} color="#FF3B30" />
          </View>
          <Text style={[st.emptyTitle, { color: colors.text }]}>Couldn't load notifications</Text>
          <Text style={[st.emptySub, { color: colors.textMuted }]}>{fetchError}</Text>
          <TouchableOpacity
            onPress={() => loadNotifications()}
            activeOpacity={0.75}
            style={[st.retryBtn, { backgroundColor: accent }]}
          >
            <Ionicons name="refresh" size={14} color="#fff" />
            <Text style={st.retryBtnText}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : filtered.length === 0 ? (
        <View style={st.center}>
          <View style={[st.emptyIconWrap, { backgroundColor: accent + "12" }]}>
            <Ionicons
              name={(catDef.icon.replace("-outline", "") as any) ?? "notifications-outline"}
              size={38}
              color={accent}
            />
          </View>
          <Text style={[st.emptyTitle, { color: colors.text }]}>
            {activeCategory === "all" ? "All caught up" : `No ${catDef.label.toLowerCase()} yet`}
          </Text>
          <Text style={[st.emptySub, { color: colors.textMuted }]}>
            {activeCategory === "all"
              ? "Notifications for likes, follows, mentions, and messages will appear here."
              : `${catDef.label} notifications will appear here.`}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accent} />
          }
          ItemSeparatorComponent={() => (
            <View style={{ height: 0.5, backgroundColor: colors.border }} />
          )}
          renderItem={({ item }) => (
            <NotifRow item={item} colors={colors} accent={accent} onPress={handleNotifPress} />
          )}
          ListHeaderComponent={
            filteredUnread > 0 ? (
              <View style={[st.unreadBanner, { backgroundColor: accent + "10", borderBottomColor: accent + "25" }]}>
                <View style={[st.unreadBadge, { backgroundColor: accent }]}>
                  <Text style={st.unreadBadgeText}>{filteredUnread}</Text>
                </View>
                <Text style={[st.unreadBannerText, { color: colors.text }]}>
                  {filteredUnread} unread notification{filteredUnread !== 1 ? "s" : ""}
                </Text>
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const st = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
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
  pillBar: {
    flexGrow: 0,
    borderBottomWidth: 0.5,
  },
  pillBarContent: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 20,
  },
  pillText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  pillBadge: {
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    marginLeft: 1,
  },
  pillBadgeText: {
    color: "#fff",
    fontSize: 9,
    fontFamily: "Inter_700Bold",
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
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  retryBtnText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  unreadBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
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
    color: "#fff",
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
    paddingVertical: 14,
    gap: 12,
  },
  avatarWrap: {
    position: "relative",
    width: 44,
    height: 44,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  typeBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#fff",
  },
  content: {
    flex: 1,
    gap: 3,
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
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
  },
});
