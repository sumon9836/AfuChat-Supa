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
import { GoogleLogo } from "@/components/ui/OAuthLogos";
import { googleSignIn } from "@/lib/googleAuth";
import AfuLogo from "@/components/ui/AfuLogo";

// ─── Input field ───────────────────────────────────────────────────────────────
function AuthInput({
  icon, placeholder, value, onChangeText, secureTextEntry,
  keyboardType, autoCapitalize, autoComplete, isDark, rightElement,
  onSubmitEditing, returnKeyType, inputRef,
}: any) {
  const [focused, setFocused] = useState(false);
  const { accent } = useAppAccent();
  const borderColor = isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.10)";
  return (
    <View
      style={[
        inputSt.wrap,
        {
          backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
          borderColor: focused ? accent + "70" : borderColor,
          borderWidth: 1,
        },
      ]}
    >
      <Ionicons
        name={icon}
        size={17}
        color={focused ? accent : isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.30)"}
        style={inputSt.icon}
      />
      <TextInput
        ref={inputRef}
        style={[inputSt.text, { color: isDark ? "#F1F1F1" : "#0F0F0F" }]}
        placeholder={placeholder}
        placeholderTextColor={isDark ? "rgba(255,255,255,0.30)" : "rgba(0,0,0,0.28)"}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize ?? "none"}
        autoComplete={autoComplete}
        autoCorrect={false}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onSubmitEditing={onSubmitEditing}
        returnKeyType={returnKeyType ?? "next"}
      />
      {rightElement}
    </View>
  );
}
const inputSt = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 52,
  },
  icon: { marginRight: 10 },
  text: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    height: 52,
    outlineStyle: "none",
  } as any,
});

// ─── OR divider ────────────────────────────────────────────────────────────────
function OrDivider({ isDark }: { isDark: boolean }) {
  const divColor = isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.12)";
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
      <View style={{ flex: 1, height: 1, backgroundColor: divColor }} />
      <Text style={{ fontSize: 11, fontFamily: "Inter_600SemiBold", color: isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.30)", letterSpacing: 1 }}>OR</Text>
      <View style={{ flex: 1, height: 1, backgroundColor: divColor }} />
    </View>
  );
}

// ─── Glass modal ───────────────────────────────────────────────────────────────
function GlassModal({ visible, onClose, isDark, children }: { visible: boolean; onClose: () => void; isDark: boolean; children: React.ReactNode }) {
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(opacity, { toValue: visible ? 1 : 0, duration: 220, useNativeDriver: true }).start();
  }, [visible]);
  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[modalSt.overlay, { opacity, backgroundColor: isDark ? "rgba(0,0,0,0.72)" : "rgba(0,0,0,0.48)" }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[modalSt.card, { backgroundColor: isDark ? "#1C1C1E" : "#FFFFFF", borderWidth: StyleSheet.hairlineWidth, borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)" }]}>
          {children}
        </View>
      </Animated.View>
    </Modal>
  );
}
const modalSt = StyleSheet.create({
  overlay: { flex: 1, alignItems: "center", justifyContent: "center", padding: 20 },
  card: { width: "100%", maxWidth: 420, borderRadius: 24, overflow: "hidden" },
});

