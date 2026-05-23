import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { router } from "expo-router";

type Channel = {
  id: string;
  name: string;
  handle: string;
  description: string | null;
  avatar_url: string | null;
  member_count: number;
  is_subscribed?: boolean;
};

const TABS = ["Following", "Discover"] as const;
type Tab = (typeof TABS)[number];

export default function AfuChannelApp() {
  const { colors, accent } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>("Following");
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    if (tab === "Following" && user) {
      supabase
        .from("channel_members")
        .select("channel_id, channels(id, name, handle, description, avatar_url, member_count)")
        .eq("user_id", user.id)
        .limit(40)
        .then(({ data }) => {
          setChannels(
            (data ?? [])
              .map((r: any) => r.channels)
              .filter(Boolean)
              .map((c: any) => ({ ...c, is_subscribed: true }))
          );
          setLoading(false);
        })
        .catch(() => setLoading(false));
    } else {
      supabase
        .from("channels")
        .select("id, name, handle, description, avatar_url, member_count")
        .order("member_count", { ascending: false })
        .limit(40)
        .then(({ data }) => {
          setChannels((data as Channel[]) ?? []);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [tab, user]);

  const openChannel = (c: Channel) => {
    router.push({ pathname: "/channel/[id]", params: { id: c.id } } as any);
  };

  const renderItem = ({ item }: { item: Channel }) => (
    <Pressable
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: colors.surface, opacity: pressed ? 0.85 : 1 },
      ]}
      onPress={() => openChannel(item)}
    >
      <View
        style={[
          styles.avatar,
          { backgroundColor: accent + "22" },
        ]}
      >
        {item.avatar_url ? (
          <Image source={{ uri: item.avatar_url }} style={styles.avatarImg} />
        ) : (
          <Ionicons name="radio" size={22} color={accent} />
        )}
      </View>
      <View style={styles.info}>
        <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={[styles.handle, { color: colors.textMuted }]} numberOfLines={1}>
          @{item.handle}
        </Text>
        {item.description ? (
          <Text
            style={[styles.desc, { color: colors.textSecondary }]}
            numberOfLines={1}
          >
            {item.description}
          </Text>
        ) : null}
      </View>
      <View style={styles.meta}>
        <Text style={[styles.members, { color: colors.textMuted }]}>
          {item.member_count >= 1000
            ? `${(item.member_count / 1000).toFixed(1)}K`
            : item.member_count}
        </Text>
        <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
      </View>
    </Pressable>
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Tabs */}
      <View
        style={[
          styles.tabRow,
          { backgroundColor: colors.surface, borderBottomColor: colors.border },
        ]}
      >
        {TABS.map((t) => (
          <Pressable key={t} onPress={() => setTab(t)} style={styles.tabItem}>
            <Text
              style={[
                styles.tabLabel,
                { color: tab === t ? accent : colors.textMuted },
              ]}
            >
              {t}
            </Text>
            {tab === t && (
              <View style={[styles.tabIndicator, { backgroundColor: accent }]} />
            )}
          </Pressable>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={accent} size="large" />
        </View>
      ) : (
        <FlatList
          data={channels}
          keyExtractor={(c) => c.id}
          renderItem={renderItem}
          ItemSeparatorComponent={() => (
            <View style={[styles.sep, { backgroundColor: colors.border, marginLeft: 76 }]} />
          )}
          contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="radio-outline" size={48} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                {tab === "Following"
                  ? "You haven't followed any channels yet"
                  : "No channels available"}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  tabRow: {
    flexDirection: "row",
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    position: "relative",
  },
  tabLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  tabIndicator: {
    position: "absolute",
    bottom: 0,
    left: "20%",
    right: "20%",
    height: 2,
    borderRadius: 2,
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, padding: 40 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImg: { width: 48, height: 48 },
  info: { flex: 1, gap: 1 },
  name: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  handle: { fontSize: 12, fontFamily: "Inter_400Regular" },
  desc: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  meta: { alignItems: "center", gap: 2 },
  members: { fontSize: 11, fontFamily: "Inter_400Regular" },
  sep: { height: StyleSheet.hairlineWidth },
});
