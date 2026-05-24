import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  KeyboardAvoidingView,

  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/hooks/useTheme";
import { supabase } from "@/lib/supabase";
import Colors from "@/constants/colors";
import { transferAcoin } from "@/lib/monetize";
import { showAlert } from "@/lib/alert";
import { isOnline, onConnectivityChange } from "@/lib/offlineStore";

const { width: W } = Dimensions.get("window");
const CACHE_LISTINGS = "afu_fl_listings_v1";
const CACHE_ORDERS = "afu_fl_orders_v1";
const CACHE_TTL = 5 * 60 * 1000;

/* ─── Types ────────────────────────────────────────────────────────────────── */
type Listing = {
  id: string; title: string; description: string; price: number;
  delivery_days: number; category: string; emoji: string;
  seller_id: string; seller_name: string; seller_handle: string; seller_avatar: string | null;
  orders_count: number; rating: number; review_count: number;
  tags: string[]; requirements: string; is_active: boolean; created_at: string;
};

type Order = {
  id: string; listing_id: string; listing_title: string; listing_emoji: string;
  buyer_id: string; buyer_name: string; buyer_handle: string; buyer_avatar: string | null;
  seller_id: string; seller_name: string; seller_handle: string; seller_avatar: string | null;
  price_paid: number; status: string; buyer_note: string; delivery_message: string;
  revision_count: number; max_revisions: number; cancel_reason: string | null;
  created_at: string; completed_at: string | null;
};

type Review = {
  id: string; rating: number; comment: string;
  reviewer_name: string; reviewer_handle: string; reviewer_avatar: string | null;
  created_at: string;
};

/* ─── Constants ─────────────────────────────────────────────────────────────  */
const CATS = [
  { key: "All",       icon: "apps-outline" },
  { key: "Design",    icon: "color-palette-outline" },
  { key: "Dev",       icon: "code-slash-outline" },
  { key: "Writing",   icon: "document-text-outline" },
  { key: "Marketing", icon: "megaphone-outline" },
  { key: "Video",     icon: "videocam-outline" },
  { key: "Music",     icon: "musical-notes-outline" },
  { key: "AI",        icon: "sparkles-outline" },
  { key: "Business",  icon: "briefcase-outline" },
  { key: "Other",     icon: "ellipsis-horizontal-outline" },
];

const S: Record<string, { c: string; label: string; icon: string }> = {
  pending:     { c: "#F59E0B", label: "Pending",     icon: "hourglass-outline" },
  in_progress: { c: "#3B82F6", label: "In Progress", icon: "construct-outline" },
  delivered:   { c: "#8B5CF6", label: "Delivered",   icon: "cube-outline" },
  revision:    { c: "#F97316", label: "Revision",     icon: "refresh-outline" },
  completed:   { c: "#22C55E", label: "Completed",   icon: "checkmark-circle-outline" },
  cancelled:   { c: "#EF4444", label: "Cancelled",   icon: "close-circle-outline" },
  disputed:    { c: "#EC4899", label: "Disputed",     icon: "warning-outline" },
};

