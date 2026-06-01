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

// ─── Brand constants ────────────────────────────────────────────────────────────
const BRAND_TEAL = "#00BCD4";
const LOGO_BG = "rgba(0,188,212,0.15)";
const LOGO_BORDER = "rgba(0,188,212,0.32)";
const TERMS_URL = "https://afuchat.com/terms";
const PRIVACY_URL = "https://afuchat.com/privacy";
const COOKIES_URL = "https://afuchat.com/cookies";
const HELP_URL = "https://afuchat.com/help";
const DATA_URL = "https://afuchat.com/data-processing";

// ─── AuthInput ─────────────────────────────────────────────────────────────────
function AuthInput({ icon, placeholder, value, onChangeText, secureTextEntry, keyboardType, autoCapitalize, autoComplete, isDark, rightElement, onSubmitEditing, returnKeyType, inputRef }: any) {
  const [focused, setFocused] = useState(false);
  const { accent } = useAppAccent();
  return (
    <View style={[inpSt.wrap, {
      backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
      borderColor: focused ? accent + "70" : isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.10)",
      borderWidth: 1,
    }]}>
      <Ionicons
        name={icon} size={17}
        color={focused ? accent : isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.30)"}
        style={inpSt.icon}
      />
      <TextInput
        ref={inputRef}
        style={[inpSt.text, { color: isDark ? "#F1F1F1" : "#0F0F0F" }]}
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
const inpSt = StyleSheet.create({
  wrap: { flexDirection: "row", alignItems: "center", borderRadius: 12, paddingHorizontal: 14, height: 52 },
  icon: { marginRight: 10 },
  text: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular", height: 52, outlineStyle: "none" } as any,
});

// ─── OrDivider ─────────────────────────────────────────────────────────────────
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

// ─── GlassModal ────────────────────────────────────────────────────────────────
function GlassModal({ visible, onClose, isDark, children }: { visible: boolean; onClose: () => void; isDark: boolean; children: React.ReactNode }) {
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(opacity, { toValue: visible ? 1 : 0, duration: 220, useNativeDriver: true }).start();
  }, [visible]);
  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[mdSt.overlay, { opacity, backgroundColor: isDark ? "rgba(0,0,0,0.72)" : "rgba(0,0,0,0.48)" }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[mdSt.card, { backgroundColor: isDark ? "#1C1C1E" : "#FFFFFF", borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)", borderWidth: StyleSheet.hairlineWidth }]}>
          {children}
        </View>
      </Animated.View>
    </Modal>
  );
}
const mdSt = StyleSheet.create({
  overlay: { flex: 1, alignItems: "center", justifyContent: "center", padding: 20 },
  card: { width: "100%", maxWidth: 420, borderRadius: 24, overflow: "hidden" },
});

// ─── ModalHeader ───────────────────────────────────────────────────────────────
function ModalHeader({ title, subtitle, onClose, isDark }: { title: string; subtitle?: string; onClose: () => void; isDark: boolean }) {
  const textColor = isDark ? "#F1F1F1" : "#0F0F0F";
  const mutedColor = isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.45)";
  return (
    <View style={mhSt.row}>
      <View style={{ flex: 1 }}>
        <Text style={[mhSt.title, { color: textColor }]}>{title}</Text>
        {subtitle ? <Text style={[mhSt.sub, { color: mutedColor }]}>{subtitle}</Text> : null}
      </View>
      <TouchableOpacity onPress={onClose} style={mhSt.closeBtn}>
        <Ionicons name="close" size={18} color={mutedColor} />
      </TouchableOpacity>
    </View>
  );
}
const mhSt = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-start", paddingHorizontal: 24, paddingTop: 24, paddingBottom: 16, gap: 12 },
  title: { fontSize: 20, fontFamily: "Inter_700Bold", letterSpacing: -0.3, marginBottom: 4 },
  sub: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },
  closeBtn: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center", marginTop: 2 },
});

