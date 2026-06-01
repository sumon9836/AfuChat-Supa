import React, { useRef, useState, useEffect } from "react";
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "@/components/ui/SafeGradient";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/hooks/useTheme";
import { useAppAccent } from "@/context/AppAccentContext";

const { width: SW } = Dimensions.get("window");

const SLIDES = [
  {
    icon: "chatbubbles" as const,
    gradient: ["#00BCD4", "#006B7A"] as [string, string],
    title: "The Super App\nAfrica Deserves",
    subtitle:
      "Chat, share stories, discover people nearby, and stay connected with everyone that matters.",
  },
  {
    icon: "wallet" as const,
    gradient: ["#AF52DE", "#6A1B9A"] as [string, string],
    title: "Payments &\nRewards Built In",
    subtitle:
      "Send money, earn Nexa points, tip creators, and access your digital wallet — no bank needed.",
  },
  {
    icon: "sparkles" as const,
    gradient: ["#FF9500", "#C15900"] as [string, string],
    title: "AI That Actually\nHelps You",
    subtitle:
      "Get AI-powered replies, generate images, transcribe voice notes, and more — right inside your chats.",
  },
];

const TOTAL = SLIDES.length;

function Dots({ step, accent }: { step: number; accent: string }) {
  return (
    <View style={dotSt.row}>
      {Array.from({ length: TOTAL }).map((_, i) => (
        <View
          key={i}
          style={[
            dotSt.dot,
            {
              width: i === step ? 20 : 7,
              borderRadius: i === step ? 5 : 3.5,
              opacity: i === step ? 1 : 0.3,
              backgroundColor: accent,
            },
          ]}
        />
      ))}
    </View>
  );
}
const dotSt = StyleSheet.create({
  row: { flexDirection: "row", gap: 6, justifyContent: "center" },
  dot: { height: 7 },
});

function FeatureSlide({
  icon,
  gradient,
  title,
  subtitle,
  isDark,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  gradient: [string, string];
  title: string;
  subtitle: string;
  isDark: boolean;
}) {
  return (
    <View style={[slideSt.container, { width: SW }]}>
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={slideSt.iconWrap}
      >
        <Ionicons name={icon} size={52} color="#fff" />
      </LinearGradient>
      <Text style={[slideSt.title, { color: isDark ? "#F1F1F1" : "#0F0F0F" }]}>
        {title}
      </Text>
      <Text
        style={[
          slideSt.subtitle,
          { color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.55)" },
        ]}
      >
        {subtitle}
      </Text>
    </View>
  );
}
const slideSt = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 36,
    gap: 28,
  },
  iconWrap: {
    width: 110,
    height: 110,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 30,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
    textAlign: "center",
    lineHeight: 38,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 24,
  },
});

export default function WelcomeScreen() {
  const { isDark, colors } = useTheme();
  const { accent } = useAppAccent();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const pagerRef = useRef<ScrollView>(null);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (user) router.replace("/(tabs)/chats");
  }, [user]);

  function scrollToStep(s: number) {
    pagerRef.current?.scrollTo({ x: s * SW, animated: true });
    setStep(s);
  }

  function handleSwipeEnd(x: number) {
    const s = Math.round(x / SW);
    if (s !== step) setStep(Math.min(Math.max(s, 0), TOTAL - 1));
  }

  const isLast = step === TOTAL - 1;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Skip → go straight to auth */}
      <TouchableOpacity
        style={[skipSt.btn, { top: insets.top + 12 }]}
        onPress={() => router.replace("/(auth)/login")}
        activeOpacity={0.7}
      >
        <Text
          style={[
            skipSt.text,
            {
              color: isDark
                ? "rgba(255,255,255,0.45)"
                : "rgba(0,0,0,0.40)",
            },
          ]}
        >
          Skip
        </Text>
      </TouchableOpacity>

      {/* Slide pager */}
      <ScrollView
        ref={pagerRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onMomentumScrollEnd={(e) =>
          handleSwipeEnd(e.nativeEvent.contentOffset.x)
        }
        style={{ flex: 1 }}
        contentContainerStyle={{
          height: "100%",
          paddingTop: insets.top + 56,
          paddingBottom: insets.bottom + 120,
        }}
        keyboardShouldPersistTaps="handled"
      >
        {SLIDES.map((slide, i) => (
          <FeatureSlide key={i} {...slide} isDark={isDark} />
        ))}
      </ScrollView>

      {/* Bottom nav */}
      <View
        style={[
          bottomSt.bar,
          {
            paddingBottom: insets.bottom + 16,
            backgroundColor: colors.background,
          },
        ]}
      >
        <Dots step={step} accent={accent} />

        <TouchableOpacity
          style={[bottomSt.nextBtn, { backgroundColor: accent }]}
          onPress={() =>
            isLast ? router.replace("/(auth)/login") : scrollToStep(step + 1)
          }
          activeOpacity={0.85}
        >
          <Text style={bottomSt.nextText}>
            {isLast ? "Get Started" : "Next"}
          </Text>
          <Ionicons
            name="arrow-forward"
            size={16}
            color="#fff"
            style={{ marginLeft: 6 }}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const skipSt = StyleSheet.create({
  btn: {
    position: "absolute",
    right: 20,
    zIndex: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  text: { fontSize: 15, fontFamily: "Inter_500Medium" },
});

const bottomSt = StyleSheet.create({
  bar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 16,
    paddingHorizontal: 28,
    gap: 18,
    alignItems: "center",
  },
  nextBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    height: 52,
    borderRadius: 999,
  },
  nextText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
});
