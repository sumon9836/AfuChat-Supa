import React, { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/hooks/useTheme";

// Lazy-load illustrations — avoids react-native-reanimated NPE crash in Android Expo Go dev.
// In production APK builds (__DEV__ === false) reanimated initialises correctly.
const _Memphis = (() => {
  if (Platform.OS === "android" && __DEV__) return null;
  return require("@/components/ui/MemphisIllustrations");
})();
const ChatIllustration      = (_Memphis?.ChatIllustration      ?? (() => null)) as React.ComponentType<{ size?: number }>;
const SecurityIllustration  = (_Memphis?.SecurityIllustration  ?? (() => null)) as React.ComponentType<{ size?: number }>;
const DiscoverIllustration  = (_Memphis?.DiscoverIllustration  ?? (() => null)) as React.ComponentType<{ size?: number }>;
const AfuAIIllustration     = (_Memphis?.AfuAIIllustration     ?? (() => null)) as React.ComponentType<{ size?: number }>;
const WalletIllustration    = (_Memphis?.WalletIllustration    ?? (() => null)) as React.ComponentType<{ size?: number }>;
const CommunityIllustration = (_Memphis?.CommunityIllustration ?? (() => null)) as React.ComponentType<{ size?: number }>;

const USE_ND = Platform.OS !== "web";
const TEAL = "#00BCD4";

const FEATURES = [
  {
    Illustration: ChatIllustration,
    accentColor: TEAL,
    bgTint: TEAL + "14",
    title: "Messaging",
    desc: "End-to-end encrypted real-time chats, voice notes, file sharing, and unlimited group conversations.",
    items: ["Private & group chats", "Voice & video calls", "Voice notes & reactions", "Typing indicators & read receipts"],
  },
  {
    Illustration: SecurityIllustration,
    accentColor: "#5C6BC0",
    bgTint: "#5C6BC014",
    title: "Privacy & Security",
    desc: "Military-grade encryption on every message. Your conversations are yours alone.",
    items: ["End-to-end encryption", "Per-chat notification muting", "Two-factor authentication", "Digital ID verification"],
  },
  {
    Illustration: DiscoverIllustration,
    accentColor: "#26A69A",
    bgTint: "#26A69A14",
    title: "Discover",
    desc: "A personalised feed of posts, articles, and short videos curated around your interests.",
    items: ["Interest-based content feed", "Short-form video (Shorts)", "Communities & channels", "Creator profiles & articles"],
  },
  {
    Illustration: AfuAIIllustration,
    accentColor: "#AB47BC",
    bgTint: "#AB47BC14",
    title: "AfuAI Assistant",
    desc: "Your always-on AI — ask questions, draft messages, generate images, and get smart suggestions.",
    items: ["Smart chat replies", "Long-thread summarisation", "AI image generation (Premium)", "Voice message transcription"],
  },
  {
    Illustration: WalletIllustration,
    accentColor: "#FF7043",
    bgTint: "#FF704314",
    title: "AfuPay & ACoins",
    desc: "Send money, earn coins through activity, and unlock premium features — all in one wallet.",
    items: ["Send & receive money", "Daily ACoins check-in", "Premium feature unlock", "Referral rewards"],
  },
  {
    Illustration: CommunityIllustration,
    accentColor: TEAL,
    bgTint: TEAL + "14",
    title: "Community",
    desc: "Join or create communities, follow channels, and connect with like-minded people globally.",
    items: ["Public & private groups", "Broadcast channels", "AfuMatch (social discovery)", "Global leaderboards & achievements"],
  },
] as const;

function FeatureCard({
  feature,
  index,
  enterAnim,
}: {
  feature: (typeof FEATURES)[number];
  index: number;
  enterAnim: Animated.Value;
}) {
  const { colors, isDark } = useTheme();
  const fromLeft = index % 2 === 0;

  return (
    <Animated.View
      style={[
        styles.card,
        {
          backgroundColor: isDark ? "#141414" : colors.surface,
          borderColor: isDark ? "#242424" : "#EBEBEB",
          opacity: enterAnim,
          transform: [
            {
              translateX: enterAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [fromLeft ? -28 : 28, 0],
              }),
            },
          ],
        },
      ]}
    >
      {/* Illustration strip */}
      <View style={[styles.cardStrip, { backgroundColor: feature.bgTint }]}>
        <feature.Illustration size={112} />
        <View style={[styles.stripAccent, { backgroundColor: feature.accentColor }]} />
      </View>

      {/* Content */}
      <View style={styles.cardBody}>
        <View style={styles.cardTitleRow}>
          <View style={[styles.titleDot, { backgroundColor: feature.accentColor }]} />
          <Text style={[styles.cardTitle, { color: colors.text }]}>{feature.title}</Text>
        </View>
        <Text style={[styles.cardDesc, { color: colors.textMuted }]}>{feature.desc}</Text>
        <View style={styles.cardItems}>
          {feature.items.map((item, i) => (
            <View key={i} style={styles.itemRow}>
              <Ionicons name="checkmark-circle" size={15} color={feature.accentColor} />
              <Text style={[styles.itemText, { color: colors.textMuted }]}>{item}</Text>
            </View>
          ))}
        </View>
      </View>
    </Animated.View>
  );
}