/* ─── Helpers ────────────────────────────────────────────────────────────────  */
function ago(d: string) {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return "now"; if (s < 3600) return `${Math.floor(s/60)}m`;
  if (s < 86400) return `${Math.floor(s/3600)}h`; if (s < 604800) return `${Math.floor(s/86400)}d`;
  return new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

async function saveCache(key: string, data: any) {
  try { await AsyncStorage.setItem(key, JSON.stringify({ data, ts: Date.now() })); } catch {}
}
async function loadCache<T>(key: string): Promise<{ data: T; stale: boolean } | null> {
  try {
    const r = await AsyncStorage.getItem(key);
    if (!r) return null;
    const p = JSON.parse(r);
    return { data: p.data, stale: Date.now() - p.ts > CACHE_TTL };
  } catch { return null; }
}

const SEL = `id,title,description,price,delivery_days,category,emoji,seller_id,orders_count,rating,review_count,tags,requirements,is_active,created_at,profiles!freelance_listings_seller_id_fkey(display_name,handle,avatar_url)`;

function toListing(l: any): Listing {
  return {
    id: l.id, title: l.title, description: l.description || "", price: l.price,
    delivery_days: l.delivery_days || 3, category: l.category || "Other", emoji: l.emoji || "💼",
    seller_id: l.seller_id, seller_name: l.profiles?.display_name || "Seller",
    seller_handle: l.profiles?.handle || "seller", seller_avatar: l.profiles?.avatar_url ?? null,
    orders_count: l.orders_count || 0, rating: Number(l.rating) || 5,
    review_count: l.review_count || 0, tags: l.tags || [], requirements: l.requirements || "",
    is_active: l.is_active, created_at: l.created_at,
  };
}
function toOrder(o: any): Order {
  return {
    id: o.id, listing_id: o.listing_id, listing_title: o.listing?.title || "Service",
    listing_emoji: o.listing?.emoji || "💼",
    buyer_id: o.buyer_id, buyer_name: o.buyer?.display_name || "Buyer",
    buyer_handle: o.buyer?.handle || "buyer", buyer_avatar: o.buyer?.avatar_url ?? null,
    seller_id: o.seller_id, seller_name: o.seller?.display_name || "Seller",
    seller_handle: o.seller?.handle || "seller", seller_avatar: o.seller?.avatar_url ?? null,
    price_paid: o.price_paid, status: o.status || "pending",
    buyer_note: o.buyer_note || "", delivery_message: o.delivery_message || "",
    revision_count: o.revision_count || 0, max_revisions: o.max_revisions || 1,
    cancel_reason: o.cancel_reason ?? null, created_at: o.created_at, completed_at: o.completed_at ?? null,
  };
}

/* ─── Small Components ───────────────────────────────────────────────────────  */
function Stars({ n, size = 12 }: { n: number; size?: number }) {
  return (
    <View style={{ flexDirection: "row", gap: 1 }}>
      {[1,2,3,4,5].map(i => (
        <Ionicons key={i}
          name={n >= i ? "star" : n >= i - 0.5 ? "star-half" : "star-outline"}
          size={size} color="#FBBF24" />
      ))}
    </View>
  );
}

function Pill({ bg, children }: { bg: string; children: React.ReactNode }) {
  return <View style={[g.pill, { backgroundColor: bg }]}>{children}</View>;
}

/* ─── Main Screen ────────────────────────────────────────────────────────────  */
export default function FreelanceScreen() {
  const { colors } = useTheme();
  const { user, profile, refreshProfile } = useAuth();
  const insets = useSafeAreaInsets();
  const online = React.useRef(isOnline());
  const [connected, setConnected] = useState(isOnline());

  // Navigation
  const [tab, setTab] = useState<"explore" | "orders" | "seller">("explore");
  const [orderSide, setOrderSide] = useState<"buying" | "selling">("buying");

  // Data
  const [listings, setListings] = useState<Listing[]>([]);
  const [myListings, setMyListings] = useState<Listing[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [cat, setCat] = useState("All");
  const [q, setQ] = useState("");

  // Modals
  const [viewL, setViewL] = useState<Listing | null>(null);
  const [viewO, setViewO] = useState<Order | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [flScreen, setFlScreen] = useState<"main" | "listing" | "order" | "create">("main");
  const [editTarget, setEditTarget] = useState<Listing | null>(null);
  const [showDeliver, setShowDeliver] = useState(false);

  // Form
  const [fEmoji, setFEmoji] = useState("💼"); const [fTitle, setFTitle] = useState("");
  const [fDesc, setFDesc] = useState(""); const [fPrice, setFPrice] = useState("200");
  const [fDays, setFDays] = useState("3"); const [fCat, setFCat] = useState("Design");
  const [fReqs, setFReqs] = useState(""); const [fTags, setFTags] = useState("");
  const [saving, setSaving] = useState(false);

  // Actions
  const [placing, setPlacing] = useState(false);
  const [delivMsg, setDelivMsg] = useState("");
  const [actioning, setActioning] = useState(false);
  const [revStars, setRevStars] = useState(5); const [revText, setRevText] = useState("");

  useEffect(() => {
    const unsub = onConnectivityChange(v => { setConnected(v); online.current = v; });
    return unsub;
  }, []);

  /* ── Data Fetching ─────────────────────────────────────────────────────── */
  const fetchListings = useCallback(async () => {
    if (!online.current) {
      const c = await loadCache<Listing[]>(CACHE_LISTINGS);
      if (c) { setListings(c.data); setMyListings(c.data.filter(l => l.seller_id === user?.id)); }
      return;
    }
    const [{ data: active }, { data: mine }] = await Promise.all([
      supabase.from("freelance_listings").select(SEL).eq("is_active", true).order("orders_count", { ascending: false }).limit(100),
      user ? supabase.from("freelance_listings").select(SEL).eq("seller_id", user.id).order("created_at", { ascending: false }) : Promise.resolve({ data: null }),
    ]);
    if (active) { const m = active.map(toListing); setListings(m); saveCache(CACHE_LISTINGS, m); }
    if (mine) setMyListings(mine.map(toListing));
  }, [user]);

  const fetchOrders = useCallback(async () => {
    if (!user) return;
    if (!online.current) {
      const c = await loadCache<Order[]>(CACHE_ORDERS);
      if (c) setOrders(c.data);
      return;
    }
    const { data } = await supabase.from("freelance_orders")
      .select(`id,listing_id,buyer_id,seller_id,price_paid,status,buyer_note,delivery_message,revision_count,max_revisions,cancel_reason,created_at,completed_at,listing:freelance_listings!freelance_orders_listing_id_fkey(title,emoji),buyer:profiles!freelance_orders_buyer_id_fkey(display_name,handle,avatar_url),seller:profiles!freelance_orders_seller_id_fkey(display_name,handle,avatar_url)`)
      .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
      .order("created_at", { ascending: false }).limit(50);
    if (data) { const m = data.map(toOrder); setOrders(m); saveCache(CACHE_ORDERS, m); }
  }, [user]);

  const fetchReviews = useCallback(async (lid: string) => {
    if (!online.current) { setReviews([]); return; }
    const { data } = await supabase.from("freelance_reviews")
      .select(`id,rating,comment,created_at,reviewer:profiles!freelance_reviews_reviewer_id_fkey(display_name,handle,avatar_url)`)
      .eq("listing_id", lid).order("created_at", { ascending: false }).limit(20);
    if (data) setReviews(data.map((r: any) => ({
      id: r.id, rating: r.rating, comment: r.comment, created_at: r.created_at,
      reviewer_name: r.reviewer?.display_name || "User", reviewer_handle: r.reviewer?.handle || "user",
      reviewer_avatar: r.reviewer?.avatar_url ?? null,
    })));
  }, []);

  const reload = useCallback(async () => {
    await Promise.all([fetchListings(), fetchOrders()]);
  }, [fetchListings, fetchOrders]);

  useEffect(() => { setLoading(true); reload().finally(() => setLoading(false)); }, [reload]);

  const onRefresh = useCallback(async () => { setRefreshing(true); await reload(); setRefreshing(false); }, [reload]);

  /* ── Derived ───────────────────────────────────────────────────────────── */
  const filtered = useMemo(() => {
    let r = cat === "All" ? listings : listings.filter(l => l.category === cat);
    if (q.trim()) {
      const lq = q.toLowerCase();
      r = r.filter(l => l.title.toLowerCase().includes(lq) || l.seller_handle.toLowerCase().includes(lq) || l.tags.some(t => t.toLowerCase().includes(lq)));
    }
    return r;
  }, [listings, cat, q]);

  const buyOrders  = useMemo(() => orders.filter(o => o.buyer_id === user?.id), [orders, user]);
  const sellOrders = useMemo(() => orders.filter(o => o.seller_id === user?.id), [orders, user]);
  const activeN    = useMemo(() => orders.filter(o => !["completed","cancelled"].includes(o.status)).length, [orders]);
  const earned     = useMemo(() => sellOrders.filter(o => o.status === "completed").reduce((s, o) => s + o.price_paid, 0), [sellOrders]);

  /* ── Actions ───────────────────────────────────────────────────────────── */
  async function placeOrder(l: Listing) {
    if (!user || !profile) { router.push("/(auth)/login"); return; }
    if (!connected) { showAlert("Offline", "You need internet to place an order."); return; }
    if (l.seller_id === user.id) { showAlert("Oops", "You can't buy your own service."); return; }
    if ((profile.acoin || 0) < l.price) {
      showAlert("Not enough ACoin", `Need ${l.price}, you have ${profile.acoin || 0}.`, [
        { text: "Top Up", onPress: () => router.push("/wallet/topup") }, { text: "Cancel" },
      ]); return;
    }
    showAlert("Confirm", `Pay ${l.price} ACoin to @${l.seller_handle}?`, [
      { text: "Cancel", style: "cancel" },
      { text: `Pay ${l.price} ACoin`, onPress: async () => {
        setPlacing(true);
        const res = await transferAcoin({ buyerId: user.id, sellerId: l.seller_id, buyerCurrentAcoin: profile.acoin || 0, amount: l.price, transactionType: "monetize_freelance", metadata: { listing_id: l.id } });
        if (res.success) {
          await supabase.from("freelance_orders").insert({ listing_id: l.id, buyer_id: user.id, seller_id: l.seller_id, price_paid: l.price, status: "pending", max_revisions: 1 });
          await supabase.from("freelance_listings").update({ orders_count: l.orders_count + 1 }).eq("id", l.id);
          refreshProfile(); setViewL(null); setFlScreen("main");
          showAlert("Ordered!", "Your order has been placed. The seller will begin soon.");
          reload();
        } else showAlert("Failed", res.error || "Payment could not be processed.");
        setPlacing(false);
      }},
    ]);
  }

  function resetForm() {
    setFEmoji("💼"); setFTitle(""); setFDesc(""); setFPrice("200"); setFDays("3");
    setFCat("Design"); setFReqs(""); setFTags(""); setEditTarget(null);
  }
  function startEdit(l: Listing) {
    setEditTarget(l); setFEmoji(l.emoji); setFTitle(l.title); setFDesc(l.description);
    setFPrice(String(l.price)); setFDays(String(l.delivery_days)); setFCat(l.category);
    setFReqs(l.requirements); setFTags(l.tags.join(", ")); setShowCreate(true); setFlScreen("create");
  }
  async function saveListing() {
    if (!user) return;
    if (!connected) { showAlert("Offline", "Connect to save."); return; }
    if (!fTitle.trim()) { showAlert("Required", "Enter a title."); return; }
    const price = parseInt(fPrice); if (!price || price < 1) { showAlert("Invalid", "Enter a valid price."); return; }
    setSaving(true);
    const body: any = { title: fTitle.trim(), description: fDesc.trim(), price, emoji: fEmoji, category: fCat, delivery_days: parseInt(fDays) || 3, seller_id: user.id, is_active: true, requirements: fReqs.trim(), tags: fTags.split(",").map(t => t.trim()).filter(Boolean) };
    const { error } = editTarget
      ? await supabase.from("freelance_listings").update(body).eq("id", editTarget.id)
      : await supabase.from("freelance_listings").insert({ ...body, orders_count: 0, rating: 5, review_count: 0 });
    setSaving(false);
    if (error) { showAlert("Error", error.message); return; }
    showAlert(editTarget ? "Updated" : "Published", editTarget ? "Service updated." : "Your service is live!");
    resetForm(); setShowCreate(false); reload();
  }
  async function toggleActive(l: Listing) {
    if (!connected) return;
    await supabase.from("freelance_listings").update({ is_active: !l.is_active }).eq("id", l.id);
    reload();
  }
  async function deleteListing(l: Listing) {
    showAlert("Delete", `Remove "${l.title}"?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        await supabase.from("freelance_listings").delete().eq("id", l.id); setViewL(null); setFlScreen("main"); reload();
      }},
    ]);
  }
  async function updateStatus(o: Order, status: string, msg?: string) {
    if (!connected) { showAlert("Offline", "Go online to update orders."); return; }
    setActioning(true);
    const upd: any = { status, updated_at: new Date().toISOString() };
    if (msg) upd.delivery_message = msg;
    if (status === "completed") upd.completed_at = new Date().toISOString();
    if (status === "cancelled") upd.cancel_reason = msg || "Cancelled";
    if (status === "revision") upd.revision_count = (o.revision_count || 0) + 1;
    await supabase.from("freelance_orders").update(upd).eq("id", o.id);
    if (status === "cancelled" && o.status === "pending") {
      const { data: bp } = await supabase.from("profiles").select("acoin").eq("id", o.buyer_id).single();
      if (bp) {
        await supabase.from("profiles").update({ acoin: (bp.acoin || 0) + o.price_paid }).eq("id", o.buyer_id);
        await supabase.from("acoin_transactions").insert({ user_id: o.buyer_id, amount: o.price_paid, transaction_type: "freelance_refund", metadata: { order_id: o.id } });
      }
    }
    setActioning(false); setViewO(null); setShowDeliver(false); setDelivMsg(""); setFlScreen("main"); reload(); refreshProfile();
  }
  async function submitReview(o: Order) {
    if (!user || !connected) return;
    setActioning(true);
    await supabase.from("freelance_reviews").insert({ order_id: o.id, listing_id: o.listing_id, reviewer_id: user.id, seller_id: o.seller_id, rating: revStars, comment: revText.trim() });
    const { data: all } = await supabase.from("freelance_reviews").select("rating").eq("listing_id", o.listing_id);
    if (all?.length) {
      const avg = all.reduce((s: number, r: any) => s + r.rating, 0) / all.length;
      await supabase.from("freelance_listings").update({ rating: Math.round(avg * 100) / 100, review_count: all.length }).eq("id", o.listing_id);
    }
    setActioning(false); setRevStars(5); setRevText(""); setViewO(null); setFlScreen("main");
    showAlert("Thanks!", "Review submitted."); reload();
  }

  /* ─── Render helpers ─────────────────────────────────────────────────────  */
  const handleBack = () => router.back();

  /* ─── Listing card ───────────────────────────────────────────────────────  */
  const ListingCard = ({ item: l }: { item: Listing }) => (
    <TouchableOpacity style={[g.card, { backgroundColor: colors.surface }]}
      onPress={() => { setViewL(l); fetchReviews(l.id); setFlScreen("listing"); }} activeOpacity={0.75}>
      {/* top row */}
      <View style={g.cardTop}>
        <View style={[g.emojiBox, { backgroundColor: colors.accent + "12" }]}>
          <Text style={{ fontSize: 24 }}>{l.emoji}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[g.cardTitle, { color: colors.text }]} numberOfLines={2}>{l.title}</Text>
          <TouchableOpacity onPress={() => router.push({ pathname: "/contact/[id]", params: { id: l.seller_id } })}>
            <Text style={[g.handle, { color: colors.accent }]}>@{l.seller_handle}</Text>
          </TouchableOpacity>
        </View>
        <View style={[g.priceBadge, { backgroundColor: Colors.gold + "16" }]}>
          <Text style={[g.priceNum, { color: Colors.gold }]}>{l.price}</Text>
          <Text style={{ fontSize: 12 }}>🪙</Text>
        </View>
      </View>

      {/* description */}
      {!!l.description && (
        <Text style={[g.cardDesc, { color: colors.textSecondary }]} numberOfLines={2}>{l.description}</Text>
      )}

      {/* footer */}
      <View style={[g.cardFooter, { borderTopColor: colors.border }]}>
        <Stars n={l.rating} />
        <Text style={[g.tiny, { color: colors.textMuted }]}>{l.rating.toFixed(1)} ({l.review_count})</Text>
        <View style={g.dot} />
        <Ionicons name="time-outline" size={11} color={colors.textMuted} />
        <Text style={[g.tiny, { color: colors.textMuted }]}>{l.delivery_days}d</Text>
        <View style={g.dot} />
        <Ionicons name="cart-outline" size={11} color={colors.textMuted} />
        <Text style={[g.tiny, { color: colors.textMuted }]}>{l.orders_count}</Text>
        <View style={{ flex: 1 }} />
        <View style={[g.catChip, { backgroundColor: colors.accent + "10" }]}>
          <Text style={[g.tiny, { color: colors.accent, fontWeight: "600" }]}>{l.category}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  /* ─── Order card ─────────────────────────────────────────────────────────  */
  const OrderCard = ({ item: o }: { item: Order }) => {
    const me = o.seller_id === user?.id;
    const sm = S[o.status] ?? S.pending;
    return (
      <TouchableOpacity style={[g.card, { backgroundColor: colors.surface }]}
        onPress={() => { setViewO(o); setFlScreen("order"); }} activeOpacity={0.75}>
        <View style={g.cardTop}>
          <View style={[g.emojiBox, { backgroundColor: sm.c + "12", width: 42, height: 42 }]}>
            <Text style={{ fontSize: 20 }}>{o.listing_emoji}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[g.cardTitle, { color: colors.text }]} numberOfLines={1}>{o.listing_title}</Text>
            <Text style={[g.tiny, { color: colors.textMuted }]}>{me ? "Buyer" : "Seller"}: @{me ? o.buyer_handle : o.seller_handle}</Text>
          </View>
          <View style={{ alignItems: "flex-end", gap: 4 }}>
            <View style={[g.statusChip, { backgroundColor: sm.c + "14" }]}>
              <View style={[g.statusDot, { backgroundColor: sm.c }]} />
              <Text style={[g.tiny, { color: sm.c, fontWeight: "600" }]}>{sm.label}</Text>
            </View>
            <Text style={[g.tiny, { color: colors.textMuted }]}>{ago(o.created_at)}</Text>
          </View>
        </View>
        <View style={[g.cardFooter, { borderTopColor: colors.border }]}>
          <Text style={[g.priceNum, { color: Colors.gold, fontSize: 14 }]}>{o.price_paid} ACoin</Text>
          <View style={{ flex: 1 }} />
          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
        </View>
      </TouchableOpacity>
    );
  };

  /* ─── Tabs ───────────────────────────────────────────────────────────────  */
  const TABS = [
    { k: "explore" as const,  icon: "compass",    label: "Explore" },
    { k: "orders"  as const,  icon: "receipt",    label: "Orders" },
    { k: "seller"  as const,  icon: "storefront", label: "Seller" },
  ];

  /* ─── Explore View ───────────────────────────────────────────────────────  */
  const ExploreView = () => (
    <>
      {/* search */}
      <View style={[g.searchWrap, { backgroundColor: colors.surface }]}>
        <Ionicons name="search-outline" size={17} color={colors.textMuted} />
        <TextInput style={[g.searchInput, { color: colors.text }]}
          placeholder="Search services…" placeholderTextColor={colors.textMuted}
          value={q} onChangeText={setQ} returnKeyType="search" />
        {!!q && (
          <TouchableOpacity onPress={() => setQ("")} hitSlop={8}>
            <Ionicons name="close-circle" size={17} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* categories */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={g.catRow}>
        {CATS.map(c => {
          const active = cat === c.key;
          return (
            <TouchableOpacity key={c.key} onPress={() => setCat(c.key)}
              style={[g.catPill, { backgroundColor: active ? colors.accent : colors.surface, borderColor: active ? colors.accent : colors.border }]}>
              <Ionicons name={c.icon as any} size={13} color={active ? "#fff" : colors.textMuted} />
              <Text style={[g.catPillText, { color: active ? "#fff" : colors.textMuted }]}>{c.key}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* list */}
      <FlatList data={filtered} keyExtractor={i => i.id}
        renderItem={({ item }) => <ListingCard item={item} />}
        contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 32, gap: 10 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
        ListEmptyComponent={
          <View style={g.empty}>
            <View style={[g.emptyIcon, { backgroundColor: colors.accent + "12" }]}>
              <Ionicons name={q ? "search-outline" : "storefront-outline"} size={34} color={colors.accent} />
            </View>
            <Text style={[g.emptyTitle, { color: colors.text }]}>{q ? "No results" : "Marketplace is empty"}</Text>
            <Text style={[g.emptySub, { color: colors.textMuted }]}>{q ? "Try different keywords" : "List your service to get started"}</Text>
            {!q && (
              <TouchableOpacity style={[g.btn, { backgroundColor: colors.accent }]}
                onPress={() => { resetForm(); setShowCreate(true); setFlScreen("create"); }}>
                <Ionicons name="add" size={16} color="#fff" />
                <Text style={g.btnText}>List a Service</Text>
              </TouchableOpacity>
            )}
          </View>
        } />
    </>
  );

  /* ─── Orders View ────────────────────────────────────────────────────────  */
  const OrdersView = () => {
    const list = orderSide === "buying" ? buyOrders : sellOrders;
    return (
      <>
        <View style={[g.subTabs, { borderBottomColor: colors.border }]}>
          {(["buying", "selling"] as const).map(s => (
            <TouchableOpacity key={s} onPress={() => setOrderSide(s)}
              style={[g.subTab, orderSide === s && { borderBottomColor: colors.accent, borderBottomWidth: 2 }]}>
              <Text style={[g.subTabText, { color: orderSide === s ? colors.accent : colors.textMuted }]}>
                {s === "buying" ? `Purchases (${buyOrders.length})` : `Sales (${sellOrders.length})`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <FlatList data={list} keyExtractor={i => i.id}
          renderItem={({ item }) => <OrderCard item={item} />}
          contentContainerStyle={{ paddingHorizontal: 14, paddingTop: 12, paddingBottom: 32, gap: 10 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
          ListEmptyComponent={
            <View style={g.empty}>
              <View style={[g.emptyIcon, { backgroundColor: colors.accent + "12" }]}>
                <Ionicons name={orderSide === "buying" ? "bag-handle-outline" : "cube-outline"} size={34} color={colors.accent} />
              </View>
              <Text style={[g.emptyTitle, { color: colors.text }]}>No {orderSide === "buying" ? "purchases" : "sales"} yet</Text>
              <Text style={[g.emptySub, { color: colors.textMuted }]}>{orderSide === "buying" ? "Explore the marketplace" : "List a service to get orders"}</Text>
            </View>
          } />
      </>
    );
  };

  /* ─── Seller View ────────────────────────────────────────────────────────  */
  const SellerView = () => (
    <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 40, gap: 16 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}>

      {/* stats */}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        {[
          { icon: "wallet",               label: "Earned",    val: `${earned} 🪙`,     c: Colors.gold },
          { icon: "flash",                label: "Active",    val: `${activeN}`,        c: colors.accent },
          { icon: "storefront",           label: "Services",  val: `${myListings.length}`, c: "#7C3AED" },
          { icon: "checkmark-done-circle",label: "Completed", val: `${sellOrders.filter(o=>o.status==="completed").length}`, c: "#16A34A" },
        ].map((s, i) => (
          <View key={i} style={[g.statCard, { backgroundColor: colors.surface, width: (W - 42) / 2 }]}>
            <View style={[g.statIcon, { backgroundColor: s.c + "14" }]}>
              <Ionicons name={s.icon as any} size={18} color={s.c} />
            </View>
            <Text style={[g.statVal, { color: colors.text }]}>{s.val}</Text>
            <Text style={[g.tiny, { color: colors.textMuted }]}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* header row */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text style={[g.secHead, { color: colors.text }]}>My Services</Text>
        <TouchableOpacity style={[g.smallBtn, { backgroundColor: colors.accent }]}
          onPress={() => { resetForm(); setShowCreate(true); setFlScreen("create"); }}>
          <Ionicons name="add" size={15} color="#fff" />
          <Text style={{ color: "#fff", fontSize: 13, fontWeight: "700" }}>New</Text>
        </TouchableOpacity>
      </View>

      {myListings.length === 0 ? (
        <View style={[g.emptyCard, { backgroundColor: colors.surface }]}>
          <Text style={{ fontSize: 36, marginBottom: 4 }}>💼</Text>
          <Text style={[g.emptyTitle, { color: colors.text }]}>No services yet</Text>
          <Text style={[g.emptySub, { color: colors.textMuted }]}>Start earning by offering your skills</Text>
          <TouchableOpacity style={[g.btn, { backgroundColor: colors.accent, marginTop: 8 }]}
            onPress={() => { resetForm(); setShowCreate(true); setFlScreen("create"); }}>
            <Ionicons name="add" size={15} color="#fff" />
            <Text style={g.btnText}>Create Service</Text>
          </TouchableOpacity>
        </View>
      ) : myListings.map(l => (
        <View key={l.id} style={[g.card, { backgroundColor: colors.surface, padding: 0, overflow: "hidden" }]}>
          <TouchableOpacity style={{ padding: 14 }}
            onPress={() => { setViewL(l); fetchReviews(l.id); setFlScreen("listing"); }} activeOpacity={0.75}>
            <View style={g.cardTop}>
              <Text style={{ fontSize: 22 }}>{l.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[g.cardTitle, { color: colors.text }]} numberOfLines={1}>{l.title}</Text>
                <Text style={[g.tiny, { color: colors.textMuted }]}>{l.orders_count} orders · ★ {l.rating.toFixed(1)}</Text>
              </View>
              <Text style={[g.priceNum, { color: Colors.gold }]}>{l.price} 🪙</Text>
            </View>
            {!l.is_active && (
              <View style={[g.pausedRow, { backgroundColor: "#F59E0B10" }]}>
                <Ionicons name="pause-circle-outline" size={13} color="#F59E0B" />
                <Text style={[g.tiny, { color: "#F59E0B" }]}>Paused — not visible to buyers</Text>
              </View>
            )}
          </TouchableOpacity>
          <View style={[g.mscActions, { borderTopColor: colors.border }]}>
            <TouchableOpacity style={[g.mscBtn, { backgroundColor: colors.accent + "10" }]} onPress={() => startEdit(l)}>
              <Ionicons name="create-outline" size={14} color={colors.accent} />
              <Text style={[g.tiny, { color: colors.accent, fontWeight: "600" }]}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[g.mscBtn, { backgroundColor: l.is_active ? "#F59E0B10" : "#22C55E10" }]} onPress={() => toggleActive(l)}>
              <Ionicons name={l.is_active ? "pause-circle-outline" : "play-circle-outline"} size={14} color={l.is_active ? "#F59E0B" : "#22C55E"} />
              <Text style={[g.tiny, { color: l.is_active ? "#F59E0B" : "#22C55E", fontWeight: "600" }]}>{l.is_active ? "Pause" : "Activate"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </ScrollView>
  );

  /* ─── Listing Screen ─────────────────────────────────────────────────────  */
  const ListingModal = () => {
    if (!viewL) return null;
    const l = viewL;
    const own = l.seller_id === user?.id;
    return (
      <View style={[g.modal, { backgroundColor: colors.backgroundSecondary, paddingTop: insets.top }]}>
          {/* nav */}
          <View style={[g.modalNav, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => { setViewL(null); setFlScreen("main"); }} hitSlop={12}>
              <Ionicons name="arrow-back" size={22} color={colors.text} />
            </TouchableOpacity>
            <Text style={[g.modalNavTitle, { color: colors.text }]} numberOfLines={1}>{l.title}</Text>
            {own
              ? <TouchableOpacity onPress={() => { setViewL(null); setFlScreen("main"); startEdit(l); }} hitSlop={12}>
                  <Ionicons name="create-outline" size={20} color={colors.accent} />
                </TouchableOpacity>
              : <View style={{ width: 22 }} />}
          </View>

          <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
            {/* hero */}
            <View style={[g.heroWrap, { backgroundColor: colors.surface }]}>
              <View style={[g.heroEmoji, { backgroundColor: colors.accent + "12" }]}>
                <Text style={{ fontSize: 44 }}>{l.emoji}</Text>
              </View>
              <Text style={[g.heroTitle, { color: colors.text }]}>{l.title}</Text>
              <TouchableOpacity onPress={() => { setViewL(null); setFlScreen("main"); router.push({ pathname: "/contact/[id]", params: { id: l.seller_id } }); }}>
                <Text style={[g.handle, { color: colors.accent, fontSize: 14, textAlign: "center" }]}>@{l.seller_handle}</Text>
              </TouchableOpacity>
              <View style={g.heroStats}>
                {[
                  { icon: "star",   val: l.rating.toFixed(1), sub: `${l.review_count} reviews`, c: "#FBBF24" },
                  { icon: "cart",   val: `${l.orders_count}`,  sub: "orders",                   c: colors.accent },
                  { icon: "time",   val: `${l.delivery_days}d`,sub: "delivery",                 c: "#8B5CF6" },
                ].map((s, i) => (
                  <View key={i} style={g.heroStatItem}>
                    <Ionicons name={s.icon as any} size={16} color={s.c} />
                    <Text style={[g.cardTitle, { color: colors.text, fontSize: 16 }]}>{s.val}</Text>
                    <Text style={[g.tiny, { color: colors.textMuted }]}>{s.sub}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* about */}
            <View style={[g.sec, { backgroundColor: colors.surface }]}>
              <Text style={[g.secHead, { color: colors.text }]}>About this service</Text>
              <Text style={[g.secBody, { color: colors.textSecondary }]}>{l.description || "No description provided."}</Text>
            </View>

            {l.tags.length > 0 && (
              <View style={[g.sec, { backgroundColor: colors.surface }]}>
                <Text style={[g.secHead, { color: colors.text }]}>Tags</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                  {l.tags.map((t, i) => (
                    <View key={i} style={[g.catChip, { backgroundColor: colors.accent + "12", paddingVertical: 5 }]}>
                      <Text style={[g.tiny, { color: colors.accent }]}>{t}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {!!l.requirements && (
              <View style={[g.sec, { backgroundColor: colors.surface }]}>
                <Text style={[g.secHead, { color: colors.text }]}>What the seller needs</Text>
                <Text style={[g.secBody, { color: colors.textSecondary }]}>{l.requirements}</Text>
              </View>
            )}

            {/* reviews */}
            <View style={[g.sec, { backgroundColor: colors.surface }]}>
              <Text style={[g.secHead, { color: colors.text }]}>Reviews ({reviews.length})</Text>
              {reviews.length === 0
                ? <Text style={[g.secBody, { color: colors.textMuted }]}>No reviews yet.</Text>
                : reviews.map(r => (
                  <View key={r.id} style={[g.reviewRow, { borderTopColor: colors.border }]}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <Stars n={r.rating} size={11} />
                      <Text style={[g.tiny, { color: colors.text, fontWeight: "600" }]}>@{r.reviewer_handle}</Text>
                      <Text style={[g.tiny, { color: colors.textMuted }]}>{ago(r.created_at)}</Text>
                    </View>
                    {!!r.comment && <Text style={[g.secBody, { color: colors.textSecondary }]}>{r.comment}</Text>}
                  </View>
                ))}
            </View>

            {own && (
              <View style={[g.sec, { backgroundColor: colors.surface }]}>
                <TouchableOpacity style={g.destructBtn} onPress={() => deleteListing(l)}>
                  <Ionicons name="trash-outline" size={15} color="#EF4444" />
                  <Text style={{ color: "#EF4444", fontWeight: "600", fontSize: 14 }}>Delete Service</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>

          {!own && (
            <View style={[g.footer, { backgroundColor: colors.surface, borderTopColor: colors.border, paddingBottom: insets.bottom + 12 }]}>
              <View>
                <Text style={[g.footerPrice, { color: Colors.gold }]}>{l.price} ACoin</Text>
                <Text style={[g.tiny, { color: colors.textMuted }]}>{l.delivery_days}-day delivery</Text>
              </View>
              <TouchableOpacity style={[g.buyBtn, { backgroundColor: colors.accent }]} onPress={() => placeOrder(l)} disabled={placing}>
                {placing ? <ActivityIndicator color="#fff" size="small" /> : <>
                  <Ionicons name="flash" size={16} color="#fff" />
                  <Text style={g.buyBtnText}>Order Now</Text>
                </>}
              </TouchableOpacity>
            </View>
          )}
        </View>
    );
  };

  /* ─── Order Screen ───────────────────────────────────────────────────────  */
  const OrderModal = () => {
    if (!viewO) return null;
    const o = viewO;
    const me = o.seller_id === user?.id;
    const sm = S[o.status] ?? S.pending;
    const done = ["completed","cancelled"].includes(o.status);
    return (
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={[g.modal, { backgroundColor: colors.backgroundSecondary, paddingTop: insets.top }]}>
            <View style={[g.modalNav, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
              <TouchableOpacity onPress={() => { setViewO(null); setShowDeliver(false); setFlScreen("main"); }} hitSlop={12}>
                <Ionicons name="arrow-back" size={22} color={colors.text} />
              </TouchableOpacity>
              <Text style={[g.modalNavTitle, { color: colors.text }]}>Order</Text>
              <View style={{ width: 22 }} />
            </View>
            <ScrollView contentContainerStyle={{ paddingBottom: 140 }}>
              <View style={[g.heroWrap, { backgroundColor: colors.surface }]}>
                <Text style={{ fontSize: 38 }}>{o.listing_emoji}</Text>
                <Text style={[g.heroTitle, { color: colors.text, fontSize: 17, marginTop: 6 }]}>{o.listing_title}</Text>
                <View style={[g.statusChip, { backgroundColor: sm.c + "14", marginTop: 8, alignSelf: "center" }]}>
                  <View style={[g.statusDot, { backgroundColor: sm.c }]} />
                  <Text style={[g.tiny, { color: sm.c, fontWeight: "600", fontSize: 13 }]}>{sm.label}</Text>
                </View>
              </View>

              <View style={[g.sec, { backgroundColor: colors.surface }]}>
                {[
                  { label: "Amount",    val: `${o.price_paid} ACoin`, c: Colors.gold, link: undefined },
                  { label: "Seller",    val: `@${o.seller_handle}`,   c: colors.accent, link: o.seller_id },
                  { label: "Buyer",     val: `@${o.buyer_handle}`,    c: colors.accent, link: o.buyer_id },
                  { label: "Placed",    val: new Date(o.created_at).toLocaleDateString(), c: undefined, link: undefined },
                  ...(o.completed_at ? [{ label: "Completed", val: new Date(o.completed_at).toLocaleDateString(), c: undefined, link: undefined }] : []),
                  { label: "Revisions", val: `${o.revision_count} / ${o.max_revisions}`, c: undefined, link: undefined },
                ].map((row, i) => (
                  <View key={i} style={[g.infoRow, { borderBottomColor: colors.border }]}>
                    <Text style={[g.tiny, { color: colors.textMuted, fontSize: 13 }]}>{row.label}</Text>
                    {row.link
                      ? <TouchableOpacity onPress={() => { setViewO(null); setFlScreen("main"); router.push({ pathname: "/contact/[id]", params: { id: row.link as string } }); }}>
                          <Text style={[g.tiny, { color: row.c || colors.text, fontWeight: "600", fontSize: 13 }]}>{row.val}</Text>
                        </TouchableOpacity>
                      : <Text style={[g.tiny, { color: row.c || colors.text, fontWeight: "600", fontSize: 13 }]}>{row.val}</Text>
                    }
                  </View>
                ))}
              </View>

              {!!o.buyer_note && <View style={[g.sec, { backgroundColor: colors.surface }]}><Text style={[g.secHead, { color: colors.text }]}>Note from buyer</Text><Text style={[g.secBody, { color: colors.textSecondary }]}>{o.buyer_note}</Text></View>}
              {!!o.delivery_message && <View style={[g.sec, { backgroundColor: colors.surface }]}><Text style={[g.secHead, { color: colors.text }]}>Delivery message</Text><Text style={[g.secBody, { color: colors.textSecondary }]}>{o.delivery_message}</Text></View>}
              {!!o.cancel_reason && <View style={[g.sec, { backgroundColor: colors.surface }]}><Text style={[g.secHead, { color: colors.text }]}>Cancellation</Text><Text style={[g.secBody, { color: "#EF4444" }]}>{o.cancel_reason}</Text></View>}

              {o.status === "completed" && !me && (
                <View style={[g.sec, { backgroundColor: colors.surface }]}>
                  <Text style={[g.secHead, { color: colors.text }]}>Leave a Review</Text>
                  <View style={{ flexDirection: "row", gap: 10, marginBottom: 12 }}>
                    {[1,2,3,4,5].map(s => (
                      <TouchableOpacity key={s} onPress={() => setRevStars(s)} hitSlop={6}>
                        <Ionicons name={revStars >= s ? "star" : "star-outline"} size={30} color="#FBBF24" />
                      </TouchableOpacity>
                    ))}
                  </View>
                  <TextInput style={[g.textarea, { backgroundColor: colors.backgroundSecondary, color: colors.text, borderColor: colors.border }]}
                    placeholder="Share your experience…" placeholderTextColor={colors.textMuted}
                    value={revText} onChangeText={setRevText} multiline />
                  <TouchableOpacity style={[g.btn, { backgroundColor: colors.accent, marginTop: 8 }]} onPress={() => submitReview(o)} disabled={actioning}>
                    {actioning ? <ActivityIndicator color="#fff" size="small" /> : <Text style={g.btnText}>Submit Review</Text>}
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>

            {!done && !showDeliver && (
              <View style={[g.footer, { backgroundColor: colors.surface, borderTopColor: colors.border, paddingBottom: insets.bottom + 12, gap: 8 }]}>
                {me && o.status === "pending" && <>
                  <TouchableOpacity style={[g.actionBtn, { backgroundColor: colors.accent, flex: 1 }]} onPress={() => updateStatus(o, "in_progress")}>
                    <Ionicons name="play" size={14} color="#fff" /><Text style={g.actionBtnText}>Start Work</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[g.actionBtn, { backgroundColor: "#EF444412", flex: 1 }]} onPress={() => updateStatus(o, "cancelled", "Seller declined")}>
                    <Text style={[g.actionBtnText, { color: "#EF4444" }]}>Decline</Text>
                  </TouchableOpacity>
                </>}
                {me && (o.status === "in_progress" || o.status === "revision") && (
                  <TouchableOpacity style={[g.actionBtn, { backgroundColor: "#7C3AED", flex: 1 }]} onPress={() => setShowDeliver(true)}>
                    <Ionicons name="cube-outline" size={14} color="#fff" /><Text style={g.actionBtnText}>Deliver Work</Text>
                  </TouchableOpacity>
                )}
                {!me && o.status === "delivered" && <>
                  <TouchableOpacity style={[g.actionBtn, { backgroundColor: "#16A34A", flex: 1 }]} onPress={() => updateStatus(o, "completed")}>
                    <Ionicons name="checkmark-circle" size={14} color="#fff" /><Text style={g.actionBtnText}>Accept</Text>
                  </TouchableOpacity>
                  {o.revision_count < o.max_revisions && (
                    <TouchableOpacity style={[g.actionBtn, { backgroundColor: "#F9731612", flex: 1 }]} onPress={() => updateStatus(o, "revision")}>
                      <Text style={[g.actionBtnText, { color: "#F97316" }]}>Request Revision</Text>
                    </TouchableOpacity>
                  )}
                </>}
                {!me && o.status === "pending" && (
                  <TouchableOpacity style={[g.actionBtn, { backgroundColor: "#EF444412", flex: 1 }]} onPress={() => updateStatus(o, "cancelled", "Buyer cancelled")}>
                    <Text style={[g.actionBtnText, { color: "#EF4444" }]}>Cancel & Refund</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {showDeliver && (
              <View style={[g.deliverSheet, { backgroundColor: colors.surface, borderTopColor: colors.border, paddingBottom: insets.bottom + 12 }]}>
                <Text style={[g.secHead, { color: colors.text, marginBottom: 8 }]}>Delivery Message</Text>
                <TextInput style={[g.textarea, { backgroundColor: colors.backgroundSecondary, color: colors.text, borderColor: colors.border }]}
                  placeholder="Describe your delivery…" placeholderTextColor={colors.textMuted}
                  value={delivMsg} onChangeText={setDelivMsg} multiline />
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <TouchableOpacity style={[g.actionBtn, { backgroundColor: colors.backgroundSecondary, flex: 1 }]} onPress={() => setShowDeliver(false)}>
                    <Text style={[g.actionBtnText, { color: colors.text }]}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[g.actionBtn, { backgroundColor: "#7C3AED", flex: 1 }]} onPress={() => updateStatus(o, "delivered", delivMsg)} disabled={actioning}>
                    {actioning ? <ActivityIndicator color="#fff" size="small" /> : <Text style={g.actionBtnText}>Send</Text>}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
    );
  };

  /* ─── Create Screen ───────────────────────────────────────────────────────  */
  const CreateModal = () => (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={[g.modal, { backgroundColor: colors.backgroundSecondary, paddingTop: insets.top }]}>
          <View style={[g.modalNav, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => { setShowCreate(false); resetForm(); setFlScreen("main"); }} hitSlop={12}>
              <Ionicons name="close" size={22} color={colors.text} />
            </TouchableOpacity>
            <Text style={[g.modalNavTitle, { color: colors.text }]}>{editTarget ? "Edit Service" : "New Service"}</Text>
            <View style={{ width: 22 }} />
          </View>
          <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
            {/* icon + title */}
            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={{ width: 76 }}>
                <Text style={[g.fieldLbl, { color: colors.textSecondary }]}>Icon</Text>
                <View style={[g.field, { backgroundColor: colors.surface }]}>
                  <TextInput style={[g.fieldInput, { color: colors.text, textAlign: "center", fontSize: 22 }]} value={fEmoji} onChangeText={setFEmoji} maxLength={4} />
                </View>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[g.fieldLbl, { color: colors.textSecondary }]}>Title</Text>
                <View style={[g.field, { backgroundColor: colors.surface }]}>
                  <TextInput style={[g.fieldInput, { color: colors.text }]} placeholder="e.g. I will design your logo" placeholderTextColor={colors.textMuted} value={fTitle} onChangeText={setFTitle} maxLength={100} />
                </View>
              </View>
            </View>

            {/* category */}
            <View>
              <Text style={[g.fieldLbl, { color: colors.textSecondary }]}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {CATS.filter(c => c.key !== "All").map(c => (
                  <TouchableOpacity key={c.key} style={[g.catPill, { backgroundColor: fCat === c.key ? colors.accent : colors.surface, borderColor: fCat === c.key ? colors.accent : colors.border }]} onPress={() => setFCat(c.key)}>
                    <Ionicons name={c.icon as any} size={12} color={fCat === c.key ? "#fff" : colors.textMuted} />
                    <Text style={[g.catPillText, { color: fCat === c.key ? "#fff" : colors.textMuted }]}>{c.key}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* price + days */}
            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={[g.fieldLbl, { color: colors.textSecondary }]}>Price (ACoin)</Text>
                <View style={[g.field, { backgroundColor: colors.surface }]}>
                  <TextInput style={[g.fieldInput, { color: colors.text }]} placeholder="200" placeholderTextColor={colors.textMuted} value={fPrice} onChangeText={setFPrice} keyboardType="numeric" />
                </View>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[g.fieldLbl, { color: colors.textSecondary }]}>Delivery (days)</Text>
                <View style={[g.field, { backgroundColor: colors.surface }]}>
                  <TextInput style={[g.fieldInput, { color: colors.text }]} placeholder="3" placeholderTextColor={colors.textMuted} value={fDays} onChangeText={setFDays} keyboardType="numeric" />
                </View>
              </View>
            </View>

            {/* desc */}
            <View>
              <Text style={[g.fieldLbl, { color: colors.textSecondary }]}>Description</Text>
              <TextInput style={[g.textarea, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border, minHeight: 100 }]} placeholder="What will the buyer receive?" placeholderTextColor={colors.textMuted} value={fDesc} onChangeText={setFDesc} multiline />
            </View>

            {/* requirements */}
            <View>
              <Text style={[g.fieldLbl, { color: colors.textSecondary }]}>Requirements from buyer</Text>
              <TextInput style={[g.textarea, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]} placeholder="What do you need to start?" placeholderTextColor={colors.textMuted} value={fReqs} onChangeText={setFReqs} multiline />
            </View>

            {/* tags */}
            <View>
              <Text style={[g.fieldLbl, { color: colors.textSecondary }]}>Tags (comma-separated)</Text>
              <View style={[g.field, { backgroundColor: colors.surface }]}>
                <TextInput style={[g.fieldInput, { color: colors.text }]} placeholder="logo, branding, design" placeholderTextColor={colors.textMuted} value={fTags} onChangeText={setFTags} />
              </View>
            </View>

            <TouchableOpacity style={[g.btn, { backgroundColor: colors.accent, height: 52, opacity: saving ? 0.7 : 1 }]} onPress={saveListing} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={g.btnText}>{editTarget ? "Save Changes" : "Publish Service"}</Text>}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
  );

  /* ─── Root Render ────────────────────────────────────────────────────────  */
  if (flScreen === "listing" && viewL) return <ListingModal />;
  if (flScreen === "order" && viewO) return <OrderModal />;
  if (flScreen === "create") return <CreateModal />;

  return (
    <View style={[g.root, { backgroundColor: colors.backgroundSecondary, paddingTop: insets.top }]}>

      {/* top nav */}
      <View style={[g.nav, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={handleBack} hitSlop={12}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text style={[g.navTitle, { color: colors.text }]}>Freelance</Text>
          <Text style={[g.tiny, { color: colors.textMuted }]}>@afuchat</Text>
        </View>
        <TouchableOpacity onPress={() => { resetForm(); setShowCreate(true); setFlScreen("create"); }} hitSlop={12}>
          <Ionicons name="add-circle" size={24} color={colors.accent} />
        </TouchableOpacity>
      </View>

      {/* offline banner */}
      {!connected && (
        <View style={g.offlineBanner}>
          <Ionicons name="cloud-offline-outline" size={14} color="#fff" />
          <Text style={g.offlineText}>Offline · Showing cached data</Text>
        </View>
      )}

      {/* tab bar */}
      <View style={[g.tabBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        {TABS.map(t => {
          const active = tab === t.k;
          return (
            <TouchableOpacity key={t.k} style={g.tabItem} onPress={() => setTab(t.k)}>
              <Ionicons name={(active ? t.icon : `${t.icon}-outline`) as any} size={20} color={active ? colors.accent : colors.textMuted} />
              <Text style={[g.tabLabel, { color: active ? colors.accent : colors.textMuted }]}>{t.label}</Text>
              {active && <View style={[g.tabActive, { backgroundColor: colors.accent }]} />}
              {t.k === "orders" && activeN > 0 && (
                <View style={[g.badge, { backgroundColor: colors.accent }]}>
                  <Text style={g.badgeText}>{activeN > 9 ? "9+" : activeN}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* content */}
      {loading ? (
        <View style={g.loadingWrap}>
          <ActivityIndicator color={colors.accent} size="large" />
          <Text style={[g.tiny, { color: colors.textMuted, marginTop: 10, fontSize: 14 }]}>Loading marketplace…</Text>
        </View>
      ) : tab === "explore" ? <ExploreView />
        : tab === "orders"  ? <OrdersView />
        : <SellerView />}

    </View>
  );
}

/* ─── Styles ─────────────────────────────────────────────────────────────────  */
const g = StyleSheet.create({
  root: { flex: 1 },
  nav: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  navTitle: { fontSize: 17, fontWeight: "700" },
  offlineBanner: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: "#F59E0B", paddingVertical: 6 },
  offlineText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  tabBar: { flexDirection: "row", borderBottomWidth: StyleSheet.hairlineWidth },
  tabItem: { flex: 1, alignItems: "center", paddingVertical: 10, gap: 2 },
  tabLabel: { fontSize: 11, fontWeight: "600" },
  tabActive: { width: 4, height: 4, borderRadius: 2 },
  badge: { position: "absolute", top: 4, right: "16%", minWidth: 16, height: 16, borderRadius: 8, alignItems: "center", justifyContent: "center", paddingHorizontal: 3 },
  badgeText: { color: "#fff", fontSize: 9, fontWeight: "700" },
  searchWrap: { flexDirection: "row", alignItems: "center", marginHorizontal: 14, marginTop: 12, marginBottom: 2, paddingHorizontal: 14, height: 44, borderRadius: 22, gap: 8 },
  searchInput: { flex: 1, fontSize: 14 },
  catRow: { paddingHorizontal: 14, paddingVertical: 10, gap: 8 },
  catPill: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  catPillText: { fontSize: 12, fontWeight: "600" },
  subTabs: { flexDirection: "row", borderBottomWidth: StyleSheet.hairlineWidth },
  subTab: { flex: 1, paddingVertical: 11, alignItems: "center" },
  subTabText: { fontSize: 13, fontWeight: "600" },
  card: { borderRadius: 16, padding: 14, gap: 8 },
  cardTop: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  emojiBox: { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center" },
  cardTitle: { fontSize: 14, fontWeight: "700", lineHeight: 19, flex: 1 },
  cardDesc: { fontSize: 13, lineHeight: 18 },
  cardFooter: { flexDirection: "row", alignItems: "center", gap: 6, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 8 },
  dot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: "#ccc" },
  catChip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  priceBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, flexDirection: "row", alignItems: "center", gap: 3 },
  priceNum: { fontSize: 14, fontWeight: "700" },
  handle: { fontSize: 12, fontWeight: "500", marginTop: 2 },
  statusChip: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  tiny: { fontSize: 12 },
  pill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  empty: { alignItems: "center", paddingVertical: 60, gap: 8, paddingHorizontal: 28 },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  emptyTitle: { fontSize: 18, fontWeight: "700" },
  emptySub: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  emptyCard: { borderRadius: 16, padding: 24, alignItems: "center", gap: 6 },
  btn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingHorizontal: 20, paddingVertical: 13, borderRadius: 14 },
  btnText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  smallBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10 },
  statCard: { borderRadius: 14, padding: 14, alignItems: "center", gap: 5 },
  statIcon: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  statVal: { fontSize: 20, fontWeight: "700" },
  secHead: { fontSize: 16, fontWeight: "700", marginBottom: 10 },
  mscActions: { flexDirection: "row", gap: 8, padding: 10, borderTopWidth: StyleSheet.hairlineWidth },
  mscBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10 },
  pausedRow: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 4, paddingVertical: 4, borderRadius: 6, marginTop: 4 },
  modal: { flex: 1 },
  modalNav: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 11, borderBottomWidth: StyleSheet.hairlineWidth },
  modalNavTitle: { flex: 1, fontSize: 16, fontWeight: "700", textAlign: "center" },
  heroWrap: { padding: 24, alignItems: "center", gap: 6 },
  heroEmoji: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center" },
  heroTitle: { fontSize: 20, fontWeight: "700", textAlign: "center" },
  heroStats: { flexDirection: "row", gap: 24, marginTop: 10 },
  heroStatItem: { alignItems: "center", gap: 2 },
  sec: { padding: 16, marginTop: 8 },
  secBody: { fontSize: 14, lineHeight: 21 },
  reviewRow: { paddingTop: 10, marginTop: 10, borderTopWidth: StyleSheet.hairlineWidth },
  destructBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 12, borderRadius: 12, backgroundColor: "#EF444410" },
  footer: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, paddingHorizontal: 16, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
  footerPrice: { fontSize: 22, fontWeight: "700" },
  buyBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 14 },
  buyBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  actionBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 13, borderRadius: 12 },
  actionBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  deliverSheet: { position: "absolute", bottom: 0, left: 0, right: 0, padding: 16, gap: 10, borderTopWidth: StyleSheet.hairlineWidth },
  infoRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 11, borderBottomWidth: StyleSheet.hairlineWidth },
  fieldLbl: { fontSize: 13, fontWeight: "500", marginBottom: 5 },
  field: { borderRadius: 12, paddingHorizontal: 14, height: 48, justifyContent: "center" },
  fieldInput: { fontSize: 15, flex: 1 },
  textarea: { borderRadius: 12, padding: 14, fontSize: 14, minHeight: 72, textAlignVertical: "top", borderWidth: 1 },
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
});
