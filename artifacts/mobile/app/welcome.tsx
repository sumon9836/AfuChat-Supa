import React, { useRef, useState, useEffect } from "react";
import {
  Animated,
  Dimensions,
  FlatList,
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "@/components/ui/SafeGradient";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/hooks/useTheme";
import { storage, KEYS } from "@/lib/storage/mmkv";
import AfuLogo from "@/components/ui/AfuLogo";

const { width: SW, height: SH } = Dimensions.get("window");
const PHOTO_H = Math.min(SH * 0.62, 520);

const SLIDES = [
  {
    photo: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=900&q=80",
    accent: "#1f95ff",
    tag: "MESSAGING",
    title: "Chat like\nnever before",
    subtitle:
      "Messages, voice notes & video calls to anyone — with real-time receipts and end-to-end encryption.",
  },
  {
    photo: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=900&q=80",
    accent: "#AF52DE",
    tag: "COMMUNITY",
    title: "Find your\ntribe nearby",
    subtitle:
      "Discover people, events and groups around you. Share stories and grow your circle every day.",
  },
  {
    photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=900&q=80",
    accent: "#FF9500",
    tag: "AI FEATURES",
    title: "AI that actually\nworks for you",
    subtitle:
      "Smart replies, image generation, voice transcription and message translation — right in your chats.",
  },
  {
    photo: "https://images.unsplash.com/photo-1573497491765-dccce02b29df?w=900&q=80",
    accent: "#34C759",
    tag: "WALLET",
    title: "Earn as you\nconnect",
    subtitle:
      "Send money, earn Nexa points, tip creators and manage your digital wallet — all in one place.",
  },
];

const TOTAL = SLIDES.length;

function finish() {
  try { storage.setBoolean(KEYS.ONBOARDING_DONE, true); } catch {}
  router.replace("/(auth)/login");
}

export default function WelcomeScreen() {
  const { isDark, colors } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const slideOpacity = useRef(new Animated.Value(1)).current;
  const slideY = useRef(new Animated.Value(0)).current;
  const activeIndexRef = useRef(0);
  const isWeb = Platform.OS === "web";

  useEffect(() => {
    if (user) router.replace("/(tabs)/chats");
  }, [user]);

  const onViewRef = useRef(({ viewableItems }: { viewableItems: any[] }) => {
    if (viewableItems.length > 0) {
      const idx = viewableItems[0].index ?? 0;
      if (idx !== activeIndexRef.current) {
        activeIndexRef.current = idx;
        Animated.sequence([
          Animated.parallel([
            Animated.timing(slideOpacity, { toValue: 0, duration: 110, useNativeDriver: !isWeb }),
            Animated.timing(slideY, { toValue: 8, duration: 110, useNativeDriver: !isWeb }),
          ]),
          Animated.parallel([
            Animated.timing(slideOpacity, { toValue: 1, duration: 180, useNativeDriver: !isWeb }),
            Animated.timing(slideY, { toValue: 0, duration: 180, useNativeDriver: !isWeb }),
          ]),
        ]).start();
        setActiveIndex(idx);
      }
    }
  });
  const viewConfig = useRef({ viewAreaCoveragePercentThreshold: 55 });

  function goNext() {
    if (activeIndex < TOTAL - 1) {
      listRef.current?.scrollToIndex({ index: activeIndex + 1, animated: true });
    } else {
      finish();
    }
  }

  const current = SLIDES[activeIndex];
  const isLast = activeIndex === TOTAL - 1;

  const bgColor = isDark ? "#0A0A0A" : "#FFFFFF";

  return (
    <View style={[s.root, { backgroundColor: bgColor }]}>
      {/* Full-bleed photo pager */}
      <View style={[s.photoPane, { height: PHOTO_H }]}>
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
                resizeMode="cover"
              />
              {/* Vignette — top */}
              <LinearGradient
                colors={["rgba(0,0,0,0.38)", "transparent"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={[StyleSheet.absoluteFill, { height: "45%" }]}
              />
              {/* Fade into bg at bottom */}
              <LinearGradient
                colors={["transparent", bgColor]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={[StyleSheet.absoluteFill, { top: "55%" }]}
              />
            </View>
          )}
        />

        {/* Logo + Skip row over the photo */}
        <View style={[s.topBar, { paddingTop: insets.top + 14 }]}>
          <AfuLogo size={28} forceTheme="dark" />
          <TouchableOpacity onPress={finish} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <View style={s.skipPill}>
              <Text style={s.skipText}>Skip</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Content area */}
      <View style={[s.content, { paddingBottom: insets.bottom + 20 }]}>
        <Animated.View style={{ opacity: slideOpacity, transform: [{ translateY: slideY }] }}>
          {/* Tag chip */}
          <View style={[s.tagWrap, { backgroundColor: current.accent + "22" }]}>
            <View style={[s.tagDot, { backgroundColor: current.accent }]} />
            <Text style={[s.tagText, { color: current.accent }]}>{current.tag}</Text>
          </View>

          {/* Title */}
          <Text style={[s.title, { color: isDark ? "#F2F2F2" : "#0A0A0A" }]}>
            {current.title}
          </Text>

          {/* Subtitle */}
          <Text style={[s.subtitle, { color: isDark ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.5)" }]}>
            {current.subtitle}
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
                hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
              >
                <View
                  style={[
                    s.dot,
                    {
                      width: active ? 22 : 7,
                      backgroundColor: active ? current.accent : (isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.15)"),
                    },
                  ]}
                />
              </TouchableOpacity>
            );
          })}
        </View>

        {/* CTA */}
        <TouchableOpacity
          style={[s.cta, { backgroundColor: current.accent }]}
          onPress={goNext}
          activeOpacity={0.85}
        >
          <Text style={s.ctaText}>{isLast ? "Get Started" : "Continue"}</Text>
          <Text style={s.ctaArrow}>{isLast ? " →" : " →"}</Text>
        </TouchableOpacity>

        {/* Bottom auth hint on last slide */}
        {isLast && (
          <View style={s.authHint}>
            <Text style={[s.authHintText, { color: isDark ? "rgba(255,255,255,0.38)" : "rgba(0,0,0,0.38)" }]}>
              Already have an account?{" "}
            </Text>
            <TouchableOpacity onPress={finish}>
              <Text style={[s.authHintLink, { color: current.accent }]}>Sign in</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },

  // Photo pane
  photoPane: { width: SW, overflow: "hidden" },
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 22,
    zIndex: 10,
  },
  skipPill: {
    backgroundColor: "rgba(255,255,255,0.18)",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.28)",
  },
  skipText: {
    color: "#fff",
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    letterSpacing: 0.2,
  },

  // Content area
  content: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 8,
    gap: 0,
  },
  tagWrap: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    marginBottom: 12,
    gap: 6,
  },
  tagDot: { width: 6, height: 6, borderRadius: 3 },
  tagText: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 1.2 },

  title: {
    fontSize: 34,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.8,
    lineHeight: 42,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15.5,
    fontFamily: "Inter_400Regular",
    lineHeight: 23,
    marginBottom: 24,
  },

  // Dots
  dotsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 20,
  },
  dot: { height: 7, borderRadius: 3.5 },

  // CTA
  cta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 54,
    borderRadius: 999,
    marginBottom: 12,
  },
  ctaText: {
    color: "#fff",
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.1,
  },
  ctaArrow: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
  },

  // Auth hint
  authHint: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  authHintText: { fontSize: 13.5, fontFamily: "Inter_400Regular" },
  authHintLink: { fontSize: 13.5, fontFamily: "Inter_600SemiBold" },
});