// ─── Forgot password modal ─────────────────────────────────────────────────────
function ForgotPasswordModal({ visible, onClose, isDark }: { visible: boolean; onClose: () => void; isDark: boolean }) {
  const { accent } = useAppAccent();
  const textColor = isDark ? "#F1F1F1" : "#0F0F0F";
  const mutedColor = isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.45)";
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  useEffect(() => {
    if (!visible) {
      const t = setTimeout(() => { setStep("email"); setEmail(""); setCode(""); setNewPwd(""); setConfirmPwd(""); }, 250);
      return () => clearTimeout(t);
    }
  }, [visible]);

  async function sendCode() {
    if (!email.trim()) return showAlert("Enter email", "Please enter your email address.");
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: "https://afuchat.com/" });
    setLoading(false);
    if (error) showAlert("Error", error.message);
    else setStep("code");
  }

  async function doReset() {
    if (!code.trim()) return showAlert("Enter code", "Check your email for the code.");
    if (newPwd.length < 6) return showAlert("Too short", "Password must be at least 6 characters.");
    if (newPwd !== confirmPwd) return showAlert("Mismatch", "Passwords don't match.");
    setLoading(true);
    const { error: e1 } = await supabase.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: "recovery" });
    if (e1) { setLoading(false); return showAlert("Invalid code", "The code is invalid or expired."); }
    const { error: e2 } = await supabase.auth.updateUser({ password: newPwd });
    setLoading(false);
    if (e2) showAlert("Error", e2.message);
    else { showAlert("Password updated", "Your password has been changed. Please sign in."); await supabase.auth.signOut(); onClose(); }
  }

  return (
    <GlassModal visible={visible} onClose={onClose} isDark={isDark}>
      <View style={fgSt.header}>
        <View style={{ flex: 1 }}>
          <Text style={[fgSt.title, { color: textColor }]}>{step === "email" ? "Reset Password" : "Create New Password"}</Text>
          <Text style={[fgSt.subtitle, { color: mutedColor }]}>{step === "email" ? "Enter your email to receive a reset code" : `Code sent to ${email}`}</Text>
        </View>
        <TouchableOpacity onPress={onClose} style={fgSt.closeBtn}>
          <Ionicons name="close" size={18} color={mutedColor} />
        </TouchableOpacity>
      </View>
      <View style={fgSt.body}>
        {step === "email" ? (
          <>
            <AuthInput icon="mail-outline" placeholder="Email address" value={email} onChangeText={setEmail} keyboardType="email-address" autoComplete="email" isDark={isDark} returnKeyType="go" onSubmitEditing={sendCode} />
            <TouchableOpacity style={[fgSt.btn, loading && { opacity: 0.6 }]} onPress={sendCode} disabled={loading} activeOpacity={0.85}>
              <LinearGradient colors={[accent, isDark ? "#005E6E" : "#007A8A"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={fgSt.btnGrad}>
                {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={fgSt.btnText}>Send Reset Code</Text>}
              </LinearGradient>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <AuthInput icon="keypad-outline" placeholder="6-digit code from email" value={code} onChangeText={setCode} keyboardType="number-pad" isDark={isDark} />
            <AuthInput icon="lock-closed-outline" placeholder="New password" value={newPwd} onChangeText={setNewPwd} secureTextEntry={!showPwd} isDark={isDark}
              rightElement={<TouchableOpacity onPress={() => setShowPwd(p => !p)} style={{ padding: 4 }}><Ionicons name={showPwd ? "eye-off-outline" : "eye-outline"} size={17} color={mutedColor} /></TouchableOpacity>}
            />
            <AuthInput icon="lock-closed-outline" placeholder="Confirm new password" value={confirmPwd} onChangeText={setConfirmPwd} secureTextEntry={!showPwd} isDark={isDark} returnKeyType="go" onSubmitEditing={doReset} />
            <TouchableOpacity style={[fgSt.btn, loading && { opacity: 0.6 }]} onPress={doReset} disabled={loading} activeOpacity={0.85}>
              <LinearGradient colors={[accent, isDark ? "#005E6E" : "#007A8A"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={fgSt.btnGrad}>
                {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={fgSt.btnText}>Update Password</Text>}
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setStep("email")} style={{ alignSelf: "center", paddingVertical: 4 }}>
              <Text style={{ fontSize: 13, fontFamily: "Inter_500Medium", color: accent }}>← Resend code</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </GlassModal>
  );
}
const fgSt = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "flex-start", paddingHorizontal: 24, paddingTop: 24, paddingBottom: 16, gap: 12 },
  title: { fontSize: 20, fontFamily: "Inter_700Bold", letterSpacing: -0.3, marginBottom: 4 },
  subtitle: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },
  closeBtn: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center", marginTop: 2 },
  body: { paddingHorizontal: 24, paddingBottom: 24, gap: 12 },
  btn: { borderRadius: 14, overflow: "hidden" },
  btnGrad: { height: 50, alignItems: "center", justifyContent: "center" },
  btnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },
});

