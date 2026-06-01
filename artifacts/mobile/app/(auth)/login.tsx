import React, { useState, useRef, useEffect } from "react";
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
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

const BRAND_TEAL = "#00BCD4";

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

// ─── ModalActionBtn ───────────────────────────────────────────────────────────
function ModalActionBtn({ label, onPress, loading, accent }: { label: string; onPress: () => void; loading: boolean; accent: string }) {
  return (
    <TouchableOpacity style={[ma.btn, loading && { opacity: 0.6 }]} onPress={onPress} disabled={loading} activeOpacity={0.85}>
      <LinearGradient colors={[accent, "#0097A7"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={ma.grad}>
        {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={ma.text}>{label}</Text>}
      </LinearGradient>
    </TouchableOpacity>
  );
}
const ma = StyleSheet.create({
  btn: { borderRadius: 14, overflow: "hidden" },
  grad: { height: 50, alignItems: "center", justifyContent: "center" },
  text: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },
});

// ─── ForgotPasswordModal ──────────────────────────────────────────────────────
function ForgotPasswordModal({ visible, onClose, isDark }: { visible: boolean; onClose: () => void; isDark: boolean }) {
  const { accent } = useAppAccent();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const mutedColor = isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.30)";

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
    if (!code.trim()) return showAlert("Enter code", "Check your email for the 6-digit code.");
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
      <ModalHeader
        title={step === "email" ? "Reset Password" : "Create New Password"}
        subtitle={step === "email" ? "Enter your email to receive a reset code" : `Code sent to ${email}`}
        onClose={onClose} isDark={isDark}
      />
      <View style={{ paddingHorizontal: 24, paddingBottom: 24, gap: 12 }}>
        {step === "email" ? (
          <>
            <AuthInput icon="mail-outline" placeholder="Email address" value={email} onChangeText={setEmail} keyboardType="email-address" autoComplete="email" isDark={isDark} returnKeyType="go" onSubmitEditing={sendCode} />
            <ModalActionBtn label="Send Reset Code" onPress={sendCode} loading={loading} accent={accent} />
          </>
        ) : (
          <>
            <AuthInput icon="keypad-outline" placeholder="6-digit code from email" value={code} onChangeText={setCode} keyboardType="number-pad" isDark={isDark} />
            <AuthInput icon="lock-closed-outline" placeholder="New password" value={newPwd} onChangeText={setNewPwd} secureTextEntry={!showPwd} isDark={isDark}
              rightElement={<TouchableOpacity onPress={() => setShowPwd(p => !p)} style={{ padding: 4 }}><Ionicons name={showPwd ? "eye-off-outline" : "eye-outline"} size={17} color={mutedColor} /></TouchableOpacity>}
            />
            <AuthInput icon="lock-closed-outline" placeholder="Confirm new password" value={confirmPwd} onChangeText={setConfirmPwd} secureTextEntry={!showPwd} isDark={isDark} returnKeyType="go" onSubmitEditing={doReset} />
            <ModalActionBtn label="Update Password" onPress={doReset} loading={loading} accent={accent} />
            <TouchableOpacity onPress={() => setStep("email")} style={{ alignSelf: "center", paddingVertical: 4 }}>
              <Text style={{ fontSize: 13, fontFamily: "Inter_500Medium", color: accent }}>← Back / Resend code</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </GlassModal>
  );
}

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
        <ModalActionBtn label="Verify Email" onPress={verify} loading={loading || sending} accent={accent} />
        <TouchableOpacity onPress={() => { setCode(""); sentRef.current = false; sendCode(); }} disabled={sending} style={{ alignSelf: "center", paddingVertical: 4 }}>
          <Text style={{ fontSize: 13, fontFamily: "Inter_500Medium", color: accent }}>{sending ? "Sending…" : "Resend code"}</Text>
        </TouchableOpacity>
      </View>
    </GlassModal>
  );
}

