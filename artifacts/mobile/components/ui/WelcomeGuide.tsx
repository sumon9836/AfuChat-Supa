/**
 * WelcomeGuide — full-screen animated onboarding carousel.
 * Native ONLY (returns null on web). Shows once before the user logs in.
 * Persists "seen" state in AsyncStorage under WELCOME_GUIDE_KEY.
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { LinearGradient } from "@/components/ui/SafeGradient";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SLIDE_ILLUSTRATIONS } from "@/components/ui/MemphisIllustrations";

// ── Constants ─────────────────────────────────────────────────────────────────
export const WELCOME_GUIDE_KEY = "afu_welcome_guide_v2_seen";
const USE_ND = true; // always native driver on native (this file is native-only)
const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

// ── Slide data ────────────────────────────────────────────────────────────────
type SlideItem = {
  id: string;
  gradient: readonly [string, string, ...string[]];
  accentColor: string;
  title: string;
  subtitle: string;
  features: string[];
  isLast?: boolean;
};

const SLIDES: SlideItem[] = [
  {
    id: "welcome",
    gradient: ["#00BCD4", "#00838F", "#006064"],
    accentColor: "#B2EBF2",
    title: "Welcome to AfuChat",
    subtitle: "The social platform built for real, meaningful conversations.",
    features: ["Chat, post & discover content", "Connect with people worldwide", "Earn rewards as you engage"],
  },
  {
    id: "chat",
    gradient: ["#5C6BC0", "#3949AB", "#283593"],
    accentColor: "#C5CAE9",
    title: "Private & Secure Chats",
    subtitle: "Message anyone with confidence — your conversations stay yours.",
    features: ["Send voice notes instantly", "Share photos, videos & files", "Group chats & communities"],
  },
  {
    id: "discover",
    gradient: ["#26A69A", "#00897B", "#004D40"],
    accentColor: "#B2DFDB",
    title: "Discover Your World",
    subtitle: "A personalised feed of articles, videos, and stories you'll love.",
    features: ["Read articles from top creators", "Watch short-form videos", "Follow topics you care about"],
  },
  {
    id: "afuai",
    gradient: ["#AB47BC", "#8E24AA", "#4A148C"],
    accentColor: "#E1BEE7",
    title: "Meet AfuAI",
    subtitle: "Your always-on intelligent assistant, ready when you need it.",
    features: ["Ask questions, get smart answers", "Summarise long threads instantly", "Generate posts & captions"],
  },
  {
    id: "wallet",
    gradient: ["#FF7043", "#E64A19", "#BF360C"],
    accentColor: "#FFCCBC",
    title: "Earn ACoins Daily",
    subtitle: "Your activity on AfuChat earns you real in-app rewards.",
    features: ["Daily check-in for ACoins", "Unlock premium features", "Send & receive between friends"],
  },
  {
    id: "community",
    gradient: ["#00BCD4", "#0097A7", "#006064"],
    accentColor: "#B2EBF2",
    title: "Join the Family",
    subtitle: "A growing community of creators, learners, and connectors.",
    features: ["Public & private groups", "Follow broadcast channels", "Global leaderboards & badges"],
    isLast: true,
  },
];

// ── Individual animated slide ─────────────────────────────────────────────────
function AnimatedSlide({
  item,
  isActive,
  slideIndex,
  onGoNext,
  onSkip,
  currentIndex,
  total,
  insets,
}: {
  item: SlideItem;
  isActive: boolean;
  slideIndex: number;
  onGoNext: () => void;
  onSkip: () => void;
  currentIndex: number;
  total: number;
  insets: { top: number; bottom: number };
}) {
  const IllustrationComp = SLIDE_ILLUSTRATIONS[slideIndex % SLIDE_ILLUSTRATIONS.length];

  const illOpacity   = useRef(new Animated.Value(0)).current;
  const illScale     = useRef(new Animated.Value(0.6)).current;
  const illBobY      = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleY       = useRef(new Animated.Value(24)).current;
  const subOpacity   = useRef(new Animated.Value(0)).current;
  const f0Opacity    = useRef(new Animated.Value(0)).current;
  const f0X          = useRef(new Animated.Value(-22)).current;
  const f1Opacity    = useRef(new Animated.Value(0)).current;
  const f1X          = useRef(new Animated.Value(-22)).current;
  const f2Opacity    = useRef(new Animated.Value(0)).current;
  const f2X          = useRef(new Animated.Value(-22)).current;

  const entranceRef  = useRef<Animated.CompositeAnimation | null>(null);
  const bobRef       = useRef<Animated.CompositeAnimation | null>(null);
  const bobTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopAll = useCallback(() => {
    entranceRef.current?.stop();
    bobRef.current?.stop();
    if (bobTimerRef.current) clearTimeout(bobTimerRef.current);
  }, []);

  useEffect(() => {
    if (!isActive) { stopAll(); return; }

    illOpacity.setValue(0);
    illScale.setValue(0.6);
    illBobY.setValue(0);
    titleOpacity.setValue(0);
    titleY.setValue(24);
    subOpacity.setValue(0);
    f0Opacity.setValue(0); f0X.setValue(-22);
    f1Opacity.setValue(0); f1X.setValue(-22);
    f2Opacity.setValue(0); f2X.setValue(-22);

    entranceRef.current = Animated.parallel([
      Animated.spring(illScale, { toValue: 1, tension: 52, friction: 8, useNativeDriver: USE_ND }),
      Animated.timing(illOpacity, { toValue: 1, duration: 330, easing: Easing.out(Easing.quad), useNativeDriver: USE_ND }),
      Animated.sequence([
        Animated.delay(160),
        Animated.parallel([
          Animated.spring(titleY, { toValue: 0, tension: 62, friction: 11, useNativeDriver: USE_ND }),
          Animated.timing(titleOpacity, { toValue: 1, duration: 300, useNativeDriver: USE_ND }),
        ]),
      ]),
      Animated.sequence([
        Animated.delay(280),
        Animated.timing(subOpacity, { toValue: 1, duration: 280, useNativeDriver: USE_ND }),
      ]),
      Animated.sequence([
        Animated.delay(400),
        Animated.stagger(110, [
          Animated.parallel([
            Animated.timing(f0Opacity, { toValue: 1, duration: 240, useNativeDriver: USE_ND }),
            Animated.spring(f0X, { toValue: 0, tension: 88, friction: 11, useNativeDriver: USE_ND }),
          ]),
          Animated.parallel([
            Animated.timing(f1Opacity, { toValue: 1, duration: 240, useNativeDriver: USE_ND }),
            Animated.spring(f1X, { toValue: 0, tension: 88, friction: 11, useNativeDriver: USE_ND }),
          ]),
          Animated.parallel([
            Animated.timing(f2Opacity, { toValue: 1, duration: 240, useNativeDriver: USE_ND }),
            Animated.spring(f2X, { toValue: 0, tension: 88, friction: 11, useNativeDriver: USE_ND }),
          ]),
        ]),
      ]),
    ]);
    entranceRef.current.start();

    bobTimerRef.current = setTimeout(() => {
      bobRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(illBobY, { toValue: -10, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: USE_ND }),
          Animated.timing(illBobY, { toValue: 0, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: USE_ND }),
        ])
      );
      bobRef.current.start();
    }, 540);

    return stopAll;
  }, [isActive]);

  const featureAnims = [
    { opacity: f0Opacity, x: f0X },
    { opacity: f1Opacity, x: f1X },
    { opacity: f2Opacity, x: f2X },
  ];

  const isLast = slideIndex === total - 1;

  return (
    <LinearGradient
      colors={item.gradient}
      style={[s.slide, { width: SCREEN_W, height: SCREEN_H }]}
      start={{ x: 0.2, y: 0 }}
      end={{ x: 0.8, y: 1 }}
    >
      {/* ── Header row: count + skip ─────────────────────── */}
      <View style={[s.header, { paddingTop: insets.top + 12 }]}>
        <View style={s.countBadge}>
          <Text style={s.countText}>{slideIndex + 1} / {total}</Text>
        </View>
        <TouchableOpacity style={s.skipBtn} onPress={onSkip} hitSlop={12}>
          <Text style={s.skipText}>Skip</Text>
          <Ionicons name="close" size={15} color="rgba(255,255,255,0.8)" />
        </TouchableOpacity>
      </View>

      {/* ── Main content ────────────────────────────────────── */}
      <View style={s.slideContent}>
        {/* Illustration */}
        <Animated.View
          style={{
            opacity: illOpacity,
            transform: [{ scale: illScale }, { translateY: illBobY }],
            marginBottom: 28,
          }}
        >
          <View style={s.illContainer}>
            <View style={s.illRing} />
            <View style={s.illInner}>
              <IllustrationComp size={156} />
            </View>
          </View>
        </Animated.View>

        {/* Title */}
        <Animated.Text
          style={[s.title, { opacity: titleOpacity, transform: [{ translateY: titleY }] }]}
        >
          {item.title}
        </Animated.Text>

        {/* Subtitle */}
        <Animated.Text style={[s.subtitle, { opacity: subOpacity }]}>
          {item.subtitle}
        </Animated.Text>

        {/* Feature bullets */}
        <View style={s.featureList}>
          {item.features.map((f, i) => (
            <Animated.View
              key={i}
              style={[
                s.featureRow,
                {
                  opacity: featureAnims[i]?.opacity ?? 1,
                  transform: [{ translateX: featureAnims[i]?.x ?? new Animated.Value(0) }],
                },
              ]}
            >
              <View style={[s.bullet, { backgroundColor: item.accentColor + "33" }]}>
                <Ionicons name="checkmark" size={14} color="#fff" />
              </View>
              <Text style={s.featureText}>{f}</Text>
            </Animated.View>
          ))}
        </View>
      </View>

      {/* ── Bottom controls ──────────────────────────────────── */}
      <View style={[s.controls, { paddingBottom: insets.bottom + 20 }]}>
        {/* Dots */}
        <View style={s.dotsRow}>
          {Array.from({ length: total }).map((_, i) => (
            <View
              key={i}
              style={[
                s.dot,
                i === currentIndex ? s.dotActive : s.dotInactive,
              ]}
            />
          ))}
        </View>

        {/* Next / Get Started */}
        <TouchableOpacity
          style={[s.nextBtn, isLast && s.nextBtnLast]}
          onPress={onGoNext}
          activeOpacity={0.82}
        >
          <Text style={[s.nextBtnText, isLast && s.nextBtnTextLast]}>
            {isLast ? "Get Started" : "Next"}
          </Text>
          <Ionicons
            name={isLast ? "rocket-outline" : "arrow-forward"}
            size={18}
            color={isLast ? "#006064" : "#fff"}
          />
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
interface WelcomeGuideProps {
  visible: boolean;
  onDismiss: () => void;
}

