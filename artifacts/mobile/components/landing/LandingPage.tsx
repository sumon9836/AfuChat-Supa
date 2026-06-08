import React, { useState } from "react";
import {
  ActivityIndicator,
  Image,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useColorScheme,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useAuth } from "@/context/AuthContext";

const SUPABASE_URL      = process.env.EXPO_PUBLIC_SUPABASE_URL      ?? "";
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";

const SHOTS = {
  chats:    require("@/assets/screenshots/chats.png"),
  search:   require("@/assets/screenshots/search.jpg"),
  discover: require("@/assets/screenshots/discover.jpg"),
  me:       require("@/assets/screenshots/me.jpg"),
  apps:     require("@/assets/screenshots/apps.jpg"),
  pay:      require("@/assets/screenshots/pay.png"),
};


function makeColors(dark: boolean) {
  return {
    teal:    "#1f95ff",
    bg:      dark ? "#0A0D14" : "#FFFFFF",
    bg2:     dark ? "#111827" : "#F8FAFC",
    surface: dark ? "#1F2937" : "#FFFFFF",
    border:  dark ? "#1F2937" : "#E2E8F0",
    text:    dark ? "#F9FAFB" : "#1E293B",
    sub:     dark ? "#9CA3AF" : "#475569",
    muted:   dark ? "#6B7280" : "#94A3B8",
    tealBg:  dark ? "rgba(0,188,212,0.15)" : "#E0F7FA",
    dark:    "#0A0D14",
    dark2:   "#111827",
    white:   "#FFFFFF",
  };
}

