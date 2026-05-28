import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { LinearGradient } from "@/components/ui/SafeGradient";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "@/hooks/useTheme";
import { SLIDE_ILLUSTRATIONS } from "@/components/ui/MemphisIllustrations";

const { width: SCREEN_W } = Dimensions.get("window");
export const WELCOME_GUIDE_KEY = "afu_welcome_guide_v2_seen";
const USE_ND = Platform.OS !== "web";

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
    gradient: ["#00BCD4", "#006064"],
    accentColor: "#80DEEA",
    title: "Welcome to AfuChat!",
    subtitle: "The social platform built for real, meaningful conversations.",
    features: ["Chat, post & discover content", "Connect with people worldwide", "Earn rewards as you engage"],
  },
  {
    id: "chat",
    gradient: ["#5C6BC0", "#283593"],
    accentColor: "#9FA8DA",
    title: "Private & Secure Chats",
    subtitle: "Message anyone with confidence — your conversations stay yours.",
    features: ["Send voice notes instantly", "Share photos, videos & files", "Group chats & communities"],
  },
  {
    id: "discover",
    gradient: ["#26A69A", "#004D40"],
    accentColor: "#80CBC4",
    title: "Discover Your World",
    subtitle: "A content feed curated around your interests and passions.",
    features: ["Read articles from creators", "Watch short-form videos", "Follow topics you love"],
  },
  {
    id: "afuai",
    gradient: ["#AB47BC", "#4A148C"],
    accentColor: "#CE93D8",
    title: "Meet AfuAI",
    subtitle: "Your always-on intelligent assistant, ready when you need it.",
    features: ["Ask questions, get smart answers", "Summarise long threads instantly", "Generate posts & captions"],
  },
  {
    id: "wallet",
    gradient: ["#FF7043", "#BF360C"],
    accentColor: "#FFAB91",
    title: "Earn ACoins Daily",
    subtitle: "Your activity on AfuChat earns you real in-app rewards.",
    features: ["Daily check-in for ACoins", "Unlock premium features", "Send & receive between friends"],
  },
  {
    id: "community",
    gradient: ["#00BCD4", "#006064"],
    accentColor: "#80DEEA",
    title: "You're Part of the Family",
    subtitle: "A growing community of creators, learners, and connectors.",
    features: ["Join our global community", "Get support from the AfuChat team", "Help shape the future of the app"],
    isLast: true,
  },
];

// ── Animated slide ────────────────────────────────────────────────────────────

