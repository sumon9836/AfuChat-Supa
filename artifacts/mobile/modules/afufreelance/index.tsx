import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { LinearGradient } from "@/components/ui/SafeGradient";

const Colors = { brand: "#00BCD4" };

const CATEGORIES = ["All", "Design", "Tech", "Writing", "Marketing", "Video", "Music", "Other"];

type Seller = {
  display_name: string | null;
  handle: string | null;
  avatar_url: string | null;
  is_verified: boolean;
};

type Gig = {
  id: string;
  title: string;
  description: string | null;
  price: number;
  currency: string | null;
  category: string | null;
  cover_url: string | null;
  rating: number | null;
  review_count: number | null;
  seller: Seller | null;
  seller_id?: string;
};

type Screen = "browse" | "detail" | "post-gig";

export default function AfuFreelanceApp() {
  const { colors } = useTheme();
  const { user, profile } = useAuth();
  const insets = useSafeAreaInsets();

  const [screen, setScreen] = useState<Screen>("browse");
  const [cat, setCat] = useState("All");
  const [gigs, setGigs] = useState<Gig[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGig, setSelectedGig] = useState<Gig | null>(null);

  // Post Gig form
  const [gigTitle, setGigTitle] = useState("");
  const [gigDesc, setGigDesc] = useState("");
  const [gigPrice, setGigPrice] = useState("");
  const [gigCat, setGigCat] = useState("Design");
  const [posting, setPosting] = useState(false);
  const [postMsg, setPostMsg] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("gigs")
      .select(
        "id,title,description,price,currency,category,cover_url,rating,review_count,seller_id,seller:profiles(display_name,handle,avatar_url,is_verified)"
      )
      .order("created_at", { ascending: false })
      .limit(30);
    if (cat !== "All") query = query.ilike("category", cat);
    const { data } = await query;
    setGigs((data as Gig[]) ?? []);
    setLoading(false);
  }, [cat]);

  useEffect(() => {
    load();
  }, [load]);

  const submitGig = useCallback(async () => {
    if (!user || !gigTitle.trim()) return;
    setPosting(true);
    setPostMsg("");
    const { error } = await supabase.from("gigs").insert({
      title: gigTitle.trim(),
      description: gigDesc.trim() || null,
      price: parseFloat(gigPrice) || 0,
      currency: "ACoin",
      category: gigCat,
      seller_id: user.id,
    });
    setPosting(false);
    if (error) {
      setPostMsg("Failed to post gig. Please try again.");
    } else {
      setPostMsg("Gig posted successfully!");
      setGigTitle("");
      setGigDesc("");
      setGigPrice("");
      setTimeout(() => {
        setPostMsg("");
        setScreen("browse");
        load();
      }, 1500);
    }
  }, [user, gigTitle, gigDesc, gigPrice, gigCat, load]);

  // ─── Post Gig Screen ──────────────────────────────────────────────────────
  if (screen === "post-gig") {
    return (
      <View style={[s.root, { backgroundColor: colors.background }]}>
        <View style={[s.subHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <Pressable onPress={() => setScreen("browse")} hitSlop={12} style={s.backBtn}>
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </Pressable>
          <Text style={[s.subTitle, { color: colors.text }]}>Post a Gig</Text>
          <View style={{ width: 34 }} />
        </View>

        <ScrollView contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: insets.bottom + 32 }}>
          <View style={s.field}>
            <Text style={[s.fieldLabel, { color: colors.textSecondary }]}>Gig Title *</Text>
            <TextInput
              style={[s.fieldInput, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]}
              value={gigTitle}
              onChangeText={setGigTitle}
              placeholder="e.g. I will design your logo"
              placeholderTextColor={colors.textMuted}
            />
          </View>

          <View style={s.field}>
            <Text style={[s.fieldLabel, { color: colors.textSecondary }]}>Description</Text>
            <TextInput
              style={[s.fieldInput, s.textArea, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]}
              value={gigDesc}
              onChangeText={setGigDesc}
              placeholder="Describe what you offer, delivery time, requirements…"
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={5}
            />
          </View>

          <View style={s.field}>
            <Text style={[s.fieldLabel, { color: colors.textSecondary }]}>Starting Price (ACoin)</Text>
            <TextInput
              style={[s.fieldInput, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]}
              value={gigPrice}
              onChangeText={setGigPrice}
              placeholder="e.g. 500"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
            />
          </View>

          <View style={s.field}>
            <Text style={[s.fieldLabel, { color: colors.textSecondary }]}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingTop: 4 }}>
              {CATEGORIES.filter((c) => c !== "All").map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[s.catBtn, { backgroundColor: gigCat === c ? Colors.brand : colors.inputBg ?? colors.surface, borderColor: gigCat === c ? Colors.brand : colors.border }]}
                  onPress={() => setGigCat(c)}
                >
                  <Text style={[s.catText, { color: gigCat === c ? "#fff" : colors.textMuted }]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <Pressable
            onPress={submitGig}
            style={[s.postSubmitBtn, { backgroundColor: Colors.brand, opacity: posting || !gigTitle.trim() ? 0.6 : 1 }]}
            disabled={posting || !gigTitle.trim()}
          >
            {posting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={s.postSubmitText}>Post Gig</Text>
            )}
          </Pressable>

          {postMsg ? (
            <Text style={[s.postMsg, { color: postMsg.includes("success") ? "#34C759" : "#FF3B30" }]}>
              {postMsg}
            </Text>
          ) : null}
        </ScrollView>
      </View>
    );
  }

  // ─── Gig Detail Screen ────────────────────────────────────────────────────
  if (screen === "detail" && selectedGig) {
    const g = selectedGig;
    return (
      <View style={[s.root, { backgroundColor: colors.background }]}>
        <View style={[s.subHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <Pressable onPress={() => setScreen("browse")} hitSlop={12} style={s.backBtn}>
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </Pressable>
          <Text style={[s.subTitle, { color: colors.text }]} numberOfLines={1}>Gig Detail</Text>
          <View style={{ width: 34 }} />
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}>
          {g.cover_url ? (
            <Image source={{ uri: g.cover_url }} style={s.detailCover} resizeMode="cover" />
          ) : (
            <View style={[s.detailCoverPlaceholder, { backgroundColor: Colors.brand + "18" }]}>
              <Ionicons name="briefcase" size={48} color={Colors.brand} />
            </View>
          )}

          <View style={{ padding: 18, gap: 14 }}>
            {/* Category */}
            {g.category ? (
              <View style={[s.catChip, { backgroundColor: Colors.brand + "18" }]}>
                <Text style={[s.catChipText, { color: Colors.brand }]}>{g.category}</Text>
              </View>
            ) : null}

            {/* Title */}
            <Text style={[s.detailTitle, { color: colors.text }]}>{g.title}</Text>

            {/* Seller */}
            {g.seller ? (
              <View style={[s.sellerRow, { backgroundColor: colors.surface }]}>
                <View style={[s.sellerAvatar, { backgroundColor: Colors.brand + "22" }]}>
                  {g.seller.avatar_url ? (
                    <Image source={{ uri: g.seller.avatar_url }} style={s.sellerAvatarImg} />
                  ) : (
                    <Ionicons name="person" size={18} color={Colors.brand} />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                    <Text style={[s.sellerName, { color: colors.text }]} numberOfLines={1}>
                      {g.seller.display_name ?? `@${g.seller.handle}`}
                    </Text>
                    {g.seller.is_verified ? <Ionicons name="checkmark-circle" size={14} color={Colors.brand} /> : null}
                  </View>
                  <Text style={[s.sellerHandle, { color: colors.textMuted }]}>@{g.seller.handle}</Text>
                </View>
                {(g.rating ?? 0) > 0 ? (
                  <View style={s.ratingRow}>
                    <Ionicons name="star" size={14} color="#FFD60A" />
                    <Text style={[s.ratingText, { color: colors.textSecondary }]}>
                      {(g.rating ?? 0).toFixed(1)} ({g.review_count ?? 0})
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : null}

            {/* Description */}
            {g.description ? (
              <View style={[s.descCard, { backgroundColor: colors.surface }]}>
                <Text style={[s.descTitle, { color: colors.textSecondary }]}>About this gig</Text>
                <Text style={[s.descText, { color: colors.text }]}>{g.description}</Text>
              </View>
            ) : null}

            {/* Price */}
            <View style={[s.priceRow, { backgroundColor: colors.surface }]}>
              <View>
                <Text style={[s.priceLabel, { color: colors.textMuted }]}>Starting at</Text>
                <Text style={[s.priceValue, { color: Colors.brand }]}>
                  {g.price.toLocaleString()} {g.currency ?? "ACoin"}
                </Text>
              </View>
              <Ionicons name="arrow-forward-circle" size={22} color={Colors.brand} />
            </View>
          </View>
        </ScrollView>

        {/* Action bar */}
        <View style={[s.actionBar, { backgroundColor: colors.surface, borderTopColor: colors.border, paddingBottom: insets.bottom + 8 }]}>
          <View>
            <Text style={[s.actionPrice, { color: Colors.brand }]}>
              {g.price.toLocaleString()} {g.currency ?? "AC"}
            </Text>
            <Text style={[s.actionPriceLabel, { color: colors.textMuted }]}>Starting price</Text>
          </View>
          <Pressable
            style={[s.contactBtn, { backgroundColor: Colors.brand }]}
            onPress={() => {
              // Open in-app chat with this seller via supabase conversations
              // For now show the seller's contact info
              if (g.seller) {
                setScreen("browse");
              }
            }}
          >
            <Ionicons name="chatbubble-ellipses" size={16} color="#fff" />
            <Text style={s.contactBtnText}>Contact Seller</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ─── Browse Screen ────────────────────────────────────────────────────────
  return (
    <View style={[s.root, { backgroundColor: colors.background }]}>
      <LinearGradient colors={["#0A2E1F", "#062218"]} style={s.hero}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <View>
            <Text style={s.heroTitle}>AfuFreelance</Text>
            <Text style={s.heroSub}>Hire talent or find work</Text>
          </View>
          <TouchableOpacity
            style={[s.postBtn, { backgroundColor: Colors.brand }]}
            onPress={() => setScreen("post-gig")}
          >
            <Ionicons name="add" size={16} color="#fff" />
            <Text style={s.postBtnText}>Post Gig</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.catRow}>
        {CATEGORIES.map((c) => (
          <TouchableOpacity
            key={c}
            style={[s.catBtn, { backgroundColor: cat === c ? Colors.brand : colors.inputBg ?? colors.surface, borderColor: cat === c ? Colors.brand : colors.border }]}
            onPress={() => setCat(c)}
          >
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
          <TouchableOpacity style={[s.postBtn2, { backgroundColor: Colors.brand }]} onPress={() => setScreen("post-gig")}>
            <Text style={{ color: "#fff", fontFamily: "Inter_600SemiBold" }}>Post a Gig</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={gigs}
          keyExtractor={(g) => g.id}
          numColumns={2}
          columnWrapperStyle={{ gap: 10, paddingHorizontal: 16 }}
          contentContainerStyle={{ paddingTop: 12, paddingBottom: insets.bottom + 32, gap: 10 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[s.gigCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => { setSelectedGig(item); setScreen("detail"); }}
              activeOpacity={0.8}
            >
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
                  <Text style={[s.gigSeller, { color: colors.textMuted }]}>
                    @{item.seller?.handle ?? "seller"}
                  </Text>
                  {item.seller?.is_verified ? <Ionicons name="checkmark-circle" size={12} color={Colors.brand} /> : null}
                </View>
                <Text style={[s.gigTitle, { color: colors.text }]} numberOfLines={2}>{item.title}</Text>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                  <Text style={[s.gigPrice, { color: Colors.brand }]}>
                    From {item.price} {item.currency ?? "AC"}
                  </Text>
                  {(item.rating ?? 0) > 0 ? (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                      <Ionicons name="star" size={12} color="#FFD60A" />
                      <Text style={[s.gigRating, { color: colors.textMuted }]}>
                        {(item.rating ?? 0).toFixed(1)}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>
            </TouchableOpacity>
          )}
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
  // Sub screens
  subHeader: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, gap: 10 },
  backBtn: { padding: 4, width: 34 },
  subTitle: { flex: 1, fontSize: 16, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  // Post gig
  field: { gap: 6 },
  fieldLabel: { fontSize: 12, fontFamily: "Inter_500Medium" },
  fieldInput: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, fontFamily: "Inter_400Regular" },
  textArea: { height: 120, textAlignVertical: "top" },
  postSubmitBtn: { borderRadius: 14, paddingVertical: 14, alignItems: "center" },
  postSubmitText: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },
  postMsg: { textAlign: "center", fontSize: 13, fontFamily: "Inter_500Medium" },
  // Detail
  detailCover: { width: "100%", height: 220 },
  detailCoverPlaceholder: { width: "100%", height: 200, alignItems: "center", justifyContent: "center" },
  catChip: { alignSelf: "flex-start", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  catChipText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  detailTitle: { fontSize: 18, fontFamily: "Inter_700Bold", lineHeight: 26 },
  sellerRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 16 },
  sellerAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  sellerAvatarImg: { width: 44, height: 44 },
  sellerName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  sellerHandle: { fontSize: 12, fontFamily: "Inter_400Regular" },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  ratingText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  descCard: { borderRadius: 16, padding: 14, gap: 6 },
  descTitle: { fontSize: 12, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.5 },
  descText: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 22 },
  priceRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderRadius: 16, padding: 16 },
  priceLabel: { fontSize: 12, fontFamily: "Inter_400Regular", marginBottom: 2 },
  priceValue: { fontSize: 22, fontFamily: "Inter_700Bold" },
  actionBar: { position: "absolute", bottom: 0, left: 0, right: 0, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 14, borderTopWidth: StyleSheet.hairlineWidth },
  actionPrice: { fontSize: 18, fontFamily: "Inter_700Bold" },
  actionPriceLabel: { fontSize: 12, fontFamily: "Inter_400Regular" },
  contactBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 14 },
  contactBtnText: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" },
});