// ─── Email verify modal ────────────────────────────────────────────────────────
function EmailVerifyModal({ visible, email, onClose, onVerified, isDark }: { visible: boolean; email: string; onClose: () => void; onVerified: () => void; isDark: boolean }) {
  const { accent } = useAppAccent();
  const textColor = isDark ? "#F1F1F1" : "#0F0F0F";
  const mutedColor = isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.45)";
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => { if (visible && !sent) sendCode(); }, [visible]);

  async function sendCode() {
    setSending(true);
    await supabase.auth.resend({ type: "signup", email });
    setSending(false); setSent(true);
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
      <View style={fgSt.header}>
        <View style={{ flex: 1 }}>
          <Text style={[fgSt.title, { color: textColor }]}>Verify Your Email</Text>
          <Text style={[fgSt.subtitle, { color: mutedColor }]}>
            {sending ? "Sending verification code…" : `A 6-digit code was sent to ${email}`}
          </Text>
        </View>
        <TouchableOpacity onPress={onClose} style={fgSt.closeBtn}>
          <Ionicons name="close" size={18} color={mutedColor} />
        </TouchableOpacity>
      </View>
      <View style={fgSt.body}>
        <AuthInput icon="keypad-outline" placeholder="6-digit verification code" value={code} onChangeText={setCode} keyboardType="number-pad" isDark={isDark} returnKeyType="go" onSubmitEditing={verify} />
        <TouchableOpacity style={[fgSt.btn, (loading || sending) && { opacity: 0.6 }]} onPress={verify} disabled={loading || sending} activeOpacity={0.85}>
          <LinearGradient colors={[accent, isDark ? "#005E6E" : "#007A8A"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={fgSt.btnGrad}>
            {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={fgSt.btnText}>Verify Email</Text>}
          </LinearGradient>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => { setCode(""); setSent(false); sendCode(); }} disabled={sending} style={{ alignSelf: "center", paddingVertical: 4 }}>
          <Text style={{ fontSize: 13, fontFamily: "Inter_500Medium", color: accent }}>{sending ? "Sending…" : "Resend code"}</Text>
        </TouchableOpacity>
      </View>
    </GlassModal>
  );
}

// ─── Terms row ─────────────────────────────────────────────────────────────────
function TermsRow({ agreed, onToggle, isDark, accent }: { agreed: boolean; onToggle: () => void; isDark: boolean; accent: string }) {
  const mutedColor = isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.45)";
  return (
    <TouchableOpacity style={termsSt.row} onPress={onToggle} activeOpacity={0.7}>
      <View style={[termsSt.box, { borderColor: agreed ? accent : isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)", backgroundColor: agreed ? accent : "transparent" }]}>
        {agreed && <Ionicons name="checkmark" size={13} color="#fff" />}
      </View>
      <Text style={[termsSt.text, { color: mutedColor }]}>
        I agree to the{" "}
        <Text style={{ color: accent }} onPress={() => Linking.openURL("https://afuchat.com/terms")}>Terms of Service</Text>
        {" "}and{" "}
        <Text style={{ color: accent }} onPress={() => Linking.openURL("https://afuchat.com/privacy")}>Privacy Policy</Text>
      </Text>
    </TouchableOpacity>
  );
}
const termsSt = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  box: { width: 20, height: 20, borderRadius: 6, borderWidth: 1.5, alignItems: "center", justifyContent: "center", marginTop: 1, flexShrink: 0 },
  text: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20 },
});

