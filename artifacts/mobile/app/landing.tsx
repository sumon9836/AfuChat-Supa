/**
 * AfuChat — Web Landing Page
 * Shown to unauthenticated visitors on web before they sign in / register.
 * Mobile (native) visitors are redirected to /welcome instead.
 */
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "@/components/ui/SafeGradient";
import { useAuth } from "@/context/AuthContext";

if (Platform.OS !== "web") {
  // Safety: native builds should never reach this; redirect to welcome
  // (index.tsx already handles this, but guard just in case)
}

const BRAND   = "#1f95ff";
const DARK    = "#050D1A";
const DARK2   = "#0B1627";
const DARK3   = "#0F1E35";
const TEXT    = "#FFFFFF";
const MUTED   = "#8899BB";
const CARD_BG = "#0D1B30";
const BORDER  = "#1A2E4A";
const GOLD    = "#D4A853";

const W = Dimensions.get("window").width;

const FEATURES = [
  {
    icon: "chatbubbles-outline" as const,
    color: BRAND,
    title: "Smart Messaging",
    desc: "Real-time DMs, group chats, voice notes, video calls and disappearing messages — all end-to-end encrypted.",
  },
  {
    icon: "sparkles-outline" as const,
    color: "#AF52DE",
    title: "AI Assistant",
    desc: "Ask anything, translate, summarise or generate content with your personal AI — built right into the chat.",
  },
  {
    icon: "wallet-outline" as const,
    color: "#34C759",
    title: "AfuPay Payments",
    desc: "Send money, pay bills, buy airtime and split expenses with contacts — zero friction peer-to-peer payments.",
  },
  {
    icon: "people-outline" as const,
    color: "#FF9F0A",
    title: "Groups & Channels",
    desc: "Build communities of thousands with rich admin controls, polls, pinned posts and scheduled broadcasts.",
  },
  {
    icon: "play-circle-outline" as const,
    color: "#FF375F",
    title: "Shorts & Stories",
    desc: "Share life moments as vertical short-form videos or 24-hour stories — discover trending creators nearby.",
  },
  {
    icon: "ribbon-outline" as const,
    color: GOLD,
    title: "Prestige & Rewards",
    desc: "Earn XP, unlock grades from Rookie to Legend, collect Nexa coins and unlock Platinum perks.",
  },
];

const STATS = [
  { value: "50K+",  label: "Active Users"   },
  { value: "25+",   label: "Countries"      },
  { value: "1M+",   label: "Messages/Day"   },
  { value: "4.8★",  label: "App Rating"     },
];