export default function FeaturesScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();

  const cardAnims = useRef(FEATURES.map(() => new Animated.Value(0))).current;
  const heroAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(heroAnim, {
      toValue: 1,
      duration: 360,
      easing: Easing.out(Easing.quad),
      useNativeDriver: USE_ND,
    }).start();

    Animated.sequence([
      Animated.delay(240),
      Animated.stagger(
        75,
        cardAnims.map((anim) =>
          Animated.spring(anim, {
            toValue: 1,
            tension: 68,
            friction: 12,
            useNativeDriver: USE_ND,
          })
        )
      ),
    ]).start();
  }, []);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 8,
            backgroundColor: colors.background,
            borderBottomColor: isDark ? "#242424" : "#EBEBEB",
          },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Features Guide</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 36 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <Animated.View
          style={{
            opacity: heroAnim,
            transform: [
              { translateY: heroAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) },
            ],
          }}
        >
          <View style={styles.hero}>
            <View style={styles.heroBadge}>
              <View style={[styles.heroBadgeDot, { backgroundColor: TEAL }]} />
              <Text style={[styles.heroBadgeText, { color: TEAL }]}>50+ Features</Text>
            </View>
            <Text style={[styles.heroTitle, { color: colors.text }]}>
              Everything you need,{"\n"}
              <Text style={{ color: TEAL }}>all in one app</Text>
            </Text>
            <Text style={[styles.heroSub, { color: colors.textMuted }]}>
              AfuChat replaces a dozen apps with one beautiful, fast experience built for everyone.
            </Text>
          </View>
        </Animated.View>

        {/* Cards */}
        <View style={styles.cardList}>
          {FEATURES.map((feature, index) => (
            <FeatureCard
              key={feature.title}
              feature={feature}
              index={index}
              enterAnim={cardAnims[index]}
            />
          ))}
        </View>

        {/* Bottom CTA */}
        <Animated.View style={[styles.ctaBox, { opacity: heroAnim }]}>
          <Text style={[styles.ctaTitle, { color: colors.text }]}>Ready to explore?</Text>
          <Text style={[styles.ctaSub, { color: colors.textMuted }]}>
            All core features are free forever. Optional Premium unlocks AI tools, verified badge & more.
          </Text>
          <Pressable
            style={({ pressed }) => [
              styles.ctaBtn,
              pressed && { opacity: 0.84, transform: [{ scale: 0.97 }] },
            ]}
            onPress={() => router.replace("/(tabs)/chats" as any)}
          >
            <Ionicons name="rocket-outline" size={17} color="#000" />
            <Text style={styles.ctaBtnText}>Start for Free</Text>
          </Pressable>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
    width: 40, height: 40,
    alignItems: "center", justifyContent: "center",
    borderRadius: 20,
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.3,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 24,
    gap: 14,
  },
  hero: {
    alignItems: "center",
    paddingHorizontal: 8,
    paddingBottom: 4,
  },
  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: TEAL + "15",
    marginBottom: 14,
  },
  heroBadgeDot: { width: 6, height: 6, borderRadius: 3 },
  heroBadgeText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.3,
  },
  heroTitle: {
    fontSize: 27,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
    lineHeight: 37,
    marginBottom: 10,
    letterSpacing: -0.4,
  },
  heroSub: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 310,
  },
  cardList: { gap: 14 },
  card: {
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
    ...Platform.select({
      web: { boxShadow: "0 2px 10px rgba(0,0,0,0.07)" } as any,
      default: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.07,
        shadowRadius: 8,
        elevation: 3,
      },
    }),
  },
  cardStrip: {
    height: 148,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  stripAccent: {
    position: "absolute",
    bottom: 0, left: 0, right: 0,
    height: 3,
  },
  cardBody: {
    padding: 18,
    gap: 7,
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  titleDot: {
    width: 8, height: 8, borderRadius: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.3,
  },
  cardDesc: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
  },
  cardItems: { gap: 8, marginTop: 4 },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  itemText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    lineHeight: 19,
    flex: 1,
  },
  ctaBox: {
    alignItems: "center",
    paddingVertical: 32,
    paddingHorizontal: 20,
    marginTop: 8,
  },
  ctaTitle: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
    marginBottom: 10,
  },
  ctaSub: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 21,
    marginBottom: 22,
    maxWidth: 310,
  },
  ctaBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: TEAL,
    paddingVertical: 14,
    paddingHorizontal: 36,
    borderRadius: 28,
    ...Platform.select({
      web: { boxShadow: "0 4px 14px rgba(0,188,212,0.38)" } as any,
      default: {
        shadowColor: TEAL,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.36,
        shadowRadius: 12,
        elevation: 7,
      },
    }),
  },
  ctaBtnText: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: "#000",
  },
});
