import React, { useState, useRef, useEffect } from "react";
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Linking,
  Modal,
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
import * as WebBrowser from "expo-web-browser";
import { makeRedirectUri } from "expo-auth-session";
import { LinearGradient } from "@/components/ui/SafeGradient";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/hooks/useTheme";
import { useAppAccent } from "@/context/AppAccentContext";
import { showAlert } from "@/lib/alert";
import { googleSignIn } from "@/lib/googleAuth";
import AfuLogo from "@/components/ui/AfuLogo";

const TERMS_URL = "/terms";
const PRIVACY_URL = "/privacy";

// ─── AuthInput ────────────────────────────────────────────────────────────────
function AuthInput({ icon, placeholder, value, onChangeText, secureTextEntry, keyboardType, autoCapitalize, autoComplete, isDark, rightElement, onSubmitEditing, returnKeyType, inputRef }: any) {
  const [focused, setFocused] = useState(false);
  const { accent } = useAppAccent();
  return (
    <View style={[inp.wrap, {
      backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
      borderColor: focused ? accent + "70" : isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.10)",
      borderWidth: 1,
    }]}>
      <Ionicons name={icon} size={17} color={focused ? accent : isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.30)"} style={inp.icon} />
      <TextInput
        ref={inputRef}
        style={[inp.text, { color: isDark ? "#F1F1F1" : "#0F0F0F" }]}
        placeholder={placeholder}
        placeholderTextColor={isDark ? "rgba(255,255,255,0.30)" : "rgba(0,0,0,0.28)"}
        value={value} onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType} autoCapitalize={autoCapitalize ?? "none"}
        autoComplete={autoComplete} autoCorrect={false}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        onSubmitEditing={onSubmitEditing} returnKeyType={returnKeyType ?? "next"}
      />
      {rightElement}
    </View>
  );
}
const inp = StyleSheet.create({
  wrap: { flexDirection: "row", alignItems: "center", borderRadius: 12, paddingHorizontal: 14, height: 52 },
  icon: { marginRight: 10 },
  text: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular", height: 52, outlineStyle: "none" } as any,
});

// ─── OrDivider ────────────────────────────────────────────────────────────────
function OrDivider({ isDark }: { isDark: boolean }) {
  const c = isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.12)";
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
      <View style={{ flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: c }} />
      <Text style={{ fontSize: 11, fontFamily: "Inter_600SemiBold", color: isDark ? "rgba(255,255,255,0.30)" : "rgba(0,0,0,0.28)", letterSpacing: 1.2 }}>OR</Text>
      <View style={{ flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: c }} />
    </View>
  );
}

// ─── Checkbox ─────────────────────────────────────────────────────────────────
function Checkbox({ checked, onToggle, isDark, accent, children }: { checked: boolean; onToggle: () => void; isDark: boolean; accent: string; children: React.ReactNode }) {
  return (
    <TouchableOpacity style={cb.row} onPress={onToggle} activeOpacity={0.7}>
      <View style={[cb.box, { borderColor: checked ? accent : isDark ? "rgba(255,255,255,0.22)" : "rgba(0,0,0,0.20)", backgroundColor: checked ? accent : "transparent" }]}>
        {checked && <Ionicons name="checkmark" size={12} color="#fff" />}
      </View>
      <View style={{ flex: 1 }}>{children}</View>
    </TouchableOpacity>
  );
}
const cb = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  box: { width: 20, height: 20, borderRadius: 6, borderWidth: 1.5, alignItems: "center", justifyContent: "center", marginTop: 1, flexShrink: 0 },
});

// ─── GlassModal ───────────────────────────────────────────────────────────────
function GlassModal({ visible, onClose, isDark, children }: { visible: boolean; onClose: () => void; isDark: boolean; children: React.ReactNode }) {
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(opacity, { toValue: visible ? 1 : 0, duration: 220, useNativeDriver: true }).start();
  }, [visible]);
  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[gm.overlay, { opacity, backgroundColor: isDark ? "rgba(0,0,0,0.72)" : "rgba(0,0,0,0.48)" }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[gm.card, { backgroundColor: isDark ? "#1C1C1E" : "#FFFFFF", borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)", borderWidth: StyleSheet.hairlineWidth }]}>
          {children}
        </View>
      </Animated.View>
    </Modal>
  );
}
const gm = StyleSheet.create({
  overlay: { flex: 1, alignItems: "center", justifyContent: "center", padding: 20 },
  card: { width: "100%", maxWidth: 420, borderRadius: 24, overflow: "hidden" },
});

