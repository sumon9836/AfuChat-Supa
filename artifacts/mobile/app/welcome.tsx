import React, { useRef, useState, useEffect } from "react";
import {
  ActivityIndicator,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "@/components/ui/SafeGradient";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/hooks/useTheme";
import { useAppAccent } from "@/context/AppAccentContext";
import { showAlert } from "@/lib/alert";
import { googleSignIn } from "@/lib/googleAuth";
import { GoogleLogo } from "@/components/ui/OAuthLogos";
import AfuLogo from "@/components/ui/AfuLogo";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { width: SW, height: SH } = Dimensions.get("window");

// ─── Slide definitions ────────────────────────────────────────────────────────
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

const TOTAL = SLIDES.length + 1; // slides + auth step

// ─── Dot indicator ────────────────────────────────────────────────────────────
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

// ─── Feature slide ────────────────────────────────────────────────────────────
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

// ─── Auth step (embedded inside the scroll) ───────────────────────────────────
function AuthStep({
  isDark,
  accent,
  onAuthSuccess,
}: {
  isDark: boolean;
  accent: string;
  onAuthSuccess: (userId: string) => void;
}) {
  const textColor = isDark ? "#F1F1F1" : "#0F0F0F";
  const mutedColor = isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.45)";
  const inputBg = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)";
  const inputBorder = isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.10)";

  const [mode, setMode] = useState<"signup" | "login">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [focused, setFocused] = useState<"email" | "pw" | null>(null);

  async function handleSubmit() {
    const e = email.trim();
    const p = password;
    if (!e || !p) {
      showAlert("Missing fields", "Please enter your email and a password.");
      return;
    }
    setLoading(true);
    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({ email: e, password: p });
      if (error) {
        setLoading(false);
        showAlert("Sign up failed", error.message);
        return;
      }
      const userId = data.user?.id;
      if (!userId) {
        setLoading(false);
        showAlert("Error", "Could not create account. Please try again.");
        return;
      }
      onAuthSuccess(userId);
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({ email: e, password: p });
      if (error) {
        setLoading(false);
        showAlert("Sign in failed", error.message);
        return;
      }
      const userId = data.user?.id;
      if (!userId) { setLoading(false); return; }
      onAuthSuccess(userId);
    }
    setLoading(false);
  }

  async function handleGoogle() {
    setOauthLoading(true);
    const result = await googleSignIn();
    if (!result.ok) {
      setOauthLoading(false);
      if (!result.cancelled) showAlert("Google Sign-In", "Could not sign in with Google. Please try email instead.");
      return;
    }
    if (result.userId) {
      onAuthSuccess(result.userId);
    }
    setOauthLoading(false);
  }

  return (
    <View style={[authSt.container, { width: SW }]}>
      <AfuLogo size={40} />

      <View style={{ gap: 4 }}>
        <Text style={[authSt.title, { color: textColor }]}>
          {mode === "signup" ? "Create your account" : "Welcome back"}
        </Text>
        <Text style={[authSt.sub, { color: mutedColor }]}>
          {mode === "signup"
            ? "Join AfuChat — it's free"
            : "Sign in to continue"}
        </Text>
      </View>

      <View style={authSt.fields}>
        {/* Email */}
        <View
          style={[
            authSt.inputWrap,
            {
              backgroundColor: inputBg,
              borderColor: focused === "email" ? accent + "70" : inputBorder,
            },
          ]}
        >
          <Ionicons
            name="mail-outline"
            size={17}
            color={focused === "email" ? accent : mutedColor}
            style={{ marginRight: 10 }}
          />
          <TextInput
            style={[authSt.input, { color: textColor }]}
            placeholder="Email address"
            placeholderTextColor={mutedColor}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect={false}
            onFocus={() => setFocused("email")}
            onBlur={() => setFocused(null)}
            returnKeyType="next"
          />
        </View>

        {/* Password */}
        <View
          style={[
            authSt.inputWrap,
            {
              backgroundColor: inputBg,
              borderColor: focused === "pw" ? accent + "70" : inputBorder,
            },
          ]}
        >
          <Ionicons
            name="lock-closed-outline"
            size={17}
            color={focused === "pw" ? accent : mutedColor}
            style={{ marginRight: 10 }}
          />
          <TextInput
            style={[authSt.input, { color: textColor }]}
            placeholder={mode === "signup" ? "Create a password" : "Your password"}
            placeholderTextColor={mutedColor}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPwd}
            autoCapitalize="none"
            autoCorrect={false}
            onFocus={() => setFocused("pw")}
            onBlur={() => setFocused(null)}
            returnKeyType="go"
            onSubmitEditing={handleSubmit}
          />
          <Pressable onPress={() => setShowPwd((v) => !v)} style={{ padding: 4 }}>
            <Ionicons
              name={showPwd ? "eye-off-outline" : "eye-outline"}
              size={17}
              color={mutedColor}
            />
          </Pressable>
        </View>
      </View>

      {/* Primary CTA */}
      <TouchableOpacity
        style={[authSt.cta, loading && { opacity: 0.6 }]}
        onPress={handleSubmit}
        disabled={loading}
        activeOpacity={0.85}
      >
        <LinearGradient
          colors={[accent, isDark ? "#005E6E" : "#007A8A"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={authSt.ctaGrad}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={authSt.ctaText}>
              {mode === "signup" ? "Create Account" : "Sign In"}
            </Text>
          )}
        </LinearGradient>
      </TouchableOpacity>

      {/* OR divider */}
      <View style={authSt.dividerRow}>
        <View style={[authSt.dividerLine, { backgroundColor: inputBorder }]} />
        <Text style={[authSt.dividerText, { color: mutedColor }]}>OR</Text>
        <View style={[authSt.dividerLine, { backgroundColor: inputBorder }]} />
      </View>

      {/* Google OAuth */}
      <TouchableOpacity
        style={[
          authSt.oauthBtn,
          {
            backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
            borderColor: inputBorder,
          },
        ]}
        onPress={handleGoogle}
        disabled={oauthLoading}
        activeOpacity={0.7}
      >
        {oauthLoading ? (
          <ActivityIndicator size="small" color={textColor} />
        ) : (
          <>
            <GoogleLogo size={20} />
            <Text style={[authSt.oauthText, { color: textColor }]}>
              Continue with Google
            </Text>
          </>
        )}
      </TouchableOpacity>

      {/* Toggle mode */}
      <TouchableOpacity
        onPress={() => {
          setMode((m) => (m === "signup" ? "login" : "signup"));
          setPassword("");
        }}
        style={{ alignSelf: "center" }}
        activeOpacity={0.7}
      >
        <Text style={[authSt.toggleText, { color: mutedColor }]}>
          {mode === "signup" ? "Already have an account? " : "Don't have an account? "}
          <Text style={{ color: accent, fontFamily: "Inter_600SemiBold" }}>
            {mode === "signup" ? "Log In" : "Sign Up"}
          </Text>
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const authSt = StyleSheet.create({
  container: {
    alignItems: "stretch",
    justifyContent: "center",
    paddingHorizontal: 28,
    gap: 20,
  },
  title: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.4,
    textAlign: "center",
  },
  sub: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  fields: { gap: 12 },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 52,
    borderWidth: 1,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    height: 52,
    outlineStyle: "none",
  } as any,
  cta: { borderRadius: 14, overflow: "hidden" },
  ctaGrad: { height: 52, alignItems: "center", justifyContent: "center" },
  ctaText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
  dividerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 1 },
  oauthBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
  },
  oauthText: { fontSize: 15, fontFamily: "Inter_500Medium" },
  toggleText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
});