function AnimatedSlide({
  item,
  width,
  isActive,
  displayName,
  slideIndex,
}: {
  item: SlideItem;
  width: number;
  isActive: boolean;
  displayName?: string;
  slideIndex: number;
}) {
  const title = item.id === "welcome" && displayName
    ? `Welcome, ${displayName.split(" ")[0]}!`
    : item.title;

  const IllustrationComp = SLIDE_ILLUSTRATIONS[slideIndex % SLIDE_ILLUSTRATIONS.length];

  // Animation refs — stable across re-renders
  const illOpacity  = useRef(new Animated.Value(0)).current;
  const illScale    = useRef(new Animated.Value(0.65)).current;
  const illBobY     = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleY      = useRef(new Animated.Value(22)).current;
  const subOpacity  = useRef(new Animated.Value(0)).current;
  const f0Opacity   = useRef(new Animated.Value(0)).current;
  const f0X         = useRef(new Animated.Value(-20)).current;
  const f1Opacity   = useRef(new Animated.Value(0)).current;
  const f1X         = useRef(new Animated.Value(-20)).current;
  const f2Opacity   = useRef(new Animated.Value(0)).current;
  const f2X         = useRef(new Animated.Value(-20)).current;

  const entranceRef = useRef<Animated.CompositeAnimation | null>(null);
  const bobRef      = useRef<Animated.CompositeAnimation | null>(null);
  const bobTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopAll = useCallback(() => {
    entranceRef.current?.stop();
    bobRef.current?.stop();
    if (bobTimerRef.current) clearTimeout(bobTimerRef.current);
  }, []);

  useEffect(() => {
    if (!isActive) { stopAll(); return; }

    // Reset
    illOpacity.setValue(0);
    illScale.setValue(0.65);
    illBobY.setValue(0);
    titleOpacity.setValue(0);
    titleY.setValue(22);
    subOpacity.setValue(0);
    f0Opacity.setValue(0); f0X.setValue(-20);
    f1Opacity.setValue(0); f1X.setValue(-20);
    f2Opacity.setValue(0); f2X.setValue(-20);

    // Staggered entrance
    entranceRef.current = Animated.parallel([
      // Illustration
      Animated.spring(illScale, { toValue: 1, tension: 55, friction: 8, useNativeDriver: USE_ND }),
      Animated.timing(illOpacity, { toValue: 1, duration: 320, easing: Easing.out(Easing.quad), useNativeDriver: USE_ND }),
      // Title (150ms delay)
      Animated.sequence([
        Animated.delay(150),
        Animated.parallel([
          Animated.spring(titleY, { toValue: 0, tension: 65, friction: 11, useNativeDriver: USE_ND }),
          Animated.timing(titleOpacity, { toValue: 1, duration: 290, useNativeDriver: USE_ND }),
        ]),
      ]),
      // Subtitle (260ms)
      Animated.sequence([
        Animated.delay(260),
        Animated.timing(subOpacity, { toValue: 1, duration: 280, useNativeDriver: USE_ND }),
      ]),
      // Features stagger (380, 480, 580ms)
      Animated.sequence([
        Animated.delay(380),
        Animated.stagger(100, [
          Animated.parallel([
            Animated.timing(f0Opacity, { toValue: 1, duration: 240, useNativeDriver: USE_ND }),
            Animated.spring(f0X, { toValue: 0, tension: 90, friction: 11, useNativeDriver: USE_ND }),
          ]),
          Animated.parallel([
            Animated.timing(f1Opacity, { toValue: 1, duration: 240, useNativeDriver: USE_ND }),
            Animated.spring(f1X, { toValue: 0, tension: 90, friction: 11, useNativeDriver: USE_ND }),
          ]),
          Animated.parallel([
            Animated.timing(f2Opacity, { toValue: 1, duration: 240, useNativeDriver: USE_ND }),
            Animated.spring(f2X, { toValue: 0, tension: 90, friction: 11, useNativeDriver: USE_ND }),
          ]),
        ]),
      ]),
    ]);
    entranceRef.current.start();

    // Gentle float bob — starts after entrance settles
    const startBob = () => {
      bobRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(illBobY, { toValue: -9, duration: 1700, easing: Easing.inOut(Easing.sin), useNativeDriver: USE_ND }),
          Animated.timing(illBobY, { toValue: 0, duration: 1700, easing: Easing.inOut(Easing.sin), useNativeDriver: USE_ND }),
        ])
      );
      bobRef.current.start();
    };
    bobTimerRef.current = setTimeout(startBob, 520);

    return stopAll;
  }, [isActive]);

  const featureAnims = [
    { opacity: f0Opacity, x: f0X },
    { opacity: f1Opacity, x: f1X },
    { opacity: f2Opacity, x: f2X },
  ];

  return (
    <LinearGradient
      colors={item.gradient}
      style={[styles.slide, { width }]}
      start={{ x: 0.2, y: 0 }}
      end={{ x: 0.8, y: 1 }}
    >
      <View style={styles.slideInner}>

        {/* Illustration */}
        <Animated.View
          style={{
            opacity: illOpacity,
            transform: [{ scale: illScale }, { translateY: illBobY }],
            marginBottom: 20,
          }}
        >
          <View style={styles.illContainer}>
            {/* Decorative ring */}
            <View style={[styles.illRing, { borderColor: "rgba(255,255,255,0.22)" }]} />
            <IllustrationComp size={148} />
          </View>
        </Animated.View>

        {/* Title */}
        <Animated.Text
          style={[
            styles.slideTitle,
            { opacity: titleOpacity, transform: [{ translateY: titleY }] },
          ]}
        >
          {title}
        </Animated.Text>

        {/* Subtitle */}
        <Animated.Text style={[styles.slideSubtitle, { opacity: subOpacity }]}>
          {item.subtitle}
        </Animated.Text>

        {/* Feature list */}
        <View style={styles.featureList}>
          {item.features.map((f, i) => (
            <Animated.View
              key={i}
              style={[
                styles.featureRow,
                {
                  opacity: featureAnims[i]?.opacity ?? 1,
                  transform: [{ translateX: featureAnims[i]?.x ?? new Animated.Value(0) }],
                },
              ]}
            >
              <View style={[styles.featureBullet, { backgroundColor: item.accentColor + "40" }]}>
                <Ionicons name="checkmark" size={14} color="#fff" />
              </View>
              <Text style={styles.featureText}>{f}</Text>
            </Animated.View>
          ))}
        </View>

      </View>
    </LinearGradient>
  );
}

// ── Main modal ────────────────────────────────────────────────────────────────

interface WelcomeGuideProps {
  visible: boolean;
  onDismiss: () => void;
  displayName?: string;
}