function NavBar({ onSignIn, onGetStarted }: { onSignIn: () => void; onGetStarted: () => void }) {
  const [scrolled, setScrolled] = useState(false);

  return (
    <View style={[nav.bar, scrolled && nav.barScrolled]}>
      {/* Logo */}
      <TouchableOpacity onPress={() => {}} activeOpacity={0.8} style={nav.brand}>
        <View style={nav.logoCircle}>
          <Text style={nav.logoLetter}>A</Text>
        </View>
        <Text style={nav.brandName}>AfuChat</Text>
      </TouchableOpacity>

      {/* Nav links — hidden on small screens */}
      <View style={nav.links}>
        {["Features", "Download", "About"].map((l) => (
          <TouchableOpacity key={l} style={nav.link} activeOpacity={0.75}>
            <Text style={nav.linkText}>{l}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* CTAs */}
      <View style={nav.actions}>
        <TouchableOpacity onPress={onSignIn} activeOpacity={0.8} style={nav.signInBtn}>
          <Text style={nav.signInText}>Sign In</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onGetStarted} activeOpacity={0.85} style={nav.getStartedBtn}>
          <Text style={nav.getStartedText}>Get Started</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function HeroSection({ onGetStarted, onDownload }: { onGetStarted: () => void; onDownload: () => void }) {
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 700, useNativeDriver: false }),
      Animated.timing(slideAnim, { toValue: 0, duration: 700, useNativeDriver: false }),
    ]).start();
  }, []);

  return (
    <LinearGradient
      colors={[DARK, DARK2, DARK3]}
      style={hero.wrap}
    >
      {/* Ambient glow orbs */}
      <View style={[hero.orb, hero.orbBlue,  { pointerEvents: "none" }]} />
      <View style={[hero.orb, hero.orbPurple, { pointerEvents: "none" }]} />

      <View style={hero.inner}>
        {/* Left: copy */}
        <Animated.View style={[hero.copy, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <View style={hero.badge}>
            <Ionicons name="flash" size={12} color={BRAND} />
            <Text style={hero.badgeText}>Africa's #1 Super App</Text>
          </View>

          <Text style={hero.headline}>
            {"One App.\nInfinite\nPossibilities."}
          </Text>

          <Text style={hero.sub}>
            AfuChat combines messaging, AI, payments, communities and short-form video into a single seamless experience — built for Africa, loved by the world.
          </Text>

          <View style={hero.btnRow}>
            <TouchableOpacity onPress={onGetStarted} activeOpacity={0.85} style={hero.primaryBtn}>
              <LinearGradient colors={[BRAND, "#0E7EE0"]} style={hero.primaryBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <Text style={hero.primaryBtnText}>Start for Free</Text>
                <Ionicons name="arrow-forward" size={16} color="#fff" style={{ marginLeft: 6 }} />
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity onPress={onDownload} activeOpacity={0.8} style={hero.secondaryBtn}>
              <Ionicons name="download-outline" size={16} color={BRAND} style={{ marginRight: 6 }} />
              <Text style={hero.secondaryBtnText}>Download App</Text>
            </TouchableOpacity>
          </View>

          {/* Store badges */}
          <View style={hero.badgeRow}>
            <TouchableOpacity
              onPress={() => Linking.openURL("https://play.google.com/store/apps/details?id=com.afuapp.afuchat")}
              style={hero.storeBadge}
              activeOpacity={0.8}
            >
              <Ionicons name="logo-google-playstore" size={18} color="#fff" />
              <View style={{ marginLeft: 6 }}>
                <Text style={hero.storeLabel}>GET IT ON</Text>
                <Text style={hero.storeName}>Google Play</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => Linking.openURL("https://apps.apple.com/app/afuchat")}
              style={hero.storeBadge}
              activeOpacity={0.8}
            >
              <Ionicons name="logo-apple" size={20} color="#fff" />
              <View style={{ marginLeft: 6 }}>
                <Text style={hero.storeLabel}>DOWNLOAD ON THE</Text>
                <Text style={hero.storeName}>App Store</Text>
              </View>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Right: phone mockup */}
        <Animated.View style={[hero.mockupWrap, { opacity: fadeAnim }]}>
          <View style={hero.phone}>
            <LinearGradient colors={[DARK2, DARK3]} style={hero.phoneScreen}>
              {/* Chat mockup */}
              <View style={hero.chatHeader}>
                <View style={hero.chatAvatar}><Text style={{ color: "#fff", fontWeight: "700", fontSize: 13 }}>A</Text></View>
                <View>
                  <Text style={hero.chatName}>AfuChat AI</Text>
                  <Text style={hero.chatStatus}>● Online</Text>
                </View>
              </View>
              {[
                { me: false, text: "Good morning! How can I help?" },
                { me: true,  text: "Translate this to French please" },
                { me: false, text: "Bonjour! Bien sûr, envoyez-moi le texte." },
                { me: true,  text: "Amazing! Also send ₦500 to John" },
                { me: false, text: "✓ ₦500 sent to @john instantly!" },
              ].map((m, i) => (
                <View key={i} style={[hero.bubble, m.me ? hero.bubbleMe : hero.bubbleThem]}>
                  <Text style={[hero.bubbleText, { color: m.me ? "#fff" : TEXT }]}>{m.text}</Text>
                </View>
              ))}
            </LinearGradient>
          </View>

          {/* Floating feature pills */}
          <View style={[hero.pill, hero.pillTL]}>
            <Ionicons name="flash"          size={14} color="#FF9F0A" />
            <Text style={hero.pillText}>2,000 Nexa earned!</Text>
          </View>
          <View style={[hero.pill, hero.pillBR]}>
            <Ionicons name="shield-checkmark" size={14} color="#34C759" />
            <Text style={hero.pillText}>End-to-end encrypted</Text>
          </View>
        </Animated.View>
      </View>

      {/* Stats strip */}
      <View style={hero.statsRow}>
        {STATS.map((s, i) => (
          <React.Fragment key={s.label}>
            {i > 0 && <View style={hero.statDivider} />}
            <View style={hero.stat}>
              <Text style={hero.statVal}>{s.value}</Text>
              <Text style={hero.statLabel}>{s.label}</Text>
            </View>
          </React.Fragment>
        ))}
      </View>
    </LinearGradient>
  );
}

