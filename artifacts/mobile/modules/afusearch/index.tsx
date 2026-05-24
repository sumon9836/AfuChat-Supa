import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";
import { supabase } from "@/lib/supabase";
import Colors from "@/constants/colors";

type ResultType = "user" | "post" | "channel";
type User = { id: string; handle: string; display_name: string; avatar_url: string | null; is_verified: boolean; bio: string | null };
type Post = { id: string; content: string; created_at: string; author: { handle: string; display_name: string; avatar_url: string | null } | null };
type Channel = { id: string; name: string; description: string | null; cover_url: string | null; member_count: number };

const TABS: { key: ResultType; label: string; icon: React.ComponentProps<typeof Ionicons>["name"] }[] = [
  { key: "user", label: "People", icon: "people" },
  { key: "post", label: "Posts", icon: "newspaper" },
  { key: "channel", label: "Channels", icon: "radio" },
];

export default function AfuSearchApp() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<ResultType>("user");
  const [users, setUsers] = useState<User[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(async (q: string) => {
    const term = q.trim();
    if (!term) { setUsers([]); setPosts([]); setChannels([]); return; }
    setLoading(true);
    try {
      const [{ data: u }, { data: p }, { data: c }] = await Promise.all([
        supabase.from("profiles").select("id,handle,display_name,avatar_url,is_verified,bio").or(`handle.ilike.%${term}%,display_name.ilike.%${term}%`).limit(20),
        supabase.from("posts").select("id,content,created_at,author:profiles(handle,display_name,avatar_url)").ilike("content", `%${term}%`).order("created_at", { ascending: false }).limit(15),
        supabase.from("channels").select("id,name,description,cover_url,member_count").ilike("name", `%${term}%`).limit(15),
      ]);
      setUsers((u as User[]) || []);
      setPosts((p as Post[]) || []);
      setChannels((c as Channel[]) || []);
    } catch (_) {}
    setLoading(false);
  }, []);

  function onChangeText(text: string) {
    setQuery(text);
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => search(text), 350);
  }

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 300);
    return () => { if (debounce.current) clearTimeout(debounce.current); };
  }, []);

  const resultCount = tab === "user" ? users.length : tab === "post" ? posts.length : channels.length;

  function renderUser({ item }: { item: User }) {
    return (
      <View style={[s.row, { borderBottomColor: colors.border }]}>
        {item.avatar_url ? (
          <Image source={{ uri: item.avatar_url }} style={s.avatar} />
        ) : (
          <View style={[s.avatarFallback, { backgroundColor: Colors.brand + "22" }]}>
            <Ionicons name="person" size={18} color={Colors.brand} />
          </View>
        )}
        <View style={s.rowInfo}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Text style={[s.name, { color: colors.text }]} numberOfLines={1}>{item.display_name}</Text>
            {item.is_verified && <Ionicons name="checkmark-circle" size={14} color={Colors.brand} />}
          </View>
          <Text style={[s.handle, { color: colors.textMuted }]}>@{item.handle}</Text>
          {item.bio ? <Text style={[s.bio, { color: colors.textSecondary }]} numberOfLines={1}>{item.bio}</Text> : null}
        </View>
        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
      </View>
    );
  }

  function renderPost({ item }: { item: Post }) {
    return (
      <View style={[s.row, { borderBottomColor: colors.border, flexDirection: "column", alignItems: "flex-start", gap: 6 }]}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          {item.author?.avatar_url ? (
            <Image source={{ uri: item.author.avatar_url }} style={[s.avatar, { width: 28, height: 28 }]} />
          ) : (
            <View style={[s.avatarFallback, { width: 28, height: 28, backgroundColor: Colors.brand + "22" }]}>
              <Ionicons name="person" size={13} color={Colors.brand} />
            </View>
          )}
          <Text style={[s.handle, { color: colors.textMuted }]}>@{item.author?.handle || "unknown"}</Text>
        </View>
        <Text style={[s.postContent, { color: colors.text }]} numberOfLines={3}>{item.content}</Text>
      </View>
    );
  }

  function renderChannel({ item }: { item: Channel }) {
    return (
      <View style={[s.row, { borderBottomColor: colors.border }]}>
        {item.cover_url ? (
          <Image source={{ uri: item.cover_url }} style={[s.avatar, { borderRadius: 10 }]} />
        ) : (
          <View style={[s.avatarFallback, { borderRadius: 10, backgroundColor: "#FF950022" }]}>
            <Ionicons name="radio" size={18} color="#FF9500" />
          </View>
        )}
        <View style={s.rowInfo}>
          <Text style={[s.name, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
          <Text style={[s.handle, { color: colors.textMuted }]}>{(item.member_count || 0).toLocaleString()} members</Text>
          {item.description ? <Text style={[s.bio, { color: colors.textSecondary }]} numberOfLines={1}>{item.description}</Text> : null}
        </View>
        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
      </View>
    );
  }

  const listData = tab === "user" ? users : tab === "post" ? posts : channels;
  const renderItem = tab === "user" ? renderUser : tab === "post" ? renderPost : renderChannel;

  return (
    <View style={[s.root, { backgroundColor: colors.background }]}>
      <View style={[s.searchBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={[s.inputWrap, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
          <Ionicons name="search" size={16} color={colors.textMuted} />
          <TextInput
            ref={inputRef}
            style={[s.input, { color: colors.text }]}
            placeholder="Search people, posts, channels…"
            placeholderTextColor={colors.textMuted}
            value={query}
            onChangeText={onChangeText}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => { setQuery(""); setUsers([]); setPosts([]); setChannels([]); }}>
              <Ionicons name="close-circle" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={[s.tabs, { borderBottomColor: colors.border }]}>
        {TABS.map(t => (
          <TouchableOpacity key={t.key} style={[s.tab, tab === t.key && { borderBottomColor: Colors.brand, borderBottomWidth: 2 }]} onPress={() => setTab(t.key)}>
            <Ionicons name={t.icon} size={15} color={tab === t.key ? Colors.brand : colors.textMuted} />
            <Text style={[s.tabLabel, { color: tab === t.key ? Colors.brand : colors.textMuted }]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator color={Colors.brand} style={{ marginTop: 40 }} />
      ) : query.length === 0 ? (
        <View style={s.empty}>
          <Ionicons name="search" size={48} color={colors.textMuted} />
          <Text style={[s.emptyText, { color: colors.textMuted }]}>Search across AfuChat</Text>
          <Text style={[s.emptyHint, { color: colors.textMuted }]}>Find people to follow, posts, and channels</Text>
        </View>
      ) : listData.length === 0 ? (
        <View style={s.empty}>
          <Ionicons name="search-outline" size={40} color={colors.textMuted} />
          <Text style={[s.emptyText, { color: colors.textMuted }]}>No results for "{query}"</Text>
        </View>
      ) : (
        <FlatList
          data={listData as any[]}
          keyExtractor={(item) => item.id}
          renderItem={renderItem as any}
          contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  searchBar: { paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  inputWrap: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10 },
  input: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  tabs: { flexDirection: "row", borderBottomWidth: StyleSheet.hairlineWidth },
  tab: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingVertical: 12 },
  tabLabel: { fontSize: 13, fontFamily: "Inter_500Medium" },
  row: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, gap: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  avatarFallback: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  rowInfo: { flex: 1 },
  name: { fontSize: 15, fontFamily: "Inter_600SemiBold", marginBottom: 2 },
  handle: { fontSize: 13, fontFamily: "Inter_400Regular", marginBottom: 1 },
  bio: { fontSize: 12, fontFamily: "Inter_400Regular" },
  postContent: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8, padding: 32 },
  emptyText: { fontSize: 16, fontFamily: "Inter_500Medium", textAlign: "center" },
  emptyHint: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },
});
