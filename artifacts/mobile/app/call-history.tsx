import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/hooks/useTheme";
import { Avatar } from "@/components/ui/Avatar";
import { GlassHeader } from "@/components/ui/GlassHeader";

type CallRecord = {
  id: string;
  caller_id: string;
  callee_id: string;
  call_type: "voice" | "video";
  status: "completed" | "missed" | "declined" | "ongoing";
  started_at: string | null;
  ended_at: string | null;
  other_user: {
    id: string;
    display_name: string | null;
    handle: string | null;
    avatar_url: string | null;
  } | null;
};

function formatDuration(start: string | null, end: string | null): string {
  if (!start || !end) return "";
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (ms <= 0) return "";
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}m`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) {
    return d.toLocaleDateString([], { weekday: "short" });
  }
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

export default function CallHistoryScreen() {
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const loadCalls = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("calls")
        .select(
          "id, caller_id, callee_id, call_type, status, started_at, ended_at"
        )
        .or(`caller_id.eq.${user.id},callee_id.eq.${user.id}`)
        .order("started_at", { ascending: false })
        .limit(50);

      if (error || !data) { setLoading(false); return; }

      const otherIds = data.map((c) =>
        c.caller_id === user.id ? c.callee_id : c.caller_id
      );
      const uniqueIds = [...new Set(otherIds)];

      let profileMap: Record<string, CallRecord["other_user"]> = {};
      if (uniqueIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, display_name, handle, avatar_url")
          .in("id", uniqueIds);
        if (profiles) {
          profileMap = Object.fromEntries(
            (profiles as any[]).map((p) => [p.id, p])
          );
        }
      }

      const enriched: CallRecord[] = (data as any[]).map((c) => {
        const otherId = c.caller_id === user.id ? c.callee_id : c.caller_id;
        return { ...c, other_user: profileMap[otherId] ?? null };
      });

      setCalls(enriched);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { loadCalls(); }, [loadCalls]);

  const startCall = useCallback((otherId: string, type: "voice" | "video") => {
    router.push(`/chat/${otherId}` as any);
  }, []);

  const renderItem = useCallback(({ item }: { item: CallRecord }) => {
    const isOutgoing = item.caller_id === user?.id;
    const missed = item.status === "missed" && !isOutgoing;
    const name =
      item.other_user?.display_name ||
      item.other_user?.handle ||
      "Unknown";
    const duration = formatDuration(item.started_at, item.ended_at);
    const time = formatTime(item.started_at || item.ended_at || new Date().toISOString());
    const iconName = item.call_type === "video" ? "videocam-outline" : "call-outline";
    const directionIcon: React.ComponentProps<typeof Ionicons>["name"] = missed
      ? "arrow-down-outline"
      : isOutgoing
      ? "arrow-up-outline"
      : "arrow-down-outline";
    const directionColor = missed ? "#FF3B30" : isOutgoing ? colors.accent : "#34C759";

    return (
      <TouchableOpacity
        activeOpacity={0.75}
        style={[styles.row, { borderBottomColor: colors.border }]}
        onPress={() => item.other_user && startCall(item.other_user.id, item.call_type)}
      >
        <View style={styles.avatarWrap}>
          <Avatar
            uri={item.other_user?.avatar_url ?? null}
            name={name}
            size={46}
          />
        </View>

        <View style={styles.info}>
          <Text
            style={[styles.name, { color: missed ? "#FF3B30" : colors.text }]}
            numberOfLines={1}
          >
            {name}
          </Text>
          <View style={styles.meta}>
            <Ionicons name={directionIcon} size={12} color={directionColor} />
            <Text style={[styles.metaText, { color: colors.textMuted }]}>
              {missed ? "Missed" : isOutgoing ? "Outgoing" : "Incoming"}
              {duration ? ` · ${duration}` : ""}
            </Text>
            <Ionicons name={iconName} size={12} color={colors.textMuted} style={{ marginLeft: 4 }} />
          </View>
        </View>

        <View style={styles.right}>
          <Text style={[styles.time, { color: colors.textMuted }]}>{time}</Text>
          <TouchableOpacity
            hitSlop={12}
            onPress={() => item.other_user && startCall(item.other_user.id, item.call_type)}
            style={[styles.callBtn, { backgroundColor: colors.accent + "18" }]}
          >
            <Ionicons name={iconName} size={18} color={colors.accent} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  }, [user, colors, startCall]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <GlassHeader
        title="Call History"
        onBack={() => router.back()}
      />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} size="large" />
        </View>
      ) : calls.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="call-outline" size={48} color={colors.textMuted} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            No call history
          </Text>
          <Text style={[styles.emptySub, { color: colors.textMuted }]}>
            Voice and video calls will appear here
          </Text>
        </View>
      ) : (
        <FlatList
          data={calls}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingBottom: 40,
  },
  emptyTitle: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    marginTop: 8,
  },
  emptySub: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    maxWidth: 260,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 0.5,
  },
  avatarWrap: { position: "relative" },
  info: { flex: 1 },
  name: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    marginBottom: 3,
  },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  metaText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  right: { alignItems: "flex-end", gap: 6 },
  time: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  callBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
});