export default function WelcomeGuide({ visible, onDismiss }: WelcomeGuideProps) {
  // Native only — never render on web
  if (Platform.OS === "web") return null;

  const insets = useSafeAreaInsets();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const enterAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setCurrentIndex(0);
      flatListRef.current?.scrollToIndex({ index: 0, animated: false });
      enterAnim.setValue(0);
      Animated.timing(enterAnim, {
        toValue: 1,
        duration: 380,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: USE_ND,
      }).start();
    }
  }, [visible]);

  async function handleDismiss() {
    Animated.timing(enterAnim, {
      toValue: 0,
      duration: 240,
      easing: Easing.in(Easing.quad),
      useNativeDriver: USE_ND,
    }).start(async () => {
      await AsyncStorage.setItem(WELCOME_GUIDE_KEY, "1").catch(() => {});
      onDismiss();
    });
  }

  function goNext() {
    if (currentIndex < SLIDES.length - 1) {
      const next = currentIndex + 1;
      flatListRef.current?.scrollToIndex({ index: next, animated: true });
      setCurrentIndex(next);
    } else {
      handleDismiss();
    }
  }

  function handleScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
    if (idx >= 0 && idx < SLIDES.length) setCurrentIndex(idx);
  }

  if (!visible) return null;

  return (
    <>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <Animated.View
        style={[
          StyleSheet.absoluteFillObject,
          {
            zIndex: 9999,
            opacity: enterAnim,
            transform: [
              { translateY: enterAnim.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) },
            ],
          },
        ]}
      >
        <FlatList
          ref={flatListRef}
          data={SLIDES}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          bounces={false}
          scrollEnabled={true}
          onMomentumScrollEnd={handleScroll}
          getItemLayout={(_, index) => ({ length: SCREEN_W, offset: SCREEN_W * index, index })}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <AnimatedSlide
              item={item}
              isActive={index === currentIndex}
              slideIndex={index}
              onGoNext={goNext}
              onSkip={handleDismiss}
              currentIndex={currentIndex}
              total={SLIDES.length}
              insets={insets}
            />
          )}
        />
      </Animated.View>
    </>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  slide: {
    flex: 1,
    justifyContent: "space-between",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 4,
  },
  countBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.20)",
  },
  countText: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  skipBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.20)",
  },
  skipText: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  slideContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingBottom: 24,
  },
  illContainer: {
    width: 180,
    height: 180,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  illRing: {
    position: "absolute",
    inset: -10,
    borderRadius: 100,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.18)",
  },
  illInner: {
    width: 160,
    height: 160,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 80,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  title: {
    fontSize: 30,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    textAlign: "center",
    marginBottom: 12,
    lineHeight: 38,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.82)",
    textAlign: "center",
    lineHeight: 25,
    marginBottom: 32,
    maxWidth: 320,
  },
  featureList: {
    gap: 14,
    alignSelf: "stretch",
    maxWidth: 340,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
  },
  bullet: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    flexShrink: 0,
  },
  featureText: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.93)",
    lineHeight: 22,
  },
  controls: {
    alignItems: "center",
    gap: 20,
    paddingHorizontal: 28,
    paddingTop: 8,
  },
  dotsRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    width: 30,
    backgroundColor: "#fff",
  },
  dotInactive: {
    width: 8,
    backgroundColor: "rgba(255,255,255,0.30)",
  },
  nextBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    backgroundColor: "rgba(255,255,255,0.22)",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.45)",
    paddingVertical: 16,
    paddingHorizontal: 44,
    borderRadius: 32,
    width: "100%",
    maxWidth: 380,
  },
  nextBtnLast: {
    backgroundColor: "#fff",
    borderColor: "#fff",
  },
  nextBtnText: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  nextBtnTextLast: {
    color: "#006064",
  },
});
