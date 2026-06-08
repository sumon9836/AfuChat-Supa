import React, { useRef, useState, useEffect } from "react";
import {
  Animated,
  Dimensions,
  FlatList,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "@/components/ui/SafeGradient";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/hooks/useTheme";
import { storage, KEYS } from "@/lib/storage/mmkv";

const SLIDES = [
  {
    photo: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=900&q=80",
    accent: "#1f95ff",
    tag: "MESSAGING",
    title: "Chat like\nnever before",
    subtitle:
      "Messages, voice notes & video calls — with real-time receipts and end-to-end encryption.",
    action: "Explore messaging",
  },
  {
    photo: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=900&q=80",
    accent: "#AF52DE",
    tag: "COMMUNITY",
    title: "Find your\ntribe nearby",
    subtitle:
      "Discover people, events and groups around you. Share stories and grow your circle every day.",
    action: "Find community",
  },
  {
    photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=900&q=80",
    accent: "#FF9500",
    tag: "AI FEATURES",
    title: "AI that actually\nworks for you",
    subtitle:
      "Smart replies, image generation, voice transcription and translation — right in your chats.",
    action: "Try AI features",
  },
  {
    photo: "https://images.unsplash.com/photo-1573497491765-dccce02b29df?w=900&q=80",
    accent: "#34C759",
    tag: "WALLET",
    title: "Earn as you\nconnect",
    subtitle:
      "Send money, earn Nexa points, tip creators and manage your digital wallet — all in one place.",
    action: "Get started free",
  },
];

const TOTAL = SLIDES.length;

function finish() {
  try { storage.setBoolean(KEYS.ONBOARDING_DONE, true); } catch {}
  router.replace("/(auth)/login");
}

export default function WelcomeScreen() {
  const { isDark } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { width: SW, height: SH } = useWindowDimensions();
  const isWeb = Platform.OS === "web";

  const PHOTO_H = Math.round(SH * 0.58);
  const bgColor = isDark ? "#0A0A0A" : "#FFFFFF";

  const listRef = useRef<FlatList>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const contentOpacity = useRef(new Animated.Value(1)).current;
  const contentY = useRef(new Animated.Value(0)).current;
  const activeIndexRef = useRef(0);

  useEffect(() => {
    if (user) router.replace("/(tabs)/chats");
  }, [user]);

  const onViewRef = useRef(({ viewableItems }: { viewableItems: any[] }) => {
    if (viewableItems.length === 0) return;
    const idx = viewableItems[0].index ?? 0;
    if (idx === activeIndexRef.current) return;
    activeIndexRef.current = idx;
    Animated.sequence([
      Animated.parallel([
        Animated.timing(contentOpacity, { toValue: 0, duration: 100, useNativeDriver: !isWeb }),
        Animated.timing(contentY, { toValue: 6, duration: 100, useNativeDriver: !isWeb }),
      ]),
      Animated.parallel([
        Animated.timing(contentOpacity, { toValue: 1, duration: 200, useNativeDriver: !isWeb }),
        Animated.timing(contentY, { toValue: 0, duration: 200, useNativeDriver: !isWeb }),
      ]),
    ]).start();
    setActiveIndex(idx);
  });
  const viewConfig = useRef({ viewAreaCoveragePercentThreshold: 55 });

  function goNext() {
    if (activeIndex < TOTAL - 1) {
      listRef.current?.scrollToIndex({ index: activeIndex + 1, animated: true });
    } else {
      finish();
    }
  }

  const slide = SLIDES[activeIndex];
  const isLast = activeIndex === TOTAL - 1;

  return (
    <View style={[s.root, { backgroundColor: bgColor }]}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* ── Full-bleed photo pager ── */}
      <View style={{ width: SW, height: PHOTO_H }}>
        <FlatList
          ref={listRef}
          data={SLIDES}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(_, i) => String(i)}
          onViewableItemsChanged={onViewRef.current}
          viewabilityConfig={viewConfig.current}
          initialNumToRender={2}
          maxToRenderPerBatch={2}
          getItemLayout={(_, index) => ({ length: SW, offset: SW * index, index })}
          renderItem={({ item }) => (
            <View style={{ width: SW, height: PHOTO_H }}>
              <Image
                source={{ uri: item.photo }}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
                cachePolicy="memory-disk"
                transition={300}
              />
              {/* Smooth bottom fade only — NO top shadow */}
              <LinearGradient
                colors={["transparent", "transparent", `${bgColor}CC`, bgColor]}
                locations={[0, 0.5, 0.82, 1]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={[StyleSheet.absoluteFill]}
              />
            </View>
          )}
        />

        {/* Top bar — NO background, just transparent */}
        <View style={[s.topBar, { paddingTop: insets.top + 12 }]}>
          <View />
          <TouchableOpacity
            onPress={finish}
            hitSlop={{ top: 12, bottom: 12, left: 16, right: 16 }}
          >
            <View style={s.skipPill}>
              <Text style={s.skipText}>Skip</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Content area ── */}
      <View style={[s.content, { paddingBottom: Math.max(insets.bottom, 20) + 12 }]}>
        <Animated.View
          style={[s.contentInner, { opacity: contentOpacity, transform: [{ translateY: contentY }] }]}
        >
          {/* Feature tag */}
          <View style={[s.tag, { backgroundColor: slide.accent + "1A" }]}>
            <View style={[s.tagDot, { backgroundColor: slide.accent }]} />
            <Text style={[s.tagText, { color: slide.accent }]}>{slide.tag}</Text>
          </View>

          {/* Title */}
          <Text style={[s.title, { color: isDark ? "#F2F2F2" : "#0A0A0A" }]}>
            {slide.title}
          </Text>

          {/* Subtitle */}
          <Text style={[s.subtitle, { color: isDark ? "rgba(255,255,255,0.52)" : "rgba(0,0,0,0.48)" }]}>
            {slide.subtitle}
          </Text>
        </Animated.View>

        {/* Dots */}
        <View style={s.dotsRow}>
          {SLIDES.map((sl, i) => {
            const active = i === activeIndex;
            return (
              <TouchableOpacity
                key={i}
                onPress={() => listRef.current?.scrollToIndex({ index: i, animated: true })}
                hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
              >
                <Animated.View
                  style={[
                    s.dot,
                    {
                      width: active ? 24 : 7,
                      backgroundColor: active
                        ? slide.accent
                        : isDark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.13)",
                    },
                  ]}
                />
              </TouchableOpacity>
            );
          })}
        </View>

        {/* CTA */}
        <TouchableOpacity
          style={[s.cta, { backgroundColor: slide.accent }]}
          onPress={goNext}
          activeOpacity={0.84}
        >
          <Text style={s.ctaText}>
            {isLast ? slide.action : slide.action}
          </Text>
          <Text style={s.ctaArrow}> →</Text>
        </TouchableOpacity>

        {/* Auth hint */}
        <View style={s.hintRow}>
          <Text style={[s.hintText, { color: isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.35)" }]}>
            Already have an account?{" "}
          </Text>
          <TouchableOpacity onPress={finish} hitSlop={8}>
            <Text style={[s.hintLink, { color: slide.accent }]}>Sign in</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },

  topBar: {
    position: "absolute",
    top: 0, left: 0, right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 22,
    zIndex: 10,
  },
  skipPill: {
    backgroundColor: "rgba(255,255,255,0.16)",
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
  },
  skipText: {
    color: "#fff",
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.1,
  },

  content: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 4,
    justifyContent: "flex-end",
  },
  contentInner: { marginBottom: 20 },

  tag: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    marginBottom: 14,
    gap: 6,
  },
  tagDot: { width: 6, height: 6, borderRadius: 3 },
  tagText: { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 1.4 },

  title: {
    fontSize: 36,
    fontFamily: "Inter_700Bold",
    letterSpacing: -1,
    lineHeight: 44,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    lineHeight: 23,
  },

  dotsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginBottom: 22,
  },
  dot: { height: 7, borderRadius: 3.5 },

  cta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 56,
    borderRadius: 999,
    marginBottom: 16,
  },
  ctaText: {
    color: "#fff",
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.1,
  },
  ctaArrow: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
  },

  hintRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  hintText: { fontSize: 13.5, fontFamily: "Inter_400Regular" },
  hintLink: { fontSize: 13.5, fontFamily: "Inter_700Bold" },
});