// ─── ModalActionBtn ────────────────────────────────────────────────────────────
function ModalActionBtn({ label, onPress, loading, accent }: { label: string; onPress: () => void; loading: boolean; accent: string }) {
  return (
    <TouchableOpacity style={[mabSt.btn, loading && { opacity: 0.6 }]} onPress={onPress} disabled={loading} activeOpacity={0.85}>
      <LinearGradient colors={[accent, "#0097A7"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={mabSt.grad}>
        {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={mabSt.text}>{label}</Text>}
      </LinearGradient>
    </TouchableOpacity>
  );
}
const mabSt = StyleSheet.create({
  btn: { borderRadius: 14, overflow: "hidden" },
  grad: { height: 50, alignItems: "center", justifyContent: "center" },
  text: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },
});

// ─── ForgotPasswordModal ───────────────────────────────────────────────────────
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
      <View style={fpSt.body}>
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
const fpSt = StyleSheet.create({
  body: { paddingHorizontal: 24, paddingBottom: 24, gap: 12 },
});

// ─── EmailVerifyModal ──────────────────────────────────────────────────────────
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
      <View style={fpSt.body}>
        <AuthInput icon="keypad-outline" placeholder="6-digit verification code" value={code} onChangeText={setCode} keyboardType="number-pad" isDark={isDark} returnKeyType="go" onSubmitEditing={verify} />
        <ModalActionBtn label="Verify Email" onPress={verify} loading={loading || sending} accent={accent} />
        <TouchableOpacity onPress={() => { setCode(""); sentRef.current = false; sendCode(); }} disabled={sending} style={{ alignSelf: "center", paddingVertical: 4 }}>
          <Text style={{ fontSize: 13, fontFamily: "Inter_500Medium", color: accent }}>{sending ? "Sending…" : "Resend code"}</Text>
        </TouchableOpacity>
      </View>
    </GlassModal>
  );
}

// ─── Checkbox ─────────────────────────────────────────────────────────────────
function Checkbox({ checked, onToggle, isDark, accent, children }: { checked: boolean; onToggle: () => void; isDark: boolean; accent: string; children: React.ReactNode }) {
  return (
    <TouchableOpacity style={cbSt.row} onPress={onToggle} activeOpacity={0.7}>
      <View style={[cbSt.box, { borderColor: checked ? accent : isDark ? "rgba(255,255,255,0.22)" : "rgba(0,0,0,0.20)", backgroundColor: checked ? accent : "transparent" }]}>
        {checked && <Ionicons name="checkmark" size={12} color="#fff" />}
      </View>
      <View style={{ flex: 1 }}>{children}</View>
    </TouchableOpacity>
  );
}
const cbSt = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  box: { width: 20, height: 20, borderRadius: 6, borderWidth: 1.5, alignItems: "center", justifyContent: "center", marginTop: 1, flexShrink: 0 },
});

// ─── LegalLink ─────────────────────────────────────────────────────────────────
function LegalLink({ label, url, accent }: { label: string; url: string; accent: string }) {
  return <Text style={{ color: accent, fontFamily: "Inter_500Medium" }} onPress={() => Linking.openURL(url)}>{label}</Text>;
}

// ─── LegalFooter ───────────────────────────────────────────────────────────────
function LegalFooter({ isDark, accent }: { isDark: boolean; accent: string }) {
  const muted = isDark ? "rgba(255,255,255,0.28)" : "rgba(0,0,0,0.28)";
  const divider = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)";
  return (
    <View style={lfSt.wrap}>
      <View style={[lfSt.divider, { backgroundColor: divider }]} />

      {/* Trust badges */}
      <View style={lfSt.badges}>
        <View style={lfSt.badge}>
          <Ionicons name="shield-checkmark-outline" size={13} color={muted} />
          <Text style={[lfSt.badgeText, { color: muted }]}>256-bit encryption</Text>
        </View>
        <View style={lfSt.badge}>
          <Ionicons name="lock-closed-outline" size={13} color={muted} />
          <Text style={[lfSt.badgeText, { color: muted }]}>Data never sold</Text>
        </View>
        <View style={lfSt.badge}>
          <Ionicons name="globe-outline" size={13} color={muted} />
          <Text style={[lfSt.badgeText, { color: muted }]}>GDPR compliant</Text>
        </View>
      </View>

      {/* Legal links */}
      <View style={lfSt.linksRow}>
        <Text style={[lfSt.link, { color: accent }]} onPress={() => Linking.openURL(TERMS_URL)}>Terms</Text>
        <Text style={[lfSt.dot, { color: muted }]}>·</Text>
        <Text style={[lfSt.link, { color: accent }]} onPress={() => Linking.openURL(PRIVACY_URL)}>Privacy</Text>
        <Text style={[lfSt.dot, { color: muted }]}>·</Text>
        <Text style={[lfSt.link, { color: accent }]} onPress={() => Linking.openURL(COOKIES_URL)}>Cookies</Text>
        <Text style={[lfSt.dot, { color: muted }]}>·</Text>
        <Text style={[lfSt.link, { color: accent }]} onPress={() => Linking.openURL(HELP_URL)}>Help</Text>
      </View>

      {/* Data notice */}
      <Text style={[lfSt.notice, { color: muted }]}>
        By continuing you acknowledge our{" "}
        <Text style={{ color: accent }} onPress={() => Linking.openURL(DATA_URL)}>Data Processing Policy</Text>
        . You may withdraw consent at any time from Settings.
      </Text>

      {/* Copyright */}
      <Text style={[lfSt.copy, { color: isDark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.18)" }]}>
        © {new Date().getFullYear()} AfuChat Technologies Limited · Uganda
      </Text>
    </View>
  );
}
const lfSt = StyleSheet.create({
  wrap: { gap: 12, paddingTop: 4 },
  divider: { height: StyleSheet.hairlineWidth },
  badges: { flexDirection: "row", justifyContent: "center", gap: 14, flexWrap: "wrap" },
  badge: { flexDirection: "row", alignItems: "center", gap: 4 },
  badgeText: { fontSize: 11, fontFamily: "Inter_400Regular" },
  linksRow: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 6 },
  link: { fontSize: 12.5, fontFamily: "Inter_500Medium" },
  dot: { fontSize: 12 },
  notice: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 17 },
  copy: { fontSize: 10.5, fontFamily: "Inter_400Regular", textAlign: "center" },
});

