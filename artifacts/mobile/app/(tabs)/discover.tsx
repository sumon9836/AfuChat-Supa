import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/hooks/useTheme";
import { Avatar } from "@/components/ui/Avatar";
import VerifiedBadge from "@/components/ui/VerifiedBadge";
import OfflineBanner from "@/components/ui/OfflineBanner";
import { showToast } from "@/lib/toast";

type UserResult = {
  id: string;
  handle: string;
  display_name: string;
  avatar_url: string | null;
  is_verified: boolean;
  is_organization_verified: boolean;
};

export default function PeopleScreen() {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState<string | null>(null);
  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const textColor  = isDark ? "#F1F1F1" : "#0F0F0F";
  const mutedColor = isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.45)";
  const inputBg    = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)";
  const inputBorder = isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.10)";

  const searchUsers = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); setLoading(false); return; }
    setLoading(true);
    try {
      const clean = q.trim().toLowerCase().replace(/^@/, "");
      const { data } = await supabase
        .from("profiles")
        .select("id, handle, display_name, avatar_url, is_verified, is_organization_verified")
        .or(`handle.ilike.%${clean}%,display_name.ilike.%${clean}%`)
        .neq("id", user?.id ?? "")
        .limit(30);
      setResults((data as UserResult[]) ?? []);
    } catch {
      setResults([]);
    }
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    if (searchRef.current) clearTimeout(searchRef.current);
    if (!query.trim()) { setResults([]); setLoading(false); return; }
    setLoading(true);
    searchRef.current = setTimeout(() => searchUsers(query), 400);
    return () => { if (searchRef.current) clearTimeout(searchRef.current); };
  }, [query, searchUsers]);

  async function openDM(targetId: string) {
    if (!user) return;
    setStarting(targetId);
    try {
      const { data: existing } = await supabase
        .from("conversations")
        .select("id")
        .eq("is_group", false)
        .contains("participant_ids", [user.id, targetId])
        .limit(1)
        .maybeSingle();

      if (existing?.id) {
        router.push({ pathname: "/chat/[id]", params: { id: existing.id } } as any);
      } else {
        const { data: conv, error } = await supabase
          .from("conversations")
          .insert({
            is_group: false,
            participant_ids: [user.id, targetId],
            created_by: user.id,
          })
          .select("id")
          .single();
        if (error || !conv) {
          showToast("Could not start chat. Please try again.");
        } else {
          router.push({ pathname: "/chat/[id]", params: { id: conv.id } } as any);
        }
      }
    } catch {
      showToast("Could not start chat.");
    }
    setStarting(null);
  }

  function renderUser({ item }: { item: UserResult }) {
    const isStarting = starting === item.id;
    return (
      <TouchableOpacity
        style={[row.wrap, { borderBottomColor: colors.border }]}
        onPress={() => openDM(item.id)}
        disabled={isStarting}
        activeOpacity={0.75}
      >
        <Avatar uri={item.avatar_url} size={46} />
        <View style={row.info}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Text style={[row.name, { color: textColor }]} numberOfLines={1}>
              {item.display_name || item.handle}
            </Text>
            {(item.is_verified || item.is_organization_verified) && (
              <VerifiedBadge size={14} />
            )}
          </View>
          <Text style={[row.handle, { color: mutedColor }]} numberOfLines={1}>
            @{item.handle}
          </Text>
        </View>
        {isStarting ? (
          <ActivityIndicator size="small" color={colors.accent} />
        ) : (
          <View style={[row.msgBtn, { backgroundColor: colors.accent + "18", borderColor: colors.accent + "40" }]}>
            <Ionicons name="chatbubble-outline" size={15} color={colors.accent} />
            <Text style={[row.msgText, { color: colors.accent }]}>Message</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <OfflineBanner />

      <View style={[header.wrap, { paddingTop: insets.top + 12, paddingHorizontal: 16 }]}>
        <Text style={[header.title, { color: textColor }]}>People</Text>
        <Text style={[header.sub, { color: mutedColor }]}>Find someone to chat with</Text>
      </View>

      <View style={{ paddingHorizontal: 16, marginTop: 12, marginBottom: 8 }}>
        <View style={[search.wrap, { backgroundColor: inputBg, borderColor: inputBorder }]}>
          <Ionicons name="search-outline" size={17} color={mutedColor} style={{ marginRight: 8 }} />
          <TextInput
            style={[search.input, { color: textColor }]}
            placeholder="Search by name or @username"
            placeholderTextColor={mutedColor}
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery("")} hitSlop={10}>
              <Ionicons name="close-circle" size={17} color={mutedColor} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading && (
        <View style={{ paddingVertical: 24, alignItems: "center" }}>
          <ActivityIndicator color={colors.accent} />
        </View>
      )}

      {!loading && query.trim() && results.length === 0 && (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingBottom: 80 }}>
          <Ionicons name="person-outline" size={48} color={mutedColor} />
          <Text style={{ color: mutedColor, fontSize: 15, fontFamily: "Inter_400Regular", marginTop: 12 }}>
            No users found for "{query}"
          </Text>
        </View>
      )}

      {!loading && !query.trim() && (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingBottom: 80 }}>
          <Ionicons name="people-outline" size={56} color={mutedColor} />
          <Text style={{ color: textColor, fontSize: 18, fontFamily: "Inter_600SemiBold", marginTop: 16 }}>
            Find People
          </Text>
          <Text style={{ color: mutedColor, fontSize: 14, fontFamily: "Inter_400Regular", marginTop: 8, textAlign: "center", paddingHorizontal: 40 }}>
            Search by name or username to start a conversation
          </Text>
        </View>
      )}

      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        renderItem={renderUser}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
      />
    </View>
  );
}

const header = StyleSheet.create({
  wrap:  { paddingBottom: 4 },
  title: { fontSize: 28, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  sub:   { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
});

const search = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    height: 44,
    ...Platform.select({ web: { outlineStyle: "none" } as any }),
  },
});

const row = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  info:    { flex: 1 },
  name:    { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  handle:  { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 1 },
  msgBtn:  { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  msgText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
});
