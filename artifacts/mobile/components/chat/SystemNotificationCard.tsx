import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Image as ExpoImage } from "expo-image";
import { router } from "expo-router";
import { useTheme } from "@/hooks/useTheme";

export type SysNotifData = {
  _sys_notif: true;
  _is_welcome?: boolean;
  notif_id?: string;
  type: string;
  title: string;
  body: string;
  actor_id?: string;
  actor_name?: string;
  actor_handle?: string;
  actor_avatar?: string;
  entity_id?: string;
  entity_type?: string;
  post_id?: string;
  data?: {
    actions?: Array<{ label: string; icon: string; route: string }>;
    orderId?: string;
    url?: string;
    actorId?: string;
    chatId?: string;
    callId?: string;
    callType?: string;
    callerName?: string;
    channelId?: string;
    notifType?: string;
    [key: string]: any;
  };
  created_at?: string;
};

function tryParseSysNotif(raw: string): SysNotifData | null {
  if (!raw || !raw.startsWith("{")) return null;
  try {
    const p = JSON.parse(raw);
    if (p?._sys_notif) return p as SysNotifData;
  } catch {}
  return null;
}

export { tryParseSysNotif };

type NotifStyle = { icon: string; color: string; bg: string };

function getNotifStyle(type: string): NotifStyle {
  switch (type) {
    case "new_follower":
      return { icon: "person-add", color: "#007AFF", bg: "#007AFF15" };
    case "new_like":
      return { icon: "heart", color: "#FF2D55", bg: "#FF2D5515" };
    case "new_reply":
    case "new_mention":
      return { icon: "chatbubble", color: "#34C759", bg: "#34C75915" };
    case "order_placed":
    case "order_shipped":
    case "order_delivered":
    case "escrow_released":
    case "shop_review":
      return { icon: "bag-handle", color: "#FF9500", bg: "#FF950015" };
    case "dispute_raised":
      return { icon: "warning", color: "#FF3B30", bg: "#FF3B3015" };
    case "refund_issued":
      return { icon: "cash", color: "#34C759", bg: "#34C75915" };
    case "gift":
      return { icon: "gift", color: "#AF52DE", bg: "#AF52DE15" };
    case "missed_call":
      return { icon: "call", color: "#FF3B30", bg: "#FF3B3015" };
    case "acoin_received":
      return { icon: "logo-bitcoin", color: "#FFD700", bg: "#FFD70015" };
    case "acoin_sent":
      return { icon: "arrow-up-circle", color: "#8E8E93", bg: "#8E8E9315" };
    case "subscription_activated":
    case "seller_approved":
    case "verification_approved":
      return { icon: "checkmark-circle", color: "#34C759", bg: "#34C75915" };
    case "live_started":
    case "channel_post":
      return { icon: "radio", color: "#FF2D55", bg: "#FF2D5515" };
    case "system_welcome":
      return { icon: "sparkles", color: "#007AFF", bg: "#007AFF15" };
    default:
      return { icon: "notifications", color: "#636366", bg: "#63636315" };
  }
}