// ─── SignupLegal ───────────────────────────────────────────────────────────────
function SignupLegal({ ageOk, termsOk, onToggleAge, onToggleTerms, isDark, accent }: {
  ageOk: boolean; termsOk: boolean;
  onToggleAge: () => void; onToggleTerms: () => void;
  isDark: boolean; accent: string;
}) {
  const muted = isDark ? "rgba(255,255,255,0.50)" : "rgba(0,0,0,0.50)";
  return (
    <View style={{ gap: 10 }}>
      {/* Age gate */}
      <Checkbox checked={ageOk} onToggle={onToggleAge} isDark={isDark} accent={accent}>
        <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: muted, lineHeight: 19 }}>
          I confirm that I am{" "}
          <Text style={{ fontFamily: "Inter_600SemiBold", color: isDark ? "#F1F1F1" : "#0F0F0F" }}>13 years of age or older</Text>
          {" "}(required by COPPA &amp; local regulations)
        </Text>
      </Checkbox>

      {/* Terms + Privacy */}
      <Checkbox checked={termsOk} onToggle={onToggleTerms} isDark={isDark} accent={accent}>
        <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: muted, lineHeight: 19 }}>
          I agree to AfuChat's{" "}
          <LegalLink label="Terms of Service" url={TERMS_URL} accent={accent} />
          {" "}and{" "}
          <LegalLink label="Privacy Policy" url={PRIVACY_URL} accent={accent} />
          , including how we handle your personal data
        </Text>
      </Checkbox>
    </View>
  );
}

