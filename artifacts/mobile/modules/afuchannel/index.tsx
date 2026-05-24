import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";

type Channel = {
  id: string;
  name: string;
  handle: string;
  description: string | null;
  avatar_url: string | null;
  member_count: number;
  is_subscribed?: boolean;
};

type Post = {
  id: string;
  content: string | null;
  image_url: string | null;
  created_at: string;
  author: { display_name: string; handle: string; avatar_url: string | null } | null;
  like_count: number;
};

const TABS = ["Following", "Discover"] as const;
type Tab = (typeof TABS)[number];
type Screen = "list" | "detail";

export default function AfuChannelApp() {
  const { colors, accent } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  // Screen state — list or channel detail
  const [screen, setScreen] = useState<Screen>("list");
  const [selected, setSelected] = useState<Channel | null>(null);

  // List state
  const [tab, setTab] = useState<Tab>("Following");
  const [channels, setChannels] = useState<Channel[]>([]);
  const [listLoading, setListLoading] = useState(true);

  // Detail state
  const [posts, setPosts] = useState<Post[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [subLoading, setSubLoading] = useState(false);

  useEffect(() => {
    setListLoading(true);
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
          setListLoading(false);
        })
        .catch(() => setListLoading(false));
    } else {
      supabase
        .from("channels")
        .select("id, name, handle, description, avatar_url, member_count")
        .order("member_count", { ascending: false })
        .limit(40)
        .then(({ data }) => {
          setChannels((data as Channel[]) ?? []);
          setListLoading(false);
        })
        .catch(() => setListLoading(false));
    }
  }, [tab, user]);

  const openChannel = useCallback(async (c: Channel) => {
    setSelected(c);
    setSubscribed(!!c.is_subscribed);
    setScreen("detail");
    setPostsLoading(true);
    setPosts([]);

    // Try channel_posts table first, fallback to posts with channel_id
    const { data: cpData } = await supabase
      .from("channel_posts")
      .select("id, content, image_url, created_at, like_count, author:profiles(display_name, handle, avatar_url)")
      .eq("channel_id", c.id)
      .order("created_at", { ascending: false })
      .limit(30);

    if (cpData && cpData.length > 0) {
      setPosts(cpData as any);
    } else {
      // fallback: posts table
      const { data: pData } = await supabase
        .from("posts")
        .select("id, content, image_url, created_at, like_count, author:profiles(display_name, handle, avatar_url)")
        .eq("channel_id", c.id)
        .order("created_at", { ascending: false })
        .limit(30);
      setPosts((pData as any) ?? []);
    }
    setPostsLoading(false);
  }, []);

  const toggleSubscribe = useCallback(async () => {
    if (!user || !selected) return;
    setSubLoading(true);
    if (subscribed) {
      await supabase.from("channel_members").delete().eq("channel_id", selected.id).eq("user_id", user.id);
      setSubscribed(false);
    } else {
      await supabase.from("channel_members").upsert({ channel_id: selected.id, user_id: user.id });
      setSubscribed(true);
    }
    setSubLoading(false);
  }, [user, selected, subscribed]);

  // ─── Detail Screen ────────────────────────────────────────────────────────
  if (screen === "detail" && selected) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        {/* Detail Header */}
        <View style={[styles.detailHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <Pressable onPress={() => setScreen("list")} hitSlop={12} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </Pressable>
          <View style={styles.detailHeaderInfo}>
            <Text style={[styles.detailName, { color: colors.text }]} numberOfLines={1}>
              {selected.name}
            </Text>
            <Text style={[styles.detailHandle, { color: colors.textMuted }]} numberOfLines={1}>
              @{selected.handle}
            </Text>
          </View>
          <Pressable
            onPress={toggleSubscribe}
            style={[
              styles.subBtn,
              { backgroundColor: subscribed ? colors.backgroundSecondary : accent },
            ]}
            disabled={subLoading}
          >
            {subLoading ? (
              <ActivityIndicator size="small" color={subscribed ? accent : "#fff"} />
            ) : (
              <Text style={[styles.subBtnText, { color: subscribed ? accent : "#fff" }]}>
                {subscribed ? "Following" : "Follow"}
              </Text>
            )}
          </Pressable>
        </View>

        {/* Channel meta */}
        <View style={[styles.detailMeta, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <View style={[styles.detailAvatar, { backgroundColor: accent + "22" }]}>
            {selected.avatar_url ? (
              <Image source={{ uri: selected.avatar_url }} style={styles.detailAvatarImg} />
            ) : (
              <Ionicons name="radio" size={28} color={accent} />
            )}
          </View>
          <View style={{ flex: 1 }}>
            {selected.description ? (
              <Text style={[styles.detailDesc, { color: colors.textSecondary }]}>{selected.description}</Text>
            ) : null}
            <Text style={[styles.detailMemberCount, { color: colors.textMuted }]}>
              {selected.member_count >= 1000
                ? `${(selected.member_count / 1000).toFixed(1)}K`
                : selected.member_count}{" "}
              followers
            </Text>
          </View>
        </View>

        {/* Posts */}
        {postsLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={accent} size="large" />
          </View>
        ) : posts.length === 0 ? (
          <View style={styles.center}>
            <Ionicons name="document-text-outline" size={48} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>No posts yet in this channel</Text>
          </View>
        ) : (
          <FlatList
            data={posts}
            keyExtractor={(p) => p.id}
            contentContainerStyle={{ paddingBottom: insets.bottom + 20, paddingTop: 8 }}
            ItemSeparatorComponent={() => (
              <View style={[styles.sep, { backgroundColor: colors.border }]} />
            )}
            renderItem={({ item }) => (
              <View style={[styles.postCard, { backgroundColor: colors.surface }]}>
                {item.author ? (
                  <View style={styles.postAuthor}>
                    <View style={[styles.postAvatar, { backgroundColor: accent + "22" }]}>
                      {item.author.avatar_url ? (
                        <Image source={{ uri: item.author.avatar_url }} style={styles.postAvatarImg} />
                      ) : (
                        <Ionicons name="person" size={14} color={accent} />
                      )}
                    </View>
                    <Text style={[styles.postAuthorName, { color: colors.text }]} numberOfLines={1}>
                      {item.author.display_name ?? `@${item.author.handle}`}
                    </Text>
                    <Text style={[styles.postDate, { color: colors.textMuted }]}>
                      {new Date(item.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                ) : null}
                {item.content ? (
                  <Text style={[styles.postContent, { color: colors.text }]}>{item.content}</Text>
                ) : null}
                {item.image_url ? (
                  <Image source={{ uri: item.image_url }} style={styles.postImage} resizeMode="cover" />
                ) : null}
                <View style={styles.postFooter}>
                  <Ionicons name="heart-outline" size={15} color={colors.textMuted} />
                  <Text style={[styles.postLikes, { color: colors.textMuted }]}>
                    {item.like_count ?? 0}
                  </Text>
                </View>
              </View>
            )}
          />
        )}
      </View>
    );
  }

  // ─── List Screen ──────────────────────────────────────────────────────────
  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.tabRow, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        {TABS.map((t) => (
          <Pressable key={t} onPress={() => setTab(t)} style={styles.tabItem}>
            <Text style={[styles.tabLabel, { color: tab === t ? accent : colors.textMuted }]}>{t}</Text>
            {tab === t ? <View style={[styles.tabIndicator, { backgroundColor: accent }]} /> : null}
          </Pressable>
        ))}
      </View>

      {listLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={accent} size="large" />
        </View>
      ) : (
        <FlatList
          data={channels}
          keyExtractor={(c) => c.id}
          renderItem={({ item }) => (
            <Pressable
              style={({ pressed }) => [
                styles.row,
                { backgroundColor: colors.surface, opacity: pressed ? 0.85 : 1 },
              ]}
              onPress={() => openChannel(item)}
            >
              <View style={[styles.avatar, { backgroundColor: accent + "22" }]}>
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
                  <Text style={[styles.desc, { color: colors.textSecondary }]} numberOfLines={1}>
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
          )}
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
  tabRow: { flexDirection: "row", borderBottomWidth: StyleSheet.hairlineWidth },
  tabItem: { flex: 1, alignItems: "center", paddingVertical: 12, position: "relative" },
  tabLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  tabIndicator: { position: "absolute", bottom: 0, left: "20%", right: "20%", height: 2, borderRadius: 2 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, padding: 40 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
  row: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  avatarImg: { width: 48, height: 48 },
  info: { flex: 1, gap: 1 },
  name: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  handle: { fontSize: 12, fontFamily: "Inter_400Regular" },
  desc: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  meta: { alignItems: "center", gap: 2 },
  members: { fontSize: 11, fontFamily: "Inter_400Regular" },
  sep: { height: StyleSheet.hairlineWidth },
  // Detail
  detailHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  backBtn: { padding: 4 },
  detailHeaderInfo: { flex: 1 },
  detailName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  detailHandle: { fontSize: 12, fontFamily: "Inter_400Regular" },
  subBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, minWidth: 80, alignItems: "center" },
  subBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  detailMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  detailAvatar: { width: 60, height: 60, borderRadius: 30, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  detailAvatarImg: { width: 60, height: 60 },
  detailDesc: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18, marginBottom: 4 },
  detailMemberCount: { fontSize: 12, fontFamily: "Inter_400Regular" },
  postCard: { paddingHorizontal: 16, paddingVertical: 14, gap: 8 },
  postAuthor: { flexDirection: "row", alignItems: "center", gap: 8 },
  postAvatar: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  postAvatarImg: { width: 32, height: 32 },
  postAuthorName: { flex: 1, fontSize: 13, fontFamily: "Inter_600SemiBold" },
  postDate: { fontSize: 11, fontFamily: "Inter_400Regular" },
  postContent: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 21 },
  postImage: { width: "100%", height: 200, borderRadius: 12 },
  postFooter: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 4 },
  postLikes: { fontSize: 12, fontFamily: "Inter_400Regular" },
});