function FeaturesSection() {
  return (
    <View style={feat.wrap}>
      <View style={feat.head}>
        <Text style={feat.eyebrow}>EVERYTHING YOU NEED</Text>
        <Text style={feat.title}>One app. Infinite possibilities.</Text>
        <Text style={feat.sub}>AfuChat brings together the tools Africa's connected generation uses every day.</Text>
      </View>

      <View style={feat.grid}>
        {FEATURES.map((f) => (
          <View key={f.title} style={feat.card}>
            <View style={[feat.icon, { backgroundColor: f.color + "20" }]}>
              <Ionicons name={f.icon} size={26} color={f.color} />
            </View>
            <Text style={feat.cardTitle}>{f.title}</Text>
            <Text style={feat.cardDesc}>{f.desc}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function DownloadSection({ onGetStarted }: { onGetStarted: () => void }) {
  return (
    <LinearGradient colors={[DARK2, "#061525"]} style={dl.wrap}>
      <View style={dl.inner}>
        <Ionicons name="phone-portrait-outline" size={40} color={BRAND} />
        <Text style={dl.title}>Start your journey today</Text>
        <Text style={dl.sub}>
          Join 50,000+ users already using AfuChat. Available on Android, iOS and the web.
        </Text>

        <View style={dl.btnRow}>
          <TouchableOpacity
            onPress={() => Linking.openURL("https://play.google.com/store/apps/details?id=com.afuapp.afuchat")}
            style={dl.storeBtn}
            activeOpacity={0.8}
          >
            <Ionicons name="logo-google-playstore" size={20} color="#fff" />
            <View style={{ marginLeft: 8 }}>
              <Text style={dl.storeMeta}>GET IT ON</Text>
              <Text style={dl.storeName}>Google Play</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => Linking.openURL("https://apps.apple.com/app/afuchat")}
            style={dl.storeBtn}
            activeOpacity={0.8}
          >
            <Ionicons name="logo-apple" size={22} color="#fff" />
            <View style={{ marginLeft: 8 }}>
              <Text style={dl.storeMeta}>DOWNLOAD ON THE</Text>
              <Text style={dl.storeName}>App Store</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onGetStarted}
            style={[dl.storeBtn, { backgroundColor: BRAND }]}
            activeOpacity={0.85}
          >
            <Ionicons name="globe-outline" size={20} color="#fff" />
            <View style={{ marginLeft: 8 }}>
              <Text style={dl.storeMeta}>USE FOR FREE IN</Text>
              <Text style={dl.storeName}>Your Browser</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </LinearGradient>
  );
}

function Footer({ onSignIn }: { onSignIn: () => void }) {
  const year = new Date().getFullYear();
  return (
    <View style={foot.wrap}>
      <View style={foot.top}>
        <View style={foot.brand}>
          <View style={nav.logoCircle}>
            <Text style={nav.logoLetter}>A</Text>
          </View>
          <Text style={foot.name}>AfuChat</Text>
        </View>
        <Text style={foot.tagline}>Africa's Super App — Connect. Create. Commerce.</Text>
      </View>

      <View style={foot.links}>
        {[
          ["About",    "/about"],
          ["Features", "/#features"],
          ["Privacy",  "/privacy"],
          ["Terms",    "/terms"],
          ["Contact",  "/support"],
        ].map(([label, href]) => (
          <TouchableOpacity key={label} onPress={() => router.push(href as any)} style={foot.linkBtn}>
            <Text style={foot.link}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={foot.bottom}>
        <Text style={foot.copy}>© {year} AfuChat. All rights reserved.</Text>
        <TouchableOpacity onPress={onSignIn} style={foot.signIn}>
          <Text style={foot.signInText}>Sign In →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function LandingPage() {
  const { session, loading } = useAuth();

  // If user is already signed in, skip the landing page
  useEffect(() => {
    if (!loading && session) {
      router.replace("/(tabs)/chats");
    }
  }, [session, loading]);

  function handleGetStarted() {
    router.push("/(auth)/register");
  }

  function handleSignIn() {
    router.push("/(auth)/login");
  }

  function handleDownload() {
    // Scroll down to download section — for now just open Play Store
    Linking.openURL("https://play.google.com/store/apps/details?id=com.afuapp.afuchat");
  }

  return (
    <View style={root.wrap}>
      <NavBar onSignIn={handleSignIn} onGetStarted={handleGetStarted} />
      <ScrollView
        style={root.scroll}
        contentContainerStyle={root.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <HeroSection onGetStarted={handleGetStarted} onDownload={handleDownload} />
        <FeaturesSection />
        <DownloadSection onGetStarted={handleGetStarted} />
        <Footer onSignIn={handleSignIn} />
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const root = StyleSheet.create({
  wrap:          { flex: 1, backgroundColor: DARK },
  scroll:        { flex: 1 },
  scrollContent: { flexGrow: 1 },
});

const nav = StyleSheet.create({
  bar: {
    position:        "absolute" as any,
    top: 0, left: 0, right: 0,
    zIndex:          100,
    flexDirection:   "row",
    alignItems:      "center",
    justifyContent:  "space-between",
    paddingHorizontal: 32,
    paddingVertical:   14,
    backgroundColor: "transparent",
  },
  barScrolled: {
    backgroundColor: DARK2 + "EE",
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  brand:       { flexDirection: "row", alignItems: "center", gap: 10 },
  logoCircle:  { width: 32, height: 32, borderRadius: 10, backgroundColor: BRAND, alignItems: "center", justifyContent: "center" },
  logoLetter:  { color: "#fff", fontWeight: "800" as any, fontSize: 16 },
  brandName:   { color: TEXT, fontSize: 18, fontWeight: "700" as any },
  links:       { flexDirection: "row", gap: 4 },
  link:        { paddingHorizontal: 12, paddingVertical: 8 },
  linkText:    { color: MUTED, fontSize: 14 },
  actions:     { flexDirection: "row", gap: 8, alignItems: "center" },
  signInBtn:   { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: BORDER },
  signInText:  { color: TEXT, fontSize: 14 },
  getStartedBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, backgroundColor: BRAND },
  getStartedText:{ color: "#fff", fontSize: 14, fontWeight: "600" as any },
});

const hero = StyleSheet.create({
  wrap:        { paddingTop: 80, paddingBottom: 0, overflow: "hidden" as any, minHeight: 680 },
  orb:         { position: "absolute", borderRadius: 999 },
  orbBlue:     { width: 500, height: 500, top: -150, right: -100, backgroundColor: BRAND + "18" },
  orbPurple:   { width: 350, height: 350, bottom: 0,  left: -80,  backgroundColor: "#AF52DE18" },
  inner:       { flexDirection: "row", flexWrap: "wrap" as any, alignItems: "center", justifyContent: "center", paddingHorizontal: 40, paddingVertical: 40, gap: 48 },

  copy:        { flex: 1, minWidth: 280, maxWidth: 520 },
  badge:       { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: BRAND + "18", borderWidth: 1, borderColor: BRAND + "40", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, alignSelf: "flex-start", marginBottom: 20 },
  badgeText:   { color: BRAND, fontSize: 12, fontWeight: "600" as any },

  headline:    { fontSize: 52, fontWeight: "800" as any, color: TEXT, lineHeight: 62, letterSpacing: -1.5, marginBottom: 18 },
  sub:         { fontSize: 16, color: MUTED, lineHeight: 26, marginBottom: 28 },

  btnRow:      { flexDirection: "row", gap: 12, flexWrap: "wrap" as any, marginBottom: 24 },
  primaryBtn:  { borderRadius: 12, overflow: "hidden" as any },
  primaryBtnGrad: { flexDirection: "row", alignItems: "center", paddingHorizontal: 24, paddingVertical: 13 },
  primaryBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" as any },
  secondaryBtn: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 13, borderRadius: 12, borderWidth: 1, borderColor: BRAND + "50" },
  secondaryBtnText: { color: BRAND, fontSize: 15, fontWeight: "600" as any },

  badgeRow:    { flexDirection: "row", gap: 10, flexWrap: "wrap" as any },
  storeBadge:  { flexDirection: "row", alignItems: "center", backgroundColor: "#FFFFFF18", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: "#FFFFFF22" },
  storeLabel:  { color: MUTED, fontSize: 9, letterSpacing: 0.5 },
  storeName:   { color: TEXT, fontSize: 13, fontWeight: "600" as any },

  mockupWrap:  { alignItems: "center", justifyContent: "center", position: "relative" as any },
  phone:       { width: 270, height: 520, borderRadius: 36, overflow: "hidden" as any, borderWidth: 3, borderColor: BORDER, ...Platform.select({ web: { boxShadow: "0 40px 80px rgba(0,0,0,0.6)" } as any, default: {} }) },
  phoneScreen: { flex: 1, padding: 16, gap: 10 },

  chatHeader:  { flexDirection: "row", alignItems: "center", gap: 10, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: BORDER, marginBottom: 4 },
  chatAvatar:  { width: 36, height: 36, borderRadius: 18, backgroundColor: BRAND, alignItems: "center", justifyContent: "center" },
  chatName:    { color: TEXT, fontWeight: "600" as any, fontSize: 14 },
  chatStatus:  { color: "#34C759", fontSize: 11 },

  bubble:      { paddingHorizontal: 11, paddingVertical: 8, borderRadius: 16, maxWidth: "80%" as any },
  bubbleMe:    { backgroundColor: BRAND, alignSelf: "flex-end", borderBottomRightRadius: 4 },
  bubbleThem:  { backgroundColor: DARK3, alignSelf: "flex-start", borderBottomLeftRadius: 4 },
  bubbleText:  { fontSize: 12, lineHeight: 18 },

  pill:        { position: "absolute", flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: DARK2, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderColor: BORDER, ...Platform.select({ web: { boxShadow: "0 8px 24px rgba(0,0,0,0.4)" } as any, default: {} }) },
  pillTL:      { top: 20,  left: -30 },
  pillBR:      { bottom: 80, right: -30 },
  pillText:    { color: TEXT, fontSize: 11, fontWeight: "500" as any },

  statsRow:    { flexDirection: "row", flexWrap: "wrap" as any, justifyContent: "center", backgroundColor: DARK2 + "CC", borderTopWidth: 1, borderTopColor: BORDER, paddingVertical: 24, paddingHorizontal: 20, gap: 0 },
  stat:        { alignItems: "center", paddingHorizontal: 28, paddingVertical: 4 },
  statVal:     { color: TEXT, fontSize: 26, fontWeight: "800" as any },
  statLabel:   { color: MUTED, fontSize: 12, marginTop: 2 },
  statDivider: { width: 1, backgroundColor: BORDER, marginVertical: 4 },
});

const feat = StyleSheet.create({
  wrap:      { backgroundColor: DARK, paddingVertical: 80, paddingHorizontal: 32 },
  head:      { alignItems: "center", marginBottom: 52 },
  eyebrow:   { color: BRAND, fontSize: 12, fontWeight: "700" as any, letterSpacing: 2, marginBottom: 12 },
  title:     { color: TEXT, fontSize: 36, fontWeight: "800" as any, textAlign: "center", marginBottom: 14 },
  sub:       { color: MUTED, fontSize: 16, textAlign: "center", lineHeight: 26, maxWidth: 560 },

  grid:      { flexDirection: "row", flexWrap: "wrap" as any, justifyContent: "center", gap: 20, maxWidth: 1100, alignSelf: "center", width: "100%" as any },
  card:      { backgroundColor: CARD_BG, borderRadius: 20, borderWidth: 1, borderColor: BORDER, padding: 28, width: 320, gap: 12, ...Platform.select({ web: { boxShadow: "0 4px 24px rgba(0,0,0,0.3)" } as any, default: {} }) },
  icon:      { width: 52, height: 52, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  cardTitle: { color: TEXT, fontSize: 17, fontWeight: "700" as any },
  cardDesc:  { color: MUTED, fontSize: 14, lineHeight: 22 },
});

const dl = StyleSheet.create({
  wrap:    { paddingVertical: 80, paddingHorizontal: 32 },
  inner:   { alignItems: "center", gap: 16 },
  title:   { color: TEXT, fontSize: 32, fontWeight: "800" as any, textAlign: "center", marginTop: 12 },
  sub:     { color: MUTED, fontSize: 16, textAlign: "center", lineHeight: 26, maxWidth: 520 },
  btnRow:  { flexDirection: "row", flexWrap: "wrap" as any, justifyContent: "center", gap: 14, marginTop: 16 },
  storeBtn:{ flexDirection: "row", alignItems: "center", backgroundColor: "#1A2E4A", borderRadius: 14, paddingHorizontal: 20, paddingVertical: 14, borderWidth: 1, borderColor: BORDER },
  storeMeta: { color: MUTED, fontSize: 10, letterSpacing: 0.5 },
  storeName: { color: TEXT, fontSize: 14, fontWeight: "700" as any },
});

const foot = StyleSheet.create({
  wrap:     { backgroundColor: "#030C18", paddingVertical: 40, paddingHorizontal: 40, borderTopWidth: 1, borderTopColor: BORDER },
  top:      { flexDirection: "row", flexWrap: "wrap" as any, alignItems: "center", gap: 12, marginBottom: 24 },
  brand:    { flexDirection: "row", alignItems: "center", gap: 8 },
  name:     { color: TEXT, fontSize: 18, fontWeight: "700" as any },
  tagline:  { color: MUTED, fontSize: 13 },
  links:    { flexDirection: "row", flexWrap: "wrap" as any, gap: 4, marginBottom: 20 },
  linkBtn:  { paddingHorizontal: 12, paddingVertical: 6 },
  link:     { color: MUTED, fontSize: 13 },
  bottom:   { flexDirection: "row", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" as any, gap: 12 },
  copy:     { color: MUTED, fontSize: 12 },
  signIn:   {},
  signInText: { color: BRAND, fontSize: 13, fontWeight: "600" as any },
});