// ─── Main auth screen ──────────────────────────────────────────────────────────
export default function AuthScreen() {
  const { isDark } = useTheme();
  const { accent } = useAppAccent();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  useEffect(() => { if (user) router.replace("/(tabs)/chats"); }, [user]);

  const [mode, setMode] = useState<"login" | "signup">("login");

  // Login fields
  const [identifier, setIdentifier] = useState("");
  const [loginPwd, setLoginPwd] = useState("");

  // Signup fields
  const [email, setEmail] = useState("");
  const [signupPwd, setSignupPwd] = useState("");
  const [agreed, setAgreed] = useState(false);

  // Shared
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [forgotVisible, setForgotVisible] = useState(false);
  const [verifyVisible, setVerifyVisible] = useState(false);
  const [verifyEmail, setVerifyEmail] = useState("");
  const [signupUserId, setSignupUserId] = useState<string | null>(null);
  const oauthHandledRef = useRef(false);
  const pwdRef = useRef<TextInput>(null);
  const signupPwdRef = useRef<TextInput>(null);

  function switchMode(m: "login" | "signup") {
    setMode(m);
    setShowPwd(false);
  }

  // ─── Identifier helpers ──────────────────────────────────────────────────────
  function detectIdentifierType(raw: string): "email" | "handle" | "phone" {
    const s = raw.trim();
    if (s.includes("@") && /\.\w+$/.test(s.split("@")[1] ?? "")) return "email";
    const digits = s.replace(/[\s\-()+]/g, "");
    if (s.startsWith("+") || /^\d{7,15}$/.test(digits)) return "phone";
    return "handle";
  }

  async function resolveIdentifierToEmail(raw: string): Promise<string | null> {
    try {
      const supaUrl = (process.env.EXPO_PUBLIC_SUPABASE_URL || "").trim().replace(/\/+$/, "");
      const anonKey = (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "").trim();
      if (!supaUrl) return null;
      const res = await fetch(`${supaUrl}/functions/v1/auth-resolve-identifier`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: anonKey },
        body: JSON.stringify({ identifier: raw.trim() }),
      });
      if (!res.ok) return null;
      const json = await res.json();
      return json.email ?? null;
    } catch { return null; }
  }

  // ─── Login ───────────────────────────────────────────────────────────────────
  async function handleLogin() {
    const raw = identifier.trim();
    if (!raw || !loginPwd) return showAlert("Missing fields", "Please enter your credentials and password.");
    setLoading(true);
    let resolvedEmail = raw;
    const type = detectIdentifierType(raw);
    if (type !== "email") {
      const found = await resolveIdentifierToEmail(raw);
      if (!found) {
        setLoading(false);
        showAlert("Account not found", type === "handle" ? "No account with that username." : "No account with that phone number.");
        return;
      }
      resolvedEmail = found;
    }
    const { data, error } = await supabase.auth.signInWithPassword({ email: resolvedEmail, password: loginPwd });
    if (error) { setLoading(false); showAlert("Sign in failed", error.message); return; }
    if (data.user) {
      if (!data.user.email_confirmed_at) {
        await supabase.auth.signOut();
        setLoading(false);
        setVerifyEmail(resolvedEmail); setVerifyVisible(true); return;
      }
      const { data: prof } = await supabase.from("profiles").select("scheduled_deletion_at, account_deleted").eq("id", data.user.id).single();
      if (prof?.account_deleted) {
        setLoading(false); await supabase.auth.signOut();
        showAlert("Account Deleted", "This account has been permanently deleted."); return;
      }
      if (prof?.scheduled_deletion_at) {
        const days = Math.max(0, Math.ceil((new Date(prof.scheduled_deletion_at).getTime() - Date.now()) / 86400000));
        setLoading(false);
        showAlert("Account Scheduled for Deletion", `Your account will be deleted in ${days} day${days !== 1 ? "s" : ""}. Restore it?`, [
          { text: "Delete Anyway", style: "destructive", onPress: async () => supabase.auth.signOut() },
          { text: "Restore", style: "default", onPress: async () => { await supabase.from("profiles").update({ scheduled_deletion_at: null }).eq("id", data.user!.id); router.replace("/(tabs)/chats"); } },
        ]); return;
      }
    }
    setLoading(false);
    router.replace("/(tabs)/chats");
  }

  // ─── Sign up ─────────────────────────────────────────────────────────────────
  async function handleSignup() {
    const e = email.trim();
    if (!e || !signupPwd) return showAlert("Missing fields", "Please enter your email and a password.");
    if (!agreed) return showAlert("Terms required", "You must agree to the Terms of Service and Privacy Policy.");
    if (signupPwd.length < 6) return showAlert("Password too short", "Password must be at least 6 characters.");
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({ email: e, password: signupPwd });
    setLoading(false);
    if (error) { showAlert("Sign up failed", error.message); return; }
    if (data.user) {
      if (data.user.identities && data.user.identities.length === 0) {
        showAlert("Account exists", "An account with this email already exists. Please sign in instead.");
        switchMode("login");
        setIdentifier(e);
        return;
      }
      setSignupUserId(data.user.id);
      if (!data.session) {
        setVerifyEmail(e);
        setVerifyVisible(true);
      } else {
        router.replace({ pathname: "/onboarding", params: { userId: data.user.id } } as any);
      }
    }
  }

  // ─── Google OAuth ─────────────────────────────────────────────────────────────
  async function nativeGoogleSignIn(): Promise<void> {
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
      if (!prof?.onboarding_completed) {
        setOauthLoading(false);
        router.replace({ pathname: "/onboarding", params: { userId: uid } } as any);
        return;
      }
    }
    setOauthLoading(false);
    router.replace("/(tabs)/chats");
  }

  async function webGoogleSignIn(): Promise<void> {
    try {
      setOauthLoading(true);
      const redirectUrl = makeRedirectUri({ native: "afuchat://(auth)/login" });
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
              if (!prof?.onboarding_completed) {
                setOauthLoading(false);
                router.replace({ pathname: "/onboarding", params: { userId: uid } } as any);
                return;
              }
            }
            setOauthLoading(false);
            router.replace("/(tabs)/chats");
            return;
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
    if (Platform.OS === "web") {
      webGoogleSignIn();
    } else {
      nativeGoogleSignIn();
    }
  }

  const identifierType = detectIdentifierType(identifier);
  const identifierIcon = identifierType === "email" ? "mail-outline" : identifierType === "phone" ? "call-outline" : "at-outline";

  return (
    <View style={{ flex: 1, backgroundColor: isDark ? "#0F0F0F" : "#F5F0E8" }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <ScrollView
          contentContainerStyle={[
            sc.scroll,
            { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 32 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo area */}
          <View style={sc.logoWrap}>
            <View style={[sc.logoCircle, { backgroundColor: isDark ? "rgba(0,188,212,0.15)" : "rgba(0,188,212,0.10)", borderColor: isDark ? "rgba(0,188,212,0.30)" : "rgba(0,188,212,0.20)" }]}>
              <AfuLogo size={72} />
            </View>
            <Text style={[sc.appName, { color: isDark ? "#F1F1F1" : "#0F0F0F" }]}>AfuChat</Text>
            <Text style={[sc.tagline, { color: isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.45)" }]}>
              Connect. Discover. Create.
            </Text>
          </View>

          {/* Form card */}
          <View style={[sc.card, { backgroundColor: isDark ? "#1C1C1E" : "#FFFFFF", borderColor: isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.08)", borderWidth: StyleSheet.hairlineWidth }]}>

            {/* Tab switcher */}
            <View style={[sc.tabs, { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)" }]}>
              {(["login", "signup"] as const).map((m) => {
                const active = mode === m;
                return (
                  <TouchableOpacity
                    key={m}
                    style={[sc.tab, active && { backgroundColor: isDark ? "#2C2C2E" : "#FFFFFF", ...Platform.select({ web: { boxShadow: "0 1px 4px rgba(0,0,0,0.10)" } as any, default: { shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 } }) }]}
                    onPress={() => switchMode(m)}
                    activeOpacity={0.7}
                  >
                    <Text style={[sc.tabText, { color: active ? (isDark ? "#F1F1F1" : "#0F0F0F") : (isDark ? "rgba(255,255,255,0.40)" : "rgba(0,0,0,0.38)"), fontFamily: active ? "Inter_600SemiBold" : "Inter_400Regular" }]}>
                      {m === "login" ? "Sign In" : "Sign Up"}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={sc.formInner}>
              {mode === "login" ? (
                <>
                  {/* Login fields */}
                  <View style={{ gap: 10 }}>
                    <AuthInput
                      icon={identifierIcon}
                      placeholder="Email, @username, or phone"
                      value={identifier}
                      onChangeText={setIdentifier}
                      keyboardType={identifierType === "phone" ? "phone-pad" : "email-address"}
                      autoComplete="username"
                      isDark={isDark}
                      returnKeyType="next"
                      onSubmitEditing={() => pwdRef.current?.focus()}
                    />
                    <AuthInput
                      inputRef={pwdRef}
                      icon="lock-closed-outline"
                      placeholder="Password"
                      value={loginPwd}
                      onChangeText={setLoginPwd}
                      secureTextEntry={!showPwd}
                      autoComplete="current-password"
                      isDark={isDark}
                      returnKeyType="go"
                      onSubmitEditing={handleLogin}
                      rightElement={
                        <TouchableOpacity onPress={() => setShowPwd(p => !p)} style={{ padding: 4 }}>
                          <Ionicons name={showPwd ? "eye-off-outline" : "eye-outline"} size={17} color={isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.30)"} />
                        </TouchableOpacity>
                      }
                    />
                  </View>
                  <TouchableOpacity onPress={() => setForgotVisible(true)} style={{ alignSelf: "flex-end", marginTop: -4 }}>
                    <Text style={{ fontSize: 13, fontFamily: "Inter_500Medium", color: accent }}>Forgot password?</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  {/* Signup fields */}
                  <View style={{ gap: 10 }}>
                    <AuthInput
                      icon="mail-outline"
                      placeholder="Email address"
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      autoComplete="email"
                      isDark={isDark}
                      returnKeyType="next"
                      onSubmitEditing={() => signupPwdRef.current?.focus()}
                    />
                    <AuthInput
                      inputRef={signupPwdRef}
                      icon="lock-closed-outline"
                      placeholder="Password (min. 6 characters)"
                      value={signupPwd}
                      onChangeText={setSignupPwd}
                      secureTextEntry={!showPwd}
                      autoComplete="new-password"
                      isDark={isDark}
                      returnKeyType="go"
                      onSubmitEditing={handleSignup}
                      rightElement={
                        <TouchableOpacity onPress={() => setShowPwd(p => !p)} style={{ padding: 4 }}>
                          <Ionicons name={showPwd ? "eye-off-outline" : "eye-outline"} size={17} color={isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.30)"} />
                        </TouchableOpacity>
                      }
                    />
                  </View>
                  <TermsRow agreed={agreed} onToggle={() => setAgreed(p => !p)} isDark={isDark} accent={accent} />
                </>
              )}

              {/* Primary button */}
              <TouchableOpacity
                style={[sc.primaryBtn, loading && { opacity: 0.6 }]}
                onPress={mode === "login" ? handleLogin : handleSignup}
                disabled={loading}
                activeOpacity={0.85}
              >
                <LinearGradient colors={[accent, "#0097A7"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={sc.primaryGrad}>
                  {loading
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={sc.primaryText}>{mode === "login" ? "Sign In" : "Create Account"}</Text>
                  }
                </LinearGradient>
              </TouchableOpacity>

              <OrDivider isDark={isDark} />

              {/* Google button — always white background so the logo is always consistent */}
              <TouchableOpacity
                style={[sc.googleBtn, { backgroundColor: "#FFFFFF", borderColor: isDark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.12)" }]}
                onPress={handleGoogle}
                disabled={oauthLoading}
                activeOpacity={0.75}
              >
                {oauthLoading
                  ? <ActivityIndicator size="small" color="#1A1208" />
                  : (
                    <>
                      <GoogleLogo size={20} />
                      <Text style={sc.googleText}>Continue with Google</Text>
                    </>
                  )
                }
              </TouchableOpacity>

              {/* Legal */}
              <View style={sc.termsRow}>
                <Text style={[sc.termsText, { color: isDark ? "rgba(255,255,255,0.30)" : "rgba(0,0,0,0.30)" }]}>
                  By continuing you agree to our{" "}
                </Text>
                <TouchableOpacity onPress={() => Linking.openURL("https://afuchat.com/terms")}>
                  <Text style={[sc.termsLink, { color: accent }]}>Terms</Text>
                </TouchableOpacity>
                <Text style={[sc.termsText, { color: isDark ? "rgba(255,255,255,0.30)" : "rgba(0,0,0,0.30)" }]}> &amp; </Text>
                <TouchableOpacity onPress={() => Linking.openURL("https://afuchat.com/privacy")}>
                  <Text style={[sc.termsLink, { color: accent }]}>Privacy Policy</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <ForgotPasswordModal visible={forgotVisible} onClose={() => setForgotVisible(false)} isDark={isDark} />
      <EmailVerifyModal
        visible={verifyVisible}
        email={verifyEmail}
        onClose={() => setVerifyVisible(false)}
        onVerified={() => {
          setVerifyVisible(false);
          if (mode === "signup" && signupUserId) {
            router.replace({ pathname: "/onboarding", params: { userId: signupUserId } } as any);
          } else {
            router.replace("/(tabs)/chats");
          }
        }}
        isDark={isDark}
      />
    </View>
  );
}

const sc = StyleSheet.create({
  scroll: { paddingHorizontal: 20, gap: 28 },

  logoWrap: { alignItems: "center", gap: 8 },
  logoCircle: { width: 80, height: 80, borderRadius: 24, alignItems: "center", justifyContent: "center", overflow: "hidden", borderWidth: 1 },
  appName: { fontSize: 30, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  tagline: { fontSize: 14, fontFamily: "Inter_400Regular" },

  card: { borderRadius: 24, overflow: "hidden" },

  tabs: { flexDirection: "row", margin: 12, borderRadius: 14, padding: 4, gap: 4 },
  tab: { flex: 1, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  tabText: { fontSize: 14 },

  formInner: { paddingHorizontal: 20, paddingBottom: 24, gap: 14 },

  primaryBtn: { borderRadius: 12, overflow: "hidden" },
  primaryGrad: { height: 52, alignItems: "center", justifyContent: "center" },
  primaryText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold", letterSpacing: 0.2 },

  googleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    height: 50,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    ...Platform.select({
      web: { boxShadow: "0 1px 4px rgba(0,0,0,0.10)" } as any,
      default: { shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.10, shadowRadius: 4, elevation: 2 },
    }),
  },
  googleText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#1A1208" },

  termsRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "center" },
  termsText: { fontSize: 11.5, fontFamily: "Inter_400Regular" },
  termsLink: { fontSize: 11.5, fontFamily: "Inter_600SemiBold" },
});
