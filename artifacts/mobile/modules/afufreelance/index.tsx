import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "@/components/ui/SafeGradient";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { showAlert } from "@/lib/alert";
import Colors from "@/constants/colors";

const CATEGORIES = ["All", "Design", "Dev", "Writing", "Marketing", "Video", "Finance"];

type Gig = {
  id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  category: string;
  seller: { display_name: string; handle: string; avatar_url: string | null; is_verified: boolean } | null;
  cover_url: string | null;
  rating: number | null;
  review_count: number;
};

export default function AfuFreelanceApp() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [cat, setCat] = useState("All");
  const [gigs, setGigs] = useState<Gig[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"browse" | "post">("browse");

  const load = useCallback(async () => {
    setLoading(true);
    const query = supabase.from("gigs").select("id,title,description,price,currency,category,cover_url,rating,review_count,seller:profiles(display_name,handle,avatar_url,is_verified)").order("created_at", { ascending: false }).limit(30);
    if (cat !== "All") query.ilike("category", cat);
    const { data } = await query;
    setGigs((data as Gig[]) || []);
    setLoading(false);
  }, [cat]);

  useEffect(() => { load(); }, [load]);

  function renderGig({ item }: { item: Gig }) {
    return (
      <TouchableOpacity style={[s.gigCard, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => showAlert(item.title, `${item.description}\n\nStarting at ${item.price} ${item.currency || "ACoin"}`)} activeOpacity={0.8}>
        {item.cover_url ? (
          <Image source={{ uri: item.cover_url }} style={s.gigCover} resizeMode="cover" />
        ) : (
          <View style={[s.gigCoverPlaceholder, { backgroundColor: Colors.brand + "18" }]}>
            <Ionicons name="briefcase" size={28} color={Colors.brand} />
          </View>
        )}
        <View style={s.gigBody}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
            {item.seller?.avatar_url ? (
              <Image source={{ uri: item.seller.avatar_url }} style={s.gigAvatar} />
            ) : (
              <View style={[s.gigAvatarFallback, { backgroundColor: Colors.brand + "22" }]}>
                <Ionicons name="person" size={10} color={Colors.brand} />
              </View>
            )}
            <Text style={[s.gigSeller, { color: colors.textMuted }]}>@{item.seller?.handle || "seller"}</Text>
            {item.seller?.is_verified && <Ionicons name="checkmark-circle" size={12} color={Colors.brand} />}
          </View>
          <Text style={[s.gigTitle, { color: colors.text }]} numberOfLines={2}>{item.title}</Text>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
            <Text style={[s.gigPrice, { color: Colors.brand }]}>From {item.price} {item.currency || "AC"}</Text>
            {(item.rating || 0) > 0 && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                <Ionicons name="star" size={12} color="#FFD60A" />
                <Text style={[s.gigRating, { color: colors.textMuted }]}>{(item.rating || 0).toFixed(1)}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={[s.root, { backgroundColor: colors.background }]}>
      <LinearGradient colors={["#0A2E1F", "#062218"]} style={s.hero}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <View>
            <Text style={s.heroTitle}>AfuFreelance</Text>
            <Text style={s.heroSub}>Hire talent or find work</Text>
          </View>
          <TouchableOpacity style={[s.postBtn, { backgroundColor: Colors.brand }]} onPress={() => showAlert("Post a Gig", "Gig posting will be available soon!")}>
            <Ionicons name="add" size={16} color="#fff" />
            <Text style={s.postBtnText}>Post</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.catRow}>
        {CATEGORIES.map(c => (
          <TouchableOpacity key={c} style={[s.catBtn, { backgroundColor: cat === c ? Colors.brand : colors.inputBg, borderColor: cat === c ? Colors.brand : colors.border }]} onPress={() => setCat(c)}>
            <Text style={[s.catText, { color: cat === c ? "#fff" : colors.textMuted }]}>{c}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <ActivityIndicator color={Colors.brand} style={{ marginTop: 40 }} />
      ) : gigs.length === 0 ? (
        <View style={s.empty}>
          <Ionicons name="briefcase-outline" size={56} color={colors.textMuted} />
          <Text style={[s.emptyTitle, { color: colors.text }]}>No gigs yet</Text>
          <Text style={[s.emptySub, { color: colors.textMuted }]}>Be the first to post a gig in this category!</Text>
          <TouchableOpacity style={[s.postBtn2, { backgroundColor: Colors.brand }]} onPress={() => showAlert("Post a Gig", "Gig posting coming soon!")}>
            <Text style={{ color: "#fff", fontFamily: "Inter_600SemiBold" }}>Post a Gig</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={gigs}
          keyExtractor={g => g.id}
          renderItem={renderGig}
          numColumns={2}
          columnWrapperStyle={{ gap: 10, paddingHorizontal: 16 }}
          contentContainerStyle={{ paddingTop: 12, paddingBottom: insets.bottom + 32, gap: 10 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  hero: { margin: 16, borderRadius: 20, padding: 18 },
  heroTitle: { color: "#fff", fontSize: 20, fontFamily: "Inter_700Bold" },
  heroSub: { color: "rgba(255,255,255,0.6)", fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  postBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  postBtnText: { color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 13 },
  catRow: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  catBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  catText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  gigCard: { flex: 1, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, overflow: "hidden" },
  gigCover: { width: "100%", height: 110 },
  gigCoverPlaceholder: { width: "100%", height: 110, alignItems: "center", justifyContent: "center" },
  gigBody: { padding: 10 },
  gigAvatar: { width: 18, height: 18, borderRadius: 9 },
  gigAvatarFallback: { width: 18, height: 18, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  gigSeller: { fontSize: 11, fontFamily: "Inter_400Regular" },
  gigTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold", lineHeight: 18 },
  gigPrice: { fontSize: 13, fontFamily: "Inter_700Bold" },
  gigRating: { fontSize: 12, fontFamily: "Inter_400Regular" },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 10 },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  emptySub: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
  postBtn2: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, marginTop: 4 },
});
