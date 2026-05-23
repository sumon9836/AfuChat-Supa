import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";
import { supabase } from "@/lib/supabase";

type Product = {
  id: string;
  name: string;
  price: number;
  currency: string;
  image_url: string | null;
  shop_name: string | null;
};

const CATEGORIES = ["All", "Electronics", "Fashion", "Food", "Services", "Art"];

export default function AfuMarketApp() {
  const { colors, accent } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState("All");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const CARD_W = (width - 16 * 2 - 10) / 2;

  useEffect(() => {
    supabase
      .from("products")
      .select("id, name, price, currency, image_url, shops(name)")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(40)
      .then(({ data }) => {
        setProducts(
          (data ?? []).map((p: any) => ({
            id: p.id,
            name: p.name,
            price: p.price ?? 0,
            currency: p.currency ?? "ACoin",
            image_url: p.image_url ?? null,
            shop_name: p.shops?.name ?? null,
          }))
        );
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filtered = products.filter((p) =>
    search ? p.name.toLowerCase().includes(search.toLowerCase()) : true
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Search */}
      <View
        style={[
          styles.searchBar,
          { backgroundColor: colors.surface, borderBottomColor: colors.border },
        ]}
      >
        <View
          style={[styles.searchInner, { backgroundColor: colors.backgroundSecondary }]}
        >
          <Ionicons name="search" size={16} color={colors.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search products…"
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
      </View>

      {/* Categories */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.catRow}
      >
        {CATEGORIES.map((c) => (
          <Pressable
            key={c}
            onPress={() => setCat(c)}
            style={[
              styles.catChip,
              cat === c
                ? { backgroundColor: accent }
                : { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 },
            ]}
          >
            <Text
              style={[
                styles.catText,
                { color: cat === c ? "#fff" : colors.textSecondary },
              ]}
            >
              {c}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Grid */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={accent} size="large" />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="storefront-outline" size={48} color={colors.textMuted} />
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            {search ? "No products found" : "No products yet"}
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.grid,
            { paddingBottom: insets.bottom + 20 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {filtered.map((p) => (
            <Pressable
              key={p.id}
              style={({ pressed }) => [
                styles.card,
                {
                  width: CARD_W,
                  backgroundColor: colors.surface,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <View
                style={[
                  styles.cardImg,
                  { backgroundColor: colors.backgroundSecondary },
                ]}
              >
                {p.image_url ? (
                  <Image
                    source={{ uri: p.image_url }}
                    style={styles.cardImgFill}
                    resizeMode="cover"
                  />
                ) : (
                  <Ionicons name="image-outline" size={32} color={colors.textMuted} />
                )}
              </View>
              <View style={styles.cardBody}>
                <Text
                  style={[styles.cardName, { color: colors.text }]}
                  numberOfLines={2}
                >
                  {p.name}
                </Text>
                {p.shop_name ? (
                  <Text
                    style={[styles.cardShop, { color: colors.textMuted }]}
                    numberOfLines={1}
                  >
                    {p.shop_name}
                  </Text>
                ) : null}
                <Text style={[styles.cardPrice, { color: accent }]}>
                  {p.price.toLocaleString()} {p.currency}
                </Text>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  searchBar: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  searchInner: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 38,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    paddingVertical: 0,
  },
  catRow: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
  },
  catChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  catText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  emptyText: { fontSize: 15, fontFamily: "Inter_400Regular" },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    gap: 10,
  },
  card: { borderRadius: 14, overflow: "hidden" },
  cardImg: {
    height: 150,
    alignItems: "center",
    justifyContent: "center",
  },
  cardImgFill: { width: "100%", height: "100%" },
  cardBody: { padding: 10, gap: 2 },
  cardName: { fontSize: 13, fontFamily: "Inter_600SemiBold", lineHeight: 18 },
  cardShop: { fontSize: 11, fontFamily: "Inter_400Regular" },
  cardPrice: { fontSize: 13, fontFamily: "Inter_700Bold", marginTop: 4 },
});
