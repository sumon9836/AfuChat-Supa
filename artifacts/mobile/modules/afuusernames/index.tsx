import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
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
import { showAlert } from "@/lib/alert";
import Colors from "@/constants/colors";

type Listing = {
  id: string;
  username: string;
  price: number;
  currency: string;
  seller: { display_name: string; handle: string } | null;
  created_at: string;
  is_premium: boolean;
};

function timeAgo(iso: string) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (d === 0) return "Today";
  if (d === 1) return "Yesterday";
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function AfuUsernamesApp() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    let query = supabase.from("username_listings").select("id,username,price,currency,is_premium,created_at,seller:seller_id(display_name,handle)").eq("status", "active").order("is_premium", { ascending: false }).order("created_at", { ascending: false }).limit(40);
    if (search.trim()) query = query.ilike("username", `%${search.trim()}%`);
    const { data } = await query;
    setListings((data as Listing[]) || []);
    setLoading(false);
  }, [search]);

  useEffect(() => {
    const t = setTimeout(load, 350);
    return () => clearTimeout(t);
  }, [load]);

  function renderItem({ item }: { item: Listing }) {
    return (
      <TouchableOpacity style={[s.card, { backgroundColor: colors.surface, borderColor: item.is_premium ? "#FFD60A40" : colors.border }]} onPress={() => showAlert(`@${item.username}`, `Price: ${item.price} ${item.currency || "ACoin"}\nSeller: @${item.seller?.handle || "unknown"}\n\nPurchase feature coming soon!`)} activeOpacity={0.8}>
        <View style={[s.usernameIcon, { backgroundColor: item.is_premium ? "#FFD60A18" : Colors.brand + "18" }]}>
          <Text style={[s.atSign, { color: item.is_premium ? "#FFD60A" : Colors.brand }]}>@</Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text style={[s.username, { color: colors.text }]}>@{item.username}</Text>
            {item.is_premium && <Ionicons name="star" size={13} color="#FFD60A" />}
          </View>
          <Text style={[s.seller, { color: colors.textMuted }]}>by @{item.seller?.handle || "seller"} · {timeAgo(item.created_at)}</Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={[s.price, { color: Colors.brand }]}>{item.price}</Text>
          <Text style={[s.currency, { color: colors.textMuted }]}>{item.currency || "ACoin"}</Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={[s.root, { backgroundColor: colors.background }]}>
      <View style={[s.header, { borderBottomColor: colors.border }]}>
        <View style={{ flex: 1 }}>
          <Text style={[s.headerTitle, { color: colors.text }]}>Username Market</Text>
          <Text style={[s.headerSub, { color: colors.textMuted }]}>Buy & sell premium @handles</Text>
        </View>
        <TouchableOpacity style={[s.listBtn, { backgroundColor: Colors.brand }]} onPress={() => showAlert("List Username", "Username listing coming soon!")}>
          <Ionicons name="add" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
      <View style={[s.searchWrap, { borderBottomColor: colors.border }]}>
        <View style={[s.searchBar, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
          <Ionicons name="search" size={15} color={colors.textMuted} />
          <TextInput style={[s.searchInput, { color: colors.text }]} placeholder="Search usernames…" placeholderTextColor={colors.textMuted} value={search} onChangeText={setSearch} autoCapitalize="none" autoCorrect={false} />
          {search.length > 0 && <TouchableOpacity onPress={() => setSearch("")}><Ionicons name="close-circle" size={15} color={colors.textMuted} /></TouchableOpacity>}
        </View>
      </View>
      {loading ? (
        <ActivityIndicator color={Colors.brand} style={{ marginTop: 40 }} />
      ) : listings.length === 0 ? (
        <View style={s.empty}>
          <Text style={{ fontSize: 40 }}>@</Text>
          <Text style={[s.emptyTitle, { color: colors.text }]}>{search ? `No results for "${search}"` : "No listings yet"}</Text>
          <Text style={[s.emptySub, { color: colors.textMuted }]}>Premium usernames will appear here.</Text>
        </View>
      ) : (
        <FlatList
          data={listings}
          keyExtractor={l => l.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32, gap: 10 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, gap: 12 },
  headerTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  headerSub: { fontSize: 12, fontFamily: "Inter_400Regular" },
  listBtn: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  searchWrap: { paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  searchBar: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 9 },
  searchInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular" },
  card: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 14, borderWidth: 1, padding: 14 },
  usernameIcon: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  atSign: { fontSize: 22, fontFamily: "Inter_700Bold" },
  username: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  seller: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  price: { fontSize: 16, fontFamily: "Inter_700Bold" },
  currency: { fontSize: 11, fontFamily: "Inter_400Regular" },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 10 },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  emptySub: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },
});
