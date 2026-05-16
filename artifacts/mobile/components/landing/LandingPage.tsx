import React, { useState, useRef } from "react";
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
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useAuth } from "@/context/AuthContext";

const SUPABASE_URL      = process.env.EXPO_PUBLIC_SUPABASE_URL      ?? "";
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";

// ─── Color System ──────────────────────────────────────────
const T = {
  teal:       "#00BCD4",
  tealDark:   "#00ACC1",
  tealDeep:   "#00838F",
  tealBg:     "#F0FDFF",
  tealMid:    "#E0F7FA",
  white:      "#FFFFFF",
  black:      "#0D1117",
  gray900:    "#111827",
  gray700:    "#374151",
  gray500:    "#6B7280",
  gray300:    "#D1D5DB",
  gray100:    "#F3F4F6",
  border:     "#E5E7EB",
};

const PLAY_STORE = "https://play.google.com/store/apps/details?id=com.afuchat.app";

// Real app screenshots
const SS_SEARCH   = require("@/assets/screenshots/search.jpg");
const SS_DISCOVER = require("@/assets/screenshots/discover.jpg");
const SS_ME       = require("@/assets/screenshots/me.jpg");
const afuLogo     = require("@/assets/images/afu-symbol.png");

// ─── NAV ───────────────────────────────────────────────────
function Nav({
  isDesktop, scrolled, onLogin, onRegister, onSection,
}: {
  isDesktop: boolean;
  scrolled: boolean;
  onLogin: () => void;
  onRegister: () => void;
  onSection: (id: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  const NAV_LINKS = ["Features", "Screenshots", "Download"];

  return (
    <View style={[nav.bar, scrolled && nav.barScrolled]}>
      <View style={nav.inner}>
        {/* Logo */}
        <TouchableOpacity style={nav.logo} onPress={() => onSection("top")} activeOpacity={0.8}>
          <Image source={afuLogo} style={nav.logoImg} />
          <Text style={nav.logoText}>AfuChat</Text>
        </TouchableOpacity>

        {/* Desktop links */}
        {isDesktop && (
          <View style={nav.links}>
            {NAV_LINKS.map((l) => (
              <TouchableOpacity key={l} onPress={() => onSection(l.toLowerCase())} style={nav.linkBtn}>
                <Text style={nav.linkText}>{l}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* CTA */}
        <View style={nav.ctas}>
          <TouchableOpacity onPress={onLogin} style={nav.signIn}>
            <Text style={nav.signInText}>Sign in</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => Linking.openURL(PLAY_STORE)}
            style={nav.getApp}
          >
            <Ionicons name="logo-google-playstore" size={14} color={T.white} />
            <Text style={nav.getAppText}>Get App</Text>
          </TouchableOpacity>
        </View>

        {/* Mobile hamburger */}
        {!isDesktop && (
          <TouchableOpacity onPress={() => setMenuOpen((p) => !p)} style={nav.hamburger}>
            <Ionicons name={menuOpen ? "close" : "menu"} size={22} color={T.gray900} />
          </TouchableOpacity>
        )}
      </View>

      {/* Mobile dropdown */}
      {!isDesktop && menuOpen && (
        <View style={nav.dropdown}>
          {NAV_LINKS.map((l) => (
            <TouchableOpacity
              key={l}
              onPress={() => { onSection(l.toLowerCase()); setMenuOpen(false); }}
              style={nav.dropItem}
            >
              <Text style={nav.dropText}>{l}</Text>
            </TouchableOpacity>
          ))}
          <View style={nav.dropDivider} />
          <TouchableOpacity onPress={onLogin} style={nav.dropItem}>
            <Text style={nav.dropText}>Sign in</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => Linking.openURL(PLAY_STORE)} style={[nav.dropItem, { backgroundColor: T.teal, borderRadius: 8 }]}>
            <Text style={[nav.dropText, { color: T.white, fontWeight: "700" }]}>Get on Android</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const nav = StyleSheet.create({
  bar: {
    position: "absolute", top: 0, left: 0, right: 0, zIndex: 100,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderBottomWidth: 1, borderBottomColor: "transparent",
  },
  barScrolled: {
    borderBottomColor: T.border,
    backgroundColor: T.white,
  },
  inner: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 24, height: 60,
  },
  logo: { flexDirection: "row", alignItems: "center", gap: 8 },
  logoImg: { width: 28, height: 28, borderRadius: 7 },
  logoText: { fontSize: 17, fontWeight: "700", color: T.gray900, letterSpacing: -0.3 },
  links: { flex: 1, flexDirection: "row", justifyContent: "center", gap: 4 },
  linkBtn: { paddingHorizontal: 14, paddingVertical: 8 },
  linkText: { fontSize: 14, color: T.gray700, fontWeight: "500" },
  ctas: { flexDirection: "row", alignItems: "center", gap: 8, marginLeft: "auto" },
  signIn: { paddingHorizontal: 14, paddingVertical: 7 },
  signInText: { fontSize: 14, color: T.gray700, fontWeight: "500" },
  getApp: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: T.teal, borderRadius: 8,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  getAppText: { fontSize: 13, color: T.white, fontWeight: "600" },
  hamburger: { marginLeft: "auto", padding: 4 },
  dropdown: {
    backgroundColor: T.white, borderTopWidth: 1, borderTopColor: T.border,
    paddingHorizontal: 16, paddingVertical: 12, gap: 4,
  },
  dropItem: { paddingVertical: 10, paddingHorizontal: 8 },
  dropText: { fontSize: 15, color: T.gray900, fontWeight: "500" },
  dropDivider: { height: 1, backgroundColor: T.border, marginVertical: 4 },
});

// ─── BROWSER FRAME (for real screenshots) ─────────────────
function BrowserFrame({ source, style }: { source: any; style?: object }) {
  return (
    <View style={[ss.frame, style]}>
      {/* Browser chrome bar */}
      <View style={ss.chrome}>
        <View style={ss.dots}>
          <View style={[ss.dot, { backgroundColor: "#FF5F57" }]} />
          <View style={[ss.dot, { backgroundColor: "#FFBD2E" }]} />
          <View style={[ss.dot, { backgroundColor: "#28CA41" }]} />
        </View>
        <View style={ss.urlBar}>
          <Ionicons name="lock-closed" size={9} color={T.gray500} />
          <Text style={ss.urlText}>afuchat.com</Text>
        </View>
      </View>
      {/* Screenshot */}
      <Image source={source} style={[ss.img, { opacity: 1 }]} resizeMode="cover" fadeDuration={0} />
    </View>
  );
}

const ss = StyleSheet.create({
  frame: {
    borderRadius: 10, overflow: "hidden",
    borderWidth: 1, borderColor: T.border,
  },
  chrome: {
    height: 32, backgroundColor: T.gray100,
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 10, gap: 0,
    borderBottomWidth: 1, borderBottomColor: T.border,
  },
  dots: { flexDirection: "row", gap: 5, marginRight: 10 },
  dot: { width: 9, height: 9, borderRadius: 5 },
  urlBar: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 4, backgroundColor: T.white, borderRadius: 5,
    paddingHorizontal: 8, paddingVertical: 3, marginRight: 40,
  },
  urlText: { fontSize: 10, color: T.gray500 },
  img: { width: "100%", aspectRatio: 16 / 9 },
});

// ─── STAT CARD ─────────────────────────────────────────────
function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={stl.stat}>
      <Text style={stl.statVal}>{value}</Text>
      <Text style={stl.statLbl}>{label}</Text>
    </View>
  );
}

const stl = StyleSheet.create({
  stat: { alignItems: "center", flex: 1 },
  statVal: { fontSize: 28, fontWeight: "800", color: T.white, letterSpacing: -0.5 },
  statLbl: { fontSize: 13, color: "rgba(255,255,255,0.75)", marginTop: 2, textAlign: "center" },
});

// ─── FEATURE CARD ──────────────────────────────────────────
function FeatureCard({
  icon, title, desc,
}: {
  icon: string; title: string; desc: string;
}) {
  return (
    <View style={fc.card}>
      <View style={fc.iconWrap}>
        <Ionicons name={icon as any} size={20} color={T.teal} />
      </View>
      <Text style={fc.title}>{title}</Text>
      <Text style={fc.desc}>{desc}</Text>
    </View>
  );
}

const fc = StyleSheet.create({
  card: {
    flex: 1, minWidth: 220,
    backgroundColor: T.white, borderRadius: 12,
    padding: 20, borderWidth: 1, borderColor: T.border,
  },
  iconWrap: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: T.tealMid, alignItems: "center", justifyContent: "center",
    marginBottom: 14,
  },
  title: { fontSize: 15, fontWeight: "700", color: T.gray900, marginBottom: 6 },
  desc: { fontSize: 13, color: T.gray500, lineHeight: 20 },
});

const FEATURES = [
  { icon: "chatbubbles-outline",      title: "Real-Time Messaging",       desc: "Instant 1-on-1 and group chats with typing indicators, read receipts and delivery status." },
  { icon: "sparkles-outline",         title: "AfuAI Built-in",            desc: "Every chat has a built-in AI assistant. Ask anything, draft replies, summarise conversations." },
  { icon: "compass-outline",          title: "Discover Feed",             desc: "Follow creators, communities and topics. Posts, videos, articles and more in one feed." },
  { icon: "people-outline",           title: "Groups & Channels",         desc: "Create and manage communities, broadcast channels and group chats at any scale." },
  { icon: "grid-outline",             title: "Mini Programs",             desc: "Built-in marketplace, freelance board, digital events, wallet and more — all inside the app." },
  { icon: "shield-checkmark-outline", title: "Private & Secure",          desc: "Your data stays yours. Full privacy controls, secure media and no third-party data sales." },
];

// ─── FOOTER COLUMN ─────────────────────────────────────────
function FooterCol({ heading, items }: { heading: string; items: { label: string; url?: string; onPress?: () => void }[] }) {
  return (
    <View style={foot.col}>
      <Text style={foot.heading}>{heading}</Text>
      {items.map((item) => (
        <TouchableOpacity
          key={item.label}
          onPress={() => item.onPress ? item.onPress() : item.url ? Linking.openURL(item.url) : null}
          style={{ paddingVertical: 5 }}
        >
          <Text style={foot.link}>{item.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const foot = StyleSheet.create({
  col: { minWidth: 140, flex: 1 },
  heading: { fontSize: 12, fontWeight: "700", color: T.gray500, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 12 },
  link: { fontSize: 14, color: "rgba(255,255,255,0.65)", lineHeight: 22 },
});

// ─── MAIN COMPONENT ────────────────────────────────────────
export default function LandingPage() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 900;
  const isMid = width >= 600;
  const { session } = useAuth();
  const isLoggedIn = !!session;

  const scrollRef = useRef<ScrollView>(null);
  const featRef   = useRef<View>(null);
  const ssRef     = useRef<View>(null);
  const dlRef     = useRef<View>(null);

  const [scrolled, setScrolled] = useState(false);

  // Newsletter state
  const [subEmail,   setSubEmail]   = useState("");
  const [subLoading, setSubLoading] = useState(false);
  const [subMsg,     setSubMsg]     = useState<{ text: string; ok: boolean } | null>(null);


  const goLogin    = () => isLoggedIn ? router.replace("/(tabs)" as any) : router.push("/(auth)/login" as any);
  const goRegister = () => isLoggedIn ? router.replace("/(tabs)/discover" as any) : router.push("/(auth)/register" as any);

  const scrollTo = (ref: React.RefObject<View>) => {
    ref.current?.measure((_, __, ___, ____, _____, pageY) => {
      scrollRef.current?.scrollTo({ y: pageY - 65, animated: true });
    });
  };

  const onSection = (id: string) => {
    if (id === "features")    scrollTo(featRef);
    else if (id === "screenshots") scrollTo(ssRef);
    else if (id === "download")    scrollTo(dlRef);
    else scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  const handleSubscribe = async () => {
    const email = subEmail.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setSubMsg({ text: "Please enter a valid email address.", ok: false });
      return;
    }
    setSubLoading(true);
    setSubMsg(null);
    try {
      const res = await fetch(
        `${SUPABASE_URL}/functions/v1/newsletter-subscribe`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
            "apikey": SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ email, source: "landing_page" }),
        }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Server error");
      setSubMsg({ text: json?.message ?? "Subscribed! Check your inbox.", ok: true });
      setSubEmail("");
    } catch (err: any) {
      setSubMsg({ text: err?.message ?? "Could not subscribe. Please try again.", ok: false });
    } finally {
      setSubLoading(false);
    }
  };

  const maxW = isDesktop ? 1140 : "100%";

  return (
    <View style={{ flex: 1, backgroundColor: T.white }}>
      <Nav
        isDesktop={isDesktop}
        scrolled={scrolled}
        onLogin={goLogin}
        onRegister={goRegister}
        onSection={onSection}
      />

      <ScrollView
        ref={scrollRef}
        style={{ flex: 1, opacity: 1 }}
        contentContainerStyle={{ paddingTop: 60, opacity: 1 }}
        showsVerticalScrollIndicator={false}
        onScroll={(e) => setScrolled(e.nativeEvent.contentOffset.y > 10)}
        scrollEventThrottle={16}
      >

        {/* ── HERO ────────────────────────────────────────── */}
        <View style={[hero.section, isDesktop && hero.sectionDsk]}>
          <View style={{ maxWidth: maxW, width: "100%", alignSelf: "center" }}>
            <View style={[hero.layout, isDesktop && hero.layoutDsk]}>
              {/* Left copy */}
              <View style={[hero.copy, isDesktop && hero.copyDsk]}>
                <View style={hero.badge}>
                  <View style={hero.badgeDot} />
                  <Text style={hero.badgeText}>Available free on Android & Web</Text>
                </View>

                <Text style={[hero.h1, isDesktop && hero.h1Dsk]}>
                  Chat. Discover.{"\n"}Create. Together.
                </Text>

                <Text style={hero.body}>
                  AfuChat is the all-in-one social platform with real-time messaging, an AI assistant, a social feed, communities, payments, and a built-in marketplace.
                </Text>

                <View style={hero.actions}>
                  <TouchableOpacity
                    style={hero.primaryBtn}
                    onPress={() => Linking.openURL(PLAY_STORE)}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="logo-google-playstore" size={17} color={T.white} />
                    <Text style={hero.primaryBtnText}>Get on Android</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={hero.secondaryBtn}
                    onPress={goRegister}
                    activeOpacity={0.85}
                  >
                    <Text style={hero.secondaryBtnText}>Open Web App</Text>
                    <Ionicons name="arrow-forward" size={14} color={T.teal} />
                  </TouchableOpacity>
                </View>

                <Text style={hero.note}>No credit card. No subscription. Always free.</Text>
              </View>

              {/* Right screenshot */}
              <View style={[hero.visual, isDesktop && hero.visualDsk]}>
                <BrowserFrame source={SS_SEARCH} />
              </View>
            </View>
          </View>
        </View>

        {/* ── TRUST BAR ───────────────────────────────────── */}
        <View style={trust.bar}>
          <View style={{ maxWidth: maxW, width: "100%", alignSelf: "center" }}>
            <View style={trust.row}>
              {[
                { icon: "shield-checkmark-outline", text: "Private & Secure" },
                { icon: "flash-outline",            text: "Real-Time Sync" },
                { icon: "globe-outline",            text: "Works Worldwide" },
                { icon: "phone-portrait-outline",   text: "Android & iOS" },
              ].map((item) => (
                <View key={item.text} style={trust.item}>
                  <Ionicons name={item.icon as any} size={15} color={T.teal} />
                  <Text style={trust.text}>{item.text}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* ── FEATURES ────────────────────────────────────── */}
        <View ref={featRef} style={sec.section}>
          <View style={{ maxWidth: maxW, width: "100%", alignSelf: "center", paddingHorizontal: 24 }}>
            <Text style={sec.overline}>Everything in one place</Text>
            <Text style={[sec.title, isDesktop && sec.titleDsk]}>
              One app. Every feature{"\n"}you actually need.
            </Text>
            <Text style={sec.subtitle}>
              No juggling between apps. AfuChat brings messaging, discovery, AI, commerce and payments together in a single, clean experience.
            </Text>

            <View style={[feat.grid, isMid && feat.gridMid]}>
              {FEATURES.map((f) => (
                <FeatureCard key={f.title} {...f} />
              ))}
            </View>
          </View>
        </View>

        {/* ── SCREENSHOTS ─────────────────────────────────── */}
        <View ref={ssRef} style={[sec.section, { backgroundColor: T.tealBg }]}>
          <View style={{ maxWidth: maxW, width: "100%", alignSelf: "center", paddingHorizontal: 24 }}>
            <Text style={sec.overline}>Real app. Real screens.</Text>
            <Text style={[sec.title, isDesktop && sec.titleDsk]}>
              See what you're{"\n"}getting into.
            </Text>

            <View style={[ssc.grid, isDesktop && ssc.gridDsk]}>
              {/* Main large screenshot */}
              <View style={ssc.main}>
                <BrowserFrame source={SS_SEARCH} />
                <View style={ssc.caption}>
                  <Ionicons name="search-outline" size={15} color={T.teal} />
                  <Text style={ssc.captionText}>Explore — Search people, posts, videos, channels, jobs and more</Text>
                </View>
              </View>

              {/* Stacked smaller */}
              <View style={ssc.stack}>
                <BrowserFrame source={SS_DISCOVER} style={{ flex: 1 }} />
                <View style={ssc.caption}>
                  <Ionicons name="compass-outline" size={15} color={T.teal} />
                  <Text style={ssc.captionText}>Discover — Social feed with posts, videos, articles and live trending topics</Text>
                </View>

                <View style={{ height: 16 }} />

                <BrowserFrame source={SS_ME} style={{ flex: 1 }} />
                <View style={ssc.caption}>
                  <Ionicons name="person-outline" size={15} color={T.teal} />
                  <Text style={ssc.captionText}>Profile — Your identity, activity, achievements and settings</Text>
                </View>
              </View>
            </View>

            <View style={ssc.note}>
              <Text style={ssc.noteText}>
                These are real screenshots from the live app — not marketing mockups.
              </Text>
            </View>
          </View>
        </View>

        {/* ── STATS ───────────────────────────────────────── */}
        <View style={stats.section}>
          <View style={{ maxWidth: maxW, width: "100%", alignSelf: "center", paddingHorizontal: 24 }}>
            <View style={[stats.row, isDesktop && stats.rowDsk]}>
              <Stat value="Free"         label="No subscription ever" />
              <View style={stats.divider} />
              <Stat value="AfuAI"        label="Built-in AI assistant" />
              <View style={stats.divider} />
              <Stat value="Android + Web" label="True cross-platform" />
              <View style={stats.divider} />
              <Stat value="Worldwide"    label="No country limits" />
            </View>
          </View>
        </View>

        {/* ── DOWNLOAD CTA ────────────────────────────────── */}
        <View ref={dlRef} style={dl.section}>
          <View style={{ maxWidth: 640, width: "100%", alignSelf: "center", paddingHorizontal: 24, alignItems: "center" }}>
            <View style={dl.iconWrap}>
              <Image source={afuLogo} style={dl.icon} />
            </View>
            <Text style={[dl.title, isDesktop && dl.titleDsk]}>Ready to get started?</Text>
            <Text style={dl.body}>
              Download AfuChat on Android or open the web app instantly — no account required to browse.
            </Text>
            <View style={dl.btns}>
              <TouchableOpacity
                style={dl.primary}
                onPress={() => Linking.openURL(PLAY_STORE)}
                activeOpacity={0.85}
              >
                <Ionicons name="logo-google-playstore" size={18} color={T.white} />
                <View>
                  <Text style={dl.primarySub}>Get it on</Text>
                  <Text style={dl.primaryMain}>Google Play</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={dl.secondary}
                onPress={goRegister}
                activeOpacity={0.85}
              >
                <Ionicons name="globe-outline" size={18} color={T.teal} />
                <View>
                  <Text style={dl.secondarySub}>Launch in</Text>
                  <Text style={dl.secondaryMain}>Web Browser</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* ── NEWSLETTER ──────────────────────────────────── */}
        <View style={nl.section}>
          <View style={{ maxWidth: 560, width: "100%", alignSelf: "center", paddingHorizontal: 24, alignItems: "center" }}>
            <Text style={nl.title}>Stay in the loop</Text>
            <Text style={nl.body}>
              New features, announcements and tips — delivered to your inbox. No spam, ever.
            </Text>

            <View style={[nl.row, !isMid && nl.rowStack]}>
              <TextInput
                style={nl.input}
                value={subEmail}
                onChangeText={setSubEmail}
                placeholder="your@email.com"
                placeholderTextColor={T.gray300}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                onSubmitEditing={handleSubscribe}
              />
              <TouchableOpacity
                style={nl.btn}
                onPress={handleSubscribe}
                disabled={subLoading}
                activeOpacity={0.85}
              >
                {subLoading
                  ? <ActivityIndicator size="small" color={T.white} />
                  : <Text style={nl.btnText}>Subscribe</Text>
                }
              </TouchableOpacity>
            </View>

            {subMsg && (
              <View style={[nl.msg, subMsg.ok ? nl.msgOk : nl.msgErr]}>
                <Ionicons
                  name={subMsg.ok ? "checkmark-circle-outline" : "alert-circle-outline"}
                  size={14}
                  color={subMsg.ok ? "#065F46" : "#991B1B"}
                />
                <Text style={[nl.msgText, subMsg.ok ? nl.msgOkText : nl.msgErrText]}>
                  {subMsg.text}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* ── FOOTER ──────────────────────────────────────── */}
        <View style={ftr.section}>
          <View style={{ maxWidth: maxW, width: "100%", alignSelf: "center", paddingHorizontal: 24 }}>
            <View style={[ftr.top, isDesktop && ftr.topDsk]}>
              {/* Brand */}
              <View style={ftr.brand}>
                <View style={ftr.brandLogo}>
                  <Image source={afuLogo} style={ftr.brandImg} />
                  <Text style={ftr.brandName}>AfuChat</Text>
                </View>
                <Text style={ftr.brandDesc}>
                  The all-in-one social super app. Chat, discover, create and transact — all in one place.
                </Text>
                <Text style={ftr.brandLoc}>
                  <Ionicons name="location-outline" size={12} color="rgba(255,255,255,0.4)" />
                  {" "}Entebbe, Uganda
                </Text>
              </View>

              {/* Link columns */}
              <View style={[ftr.cols, isDesktop && ftr.colsDsk]}>
                <FooterCol
                  heading="Product"
                  items={[
                    { label: "Discover Feed",   onPress: goRegister },
                    { label: "Messaging",        onPress: goRegister },
                    { label: "AfuAI Assistant",  onPress: goRegister },
                    { label: "Groups & Channels",onPress: goRegister },
                    { label: "Marketplace",      onPress: goRegister },
                  ]}
                />
                <FooterCol
                  heading="Company"
                  items={[
                    { label: "About",    onPress: () => router.push("/about" as any) },
                    { label: "Blog",     url: "https://afuchat.com/blog" },
                    { label: "Careers",  url: "https://afuchat.com/careers" },
                    { label: "Contact",  url: "mailto:hello@afuchat.com" },
                  ]}
                />
                <FooterCol
                  heading="Legal"
                  items={[
                    { label: "Privacy Policy",   onPress: () => router.push("/terms" as any) },
                    { label: "Terms of Service", onPress: () => router.push("/terms" as any) },
                  ]}
                />
              </View>
            </View>

            <View style={ftr.bottom}>
              <Text style={ftr.copy}>
                © {new Date().getFullYear()} AfuChat Technologies Limited. All rights reserved.
              </Text>
              <View style={ftr.socials}>
                {[
                  { icon: "logo-twitter",   url: "https://twitter.com/afuchat" },
                  { icon: "logo-instagram", url: "https://instagram.com/afuchat" },
                  { icon: "logo-youtube",   url: "https://youtube.com/@afuchat" },
                ].map((s) => (
                  <TouchableOpacity key={s.icon} onPress={() => Linking.openURL(s.url)} style={ftr.socialBtn}>
                    <Ionicons name={s.icon as any} size={16} color="rgba(255,255,255,0.5)" />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </View>

      </ScrollView>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────

const hero = StyleSheet.create({
  section: {
    paddingHorizontal: 24, paddingTop: 64, paddingBottom: 56,
    backgroundColor: T.white,
  },
  sectionDsk: { paddingTop: 88, paddingBottom: 72 },
  layout: { gap: 40 },
  layoutDsk: { flexDirection: "row", alignItems: "center", gap: 64 },
  copy: { gap: 0 },
  copyDsk: { flex: 1, maxWidth: 500 },
  badge: {
    flexDirection: "row", alignItems: "center", gap: 7,
    backgroundColor: T.tealMid, borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 5,
    alignSelf: "flex-start", marginBottom: 20,
  },
  badgeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: T.teal },
  badgeText: { fontSize: 12, color: T.tealDeep, fontWeight: "600" },
  h1: {
    fontSize: 38, fontWeight: "800", color: T.gray900,
    lineHeight: 46, letterSpacing: -1.2, marginBottom: 16,
  },
  h1Dsk: { fontSize: 52, lineHeight: 62 },
  body: {
    fontSize: 16, color: T.gray500, lineHeight: 26,
    marginBottom: 28,
  },
  actions: { flexDirection: "row", gap: 12, flexWrap: "wrap", marginBottom: 16 },
  primaryBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: T.teal, borderRadius: 10,
    paddingHorizontal: 22, paddingVertical: 13,
  },
  primaryBtnText: { fontSize: 15, color: T.white, fontWeight: "700" },
  secondaryBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    borderRadius: 10, borderWidth: 1.5, borderColor: T.border,
    paddingHorizontal: 22, paddingVertical: 13,
  },
  secondaryBtnText: { fontSize: 15, color: T.gray900, fontWeight: "600" },
  note: { fontSize: 12, color: T.gray300 },
  visual: { borderRadius: 12, overflow: "hidden" },
  visualDsk: { flex: 1.1 },
});

const trust = StyleSheet.create({
  bar: { borderTopWidth: 1, borderBottomWidth: 1, borderColor: T.border, paddingVertical: 14, paddingHorizontal: 24 },
  row: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 24, alignSelf: "center" },
  item: { flexDirection: "row", alignItems: "center", gap: 6 },
  text: { fontSize: 13, color: T.gray700, fontWeight: "500" },
});

const sec = StyleSheet.create({
  section: { paddingHorizontal: 0, paddingVertical: 72 },
  overline: { fontSize: 12, fontWeight: "700", color: T.teal, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 },
  title: { fontSize: 30, fontWeight: "800", color: T.gray900, lineHeight: 38, letterSpacing: -0.6, marginBottom: 12 },
  titleDsk: { fontSize: 38, lineHeight: 48 },
  subtitle: { fontSize: 16, color: T.gray500, lineHeight: 26, marginBottom: 40, maxWidth: 540 },
});

const feat = StyleSheet.create({
  grid: { flexDirection: "column", gap: 12 },
  gridMid: { flexDirection: "row", flexWrap: "wrap" },
});

const ssc = StyleSheet.create({
  grid: { gap: 20 },
  gridDsk: { flexDirection: "row", gap: 24 },
  main: { flex: 1.5, gap: 0 },
  stack: { flex: 1 },
  caption: {
    flexDirection: "row", alignItems: "flex-start", gap: 6,
    paddingTop: 10, paddingBottom: 4,
  },
  captionText: { fontSize: 12, color: T.gray500, flex: 1, lineHeight: 18 },
  note: {
    marginTop: 24, paddingVertical: 12, paddingHorizontal: 16,
    backgroundColor: T.tealMid, borderRadius: 8,
    borderLeftWidth: 3, borderLeftColor: T.teal,
  },
  noteText: { fontSize: 13, color: T.tealDeep, lineHeight: 19 },
});

const stats = StyleSheet.create({
  section: { backgroundColor: T.teal, paddingVertical: 52, paddingHorizontal: 24 },
  row: { flexDirection: "column", gap: 32, alignItems: "center" },
  rowDsk: { flexDirection: "row", gap: 0, alignItems: "stretch" },
  divider: { width: 1, backgroundColor: "rgba(255,255,255,0.2)", marginHorizontal: 0 },
});

const dl = StyleSheet.create({
  section: { paddingVertical: 80, paddingHorizontal: 24, backgroundColor: T.white },
  iconWrap: { marginBottom: 16 },
  icon: { width: 56, height: 56, borderRadius: 14 },
  title: { fontSize: 28, fontWeight: "800", color: T.gray900, letterSpacing: -0.6, marginBottom: 10, textAlign: "center" },
  titleDsk: { fontSize: 36 },
  body: { fontSize: 15, color: T.gray500, lineHeight: 24, textAlign: "center", marginBottom: 32 },
  btns: { flexDirection: "row", gap: 12, flexWrap: "wrap", justifyContent: "center" },
  primary: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: T.black, borderRadius: 12,
    paddingHorizontal: 20, paddingVertical: 12,
  },
  primarySub: { fontSize: 10, color: "rgba(255,255,255,0.6)", lineHeight: 14 },
  primaryMain: { fontSize: 16, color: T.white, fontWeight: "700", lineHeight: 20 },
  secondary: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: T.white, borderRadius: 12, borderWidth: 1.5, borderColor: T.border,
    paddingHorizontal: 20, paddingVertical: 12,
  },
  secondarySub: { fontSize: 10, color: T.gray500, lineHeight: 14 },
  secondaryMain: { fontSize: 16, color: T.gray900, fontWeight: "700", lineHeight: 20 },
});

const nl = StyleSheet.create({
  section: { paddingVertical: 72, paddingHorizontal: 24, backgroundColor: T.gray100 },
  title: { fontSize: 24, fontWeight: "800", color: T.gray900, marginBottom: 8, textAlign: "center", letterSpacing: -0.4 },
  body: { fontSize: 14, color: T.gray500, lineHeight: 22, textAlign: "center", marginBottom: 24 },
  row: { flexDirection: "row", width: "100%", gap: 0 },
  rowStack: { flexDirection: "column", gap: 10 },
  input: {
    flex: 1, height: 46,
    borderWidth: 1.5, borderColor: T.border, borderTopLeftRadius: 10, borderBottomLeftRadius: 10,
    paddingHorizontal: 16, fontSize: 14, color: T.gray900,
    backgroundColor: T.white,
  },
  btn: {
    height: 46, paddingHorizontal: 20, alignItems: "center", justifyContent: "center",
    backgroundColor: T.teal, borderTopRightRadius: 10, borderBottomRightRadius: 10,
  },
  btnText: { fontSize: 14, color: T.white, fontWeight: "700" },
  msg: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10, padding: 10, borderRadius: 8 },
  msgOk: { backgroundColor: "#D1FAE5" },
  msgErr: { backgroundColor: "#FEE2E2" },
  msgText: { fontSize: 13 },
  msgOkText: { color: "#065F46" },
  msgErrText: { color: "#991B1B" },
});

const ftr = StyleSheet.create({
  section: { backgroundColor: T.black, paddingTop: 56, paddingBottom: 32 },
  top: { gap: 40, paddingHorizontal: 0, marginBottom: 40 },
  topDsk: { flexDirection: "row", gap: 80 },
  brand: { gap: 10, maxWidth: 280 },
  brandLogo: { flexDirection: "row", alignItems: "center", gap: 8 },
  brandImg: { width: 28, height: 28, borderRadius: 7 },
  brandName: { fontSize: 16, fontWeight: "700", color: T.white },
  brandDesc: { fontSize: 13, color: "rgba(255,255,255,0.5)", lineHeight: 20 },
  brandLoc: { fontSize: 12, color: "rgba(255,255,255,0.35)" },
  cols: { flexDirection: "row", flexWrap: "wrap", gap: 32, flex: 1 },
  colsDsk: { justifyContent: "flex-end" },
  bottom: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.08)",
    paddingTop: 24, flexWrap: "wrap", gap: 12,
  },
  copy: { fontSize: 12, color: "rgba(255,255,255,0.35)" },
  socials: { flexDirection: "row", gap: 4 },
  socialBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
});