// ─── ModalHeader ──────────────────────────────────────────────────────────────
function ModalHeader({ title, subtitle, onClose, isDark }: { title: string; subtitle?: string; onClose: () => void; isDark: boolean }) {
  const textColor = isDark ? "#F1F1F1" : "#0F0F0F";
  const mutedColor = isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.45)";
  return (
    <View style={mh.row}>
      <View style={{ flex: 1 }}>
        <Text style={[mh.title, { color: textColor }]}>{title}</Text>
        {subtitle ? <Text style={[mh.sub, { color: mutedColor }]}>{subtitle}</Text> : null}
      </View>
      <TouchableOpacity onPress={onClose} style={mh.closeBtn}>
        <Ionicons name="close" size={18} color={mutedColor} />
      </TouchableOpacity>
    </View>
  );
}
const mh = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-start", paddingHorizontal: 24, paddingTop: 24, paddingBottom: 16, gap: 12 },
  title: { fontSize: 20, fontFamily: "Inter_700Bold", letterSpacing: -0.3, marginBottom: 4 },
  sub: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },
  closeBtn: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center", marginTop: 2 },
});

// ─── EmailVerifyModal ─────────────────────────────────────────────────────────
function EmailVerifyModal({ visible, email, onClose, onVerified, isDark }: { visible: boolean; email: string; onClose: () => void; onVerified: () => void; isDark: boolean }) {
  const { accent } = useAppAccent();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const sentRef = useRef(false);

  useEffect(() => {
    if (visible && !sentRef.current && email) { sentRef.current = true; sendCode(); }
    if (!visible) { sentRef.current = false; setCode(""); }
  }, [visible, email]);

  async function sendCode() {
    setSending(true);
    await supabase.auth.resend({ type: "signup", email });
    setSending(false);
  }

  async function verify() {
    if (!code.trim()) return showAlert("Enter code", "Please enter the 6-digit code from your email.");
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({ email, token: code.trim(), type: "signup" });
    setLoading(false);
    if (error) showAlert("Invalid code", "The code is incorrect or expired. Try resending.");
    else onVerified();
  }

  return (
    <GlassModal visible={visible} onClose={onClose} isDark={isDark}>
      <ModalHeader
        title="Verify Your Email"
        subtitle={sending ? "Sending verification code…" : `We sent a 6-digit code to ${email}`}
        onClose={onClose} isDark={isDark}
      />
      <View style={{ paddingHorizontal: 24, paddingBottom: 24, gap: 12 }}>
        <AuthInput icon="keypad-outline" placeholder="6-digit verification code" value={code} onChangeText={setCode} keyboardType="number-pad" isDark={isDark} returnKeyType="go" onSubmitEditing={verify} />
        <TouchableOpacity style={[sc.primaryBtn, (loading || sending) && { opacity: 0.6 }]} onPress={verify} disabled={loading || sending} activeOpacity={0.85}>
          <LinearGradient colors={[accent, "#1a7fd4"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={sc.primaryGrad}>
            {(loading || sending) ? <ActivityIndicator color="#fff" size="small" /> : <Text style={sc.primaryText}>Verify Email</Text>}
          </LinearGradient>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => { setCode(""); sentRef.current = false; sendCode(); }} disabled={sending} style={{ alignSelf: "center", paddingVertical: 4 }}>
          <Text style={{ fontSize: 13, fontFamily: "Inter_500Medium", color: accent }}>{sending ? "Sending…" : "Resend code"}</Text>
        </TouchableOpacity>
      </View>
    </GlassModal>
  );
}

// ─── SignUpScreen ─────────────────────────────────────────────────────────────
export default function SignUpScreen() {
  const { isDark, colors } = useTheme();
  const { accent } = useAppAccent();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  useEffect(() => { if (user) router.replace("/(tabs)/chats"); }, [user]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [ageOk, setAgeOk] = useState(false);
  const [termsOk, setTermsOk] = useState(false);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [verifyVisible, setVerifyVisible] = useState(false);
  const [verifyEmail, setVerifyEmail] = useState("");
  const [signupUserId, setSignupUserId] = useState<string | null>(null);
  const pwdRef = useRef<TextInput>(null);
  const oauthHandledRef = useRef(false);

  const textColor = isDark ? "#F1F1F1" : "#0F0F0F";
  const mutedColor = isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.45)";

  // ── Signup ──────────────────────────────────────────────────────────────────
  async function handleSignup() {
    const e = email.trim();
    if (!e || !password) return showAlert("Missing fields", "Please enter your email and a password.");
    if (!ageOk) return showAlert("Age required", "You must confirm that you are 13 years of age or older.");
    if (!termsOk) return showAlert("Terms required", "You must agree to the Terms of Service and Privacy Policy.");
    if (password.length < 8) return showAlert("Password too short", "Password must be at least 8 characters.");
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({ email: e, password });
    setLoading(false);
    if (error) { showAlert("Sign up failed", error.message); return; }
    if (data.user) {
      if (data.user.identities && data.user.identities.length === 0) {
        showAlert("Account exists", "An account with this email already exists. Please sign in instead.");
        router.replace("/(auth)/login"); return;
      }
      setSignupUserId(data.user.id);
      if (!data.session) { setVerifyEmail(e); setVerifyVisible(true); }
      else router.replace({ pathname: "/onboarding", params: { userId: data.user.id } } as any);
    }
  }

  // ── Google ──────────────────────────────────────────────────────────────────
  async function nativeGoogleSignIn() {
    setOauthLoading(true);
    const result = await googleSignIn();
    if (!result.ok) {
      setOauthLoading(false);
      if (result.cancelled) return;
      return webGoogleSignIn();
    }
    const uid = result.userId;
    if (uid) {
      const { data: prof } = await supabase.from("profiles").select("onboarding_completed").eq("id", uid).maybeSingle();
      if (!prof?.onboarding_completed) { setOauthLoading(false); router.replace({ pathname: "/onboarding", params: { userId: uid } } as any); return; }
    }
    setOauthLoading(false);
    router.replace("/(tabs)/chats");
  }

  async function webGoogleSignIn() {
    try {
      setOauthLoading(true);
      const redirectUrl = makeRedirectUri({ native: "afuchat://(auth)/register" });
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: redirectUrl, skipBrowserRedirect: true, queryParams: { prompt: "select_account" } },
      });
      if (error) { showAlert("Error", error.message); setOauthLoading(false); return; }
      if (!data?.url) { setOauthLoading(false); return; }
      oauthHandledRef.current = false;
      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl, { showInRecents: false });
      if (result.type === "success" && result.url) {
        const url = new URL(result.url);
        const code = url.searchParams.get("code");
        if (code) {
          const { data: sd, error: e } = await supabase.auth.exchangeCodeForSession(code);
          if (e) { showAlert("Error", e.message); }
          else {
            const uid = sd.user?.id;
            if (uid) {
              const { data: prof } = await supabase.from("profiles").select("onboarding_completed").eq("id", uid).maybeSingle();
              if (!prof?.onboarding_completed) { setOauthLoading(false); router.replace({ pathname: "/onboarding", params: { userId: uid } } as any); return; }
            }
            setOauthLoading(false); router.replace("/(tabs)/chats"); return;
          }
        }
        let at = url.hash ? new URLSearchParams(url.hash.substring(1)).get("access_token") : null;
        let rt = url.hash ? new URLSearchParams(url.hash.substring(1)).get("refresh_token") : null;
        if (!at) { at = url.searchParams.get("access_token"); rt = url.searchParams.get("refresh_token"); }
        if (at && rt) {
          const { error: e } = await supabase.auth.setSession({ access_token: at, refresh_token: rt });
          if (e) showAlert("Error", e.message);
          else router.replace("/(tabs)/chats");
        }
      }
      setOauthLoading(false);
    } catch { setOauthLoading(false); showAlert("Error", "Could not complete Google sign-in."); }
  }

  function handleGoogle() {
    Platform.OS === "web" ? webGoogleSignIn() : nativeGoogleSignIn();
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 28, paddingTop: insets.top + 32, paddingBottom: insets.bottom + 40 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo */}
          <View style={{ alignItems: "center", marginBottom: 36 }}>
            <AfuLogo size={72} />
            <Text style={{ fontSize: 28, fontFamily: "Inter_700Bold", letterSpacing: -0.5, marginTop: 12, color: textColor }}>AfuChat</Text>
            <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: mutedColor, marginTop: 4 }}>Connect · Discover · Create</Text>
          </View>

          {/* Heading */}
          <Text style={{ fontSize: 24, fontFamily: "Inter_700Bold", letterSpacing: -0.4, color: textColor, marginBottom: 4 }}>Create account</Text>
          <Text style={{ fontSize: 14, fontFamily: "Inter_400Regular", color: mutedColor, marginBottom: 24 }}>Join AfuChat — it's free</Text>

          {/* Fields */}
          <View style={{ gap: 12, marginBottom: 20 }}>
            <AuthInput
              icon="mail-outline" placeholder="Email address"
              value={email} onChangeText={setEmail}
              keyboardType="email-address" autoComplete="email"
              isDark={isDark} returnKeyType="next"
              onSubmitEditing={() => pwdRef.current?.focus()}
            />
            <AuthInput
              inputRef={pwdRef}
              icon="lock-closed-outline" placeholder="Password (min. 8 characters)"
              value={password} onChangeText={setPassword}
              secureTextEntry={!showPwd} autoComplete="new-password"
              isDark={isDark} returnKeyType="go" onSubmitEditing={handleSignup}
              rightElement={
                <TouchableOpacity onPress={() => setShowPwd(p => !p)} style={{ padding: 4 }}>
                  <Ionicons name={showPwd ? "eye-off-outline" : "eye-outline"} size={17} color={isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.30)"} />
                </TouchableOpacity>
              }
            />
          </View>

          {/* Legal checkboxes */}
          <View style={{ gap: 12, marginBottom: 24 }}>
            <Checkbox checked={ageOk} onToggle={() => setAgeOk(p => !p)} isDark={isDark} accent={accent}>
              <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: mutedColor, lineHeight: 19, flex: 1 }}>
                I confirm I am{" "}
                <Text style={{ fontFamily: "Inter_600SemiBold", color: textColor }}>13 years of age or older</Text>
              </Text>
            </Checkbox>

            <Checkbox checked={termsOk} onToggle={() => setTermsOk(p => !p)} isDark={isDark} accent={accent}>
              <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: mutedColor, lineHeight: 19, flex: 1 }}>
                I agree to the{" "}
                <Text style={{ color: accent, fontFamily: "Inter_500Medium" }} onPress={() => router.push("/terms")}>Terms of Service</Text>
                {" "}and{" "}
                <Text style={{ color: accent, fontFamily: "Inter_500Medium" }} onPress={() => router.push("/privacy")}>Privacy Policy</Text>
              </Text>
            </Checkbox>
          </View>

          {/* Create Account button */}
          <TouchableOpacity style={[sc.primaryBtn, loading && { opacity: 0.6 }, { marginBottom: 20 }]} onPress={handleSignup} disabled={loading} activeOpacity={0.85}>
            <LinearGradient colors={[accent, "#1a7fd4"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={sc.primaryGrad}>
              {loading
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={sc.primaryText}>Create Account</Text>
              }
            </LinearGradient>
          </TouchableOpacity>

          <OrDivider isDark={isDark} />

          {/* Google */}
          <TouchableOpacity style={[sc.googleBtn, { marginTop: 20 }]} onPress={handleGoogle} disabled={oauthLoading} activeOpacity={0.75}>
            {oauthLoading
              ? <ActivityIndicator size="small" color="#3C4043" />
              : <Text style={sc.googleText}>Continue with Google</Text>
            }
          </TouchableOpacity>

          {/* Switch to login */}
          <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 4, marginTop: 28 }}>
            <Text style={{ fontSize: 14, fontFamily: "Inter_400Regular", color: mutedColor }}>Already have an account?</Text>
            <TouchableOpacity onPress={() => router.replace("/(auth)/login")} activeOpacity={0.7}>
              <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: accent }}>Sign In</Text>
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={{ marginTop: 36, paddingTop: 20, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)", gap: 8 }}>
            <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 6 }}>
              <Text style={[sc.footerLink, { color: accent }]} onPress={() => router.push("/terms")}>Terms</Text>
              <Text style={{ color: mutedColor, fontSize: 12 }}>·</Text>
              <Text style={[sc.footerLink, { color: accent }]} onPress={() => router.push("/privacy")}>Privacy</Text>
            </View>
            <Text style={{ fontSize: 10.5, fontFamily: "Inter_400Regular", textAlign: "center", color: isDark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.18)" }}>
              © {new Date().getFullYear()} AfuChat Technologies Limited
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <EmailVerifyModal
        visible={verifyVisible} email={verifyEmail}
        onClose={() => setVerifyVisible(false)}
        onVerified={() => {
          setVerifyVisible(false);
          if (signupUserId) router.replace({ pathname: "/onboarding", params: { userId: signupUserId } } as any);
          else router.replace("/(tabs)/chats");
        }}
        isDark={isDark}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const sc = StyleSheet.create({
  primaryBtn: { borderRadius: 999, overflow: "hidden" },
  primaryGrad: { height: 52, alignItems: "center", justifyContent: "center" },
  primaryText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold", letterSpacing: 0.2 },
  googleBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 10, height: 50, borderRadius: 999,
    backgroundColor: "#FFFFFF",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.12)",
    ...Platform.select({
      web: { boxShadow: "0 1px 6px rgba(0,0,0,0.12)" } as any,
      default: { shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.12, shadowRadius: 4, elevation: 2 },
    }),
  },
  googleText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#3C4043" },
  footerLink: { fontSize: 12.5, fontFamily: "Inter_500Medium" },
});