export default function WelcomeGuide({ visible, onDismiss, displayName }: WelcomeGuideProps) {
  const insets = useSafeAreaInsets();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const enterAnim = useRef(new Animated.Value(0)).current;
  const slideW = Math.min(SCREEN_W, 500);

  useEffect(() => {
    if (visible) {
      setCurrentIndex(0);
      enterAnim.setValue(0);
      Animated.spring(enterAnim, {
        toValue: 1,
        useNativeDriver: USE_ND,
        tension: 55,
        friction: 10,
      }).start();
    }
  }, [visible]);

  async function handleDismiss() {
    Animated.timing(enterAnim, {
      toValue: 0,
      duration: 220,
      useNativeDriver: USE_ND,
    }).start(async () => {
      await AsyncStorage.setItem(WELCOME_GUIDE_KEY, "1");
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
    const idx = Math.round(e.nativeEvent.contentOffset.x / slideW);
    if (idx >= 0 && idx < SLIDES.length) setCurrentIndex(idx);
  }

  if (!visible) return null;

  const isLast = currentIndex === SLIDES.length - 1;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View
        style={[
          styles.container,
          {
            opacity: enterAnim,
            transform: [
              { scale: enterAnim.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) },
              { translateY: enterAnim.interpolate({ inputRange: [0, 1], outputRange: [36, 0] }) },
            ],
          },
        ]}
      >
        <View style={[styles.backdrop, { paddingBottom: insets.bottom }]}>

          {/* Skip button */}
          <TouchableOpacity
            style={[styles.skipBtn, { top: insets.top + 14 }]}
            onPress={handleDismiss}
            hitSlop={12}
          >
            <Text style={styles.skipText}>Skip</Text>
            <Ionicons name="close" size={16} color="rgba(255,255,255,0.8)" />
          </TouchableOpacity>

          {/* Slide count badge */}
          <View style={[styles.countBadge, { top: insets.top + 18 }]}>
            <Text style={styles.countText}>{currentIndex + 1} / {SLIDES.length}</Text>
          </View>

          <FlatList
            ref={flatListRef}
            data={SLIDES}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            bounces={false}
            onMomentumScrollEnd={handleScroll}
            getItemLayout={(_, index) => ({ length: slideW, offset: slideW * index, index })}
            keyExtractor={(s) => s.id}
            renderItem={({ item, index }) => (
              <AnimatedSlide
                item={item}
                width={slideW}
                isActive={index === currentIndex}
                displayName={displayName}
                slideIndex={index}
              />
            )}
            style={{ flexGrow: 0 }}
          />

          {/* Dot indicators + Next button */}
          <View style={styles.controls}>
            <View style={styles.dotsRow}>
              {SLIDES.map((_, i) => (
                <TouchableOpacity
                  key={i}
                  onPress={() => {
                    flatListRef.current?.scrollToIndex({ index: i, animated: true });
                    setCurrentIndex(i);
                  }}
                  hitSlop={8}
                >
                  <Animated.View
                    style={[
                      styles.dot,
                      i === currentIndex ? styles.dotActive : styles.dotInactive,
                    ]}
                  />
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.nextBtn, isLast && styles.nextBtnLast]}
              onPress={goNext}
              activeOpacity={0.82}
            >
              <Text style={styles.nextBtnText}>
                {isLast ? "Get Started" : "Next"}
              </Text>
              <Ionicons
                name={isLast ? "rocket-outline" : "arrow-forward"}
                size={18}
                color="#fff"
              />
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    elevation: 99,
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.72)",
    alignItems: "center",
    justifyContent: "center",
  },
  skipBtn: {
    position: "absolute",
    right: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    zIndex: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.13)",
  },
  skipText: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  countBadge: {
    position: "absolute",
    left: 20,
    zIndex: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.13)",
  },
  countText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  slide: {
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 28,
    overflow: "hidden",
  },
  slideInner: {
    alignItems: "center",
    paddingHorizontal: 30,
    paddingVertical: 40,
    maxWidth: 420,
    width: "100%",
  },
  illContainer: {
    width: 164,
    height: 164,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  illRing: {
    position: "absolute",
    inset: -6,
    borderRadius: 90,
    borderWidth: 2,
  },
  slideTitle: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    textAlign: "center",
    marginBottom: 10,
    lineHeight: 34,
  },
  slideSubtitle: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.85)",
    textAlign: "center",
    lineHeight: 23,
    marginBottom: 26,
  },
  featureList: {
    gap: 12,
    alignSelf: "stretch",
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  featureBullet: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  featureText: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.92)",
    lineHeight: 21,
  },
  controls: {
    alignItems: "center",
    gap: 18,
    paddingTop: 20,
    paddingBottom: 6,
    width: "100%",
    paddingHorizontal: 28,
  },
  dotsRow: {
    flexDirection: "row",
    gap: 7,
    alignItems: "center",
  },
  dot: {
    borderRadius: 4,
    height: 8,
  },
  dotActive: {
    width: 28,
    backgroundColor: "#fff",
  },
  dotInactive: {
    width: 8,
    backgroundColor: "rgba(255,255,255,0.32)",
  },
  nextBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#00BCD4",
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 28,
    width: "100%",
    maxWidth: 360,
    ...Platform.select({
      web: { boxShadow: "0 4px 12px rgba(0,0,0,0.35)" } as any,
      default: { shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.32, shadowRadius: 10, elevation: 8 },
    }),
  },
  nextBtnLast: {
    backgroundColor: "#00BCD4",
  },
  nextBtnText: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
});
