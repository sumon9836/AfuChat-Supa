import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Animated,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import QRCode from "@/components/ui/QRCode";
import { LinearGradient } from "@/components/ui/SafeGradient";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/hooks/useTheme";
import { showAlert } from "@/lib/alert";
import { TwoFactorGate } from "@/components/ui/TwoFactorGate";
import * as Haptics from "@/lib/haptics";
import { GlassHeader } from "@/components/ui/GlassHeader";
import { GlassCard } from "@/components/ui/GlassCard";

// ─── Step machine ─────────────────────────────────────────────────────────────
type Step =
  | { id: "loading" }
  | { id: "status"; enrolled: boolean; factorId?: string }
  | { id: "enroll"; factorId: string; uri: string; secret: string }
  | { id: "recovery-email" }
  | { id: "recovery-otp"; email: string };

// ─── Instruction step row ──────────────────────────────────────────────────────
function InstructionRow({ n, text, colors }: { n: number; text: string; colors: any }) {
  return (
    <View style={ins.row}>
      <View style={ins.numWrap}>
        <Text style={ins.num}>{n}</Text>
      </View>
      <Text style={[ins.text, { color: colors.textSecondary }]}>{text}</Text>
    </View>
  );
}
const ins = StyleSheet.create({
  row:     { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  numWrap: { width: 22, height: 22, borderRadius: 11, backgroundColor: "#5856D6", alignItems: "center", justifyContent: "center", marginTop: 1, flexShrink: 0 },
  num:     { color: "#fff", fontSize: 12, fontFamily: "Inter_700Bold" },
  text:    { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20 },
});

// ─── OTP digit display ────────────────────────────────────────────────────────
function OtpBoxes({ value, error, colors }: { value: string; error: boolean; colors: any }) {
  const digits = value.split("").concat(Array(6 - value.length).fill(""));
  return (
    <View style={otp.row}>
      {digits.map((d, i) => (
        <View key={i} style={[otp.box, {
          backgroundColor: colors.inputBg,
          borderColor: error ? "#FF3B30" : d ? "#5856D6" : colors.border,
          borderWidth: d ? 2 : 1,
        }]}>
          <Text style={[otp.digit, { color: colors.text }]}>{d || ""}</Text>
        </View>
      ))}
    </View>
  );
}
const otp = StyleSheet.create({
  row:   { flexDirection: "row", gap: 8, justifyContent: "center" },
  box:   { width: 44, height: 52, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  digit: { fontSize: 22, fontFamily: "Inter_700Bold", letterSpacing: 0 },
});

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function TwoFactorScreen() {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState<Step>({ id: "loading" });

  // Enrollment state
  const [scannedAck, setScannedAck] = useState(false);          // checkbox: "I can see a rotating code"
  const [verifyCode, setVerifyCode] = useState("");
  const [verifyError, setVerifyError] = useState("");
  const [verifyBusy, setVerifyBusy] = useState(false);
  const [secretVisible, setSecretVisible] = useState(false);

  // Recovery state
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [recoveryOtp, setRecoveryOtp] = useState("");
  const [recoveryBusy, setRecoveryBusy] = useState(false);
  const [recoveryError, setRecoveryError] = useState("");

  // Disable gate
  const [showDisableGate, setShowDisableGate] = useState(false);

  const verifyRef = useRef<TextInput>(null);
  const otpRef    = useRef<TextInput>(null);

  // Pulse animation for the "not saved" warning
  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.04, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 800, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  // ── Load status ──────────────────────────────────────────────────────────────
  const loadStatus = useCallback(async () => {
    setStep({ id: "loading" });
    const { data: factors, error } = await supabase.auth.mfa.listFactors();
    if (error) { setStep({ id: "status", enrolled: false }); return; }

    const active   = factors?.totp?.find((f: any) => f.status === "verified");
    const pending  = factors?.totp?.filter((f: any) => f.status !== "verified") ?? [];

    // Silently remove any stale unverified factors so users never hit
    // the "factor already exists" error on their next enrollment attempt.
    for (const pf of pending) {
      await supabase.auth.mfa.unenroll({ factorId: pf.id }).catch(() => {});
    }

    setStep({ id: "status", enrolled: !!active, factorId: active?.id });
  }, []);

  useEffect(() => { loadStatus(); }, [loadStatus]);

  // ── Enrollment ───────────────────────────────────────────────────────────────
  async function startEnroll() {
    setStep({ id: "loading" });
    setScannedAck(false);
    setVerifyCode("");
    setVerifyError("");
    setSecretVisible(false);

    // 1. Best-effort: remove any unverified factors before enrolling.
    try {
      const { data: existing } = await supabase.auth.mfa.listFactors();
      for (const f of existing?.totp ?? []) {
        if (f.status !== "verified") {
          await supabase.auth.mfa.unenroll({ factorId: f.id }).catch(() => {});
        }
      }
    } catch { /* ignore */ }

    // 2. Attempt enrollment with the user's email as the friendly name.
    let { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      issuer: "AfuChat",
      friendlyName: user?.email ?? "AfuChat",
    });

    // 3. If a stale factor is still blocking (cleanup didn't take effect),
    //    automatically retry with a unique name — this always succeeds.
    if (error?.message?.includes("already exists")) {
      const retry = await supabase.auth.mfa.enroll({
        factorType: "totp",
        issuer: "AfuChat",
        friendlyName: `AfuChat-${Date.now()}`,
      });
      data  = retry.data;
      error = retry.error;
    }

    if (error || !data) {
      showAlert("Error", error?.message ?? "Could not start enrollment. Please try again.");
      await loadStatus();
      return;
    }
    setStep({ id: "enroll", factorId: data.id, uri: data.totp.uri, secret: data.totp.secret });
  }

  // Cancel a pending (unverified) enrollment – no data is saved
  async function cancelEnroll(factorId: string) {
    await supabase.auth.mfa.unenroll({ factorId }).catch(() => {});
    await loadStatus();
  }

  async function confirmEnroll(factorId: string) {
    if (!scannedAck) {
      showAlert("Confirmation required", "Please confirm you have added AfuChat to your authenticator app.");
      return;
    }
    if (verifyCode.length !== 6) return;
    setVerifyBusy(true);
    setVerifyError("");

    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code: verifyCode });
    setVerifyBusy(false);

    if (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setVerifyError("Wrong code — 2FA has not been saved. Check your authenticator and try again.");
      setVerifyCode("");
      verifyRef.current?.focus();
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    showAlert(
      "2FA Enabled ✓",
      "Two-factor authentication is now active. You will need a code from your authenticator app for future sensitive actions."
    );
    loadStatus();
  }

  // ── Disable ──────────────────────────────────────────────────────────────────
  async function doDisable() {
    const s = step;
    if (s.id !== "status" || !s.factorId) return;
    const { error } = await supabase.auth.mfa.unenroll({ factorId: s.factorId });
    if (error) { showAlert("Error", error.message); return; }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    showAlert("2FA Disabled", "Two-factor authentication has been removed from your account.");
    loadStatus();
  }

  // ── Recovery (email OTP) ─────────────────────────────────────────────────────
  async function sendRecoveryOtp() {
    const email = recoveryEmail.trim().toLowerCase();
    if (!email) { setRecoveryError("Please enter your email address."); return; }
    setRecoveryBusy(true);
    setRecoveryError("");
    const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false } });
    setRecoveryBusy(false);
    if (error) { setRecoveryError(error.message); return; }
    setRecoveryOtp("");
    setStep({ id: "recovery-otp", email });
    setTimeout(() => otpRef.current?.focus(), 300);
  }

  async function verifyRecoveryOtp(email: string) {
    const token = recoveryOtp.trim();
    if (token.length < 6) { setRecoveryError("Enter the full 6-digit code from your email."); return; }
    setRecoveryBusy(true);
    setRecoveryError("");
    const { error: otpError } = await supabase.auth.verifyOtp({ email, token, type: "email" });
    if (otpError) { setRecoveryBusy(false); setRecoveryError("Invalid or expired code."); return; }
    const { data: factors } = await supabase.auth.mfa.listFactors();
    const factor = factors?.totp?.find((f: any) => f.status === "verified");
    if (factor) await supabase.auth.mfa.unenroll({ factorId: factor.id });
    setRecoveryBusy(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    showAlert("Account Recovered", "Two-factor authentication has been removed. You can re-enable it from Security settings.");
    loadStatus();
  }

  // ── Back handler ─────────────────────────────────────────────────────────────
  function handleBack() {
    if (step.id === "enroll") {
      // Cancel the pending (unverified) enrollment — nothing is saved
      cancelEnroll(step.factorId);
    } else if (step.id === "recovery-email" || step.id === "recovery-otp") {
      setStep({ id: "status", enrolled: false });
    } else {
      if (router.canGoBack()) router.back();
      else router.replace("/(tabs)/me" as any);
    }
  }

  function renderHeader(title: string) {
    return <GlassHeader title={title} onBack={handleBack} />;
  }

  // ── Loading ───────────────────────────────────────────────────────────────────
  if (step.id === "loading") {
    return (
      <View style={[styles.root, { backgroundColor: colors.backgroundSecondary }]}>
        {renderHeader("Two-Factor Authentication")}
        <View style={styles.centered}><ActivityIndicator color={colors.accent} /></View>
      </View>
    );
  }

  // ── Status page ───────────────────────────────────────────────────────────────
  if (step.id === "status") {
    const { enrolled, factorId } = step;
    return (
      <View style={[styles.root, { backgroundColor: colors.backgroundSecondary }]}>
        {renderHeader("Two-Factor Authentication")}
        <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false}>

          {/* Status card */}
          <GlassCard style={styles.statusCard} variant={enrolled ? "medium" : "subtle"}>
            <View style={[styles.statusIcon, { backgroundColor: enrolled ? "rgba(48,209,88,0.12)" : "rgba(142,142,147,0.12)" }]}>
              <Ionicons name={enrolled ? "shield-checkmark" : "shield-outline"} size={36} color={enrolled ? "#30D158" : colors.textMuted} />
            </View>
            <Text style={[styles.statusTitle, { color: colors.text }]}>{enrolled ? "2FA is Active" : "2FA is Disabled"}</Text>
            <Text style={[styles.statusDesc, { color: colors.textMuted }]}>
              {enrolled
                ? "Your account is protected. A verification code is required for sensitive actions."
                : "Add a layer of protection using an authenticator app. Setup requires you to verify it actually works."}
            </Text>
          </GlassCard>

          {enrolled ? (
            <>
              <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>MANAGE</Text>
              <GlassCard style={styles.section} variant="medium">
                <TouchableOpacity style={styles.row} onPress={() => setShowDisableGate(true)}>
                  <View style={[styles.rowIcon, { backgroundColor: "#FF3B30" }]}>
                    <Ionicons name="shield-outline" size={18} color="#fff" />
                  </View>
                  <View style={styles.rowMeta}>
                    <Text style={[styles.rowLabel, { color: colors.text }]}>Disable Two-Factor Auth</Text>
                    <Text style={[styles.rowSub, { color: colors.textMuted }]}>Requires your authenticator code</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                </TouchableOpacity>
              </GlassCard>

              <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>RECOVERY OPTIONS</Text>
              <GlassCard style={styles.section} variant="medium">
                <TouchableOpacity style={styles.row} onPress={() => { setRecoveryEmail(user?.email ?? ""); setRecoveryError(""); setStep({ id: "recovery-email" }); }}>
                  <View style={[styles.rowIcon, { backgroundColor: "#007AFF" }]}>
                    <Ionicons name="mail-outline" size={18} color="#fff" />
                  </View>
                  <View style={styles.rowMeta}>
                    <Text style={[styles.rowLabel, { color: colors.text }]}>Reset via Email</Text>
                    <Text style={[styles.rowSub, { color: colors.textMuted }]}>Verify your identity with a one-time email code</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                </TouchableOpacity>
                <View style={[styles.sep, { backgroundColor: colors.border, marginLeft: 60 }]} />
                <View style={styles.row}>
                  <View style={[styles.rowIcon, { backgroundColor: "#8E8E93" }]}>
                    <Ionicons name="phone-portrait-outline" size={18} color="#fff" />
                  </View>
                  <View style={styles.rowMeta}>
                    <Text style={[styles.rowLabel, { color: colors.text }]}>Reset via Phone</Text>
                    <Text style={[styles.rowSub, { color: colors.textMuted }]}>SMS recovery — coming soon</Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: colors.inputBg }]}>
                    <Text style={[styles.badgeText, { color: colors.textMuted }]}>SOON</Text>
                  </View>
                </View>
              </GlassCard>
              <Text style={[styles.infoText, { color: colors.textMuted }]}>
                Use recovery options only if you have permanently lost access to your authenticator app.
              </Text>
            </>
          ) : (
            <>
              <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>SET UP</Text>
              <GlassCard style={styles.section} variant="medium">
                <TouchableOpacity style={styles.row} onPress={startEnroll}>
                  <View style={[styles.rowIcon, { backgroundColor: "#5856D6" }]}>
                    <Ionicons name="qr-code-outline" size={18} color="#fff" />
                  </View>
                  <View style={styles.rowMeta}>
                    <Text style={[styles.rowLabel, { color: colors.text }]}>Enable Two-Factor Auth</Text>
                    <Text style={[styles.rowSub, { color: colors.textMuted }]}>You must verify a working code before 2FA is saved</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                </TouchableOpacity>
              </GlassCard>
              <Text style={[styles.infoText, { color: colors.textMuted }]}>
                Compatible with Google Authenticator, Authy, 1Password, and any TOTP app.
              </Text>
            </>
          )}
        </ScrollView>

        <TwoFactorGate
          visible={showDisableGate}
          title="Disable Two-Factor Auth"
          subtitle="Enter your authenticator code to confirm you want to disable 2FA."
          onSuccess={() => { setShowDisableGate(false); doDisable(); }}
          onDismiss={() => setShowDisableGate(false)}
        />
      </View>
    );
  }

  // ── Enroll — combined QR + verify screen ──────────────────────────────────────
  if (step.id === "enroll") {
    const { factorId, uri, secret } = step;
    const formattedSecret = secret.match(/.{1,4}/g)?.join(" ") ?? secret;
    const canVerify = scannedAck && verifyCode.length === 6;

    return (
      <View style={[styles.root, { backgroundColor: colors.backgroundSecondary }]}>
        {renderHeader("Set Up Authenticator")}
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <ScrollView
            contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 48 }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* "Not saved yet" banner */}
            <Animated.View style={[styles.unsavedBanner, { transform: [{ scale: pulseAnim }] }]}>
              <Ionicons name="time-outline" size={15} color="#FF9F0A" />
              <Text style={styles.unsavedText}>
                2FA is <Text style={{ fontFamily: "Inter_700Bold" }}>not active yet</Text> — complete all steps below to enable it
              </Text>
            </Animated.View>

            {/* Step 1: Instructions */}
            <View style={[styles.enrollCard, { backgroundColor: colors.surface }]}>
              <Text style={[styles.enrollCardTitle, { color: colors.text }]}>
                Step 1 — Add AfuChat to your app
              </Text>
              <View style={styles.instructionList}>
                <InstructionRow n={1} text="Open Google Authenticator, Authy, 1Password, or any TOTP app on your phone" colors={colors} />
                <InstructionRow n={2} text='Tap the "+" or "Add account" button inside the app' colors={colors} />
                <InstructionRow n={3} text={'Choose "Scan a QR code" and point your camera at the code below, or tap the key to enter it manually'} colors={colors} />
              </View>
            </View>

            {/* QR code */}
            <View style={[styles.qrContainer, { backgroundColor: "#fff" }]}>
              <QRCode value={uri} size={180} />
            </View>

            {/* Manual secret toggle */}
            <TouchableOpacity
              style={[styles.secretToggle, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => setSecretVisible(v => !v)}
              activeOpacity={0.75}
            >
              <Ionicons name={secretVisible ? "eye-off-outline" : "key-outline"} size={15} color={colors.accent} />
              <Text style={[styles.secretToggleText, { color: colors.accent }]}>
                {secretVisible ? "Hide" : "Show"} manual entry key
              </Text>
              <Ionicons name={secretVisible ? "chevron-up" : "chevron-down"} size={14} color={colors.textMuted} />
            </TouchableOpacity>

            {secretVisible && (
              <View style={[styles.secretBox, { backgroundColor: colors.backgroundTertiary, borderColor: colors.border }]}>
                <Text style={[styles.secretLabel, { color: colors.textMuted }]}>TOTP Secret Key (tap to copy)</Text>
                <Text style={[styles.secretKey, { color: colors.text }]} selectable>{formattedSecret}</Text>
                <Text style={[styles.secretHint, { color: colors.textMuted }]}>
                  Account name: AfuChat · Issuer: AfuChat
                </Text>
              </View>
            )}

            {/* Step 2: Confirmation checkbox */}
            <View style={[styles.enrollCard, { backgroundColor: colors.surface, marginTop: 0 }]}>
              <Text style={[styles.enrollCardTitle, { color: colors.text }]}>
                Step 2 — Confirm setup
              </Text>
              <TouchableOpacity
                style={[styles.ackRow, {
                  backgroundColor: scannedAck ? "#5856D612" : colors.backgroundTertiary,
                  borderColor: scannedAck ? "#5856D6" : colors.border,
                }]}
                onPress={() => {
                  Haptics.selectionAsync();
                  setScannedAck(v => !v);
                  if (!scannedAck) setTimeout(() => verifyRef.current?.focus(), 200);
                }}
                activeOpacity={0.75}
              >
                <View style={[styles.ackCheckbox, {
                  backgroundColor: scannedAck ? "#5856D6" : "transparent",
                  borderColor: scannedAck ? "#5856D6" : colors.border,
                }]}>
                  {scannedAck && <Ionicons name="checkmark" size={13} color="#fff" />}
                </View>
                <Text style={[styles.ackText, { color: scannedAck ? colors.text : colors.textSecondary }]}>
                  I have added <Text style={{ fontFamily: "Inter_700Bold" }}>AfuChat</Text> to my authenticator app and I can see a 6-digit rotating code
                </Text>
              </TouchableOpacity>
            </View>

            {/* Step 3: Code entry — only shown after checkbox */}
            {scannedAck && (
              <View style={[styles.enrollCard, { backgroundColor: colors.surface, marginTop: 0 }]}>
                <Text style={[styles.enrollCardTitle, { color: colors.text }]}>
                  Step 3 — Enter the code
                </Text>
                <Text style={[styles.stepDesc, { color: colors.textMuted }]}>
                  Enter the 6-digit code <Text style={{ fontFamily: "Inter_600SemiBold" }}>currently showing</Text> in your authenticator. Codes refresh every 30 seconds.
                </Text>

                {/* Hidden real input */}
                <TextInput
                  ref={verifyRef}
                  value={verifyCode}
                  onChangeText={t => {
                    const v = t.replace(/\D/g, "").slice(0, 6);
                    setVerifyCode(v);
                    setVerifyError("");
                    if (v.length === 6) confirmEnroll(factorId);
                  }}
                  keyboardType="number-pad"
                  maxLength={6}
                  style={styles.hiddenInput}
                  caretHidden
                  autoFocus={false}
                />

                {/* Visual OTP boxes — tap to focus */}
                <TouchableOpacity onPress={() => verifyRef.current?.focus()} activeOpacity={1}>
                  <OtpBoxes value={verifyCode} error={!!verifyError} colors={colors} />
                </TouchableOpacity>

                {verifyError ? (
                  <View style={styles.errorBox}>
                    <Ionicons name="warning" size={14} color="#FF3B30" />
                    <Text style={styles.errorText}>{verifyError}</Text>
                  </View>
                ) : (
                  <Text style={[styles.codeHint, { color: colors.textMuted }]}>
                    The code is entered automatically when all 6 digits are filled
                  </Text>
                )}
              </View>
            )}

            {/* Verify button (manual fallback) */}
            <TouchableOpacity
              style={[styles.primaryBtn, (!canVerify || verifyBusy) && { opacity: 0.4 }]}
              onPress={() => confirmEnroll(factorId)}
              disabled={!canVerify || verifyBusy}
            >
              <LinearGradient
                colors={["#5856D6", "#3634A3"]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={styles.primaryBtnGrad}
              >
                {verifyBusy
                  ? <ActivityIndicator color="#fff" />
                  : <>
                      <Ionicons name="shield-checkmark" size={18} color="#fff" />
                      <Text style={styles.primaryBtnText}>Verify & Enable 2FA</Text>
                    </>
                }
              </LinearGradient>
            </TouchableOpacity>

            {/* Cancel — explicitly unenrolls the pending factor */}
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => cancelEnroll(factorId)}
              disabled={verifyBusy}
            >
              <Text style={[styles.cancelText, { color: colors.textMuted }]}>
                Cancel setup — no changes will be saved
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    );
  }

  // ── Recovery — Email input ─────────────────────────────────────────────────────
  if (step.id === "recovery-email") {
    return (
      <View style={[styles.root, { backgroundColor: colors.backgroundSecondary }]}>
        {renderHeader("Recover Account")}
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 40 }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={styles.recoveryIcon}>
              <Ionicons name="mail" size={36} color="#007AFF" />
            </View>
            <Text style={[styles.stepTitle, { color: colors.text }]}>Reset via Email</Text>
            <Text style={[styles.stepDesc, { color: colors.textMuted }]}>
              We'll send a one-time code to your email. Verifying it will remove two-factor authentication from your account.
            </Text>
            <TextInput
              style={[styles.textInput, { color: colors.text, backgroundColor: colors.inputBg, borderColor: recoveryError ? "#FF3B30" : colors.border }]}
              value={recoveryEmail}
              onChangeText={t => { setRecoveryEmail(t); setRecoveryError(""); }}
              placeholder="your@email.com"
              placeholderTextColor={colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="send"
              onSubmitEditing={sendRecoveryOtp}
            />
            {recoveryError ? <Text style={styles.errorText}>{recoveryError}</Text> : null}
            <TouchableOpacity
              style={[(recoveryBusy || !recoveryEmail.trim()) && { opacity: 0.45 }, styles.primaryBtn]}
              onPress={sendRecoveryOtp}
              disabled={recoveryBusy || !recoveryEmail.trim()}
            >
              <LinearGradient colors={["#007AFF", "#0055CC"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.primaryBtnGrad}>
                {recoveryBusy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Send Recovery Code</Text>}
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    );
  }

  // ── Recovery — OTP input ───────────────────────────────────────────────────────
  if (step.id === "recovery-otp") {
    const { email } = step;
    return (
      <View style={[styles.root, { backgroundColor: colors.backgroundSecondary }]}>
        {renderHeader("Enter Recovery Code")}
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 40 }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={styles.recoveryIcon}>
              <Ionicons name="lock-open" size={36} color="#007AFF" />
            </View>
            <Text style={[styles.stepTitle, { color: colors.text }]}>Check your email</Text>
            <Text style={[styles.stepDesc, { color: colors.textMuted }]}>
              We sent a 6-digit code to{" "}
              <Text style={{ fontFamily: "Inter_600SemiBold", color: colors.text }}>{email}</Text>.
              Enter it below to remove 2FA from your account.
            </Text>
            <TextInput
              ref={otpRef}
              style={[styles.codeInput, { color: colors.text, backgroundColor: colors.inputBg, borderColor: recoveryError ? "#FF3B30" : colors.border }]}
              value={recoveryOtp}
              onChangeText={t => { setRecoveryOtp(t.replace(/\D/g, "").slice(0, 6)); setRecoveryError(""); }}
              keyboardType="number-pad"
              maxLength={6}
              placeholder="000000"
              placeholderTextColor={colors.textMuted}
              textAlign="center"
              returnKeyType="done"
              onSubmitEditing={() => verifyRecoveryOtp(email)}
            />
            {recoveryError ? <Text style={styles.errorText}>{recoveryError}</Text> : null}
            <TouchableOpacity
              style={[(recoveryBusy || recoveryOtp.length < 6) && { opacity: 0.45 }, styles.primaryBtn]}
              onPress={() => verifyRecoveryOtp(email)}
              disabled={recoveryBusy || recoveryOtp.length < 6}
            >
              <LinearGradient colors={["#007AFF", "#0055CC"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.primaryBtnGrad}>
                {recoveryBusy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Verify & Remove 2FA</Text>}
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setRecoveryOtp(""); setRecoveryError(""); setStep({ id: "recovery-email" }); }}>
              <Text style={[styles.linkText, { color: colors.accent }]}>Didn't receive the code? Try again</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    );
  }

  return null;
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root:    { flex: 1 },
  centered:{ flex: 1, alignItems: "center", justifyContent: "center" },
  body:    { paddingHorizontal: 16, paddingTop: 16, gap: 14 },

  statusCard:  { borderRadius: 16, padding: 24, alignItems: "center", gap: 10 },
  statusIcon:  { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center" },
  statusTitle: { fontSize: 20, fontFamily: "Inter_700Bold" },
  statusDesc:  { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },

  sectionLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.6, paddingHorizontal: 4, marginTop: 4 },
  section:      { borderRadius: 16, overflow: "hidden", gap: 0 },
  row:          { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  rowIcon:      { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  rowMeta:      { flex: 1 },
  rowLabel:     { fontSize: 15, fontFamily: "Inter_500Medium" },
  rowSub:       { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2, lineHeight: 17 },
  sep:          { height: StyleSheet.hairlineWidth },
  badge:        { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText:    { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  infoText:     { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17, textAlign: "center", paddingHorizontal: 8 },

  // Enroll
  unsavedBanner: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#FF9F0A18", borderColor: "#FF9F0A40", borderWidth: 1, borderRadius: 12, padding: 12 },
  unsavedText:   { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", color: "#FF9F0A", lineHeight: 18 },

  enrollCard:      { backgroundColor: "#fff", borderRadius: 16, padding: 16, gap: 12 },
  enrollCardTitle: { fontSize: 14, fontFamily: "Inter_700Bold", letterSpacing: -0.1 },
  instructionList: { gap: 10 },

  qrContainer: { alignSelf: "center", padding: 20, borderRadius: 20, elevation: 4, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 8 },

  secretToggle:     { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 12, borderWidth: 1, alignSelf: "center" },
  secretToggleText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  secretBox:        { borderRadius: 14, borderWidth: 1, padding: 14, gap: 6 },
  secretLabel:      { fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 1 },
  secretKey:        { fontSize: 17, fontFamily: "Inter_700Bold", letterSpacing: 3, textAlign: "center" },
  secretHint:       { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "center" },

  ackRow:      { flexDirection: "row", alignItems: "flex-start", gap: 12, padding: 14, borderRadius: 14, borderWidth: 1.5 },
  ackCheckbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, alignItems: "center", justifyContent: "center", marginTop: 1, flexShrink: 0 },
  ackText:     { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 21 },

  hiddenInput: { position: "absolute", opacity: 0, width: 1, height: 1 },

  errorBox:  { flexDirection: "row", alignItems: "flex-start", gap: 6, marginTop: 10 },
  errorText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", color: "#FF3B30", lineHeight: 18 },
  codeHint:  { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center", marginTop: 10 },

  primaryBtn:     { borderRadius: 14, overflow: "hidden", marginTop: 4 },
  primaryBtnGrad: { paddingVertical: 15, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  primaryBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },

  cancelBtn:  { alignItems: "center", paddingVertical: 14 },
  cancelText: { fontSize: 13, fontFamily: "Inter_400Regular" },

  stepTitle:  { fontSize: 20, fontFamily: "Inter_700Bold", marginBottom: 4 },
  stepDesc:   { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },
  codeInput:  { borderRadius: 14, borderWidth: 1, padding: 16, fontSize: 28, fontFamily: "Inter_700Bold", textAlign: "center", letterSpacing: 12, marginVertical: 8 },
  textInput:  { borderRadius: 14, borderWidth: 1, padding: 14, fontSize: 15, fontFamily: "Inter_400Regular" },
  linkText:   { fontSize: 14, fontFamily: "Inter_500Medium", textAlign: "center", paddingVertical: 8 },
  recoveryIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: "rgba(0,122,255,0.12)", alignItems: "center", justifyContent: "center", alignSelf: "center" },
});