// ─── Main AuthScreen ───────────────────────────────────────────────────────────
export default function AuthScreen() {
  const { isDark } = useTheme();
  const { accent } = useAppAccent();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  useEffect(() => { if (user) router.replace("/(tabs)/chats"); }, [user]);

  const [mode, setMode] = useState<"login" | "signup">("login");

  // Login state
  const [identifier, setIdentifier] = useState("");
  const [loginPwd, setLoginPwd] = useState("");
  const [showLoginPwd, setShowLoginPwd] = useState(false);

  // Signup state
  const [email, setEmail] = useState("");
  const [signupPwd, setSignupPwd] = useState("");
  const [showSignupPwd, setShowSignupPwd] = useState(false);
  const [ageOk, setAgeOk] = useState(false);
  const [termsOk, setTermsOk] = useState(false);

  // Shared state
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [forgotVisible, setForgotVisible] = useState(false);
  const [verifyVisible, setVerifyVisible] = useState(false);
  const [verifyEmail, setVerifyEmail] = useState("");
  const [signupUserId, setSignupUserId] = useState<string | null>(null);
  const oauthHandledRef = useRef(false);
  const loginPwdRef = useRef<TextInput>(null);
  const signupPwdRef = useRef<TextInput>(null);

  function switchMode(m: "login" | "signup") {
    setMode(m);
    setShowLoginPwd(false);
    setShowSignupPwd(false);
  }

  // ─── Identifier helpers ──────────────────────────────────────────────────────
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

  // ─── Login ───────────────────────────────────────────────────────────────────
  async function handleLogin() {
    const raw = identifier.trim();
    if (!raw || !loginPwd) return showAlert("Missing fields", "Please enter your email/username and password.");
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

  // ─── Signup ──────────────────────────────────────────────────────────────────
  async function handleSignup() {
    const e = email.trim();
    if (!e || !signupPwd) return showAlert("Missing fields", "Please enter your email and a password.");
    if (!ageOk) return showAlert("Age required", "You must confirm that you are 13 years of age or older.");
    if (!termsOk) return showAlert("Terms required", "You must agree to the Terms of Service and Privacy Policy.");
    if (signupPwd.length < 8) return showAlert("Password too short", "Password must be at least 8 characters.");
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({ email: e, password: signupPwd });
    setLoading(false);
    if (error) { showAlert("Sign up failed", error.message); return; }
    if (data.user) {
      if (data.user.identities && data.user.identities.length === 0) {
        showAlert("Account exists", "An account with this email already exists. Please sign in instead.");
        switchMode("login"); setIdentifier(e); return;
      }
      setSignupUserId(data.user.id);
      if (!data.session) { setVerifyEmail(e); setVerifyVisible(true); }
      else router.replace({ pathname: "/onboarding", params: { userId: data.user.id } } as any);
    }
  }

  // ─── Google OAuth ─────────────────────────────────────────────────────────────
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
          contentContainerStyle={[sc.scroll, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 32 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ─── Brand logo ─── */}
          <View style={sc.logoWrap}>
            {/* Logo circle: same brand teal color in both dark and light */}
            <View style={[sc.logoCircle, { backgroundColor: LOGO_BG, borderColor: LOGO_BORDER }]}>
              <AfuLogo size={68} />
            </View>
            <Text style={[sc.appName, { color: isDark ? "#F1F1F1" : "#0F0F0F" }]}>AfuChat</Text>
            <Text style={[sc.tagline, { color: isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.45)" }]}>
              Connect · Discover · Create
            </Text>
          </View>

          {/* ─── Form card ─── */}
          <View style={[sc.card, { backgroundColor: isDark ? "#1C1C1E" : "#FFFFFF", borderColor: isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.08)", borderWidth: StyleSheet.hairlineWidth }]}>

            {/* Tab switcher */}
            <View style={[sc.tabs, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)" }]}>
              {(["login", "signup"] as const).map((m) => {
                const active = mode === m;
                return (
                  <TouchableOpacity
                    key={m}
                    style={[sc.tab, active && {
                      backgroundColor: isDark ? "#2C2C2E" : "#FFFFFF",
                      ...Platform.select({ web: { boxShadow: "0 1px 4px rgba(0,0,0,0.10)" } as any, default: { shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 } }),
                    }]}
                    onPress={() => switchMode(m)} activeOpacity={0.7}
                  >
                    <Text style={[sc.tabText, { color: active ? (isDark ? "#F1F1F1" : "#0F0F0F") : (isDark ? "rgba(255,255,255,0.38)" : "rgba(0,0,0,0.36)"), fontFamily: active ? "Inter_600SemiBold" : "Inter_400Regular" }]}>
                      {m === "login" ? "Sign In" : "Sign Up"}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={sc.formInner}>

              {/* ── Sign In fields ── */}
              {mode === "login" ? (
                <>
                  <View style={{ gap: 10 }}>
                    <AuthInput
                      icon={idIcon} placeholder="Email, @username, or phone"
                      value={identifier} onChangeText={setIdentifier}
                      keyboardType={idType === "phone" ? "phone-pad" : "email-address"}
                      autoComplete="username" isDark={isDark}
                      returnKeyType="next" onSubmitEditing={() => loginPwdRef.current?.focus()}
                    />
                    <AuthInput
                      inputRef={loginPwdRef} icon="lock-closed-outline" placeholder="Password"
                      value={loginPwd} onChangeText={setLoginPwd}
                      secureTextEntry={!showLoginPwd} autoComplete="current-password"
                      isDark={isDark} returnKeyType="go" onSubmitEditing={handleLogin}
                      rightElement={
                        <TouchableOpacity onPress={() => setShowLoginPwd(p => !p)} style={{ padding: 4 }}>
                          <Ionicons name={showLoginPwd ? "eye-off-outline" : "eye-outline"} size={17} color={isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.30)"} />
                        </TouchableOpacity>
                      }
                    />
                  </View>
                  <TouchableOpacity onPress={() => setForgotVisible(true)} style={{ alignSelf: "flex-end", marginTop: -4 }}>
                    <Text style={{ fontSize: 13, fontFamily: "Inter_500Medium", color: accent }}>Forgot password?</Text>
                  </TouchableOpacity>
                </>
              ) : (
                /* ── Sign Up fields ── */
                <>
                  <View style={{ gap: 10 }}>
                    <AuthInput
                      icon="mail-outline" placeholder="Email address"
                      value={email} onChangeText={setEmail}
                      keyboardType="email-address" autoComplete="email"
                      isDark={isDark} returnKeyType="next"
                      onSubmitEditing={() => signupPwdRef.current?.focus()}
                    />
                    <AuthInput
                      inputRef={signupPwdRef} icon="lock-closed-outline"
                      placeholder="Password (min. 8 characters)"
                      value={signupPwd} onChangeText={setSignupPwd}
                      secureTextEntry={!showSignupPwd} autoComplete="new-password"
                      isDark={isDark} returnKeyType="go" onSubmitEditing={handleSignup}
                      rightElement={
                        <TouchableOpacity onPress={() => setShowSignupPwd(p => !p)} style={{ padding: 4 }}>
                          <Ionicons name={showSignupPwd ? "eye-off-outline" : "eye-outline"} size={17} color={isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.30)"} />
                        </TouchableOpacity>
                      }
                    />
                  </View>

                  {/* Legal checkboxes */}
                  <SignupLegal
                    ageOk={ageOk} termsOk={termsOk}
                    onToggleAge={() => setAgeOk(p => !p)}
                    onToggleTerms={() => setTermsOk(p => !p)}
                    isDark={isDark} accent={accent}
                  />
                </>
              )}

              {/* Primary action button */}
              <TouchableOpacity
                style={[sc.primaryBtn, loading && { opacity: 0.6 }]}
                onPress={mode === "login" ? handleLogin : handleSignup}
                disabled={loading} activeOpacity={0.85}
              >
                <LinearGradient colors={[accent, "#0097A7"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={sc.primaryGrad}>
                  {loading
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={sc.primaryText}>{mode === "login" ? "Sign In" : "Create Account"}</Text>
                  }
                </LinearGradient>
              </TouchableOpacity>

              <OrDivider isDark={isDark} />

              {/* Google — always white background for brand consistency */}
              <TouchableOpacity
                style={[sc.googleBtn, { borderColor: isDark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.12)" }]}
                onPress={handleGoogle} disabled={oauthLoading} activeOpacity={0.75}
              >
                {oauthLoading
                  ? <ActivityIndicator size="small" color="#3C4043" />
                  : <><GoogleLogo size={20} /><Text style={sc.googleText}>Continue with Google</Text></>
                }
              </TouchableOpacity>

              {/* Legal footer */}
              <LegalFooter isDark={isDark} accent={accent} />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <ForgotPasswordModal visible={forgotVisible} onClose={() => setForgotVisible(false)} isDark={isDark} />
      <EmailVerifyModal
        visible={verifyVisible} email={verifyEmail}
        onClose={() => setVerifyVisible(false)}
        onVerified={() => {
          setVerifyVisible(false);
          if (mode === "signup" && signupUserId) router.replace({ pathname: "/onboarding", params: { userId: signupUserId } } as any);
          else router.replace("/(tabs)/chats");
        }}
        isDark={isDark}
      />
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const sc = StyleSheet.create({
  scroll: { paddingHorizontal: 20, gap: 28 },

  logoWrap: { alignItems: "center", gap: 8 },
  logoCircle: {
    width: 84, height: 84, borderRadius: 24,
    alignItems: "center", justifyContent: "center",
    overflow: "hidden", borderWidth: 1.5,
  },
  appName: { fontSize: 30, fontFamily: "Inter_700Bold", letterSpacing: -0.5, marginTop: 4 },
  tagline: { fontSize: 14, fontFamily: "Inter_400Regular" },

  card: { borderRadius: 24, overflow: "hidden" },

  tabs: { flexDirection: "row", margin: 12, borderRadius: 14, padding: 4, gap: 4 },
  tab: { flex: 1, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  tabText: { fontSize: 14 },

  formInner: { paddingHorizontal: 20, paddingBottom: 20, gap: 14 },

  primaryBtn: { borderRadius: 14, overflow: "hidden" },
  primaryGrad: { height: 52, alignItems: "center", justifyContent: "center" },
  primaryText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold", letterSpacing: 0.2 },

  googleBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 10, height: 50, borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: StyleSheet.hairlineWidth,
    ...Platform.select({
      web: { boxShadow: "0 1px 6px rgba(0,0,0,0.12)" } as any,
      default: { shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.12, shadowRadius: 4, elevation: 2 },
    }),
  },
  googleText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#3C4043" },
});