function buildActions(data: SysNotifData): Array<{ label: string; icon: string; route: string }> {
  const type = data.type;
  const d = data.data || {};
  const notifType = d.notifType || type;

  // Custom actions defined in the notification data take priority
  if (d.actions && Array.isArray(d.actions) && d.actions.length > 0) {
    return d.actions as Array<{ label: string; icon: string; route: string }>;
  }

  const actions: Array<{ label: string; icon: string; route: string }> = [];

  // Actor-based actions
  if (data.actor_handle && (type === "new_follower")) {
    actions.push({ label: "View Profile", icon: "person-outline", route: `/@${data.actor_handle}` });
    actions.push({ label: "Follow Back", icon: "person-add-outline", route: `/@${data.actor_handle}?followBack=1` });
  } else if (data.actor_handle && ["new_like", "new_reply", "new_mention"].includes(type)) {
    actions.push({ label: "View Profile", icon: "person-outline", route: `/@${data.actor_handle}` });
  }

  // Post actions
  if (data.post_id && ["new_like", "new_reply", "new_mention"].includes(type)) {
    actions.push({ label: "View Post", icon: "document-text-outline", route: `/post/${data.post_id}` });
  }

  // Order actions
  const orderId = d.orderId || data.entity_id;
  if (orderId && (data.entity_type === "order" || notifType?.includes("order") || notifType?.includes("escrow") || notifType?.includes("refund") || notifType?.includes("dispute") || notifType?.includes("review"))) {
    actions.push({ label: "View Order", icon: "bag-outline", route: `/shop/order/${orderId}` });
  }

  // Call actions
  if (type === "missed_call" && d.actorId) {
    actions.push({ label: "Call History", icon: "time-outline", route: "/call-history" });
  }

  // Gift actions
  if (type === "gift") {
    actions.push({ label: "View Gifts", icon: "gift-outline", route: "/gifts" });
  }

  // Wallet actions
  if (["acoin_received", "acoin_sent", "escrow_released", "refund_issued"].includes(notifType)) {
    actions.push({ label: "View Wallet", icon: "wallet-outline", route: "/wallet" });
  }

  // Channel actions
  const channelId = d.channelId || data.entity_id;
  if (channelId && (data.entity_type === "channel" || type === "live_started" || type === "channel_post")) {
    actions.push({ label: "View Channel", icon: "radio-outline", route: `/channel/${channelId}` });
  }

  // URL fallback
  if (actions.length === 0 && d.url) {
    actions.push({ label: "View", icon: "arrow-forward-circle-outline", route: d.url });
  }

  return actions;
}

interface Props {
  data: SysNotifData;
  sentAt: string;
}

export function SystemNotificationCard({ data, sentAt }: Props) {
  const { colors, isDark } = useTheme();
  const ns = getNotifStyle(data.type);
  const actions = buildActions(data);

  const cardBg = isDark ? "rgba(28,28,32,0.96)" : "rgba(255,255,255,0.97)";
  const borderColor = isDark ? "rgba(58,58,64,0.8)" : "rgba(220,220,228,0.9)";

  const timeStr = (() => {
    const d = new Date(sentAt);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60000) return "Just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    if (diff < 604800000) {
      const days = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
      return days[d.getDay()];
    }
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  })();

  return (
    <View style={[sn.wrapper, { paddingHorizontal: 14, paddingVertical: 3 }]}>
      <View style={[sn.card, { backgroundColor: cardBg, borderColor }]}>
        {/* Header row */}
        <View style={sn.headerRow}>
          <View style={[sn.iconBadge, { backgroundColor: ns.bg }]}>
            <Ionicons name={ns.icon as any} size={18} color={ns.color} />
          </View>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={[sn.title, { color: colors.text }]} numberOfLines={2}>
              {data.title}
            </Text>
          </View>
          {data.actor_avatar ? (
            <ExpoImage
              source={{ uri: data.actor_avatar }}
              style={sn.actorAvatar}
              contentFit="cover"
              cachePolicy="memory-disk"
            />
          ) : null}
        </View>

        {/* Body */}
        {data.body ? (
          <Text style={[sn.body, { color: colors.textSecondary || colors.textMuted }]} numberOfLines={4}>
            {data.body}
          </Text>
        ) : null}

        {/* Action buttons */}
        {actions.length > 0 && (
          <View style={sn.actionsRow}>
            {actions.map((a, i) => (
              <TouchableOpacity
                key={i}
                style={[
                  sn.actionBtn,
                  i === 0
                    ? { backgroundColor: ns.color, borderColor: ns.color }
                    : { backgroundColor: "transparent", borderColor: borderColor },
                ]}
                onPress={() => {
                  try { router.push(a.route as any); } catch {}
                }}
                activeOpacity={0.75}
              >
                <Ionicons
                  name={a.icon as any}
                  size={13}
                  color={i === 0 ? "#fff" : colors.text}
                  style={{ marginRight: 4 }}
                />
                <Text
                  style={[
                    sn.actionBtnText,
                    { color: i === 0 ? "#fff" : colors.text },
                  ]}
                  numberOfLines={1}
                >
                  {a.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Timestamp */}
        <Text style={[sn.time, { color: colors.textMuted }]}>{timeStr}</Text>
      </View>
    </View>
  );
}

const sn = StyleSheet.create({
  wrapper: {
    alignItems: "stretch",
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 8,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 2,
  },
  iconBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    lineHeight: 19,
    flex: 1,
  },
  actorAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    marginLeft: 6,
  },
  body: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
  actionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 2,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  actionBtnText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  time: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
    textAlign: "right",
  },
});