// ─── SignInScreen ─────────────────────────────────────────────────────────────
export default function SignInScreen() {
  const { isDark } = useTheme();
  const { accent } = useAppAccent();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  useEffect(() => { if (user) router.replace("/(tabs)/chats"); }, [user]);

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [forgotVisible, setForgotVisible] = useState(false);
  const [verifyVisible, setVerifyVisible] = useState(false);
  const [verifyEmail, setVerifyEmail] = useState("");
  const pwdRef = useRef<TextInput>(null);
  const oauthHandledRef = useRef(false);

  const textColor = isDark ? "#F1F1F1" : "#0F0F0F";
  const mutedColor = isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.45)";

  // ── Identifier helpers ──────────────────────────────────────────────────────
  function detectType(raw: string): "email" | "handle" | "phone" {
    const s = raw.trim();
    if (s.includes("@") && /\.\w+$/.test(s.split("@")[1] ?? "")) return "email";
    if (s.startsWith("+") || /^\d{7,15}$/.test(s.replace(/[\s\-()+]/g, ""))) return "phone";
    return "handle";
  }

  async function resolveToEmail(raw: string): Promise<string | null> {
    try {
      const base = (process.env.EXPO_PUBLIC_SUPABASE_URL || "").trim().replace(/\/+$/, "");
      const anon = (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "").trim();
      if (!base) return null;
      const res = await fetch(`${base}/functions/v1/auth-resolve-identifier`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: anon },
        body: JSON.stringify({ identifier: raw.trim() }),
      });
      const json = await res.json();
      return json.email ?? null;
    } catch { return null; }
  }

  // ── Login ───────────────────────────────────────────────────────────────────
  async function handleLogin() {
    const raw = identifier.trim();
    if (!raw || !password) return showAlert("Missing fields", "Please enter your email/username and password.");
    setLoading(true);
    let resolvedEmail = raw;
    const type = detectType(raw);
    if (type !== "email") {
      const found = await resolveToEmail(raw);
      if (!found) {
        setLoading(false);
        showAlert("Account not found", type === "handle" ? "No account found for that username." : "No account found for that phone number.");
        return;
      }
      resolvedEmail = found;
    }
    const { data, error } = await supabase.auth.signInWithPassword({ email: resolvedEmail, password });
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

  const idType = detectType(identifier);
  const idIcon = idType === "email" ? "mail-outline" : idType === "phone" ? "call-outline" : "at-outline";

  return (
    <View style={{ flex: 1, backgroundColor: isDark ? "#0F0F0F" : "#F5F0E8" }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: insets.top + 24, paddingBottom: insets.bottom + 32, gap: 28 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo */}
          <View style={{ alignItems: "center", gap: 8 }}>
            <AfuLogo size={80} />
            <Text style={{ fontSize: 30, fontFamily: "Inter_700Bold", letterSpacing: -0.5, marginTop: 4, color: textColor }}>AfuChat</Text>
            <Text style={{ fontSize: 14, fontFamily: "Inter_400Regular", color: mutedColor }}>Connect · Discover · Create</Text>
          </View>

          {/* Card */}
          <View style={[sc.card, { backgroundColor: isDark ? "#1C1C1E" : "#FFFFFF", borderColor: isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.08)", borderWidth: StyleSheet.hairlineWidth }]}>
            <View style={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 8 }}>
              <Text style={{ fontSize: 22, fontFamily: "Inter_700Bold", letterSpacing: -0.4, color: textColor }}>Welcome back</Text>
              <Text style={{ fontSize: 14, fontFamily: "Inter_400Regular", color: mutedColor, marginTop: 4 }}>Sign in to your account</Text>
            </View>

            <View style={{ paddingHorizontal: 20, paddingBottom: 24, gap: 14 }}>
              {/* Fields */}
              <View style={{ gap: 10 }}>
                <AuthInput
                  icon={idIcon}
                  placeholder="Email, @username, or phone"
                  value={identifier} onChangeText={setIdentifier}
                  keyboardType={idType === "phone" ? "phone-pad" : "email-address"}
                  autoComplete="username" isDark={isDark}
                  returnKeyType="next" onSubmitEditing={() => pwdRef.current?.focus()}
                />
                <AuthInput
                  inputRef={pwdRef}
                  icon="lock-closed-outline" placeholder="Password"
                  value={password} onChangeText={setPassword}
                  secureTextEntry={!showPwd} autoComplete="current-password"
                  isDark={isDark} returnKeyType="go" onSubmitEditing={handleLogin}
                  rightElement={
                    <TouchableOpacity onPress={() => setShowPwd(p => !p)} style={{ padding: 4 }}>
                      <Ionicons name={showPwd ? "eye-off-outline" : "eye-outline"} size={17} color={isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.30)"} />
                    </TouchableOpacity>
                  }
                />
              </View>

              {/* Forgot password */}
              <TouchableOpacity onPress={() => setForgotVisible(true)} style={{ alignSelf: "flex-end", marginTop: -6 }}>
                <Text style={{ fontSize: 13, fontFamily: "Inter_500Medium", color: accent }}>Forgot password?</Text>
              </TouchableOpacity>

              {/* Sign In button */}
              <TouchableOpacity style={[sc.primaryBtn, loading && { opacity: 0.6 }]} onPress={handleLogin} disabled={loading} activeOpacity={0.85}>
                <LinearGradient colors={[accent, "#0097A7"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={sc.primaryGrad}>
                  {loading
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={sc.primaryText}>Sign In</Text>
                  }
                </LinearGradient>
              </TouchableOpacity>

              <OrDivider isDark={isDark} />

              {/* Google */}
              <TouchableOpacity style={sc.googleBtn} onPress={handleGoogle} disabled={oauthLoading} activeOpacity={0.75}>
                {oauthLoading
                  ? <ActivityIndicator size="small" color="#3C4043" />
                  : <><GoogleLogo size={20} /><Text style={sc.googleText}>Continue with Google</Text></>
                }
              </TouchableOpacity>

              {/* Switch to register */}
              <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 4, marginTop: 2 }}>
                <Text style={{ fontSize: 14, fontFamily: "Inter_400Regular", color: mutedColor }}>Don't have an account?</Text>
                <TouchableOpacity onPress={() => router.push("/(auth)/register")} activeOpacity={0.7}>
                  <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: accent }}>Sign Up</Text>
                </TouchableOpacity>
              </View>

              {/* Footer */}
              <View style={{ borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)", paddingTop: 14, gap: 8 }}>
                <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 6 }}>
                  <Text style={[sc.footerLink, { color: accent }]} onPress={() => router.push("/terms")}>Terms</Text>
                  <Text style={{ color: mutedColor, fontSize: 12 }}>·</Text>
                  <Text style={[sc.footerLink, { color: accent }]} onPress={() => router.push("/privacy")}>Privacy</Text>
                  <Text style={{ color: mutedColor, fontSize: 12 }}>·</Text>
                  <Text style={[sc.footerLink, { color: accent }]} onPress={() => router.push("/help")}>Help</Text>
                </View>
                <Text style={{ fontSize: 10.5, fontFamily: "Inter_400Regular", textAlign: "center", color: isDark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.18)" }}>
                  © {new Date().getFullYear()} AfuChat Technologies Limited
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <ForgotPasswordModal visible={forgotVisible} onClose={() => setForgotVisible(false)} isDark={isDark} />
      <EmailVerifyModal
        visible={verifyVisible} email={verifyEmail}
        onClose={() => setVerifyVisible(false)}
        onVerified={() => { setVerifyVisible(false); router.replace("/(tabs)/chats"); }}
        isDark={isDark}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const sc = StyleSheet.create({
  card: { borderRadius: 24, overflow: "hidden" },
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