function PhoneFrame({ source, fw, tilt = 0, dark }: { source: any; fw: number; tilt?: number; dark: boolean }) {
  const fh = Math.round(fw * 2.12);
  const br = Math.round(fw * 0.17);
  const bw = Math.max(8, Math.round(fw * 0.038));
  const outer: any = { width: fw, height: fh };
  if (tilt) outer.transform = [{ rotate: `${tilt}deg` }];
  return (
    <View style={outer}>
      <View style={{ flex: 1, borderRadius: br, borderWidth: bw, borderColor: "#0A0D14", backgroundColor: "#0A0D14", overflow: "hidden" }}>
        <Image source={source} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
        <View style={{ position: "absolute", top: 10, alignSelf: "center", width: fw * 0.38, height: fw * 0.093, borderRadius: fw * 0.05, backgroundColor: "#0A0D14" }} />
        <View style={{ position: "absolute", bottom: 7, alignSelf: "center", width: fw * 0.34, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.38)" }} />
      </View>
    </View>
  );
}

export default function LandingPage() {
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const C = makeColors(isDark);

  const [subEmail, setSubEmail]     = useState("");
  const [subLoading, setSubLoading] = useState(false);
  const [subMsg, setSubMsg]         = useState<{ text: string; ok: boolean } | null>(null);

  const isDesktop = width >= 1024;
  const isTablet  = width >= 640;
  const pH  = isDesktop ? 80 : 24;
  const pHv = isDesktop ? 96 : 64;
  const phoneW = isDesktop ? 230 : isTablet ? 200 : 180;

  async function handleSubscribe() {
    const email = subEmail.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setSubMsg({ text: "Please enter a valid email address.", ok: false });
      return;
    }
    setSubLoading(true);
    setSubMsg(null);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/newsletter-subscribe`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          apikey: SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ email, source: "landing_page" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Server error");
      setSubMsg({ text: json?.message ?? "Subscribed! Check your inbox.", ok: true });
      setSubEmail("");
    } catch (err: any) {
      setSubMsg({ text: err?.message ?? "Could not subscribe. Please try again.", ok: false });
    } finally {
      setSubLoading(false);
    }
  }

  const features = [
    { icon: "chatbubbles-outline",  color: C.teal,    title: "Encrypted Messaging",  desc: "End-to-end encrypted 1-on-1 chats, group rooms, voice notes, and broadcasts." },
    { icon: "sparkles-outline",     color: "#8B5CF6", title: "AfuAI Assistant",       desc: "Your personal AI — ask questions, generate content, and get smart replies." },
    { icon: "wallet-outline",       color: "#F59E0B", title: "ACoin Wallet",          desc: "Send money, pay for services, earn rewards, and manage your digital wallet." },
    { icon: "storefront-outline",   color: "#10B981", title: "Marketplace",           desc: "Shop verified stores, discover exclusive products, and track your orders." },
    { icon: "briefcase-outline",    color: "#3B82F6", title: "Freelance Hub",         desc: "Post jobs or offer skills — AfuChat's built-in talent marketplace." },
    { icon: "gift-outline",         color: "#EC4899", title: "Gifts & Stickers",      desc: "Send digital gifts, animated stickers, and red envelopes to friends." },
  ];

  const stats = [
    { value: "2M+",     label: "Downloads" },
    { value: "180+",    label: "Countries" },
    { value: "40+",     label: "Features" },
    { value: "256-bit", label: "Encryption" },
  ];

  const footerCols = [
    { heading: "Product", links: [
      { label: "Features",  fn: () => {} },
      { label: "Premium",   fn: () => router.push("/premium") },
      { label: "Download",  fn: () => Linking.openURL("https://play.google.com/store/apps/details?id=com.afuchat.app") },
    ]},
    { heading: "Company", links: [
      { label: "About",   fn: () => router.push("/about") },
      { label: "Contact", fn: () => Linking.openURL("mailto:support@afuchat.com") },
      { label: "Press",   fn: () => Linking.openURL("mailto:press@afuchat.com") },
    ]},
    { heading: "Legal", links: [
      { label: "Terms of Service", fn: () => router.push("/terms") },
      { label: "Privacy Policy",   fn: () => router.push("/privacy") },
    ]},
    { heading: "Support", links: [
      { label: "Help Center",  fn: () => router.push("/help") },
      { label: "Report a Bug", fn: () => Linking.openURL("mailto:support@afuchat.com") },
    ]},
  ];

  return (
    <ScrollView
      style={[s.root, { backgroundColor: C.bg }]}
      contentContainerStyle={{ paddingBottom: 0 }}
      showsVerticalScrollIndicator={false}
      stickyHeaderIndices={[0]}
    >

      {/* ── NAV ─────────────────────────────────────────── */}
      <View style={[s.nav, { paddingHorizontal: pH, backgroundColor: C.bg, borderBottomColor: C.border }]}>
        <TouchableOpacity onPress={() => router.replace("/")} style={s.brand}>
          <Text style={[s.brandText, { color: C.text }]}>AfuChat</Text>
        </TouchableOpacity>

        {isDesktop && (
          <View style={s.navLinks}>
            {[
              { label: "Features", fn: () => {} },
              { label: "Download", fn: () => Linking.openURL("https://play.google.com/store/apps/details?id=com.afuchat.app") },
            ].map((l) => (
              <TouchableOpacity key={l.label} onPress={l.fn} style={s.navLink}>
                <Text style={[s.navLinkTxt, { color: C.sub }]}>{l.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={s.navRight}>
          {isDesktop && (
            <TouchableOpacity
              onPress={() => user ? router.replace("/(tabs)") : router.push("/login")}
              style={{ paddingHorizontal: 16, paddingVertical: 8 }}
            >
              <Text style={{ fontSize: 15, fontFamily: "Inter_500Medium", color: C.text }}>
                {user ? "Open App" : "Sign in"}
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={() => Linking.openURL("https://play.google.com/store/apps/details?id=com.afuchat.app")}
            style={s.navCta}
          >
            <Ionicons name="logo-google-playstore" size={14} color="#FFFFFF" />
            <Text style={s.navCtaTxt}>Get App</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── HERO ────────────────────────────────────────── */}
      <View style={[s.hero, { paddingHorizontal: pH, paddingTop: pHv, paddingBottom: pHv }]}>
        <View style={[s.heroRow, { flexDirection: isDesktop ? "row" : "column" }]}>

          {/* Copy */}
          <View style={{ flex: isDesktop ? 1 : 0, alignItems: isDesktop ? "flex-start" : "center" }}>
            <View style={[s.badgeRow, { justifyContent: isDesktop ? "flex-start" : "center" }]}>
              <View style={s.pill}>
                <Ionicons name="checkmark-circle" size={12} color={C.teal} />
                <Text style={[s.pillTxt, { color: C.teal }]}>Android & Web</Text>
              </View>
              <View style={s.pill}>
                <Ionicons name="lock-closed" size={12} color={C.teal} />
                <Text style={[s.pillTxt, { color: C.teal }]}>End-to-end Encrypted</Text>
              </View>
            </View>

            <Text style={[s.h1, { fontSize: isDesktop ? 54 : isTablet ? 42 : 36, textAlign: isDesktop ? "left" : "center" }]}>
              {"Chat. Share.\n"}<Text style={{ color: C.teal }}>Connect.</Text>
            </Text>

            <Text style={[s.heroSub, { textAlign: isDesktop ? "left" : "center" }]}>
              AfuChat is the all-in-one super app — messaging, AI, payments, marketplace, videos, and communities in one place.
            </Text>

            <View style={[s.ctaRow, { flexDirection: isTablet ? "row" : "column", alignItems: isDesktop ? "flex-start" : "center" }]}>
              <TouchableOpacity
                onPress={() => Linking.openURL("https://play.google.com/store/apps/details?id=com.afuchat.app")}
                style={s.ctaPrimary}
              >
                <Ionicons name="logo-google-playstore" size={18} color="#FFFFFF" />
                <Text style={s.ctaPrimaryTxt}>Get on Android</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => user ? router.replace("/(tabs)") : router.push("/login")}
                style={[s.ctaSecondary, { backgroundColor: isDark ? "#1F2937" : "#FFFFFF" }]}
              >
                <Text style={[s.ctaSecondaryTxt, { color: C.text }]}>Open Web App</Text>
                <Ionicons name="arrow-forward" size={16} color={C.text} />
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: C.muted }}>
              Free to download · No credit card required
            </Text>
          </View>

          {/* Phones */}
          <View style={[s.heroPhones, { marginTop: isDesktop ? 0 : 52 }]}>
            {isTablet && (
              <View style={{ marginRight: -20, marginTop: 44, opacity: 0.78 }}>
                <PhoneFrame source={SHOTS.apps} fw={phoneW - 40} tilt={-5} dark={isDark} />
              </View>
            )}
            <PhoneFrame source={SHOTS.chats} fw={phoneW} tilt={isTablet ? 5 : 0} dark={isDark} />
          </View>
        </View>
      </View>

      {/* ── TRUST BAR ──────────────────────────────────── */}
      <View style={[s.trustBar, { paddingHorizontal: pH, backgroundColor: C.bg2, borderBottomColor: C.border }]}>
        <Text style={[s.eyebrowCenter, { color: C.teal }]}>AVAILABLE ON</Text>
        <View style={s.trustRow}>
          {[
            { icon: "logo-google-playstore", label: "Google Play" },
            { icon: "globe-outline",          label: "Web App" },
            { icon: "phone-portrait-outline", label: "Android APK" },
          ].map((p) => (
            <View key={p.label} style={s.trustItem}>
              <Ionicons name={p.icon as any} size={18} color={C.teal} />
              <Text style={[s.trustTxt, { color: C.text }]}>{p.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* ── FEATURES ──────────────────────────────────── */}
      <View style={[s.section, { backgroundColor: C.bg2, paddingHorizontal: pH }]}>
        <Text style={[s.eyebrowCenter, { color: C.teal }]}>EVERYTHING IN ONE APP</Text>
        <Text style={[s.h2, { textAlign: "center", fontSize: isDesktop ? 38 : 28, color: C.text }]}>One app. Infinite possibilities.</Text>
        <Text style={[s.bodyCtr, { marginBottom: 48, color: C.sub }]}>
          AfuChat combines the best features of messaging, social, and finance apps into one seamless experience.
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
          {features.map((f) => (
            <View
              key={f.title}
              style={[s.featureCard, {
                width: isDesktop ? "31%" : isTablet ? "47%" : "100%",
                marginRight: 16, marginBottom: 16,
                backgroundColor: C.surface,
                borderColor: C.border,
              }]}
            >
              <View style={[s.fIcon, { backgroundColor: f.color + "18" }]}>
                <Ionicons name={f.icon as any} size={22} color={f.color} />
              </View>
              <Text style={[s.fTitle, { color: C.text }]}>{f.title}</Text>
              <Text style={[s.fDesc, { color: C.sub }]}>{f.desc}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* ── SHOWCASE ──────────────────────────────────── */}
      <View style={[s.section, { backgroundColor: C.dark, paddingHorizontal: pH }]}>
        <Text style={[s.eyebrowCenter, { color: C.teal }]}>BUILT FOR MOBILE</Text>
        <Text style={[s.h2, { textAlign: "center", color: "#F9FAFB", fontSize: isDesktop ? 38 : 28 }]}>Every screen, perfectly designed.</Text>
        <Text style={[s.bodyCtr, { color: "#94A3B8", marginBottom: 48 }]}>
          Crafted for speed and simplicity — no clutter, just what you need.
        </Text>
        <View style={[s.showcaseRow, { flexDirection: isTablet ? "row" : "column" }]}>
          {[
            { src: SHOTS.chats,   cap: "Messaging",          sub: "Chats, groups & broadcasts" },
            { src: SHOTS.apps,    cap: "Mini Programs",       sub: "Airtime, bills, transfers & more", offset: -32 },
            { src: SHOTS.me,      cap: "Your Profile",        sub: "Posts, wallet & digital ID", tabletOnly: true },
          ].map((item) =>
            (item.tabletOnly && !isTablet) ? null : (
              <View key={item.cap} style={[s.showcaseItem, { marginTop: isTablet && item.offset ? item.offset : 0 }]}>
                <PhoneFrame source={item.src} fw={isDesktop ? 190 : isTablet ? 165 : 200} dark={true} />
                <Text style={s.showCap}>{item.cap}</Text>
                <Text style={s.showSub}>{item.sub}</Text>
              </View>
            )
          )}
        </View>
      </View>

      {/* ── DETAIL 1 — Messaging ──────────────────────── */}
      <View style={[s.section, { backgroundColor: C.bg, paddingHorizontal: pH }]}>
        <View style={[s.detailRow, { flexDirection: isDesktop ? "row" : "column" }]}>
          <View style={{ flex: isDesktop ? 1 : 0, alignItems: "center", marginBottom: isDesktop ? 0 : 40 }}>
            <PhoneFrame source={SHOTS.chats} fw={isDesktop ? 240 : isTablet ? 220 : 200} dark={isDark} />
          </View>
          <View style={{ flex: isDesktop ? 1 : 0, paddingLeft: isDesktop ? 52 : 0, alignItems: isDesktop ? "flex-start" : "center" }}>
            <Text style={[s.eyebrow, { color: C.teal }]}>MESSAGING & SOCIAL</Text>
            <Text style={[s.h2, { textAlign: isDesktop ? "left" : "center", fontSize: isDesktop ? 34 : 26, marginBottom: 12, color: C.text }]}>
              {"Real conversations,\nreal connections."}
            </Text>
            <Text style={[s.body, { textAlign: isDesktop ? "left" : "center", marginBottom: 20, color: C.sub }]}>
              Send messages that no one else can read. Full end-to-end encryption — your private chats stay private, always.
            </Text>
            {["End-to-end encrypted 1-on-1 chats", "Group rooms with up to 1,000 members", "Voice notes, media, and document sharing", "Stories, broadcasts, and channels", "Disappearing messages"].map((item) => (
              <View key={item} style={s.checkRow}>
                <View style={[s.checkMark, { backgroundColor: C.tealBg }]}>
                  <Ionicons name="checkmark" size={13} color={C.teal} />
                </View>
                <Text style={[s.checkTxt, { color: C.sub }]}>{item}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* ── DETAIL 2 — Payments ───────────────────────── */}
      <View style={[s.section, { backgroundColor: C.bg2, paddingHorizontal: pH }]}>
        <View style={[s.detailRow, { flexDirection: isDesktop ? "row-reverse" : "column" }]}>
          <View style={{ flex: isDesktop ? 1 : 0, alignItems: "center", marginBottom: isDesktop ? 0 : 40 }}>
            <PhoneFrame source={SHOTS.pay} fw={isDesktop ? 240 : isTablet ? 220 : 200} dark={isDark} />
          </View>
          <View style={{ flex: isDesktop ? 1 : 0, paddingRight: isDesktop ? 52 : 0, alignItems: isDesktop ? "flex-start" : "center" }}>
            <Text style={[s.eyebrow, { color: "#F59E0B" }]}>PAYMENTS & WALLET</Text>
            <Text style={[s.h2, { textAlign: isDesktop ? "left" : "center", fontSize: isDesktop ? 34 : 26, marginBottom: 12, color: C.text }]}>
              {"Your life,\nhandled in-app."}
            </Text>
            <Text style={[s.body, { textAlign: isDesktop ? "left" : "center", marginBottom: 20, color: C.sub }]}>
              Buy airtime, pay bills, send money, and shop — all without leaving AfuChat.
            </Text>
            {["Send & receive ACoins instantly", "Pay utility bills and buy airtime", "Mobile data bundle purchases", "Hotel and event ticket booking", "Peer-to-peer money transfers"].map((item) => (
              <View key={item} style={s.checkRow}>
                <View style={[s.checkMark, { backgroundColor: isDark ? "rgba(245,158,11,0.15)" : "#FFF8E1" }]}>
                  <Ionicons name="checkmark" size={13} color="#F59E0B" />
                </View>
                <Text style={[s.checkTxt, { color: C.sub }]}>{item}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* ── AI ────────────────────────────────────────── */}
      <View style={[s.section, { backgroundColor: "#0F0A1E", paddingHorizontal: pH, alignItems: "center" }]}>
        <View style={s.aiIcon}>
          <Ionicons name="sparkles" size={28} color="#8B5CF6" />
        </View>
        <Text style={[s.eyebrowCenter, { color: "#C084FC" }]}>AFUAI ASSISTANT</Text>
        <Text style={[s.h2, { color: "#F9FAFB", textAlign: "center", fontSize: isDesktop ? 40 : 28, maxWidth: 640 }]}>
          {"Your AI co-pilot,\nalways available."}
        </Text>
        <Text style={[s.bodyCtr, { color: "#94A3B8", maxWidth: 560, marginBottom: 28 }]}>
          AfuAI helps you write messages, generate images, discover content, answer questions, and navigate the app — all in natural conversation.
        </Text>
        <View style={{ flexDirection: isTablet ? "row" : "column", flexWrap: "wrap", justifyContent: "center" }}>
          {["Smart Replies", "AI Image Gen", "Voice Transcription", "Content Discovery"].map((f) => (
            <View key={f} style={s.aiChip}>
              <Ionicons name="sparkles-outline" size={14} color="#C084FC" />
              <Text style={s.aiChipTxt}>{f}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* ── STATS ─────────────────────────────────────── */}
      <View style={[s.statsSection, { paddingHorizontal: pH }]}>
        <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center" }}>
          {stats.map((st) => (
            <View key={st.label} style={[s.statItem, { width: isTablet ? "25%" : "50%" }]}>
              <Text style={s.statValue}>{st.value}</Text>
              <Text style={s.statLabel}>{st.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* ── DOWNLOAD ──────────────────────────────────── */}
      <View style={[s.section, { backgroundColor: C.dark2, paddingHorizontal: pH, alignItems: "center" }]}>
        <Text style={[s.eyebrowCenter, { color: C.teal }]}>DOWNLOAD NOW</Text>
        <Text style={[s.h2, { color: "#F9FAFB", textAlign: "center", fontSize: isDesktop ? 44 : 30, marginBottom: 12 }]}>
          Start connecting today.
        </Text>
        <Text style={[s.bodyCtr, { color: "#94A3B8", maxWidth: 480, marginBottom: 32 }]}>
          Download AfuChat free on Android, or open the web app right now — no installation needed.
        </Text>
        <View style={{ flexDirection: isTablet ? "row" : "column", flexWrap: "wrap", justifyContent: "center" }}>
          <TouchableOpacity
            onPress={() => Linking.openURL("https://play.google.com/store/apps/details?id=com.afuchat.app")}
            style={[s.dlBtn, { backgroundColor: C.teal }]}
          >
            <Ionicons name="logo-google-playstore" size={22} color="#FFFFFF" />
            <View style={{ marginLeft: 14 }}>
              <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 11, fontFamily: "Inter_400Regular" }}>Download on</Text>
              <Text style={{ color: "#FFFFFF", fontSize: 16, fontFamily: "Inter_700Bold" }}>Google Play</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => user ? router.replace("/(tabs)") : router.push("/login")}
            style={[s.dlBtn, { backgroundColor: "transparent", borderWidth: 1, borderColor: "#374151" }]}
          >
            <Ionicons name="globe-outline" size={22} color="#FFFFFF" />
            <View style={{ marginLeft: 14 }}>
              <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 11, fontFamily: "Inter_400Regular" }}>Open in</Text>
              <Text style={{ color: "#FFFFFF", fontSize: 16, fontFamily: "Inter_700Bold" }}>Web Browser</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── NEWSLETTER ────────────────────────────────── */}
      <View style={[s.section, { backgroundColor: C.bg2, paddingHorizontal: pH }]}>
        <View style={{ flexDirection: isDesktop ? "row" : "column" }}>
          <View style={{ flex: isDesktop ? 1 : 0, marginBottom: isDesktop ? 0 : 24 }}>
            <Text style={[s.eyebrow, { color: C.teal }]}>STAY IN THE LOOP</Text>
            <Text style={[s.h2, { fontSize: isDesktop ? 32 : 24, marginBottom: 8, color: C.text }]}>Product updates & news.</Text>
            <Text style={[s.body, { color: C.sub }]}>Get the latest from AfuChat — new features, platform news, and insider updates.</Text>
          </View>
          <View style={{ flex: isDesktop ? 1 : 0, paddingLeft: isDesktop ? 48 : 0 }}>
            <View style={s.nlRow}>
              <TextInput
                style={[s.nlInput, { backgroundColor: C.surface, borderColor: C.border, color: C.text }]}
                placeholder="your@email.com"
                placeholderTextColor={C.muted}
                value={subEmail}
                onChangeText={setSubEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                onSubmitEditing={handleSubscribe}
              />
              <TouchableOpacity onPress={handleSubscribe} style={s.nlBtn} disabled={subLoading}>
                {subLoading
                  ? <ActivityIndicator size="small" color="#FFFFFF" />
                  : <Text style={s.nlBtnTxt}>Subscribe</Text>}
              </TouchableOpacity>
            </View>
            {subMsg && (
              <View style={[s.nlMsg, { backgroundColor: subMsg.ok ? "#ECFDF5" : "#FEF2F2", borderColor: subMsg.ok ? "#6EE7B7" : "#FCA5A5" }]}>
                <Ionicons name={subMsg.ok ? "checkmark-circle" : "alert-circle"} size={15} color={subMsg.ok ? "#059669" : "#DC2626"} />
                <Text style={[s.nlMsgTxt, { color: subMsg.ok ? "#065F46" : "#991B1B" }]}>{subMsg.text}</Text>
              </View>
            )}
            <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: C.muted, marginTop: 8 }}>
              No spam · Unsubscribe anytime
            </Text>
          </View>
        </View>
      </View>

      {/* ── FOOTER ────────────────────────────────────── */}
      <View style={[s.footer, { paddingHorizontal: pH }]}>
        <View style={{ flexDirection: isDesktop ? "row" : "column" }}>
          <View style={{ flex: isDesktop ? 1.4 : 0, marginBottom: isDesktop ? 0 : 36 }}>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
              <Text style={{ color: "#FFFFFF", fontSize: 18, fontFamily: "Inter_700Bold" }}>AfuChat</Text>
            </View>
            <Text style={{ color: "#6B7280", fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 22, maxWidth: 300, marginBottom: 8 }}>
              The all-in-one super app — messaging, AI, payments, marketplace, and communities. Built for Africa, made for everyone.
            </Text>
            <Text style={{ color: "#4B5563", fontSize: 13, fontFamily: "Inter_400Regular" }}>Kampala, Uganda</Text>
          </View>

          <View style={{ flex: isDesktop ? 2 : 0, flexDirection: "row", flexWrap: "wrap" }}>
            {footerCols.map((col) => (
              <View key={col.heading} style={{ minWidth: 120, marginRight: 24, marginBottom: 24 }}>
                <Text style={s.footColHead}>{col.heading}</Text>
                {col.links.map((l) => (
                  <TouchableOpacity key={l.label} onPress={l.fn} style={{ marginTop: 8 }}>
                    <Text style={s.footLink}>{l.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ))}
          </View>
        </View>

        <View style={s.footDivider} />

        <View style={{ flexDirection: isTablet ? "row" : "column", alignItems: "center", justifyContent: "space-between" }}>
          <Text style={s.footCopy}>© {new Date().getFullYear()} AfuChat Technologies Limited. All rights reserved.</Text>
          <View style={{ flexDirection: "row", marginTop: isTablet ? 0 : 16 }}>
            {[
              { icon: "logo-twitter",  url: "https://twitter.com/afuchat" },
              { icon: "paper-plane",   url: "https://t.me/afuchat" },
              { icon: "logo-facebook", url: "https://facebook.com/afuchat" },
              { icon: "logo-linkedin", url: "https://linkedin.com/company/afuchat" },
            ].map((soc) => (
              <TouchableOpacity key={soc.icon} onPress={() => Linking.openURL(soc.url)} style={{ marginLeft: 20 }}>
                <Ionicons name={soc.icon as any} size={20} color="#4B5563" />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },

  nav:        { height: 64, flexDirection: "row", alignItems: "center", borderBottomWidth: 1, zIndex: 100 },
  brand:      { flexDirection: "row", alignItems: "center" },
  logoImg:    { width: 32, height: 32, borderRadius: 8 },
  brandText:  { fontSize: 18, fontFamily: "Inter_700Bold", marginLeft: 10 },
  navLinks:   { flex: 1, flexDirection: "row", alignItems: "center", marginLeft: 24 },
  navLink:    { paddingHorizontal: 14, paddingVertical: 8 },
  navLinkTxt: { fontSize: 15, fontFamily: "Inter_500Medium" },
  navRight:   { flexDirection: "row", alignItems: "center", marginLeft: "auto" },
  navCta:     { flexDirection: "row", alignItems: "center", backgroundColor: "#1f95ff", paddingHorizontal: 18, paddingVertical: 9, borderRadius: 10, marginLeft: 8 },
  navCtaTxt:  { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#FFFFFF", marginLeft: 6 },

  hero:         { backgroundColor: "#0A0D14" },
  heroRow:      { alignItems: "center" },
  badgeRow:     { flexDirection: "row", flexWrap: "wrap", marginBottom: 20 },
  pill:         { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(0,188,212,0.12)", borderWidth: 1, borderColor: "rgba(0,188,212,0.25)", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 100, marginRight: 8, marginBottom: 8 },
  pillTxt:      { fontSize: 12, fontFamily: "Inter_500Medium", marginLeft: 5 },
  h1:           { fontFamily: "Inter_700Bold", color: "#F9FAFB", lineHeight: 60, marginBottom: 20 },
  heroSub:      { fontSize: 18, fontFamily: "Inter_400Regular", color: "#94A3B8", lineHeight: 28, marginBottom: 32, maxWidth: 520 },
  ctaRow:       { marginBottom: 20 },
  ctaPrimary:   { flexDirection: "row", alignItems: "center", backgroundColor: "#1f95ff", paddingHorizontal: 28, paddingVertical: 15, borderRadius: 12, marginRight: 12, marginBottom: 12 },
  ctaPrimaryTxt:{ fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#FFFFFF", marginLeft: 8 },
  ctaSecondary: { flexDirection: "row", alignItems: "center", paddingHorizontal: 24, paddingVertical: 15, borderRadius: 12, marginBottom: 12 },
  ctaSecondaryTxt: { fontSize: 16, fontFamily: "Inter_600SemiBold", marginRight: 6 },
  heroPhones:   { flexDirection: "row", alignItems: "flex-end", justifyContent: "center" },

  trustBar:   { paddingVertical: 24, borderBottomWidth: 1 },
  trustRow:   { flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "center" },
  trustItem:  { flexDirection: "row", alignItems: "center", marginHorizontal: 12, marginBottom: 8 },
  trustTxt:   { fontSize: 14, fontFamily: "Inter_500Medium", marginLeft: 8 },

  section:       { paddingVertical: 80 },
  eyebrow:       { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 1.5, marginBottom: 12 },
  eyebrowCenter: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 1.5, marginBottom: 12, textAlign: "center" },
  h2:            { fontFamily: "Inter_700Bold", lineHeight: 44, marginBottom: 12 },
  body:          { fontSize: 17, fontFamily: "Inter_400Regular", lineHeight: 26 },
  bodyCtr:       { fontSize: 17, fontFamily: "Inter_400Regular", lineHeight: 26, textAlign: "center" },

  featureCard: { borderRadius: 16, padding: 24, borderWidth: 1 },
  fIcon:       { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", marginBottom: 10 },
  fTitle:      { fontSize: 16, fontFamily: "Inter_600SemiBold", marginBottom: 6 },
  fDesc:       { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 21 },

  showcaseRow:  { alignItems: "flex-end", justifyContent: "center" },
  showcaseItem: { alignItems: "center", marginHorizontal: 12, marginBottom: 24 },
  showCap:      { fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#F9FAFB", textAlign: "center", marginTop: 16 },
  showSub:      { fontSize: 13, fontFamily: "Inter_400Regular", color: "#6B7280", textAlign: "center", maxWidth: 180, marginTop: 4 },

  detailRow:  { alignItems: "center" },
  checkRow:   { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  checkMark:  { width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center", marginRight: 10 },
  checkTxt:   { fontSize: 15, fontFamily: "Inter_400Regular" },

  aiIcon:    { width: 60, height: 60, borderRadius: 18, backgroundColor: "rgba(139,92,246,0.15)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(139,92,246,0.3)", marginBottom: 16 },
  aiChip:    { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(139,92,246,0.1)", borderWidth: 1, borderColor: "rgba(139,92,246,0.2)", paddingHorizontal: 16, paddingVertical: 10, borderRadius: 100, margin: 6 },
  aiChipTxt: { fontSize: 14, fontFamily: "Inter_500Medium", color: "#C084FC", marginLeft: 8 },

  statsSection: { backgroundColor: "#1f95ff", paddingVertical: 48 },
  statItem:     { alignItems: "center", paddingVertical: 16 },
  statValue:    { fontSize: 36, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  statLabel:    { fontSize: 14, fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.75)", marginTop: 4 },

  dlBtn: { flexDirection: "row", alignItems: "center", paddingHorizontal: 28, paddingVertical: 18, borderRadius: 14, margin: 8 },

  nlRow:   { flexDirection: "row", marginBottom: 10 },
  nlInput: { flex: 1, height: 50, borderWidth: 1, borderRadius: 10, paddingHorizontal: 16, fontSize: 15, fontFamily: "Inter_400Regular" },
  nlBtn:   { backgroundColor: "#1f95ff", paddingHorizontal: 22, borderRadius: 10, alignItems: "center", justifyContent: "center", height: 50, marginLeft: 10 },
  nlBtnTxt:{ fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" },
  nlMsg:   { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 8, marginTop: 4 },
  nlMsgTxt:{ fontSize: 13, fontFamily: "Inter_400Regular", flex: 1, marginLeft: 8 },

  footer:     { backgroundColor: "#111827", paddingTop: 64, paddingBottom: 40 },
  footColHead:{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#FFFFFF", marginBottom: 4 },
  footLink:   { fontSize: 14, fontFamily: "Inter_400Regular", color: "#6B7280" },
  footDivider:{ height: 1, backgroundColor: "#1F2937", marginVertical: 36 },
  footCopy:   { fontSize: 13, fontFamily: "Inter_400Regular", color: "#4B5563" },
});