// ─── Main welcome screen ──────────────────────────────────────────────────────
export default function WelcomeScreen() {
  const { isDark, colors } = useTheme();
  const { accent } = useAppAccent();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const pagerRef = useRef<ScrollView>(null);
  const [step, setStep] = useState(0);
  const isAuthStep = step === TOTAL - 1;

  // If already authenticated, skip to app
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

  async function handleAuthSuccess(userId: string) {
    // Check if the user has completed profile onboarding
    const { data: prof } = await supabase
      .from("profiles")
      .select("onboarding_completed")
      .eq("id", userId)
      .maybeSingle();

    if (!prof?.onboarding_completed) {
      router.replace({ pathname: "/onboarding", params: { userId } } as any);
    } else {
      router.replace("/(tabs)/chats");
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={0}
    >
      {/* Skip button (only on feature slides) */}
      {!isAuthStep && (
        <TouchableOpacity
          style={[skipSt.btn, { top: insets.top + 12 }]}
          onPress={() => scrollToStep(TOTAL - 1)}
          activeOpacity={0.7}
        >
          <Text
            style={[
              skipSt.text,
              { color: isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.40)" },
            ]}
          >
            Skip
          </Text>
        </TouchableOpacity>
      )}

      {/* Pager */}
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
        // Disable horizontal scrolling on the auth step to prevent accidental dismiss
        scrollEnabled={!isAuthStep}
        keyboardShouldPersistTaps="handled"
      >
        {SLIDES.map((slide, i) => (
          <FeatureSlide key={i} {...slide} isDark={isDark} />
        ))}
        <AuthStep
          isDark={isDark}
          accent={accent}
          onAuthSuccess={handleAuthSuccess}
        />
      </ScrollView>

      {/* Bottom bar */}
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

        {!isAuthStep && (
          <TouchableOpacity
            style={[bottomSt.nextBtn, { backgroundColor: accent }]}
            onPress={() => scrollToStep(step + 1)}
            activeOpacity={0.85}
          >
            <Text style={bottomSt.nextText}>
              {step === SLIDES.length - 1 ? "Get Started" : "Next"}
            </Text>
            <Ionicons name="arrow-forward" size={16} color="#fff" style={{ marginLeft: 6 }} />
          </TouchableOpacity>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const skipSt = StyleSheet.create({
  btn: { position: "absolute", right: 20, zIndex: 10, paddingVertical: 6, paddingHorizontal: 10 },
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
    borderRadius: 14,
  },
  nextText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
});
