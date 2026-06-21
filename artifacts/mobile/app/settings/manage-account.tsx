import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Animated,
} from "react-native";
import { LinearGradient } from "@/components/ui/SafeGradient";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "@/lib/haptics";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/hooks/useTheme";
import { showAlert } from "@/lib/alert";
import { GlassHeader } from "@/components/ui/GlassHeader";
import { GlassCard } from "@/components/ui/GlassCard";
import { TwoFactorGate } from "@/components/ui/TwoFactorGate";
import { API_URL } from "@/lib/env";

// ─── Constants ────────────────────────────────────────────────────────────────

const COUNTDOWN_SECONDS = 10;

const CONSEQUENCES = [
  { id: "posts",    icon: "newspaper-outline",    text: "All posts, stories and moments will be permanently deleted" },
  { id: "chats",    icon: "chatbubbles-outline",   text: "Every chat, message and media file will be removed" },
  { id: "coins",    icon: "wallet-outline",        text: "Your entire ACoins balance will be forfeited with no refund" },
  { id: "friends",  icon: "people-outline",        text: "All contacts, followers and community memberships will be lost" },
  { id: "premium",  icon: "star-outline",          text: "Any active Premium or Platinum subscription will not be refunded" },
  { id: "irrev",    icon: "warning-outline",       text: "After 30 days this cannot be undone — your data is gone forever" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Section({
  title, children, colors,
}: { title?: string; children: React.ReactNode; colors: any }) {
  return (
    <View style={s.section}>
      {title && <Text style={[s.sectionLabel, { color: colors.textMuted }]}>{title}</Text>}
      <View style={[s.card, { backgroundColor: colors.card }]}>{children}</View>
    </View>
  );
}

function Row({
  icon, iconColor, label, sublabel, last, danger, loading, onPress, colors,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  iconColor?: string; label: string; sublabel?: string;
  last?: boolean; danger?: boolean; loading?: boolean;
  onPress?: () => void; colors: any;
}) {
  const ic = iconColor ?? (danger ? "#FF3B30" : colors.accent);
  return (
    <>
      <TouchableOpacity style={s.row} onPress={onPress} activeOpacity={onPress ? 0.7 : 1} disabled={!onPress || loading}>
        <View style={[s.iconWrap, { backgroundColor: ic + "18" }]}>
          {loading
            ? <ActivityIndicator size="small" color={ic} />
            : <Ionicons name={icon} size={18} color={ic} />}
        </View>
        <View style={s.rowText}>
          <Text style={[s.rowLabel, { color: danger ? "#FF3B30" : colors.text }]}>{label}</Text>
          {sublabel && <Text style={[s.rowSub, { color: colors.textMuted }]} numberOfLines={2}>{sublabel}</Text>}
        </View>
        {onPress && !loading && (
          <Ionicons name="chevron-forward" size={15} color={danger ? "#FF3B3088" : colors.textMuted} style={{ marginLeft: 2 }} />
        )}
      </TouchableOpacity>
      {!last && <View style={[s.divider, { backgroundColor: colors.separator }]} />}
    </>
  );
}

// ─── Step indicator ───────────────────────────────────────────────────────────

function StepIndicator({ step, total }: { step: number; total: number }) {
  return (
    <View style={si.row}>
      {Array.from({ length: total }).map((_, i) => (
        <View key={i} style={[si.dot, {
          backgroundColor: i < step ? "#FF3B30" : i === step ? "#FF3B30" : "rgba(120,120,128,0.25)",
          width: i === step ? 20 : 8,
          opacity: i < step ? 0.45 : 1,
        }]} />
      ))}
      <Text style={si.label}>Step {step + 1} of {total}</Text>
    </View>
  );
}
const si = StyleSheet.create({
  row:   { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 18 },
  dot:   { height: 8, borderRadius: 4, backgroundColor: "#FF3B30" },
  label: { marginLeft: 6, fontSize: 12, fontFamily: "Inter_500Medium", color: "#8E8E93" },
});

// ─── Step 1: Acknowledge consequences ─────────────────────────────────────────

function Step1({
  checked, onToggle, onNext, onCancel, colors,
}: {
  checked: Set<string>; onToggle: (id: string) => void;
  onNext: () => void; onCancel: () => void; colors: any;
}) {
  const allChecked = CONSEQUENCES.every(c => checked.has(c.id));

  return (
    <>
      <Text style={[st.title, { color: "#FF3B30" }]}>What you will lose</Text>
      <Text style={[st.subtitle, { color: colors.textMuted }]}>
        Read each item carefully and check the box to acknowledge.
      </Text>

      <View style={{ gap: 10, marginVertical: 4 }}>
        {CONSEQUENCES.map(c => {
          const active = checked.has(c.id);
          return (
            <TouchableOpacity
              key={c.id}
              style={[st.consequenceRow, {
                backgroundColor: active ? "#FF3B3010" : colors.backgroundTertiary,
                borderColor: active ? "#FF3B3040" : colors.border,
              }]}
              onPress={() => { Haptics.selectionAsync(); onToggle(c.id); }}
              activeOpacity={0.75}
            >
              <View style={[st.checkbox, {
                backgroundColor: active ? "#FF3B30" : "transparent",
                borderColor: active ? "#FF3B30" : colors.border,
              }]}>
                {active && <Ionicons name="checkmark" size={12} color="#fff" />}
              </View>
              <Ionicons name={c.icon as any} size={16} color={active ? "#FF3B30" : colors.textMuted} style={{ marginTop: 1 }} />
              <Text style={[st.consequenceText, { color: active ? colors.text : colors.textMuted }]}>{c.text}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <TouchableOpacity
        style={[st.btn, { backgroundColor: allChecked ? "#FF3B30" : colors.backgroundTertiary }]}
        onPress={allChecked ? onNext : undefined}
        activeOpacity={0.8}
      >
        <Text style={[st.btnText, { color: allChecked ? "#fff" : colors.textMuted }]}>
          {allChecked ? "I understand — Continue" : `Check all ${CONSEQUENCES.length - checked.size} remaining`}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onCancel} style={st.cancelBtn}>
        <Text style={[st.cancelText, { color: colors.textMuted }]}>Cancel</Text>
      </TouchableOpacity>
    </>
  );
}

// ─── Step 2: Cooldown + email ──────────────────────────────────────────────────

function Step2({
  userEmail, emailInput, onEmailChange, onNext, onBack, colors, isDark,
}: {
  userEmail: string; emailInput: string; onEmailChange: (v: string) => void;
  onNext: () => void; onBack: () => void; colors: any; isDark: boolean;
}) {
  const [seconds, setSeconds] = useState(COUNTDOWN_SECONDS);
  const [timerDone, setTimerDone] = useState(false);
  const progress = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 0, duration: COUNTDOWN_SECONDS * 1000, useNativeDriver: false,
    }).start();

    const interval = setInterval(() => {
      setSeconds(prev => {
        if (prev <= 1) { clearInterval(interval); setTimerDone(true); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const emailMatch = emailInput.trim().toLowerCase() === userEmail.toLowerCase();
  const canContinue = timerDone && emailMatch;

  return (
    <>
      <Text style={[st.title, { color: "#FF3B30" }]}>Confirm your identity</Text>
      <Text style={[st.subtitle, { color: colors.textMuted }]}>
        Re-enter your email address to prove this is really you.
      </Text>

      {/* Timer bar */}
      {!timerDone && (
        <View style={[st.timerBox, { backgroundColor: colors.backgroundTertiary }]}>
          <Ionicons name="time-outline" size={16} color="#FF9F0A" />
          <View style={{ flex: 1 }}>
            <Text style={[st.timerLabel, { color: colors.text }]}>
              Please wait {seconds}s before continuing
            </Text>
            <View style={[st.timerTrack, { backgroundColor: colors.border }]}>
              <Animated.View style={[st.timerFill, {
                width: progress.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }),
              }]} />
            </View>
          </View>
        </View>
      )}

      {timerDone && (
        <View style={[st.timerBox, { backgroundColor: "#34C75912" }]}>
          <Ionicons name="checkmark-circle" size={16} color="#34C759" />
          <Text style={[st.timerLabel, { color: "#34C759" }]}>Waiting period complete</Text>
        </View>
      )}

      <Text style={[st.fieldLabel, { color: colors.textMuted }]}>Your account email</Text>
      <TextInput
        style={[st.input, {
          color: colors.text,
          backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
          borderColor: emailInput.length > 0 ? (emailMatch ? "#34C759" : "#FF3B30") : colors.border,
        }]}
        placeholder={userEmail.replace(/(.{2}).+(@.+)/, "$1***$2")}
        placeholderTextColor={colors.textMuted}
        value={emailInput}
        onChangeText={onEmailChange}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
      />
      {emailInput.length > 3 && !emailMatch && (
        <Text style={st.mismatchText}>Email does not match your account</Text>
      )}

      <TouchableOpacity
        style={[st.btn, { backgroundColor: canContinue ? "#FF3B30" : colors.backgroundTertiary }]}
        onPress={canContinue ? onNext : undefined}
        activeOpacity={0.8}
      >
        <Text style={[st.btnText, { color: canContinue ? "#fff" : colors.textMuted }]}>
          {!timerDone ? `Wait ${seconds}s…` : !emailMatch ? "Enter your email to continue" : "Continue"}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onBack} style={st.cancelBtn}>
        <Text style={[st.cancelText, { color: colors.textMuted }]}>← Go back</Text>
      </TouchableOpacity>
    </>
  );
}

// ─── Step 3: Final phrase confirmation ────────────────────────────────────────

const FINAL_PHRASE = "DELETE MY ACCOUNT";

function Step3({
  phraseInput, onPhraseChange, onConfirm, onBack, deleting, colors, isDark,
}: {
  phraseInput: string; onPhraseChange: (v: string) => void;
  onConfirm: () => void; onBack: () => void;
  deleting: boolean; colors: any; isDark: boolean;
}) {
  const [countdown, setCountdown] = useState(5);
  const [ready, setReady] = useState(false);
  const phraseMatch = phraseInput.trim() === FINAL_PHRASE;

  useEffect(() => {
    if (!phraseMatch) { setCountdown(5); setReady(false); return; }
    setReady(false);
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { clearInterval(interval); setReady(true); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [phraseMatch]);

  const canDelete = phraseMatch && ready;

  return (
    <>
      <Text style={[st.title, { color: "#FF3B30" }]}>Final confirmation</Text>
      <Text style={[st.subtitle, { color: colors.textMuted }]}>
        This is your last chance to change your mind. Your account will be scheduled for permanent deletion.
      </Text>

      <View style={[st.finalWarnBox, { backgroundColor: "#FF3B3012", borderColor: "#FF3B3035" }]}>
        <Ionicons name="skull-outline" size={20} color="#FF3B30" />
        <Text style={[st.finalWarnText, { color: colors.text }]}>
          After 30 days your account and all associated data will be{" "}
          <Text style={{ fontFamily: "Inter_700Bold", color: "#FF3B30" }}>permanently erased</Text>.
          This action cannot be undone.
        </Text>
      </View>

      <Text style={[st.fieldLabel, { color: colors.textMuted }]}>
        Type{" "}
        <Text style={{ fontFamily: "Inter_700Bold", color: colors.text, letterSpacing: 0.5 }}>
          {FINAL_PHRASE}
        </Text>{" "}
        exactly to unlock the delete button:
      </Text>
      <TextInput
        style={[st.input, {
          color: "#FF3B30",
          fontFamily: "Inter_700Bold",
          backgroundColor: isDark ? "rgba(255,59,48,0.08)" : "rgba(255,59,48,0.05)",
          borderColor: phraseMatch ? "#FF3B30" : colors.border,
        }]}
        placeholder={FINAL_PHRASE}
        placeholderTextColor={colors.textMuted}
        value={phraseInput}
        onChangeText={onPhraseChange}
        autoCapitalize="characters"
        autoCorrect={false}
      />

      {phraseMatch && !ready && (
        <View style={[st.timerBox, { backgroundColor: colors.backgroundTertiary }]}>
          <Ionicons name="hourglass-outline" size={15} color="#FF9F0A" />
          <Text style={[st.timerLabel, { color: colors.textMuted }]}>
            Button unlocks in {countdown}s…
          </Text>
        </View>
      )}

      <TouchableOpacity
        style={[st.btn, {
          backgroundColor: canDelete ? "#FF3B30" : colors.backgroundTertiary,
          opacity: deleting ? 0.6 : 1,
        }]}
        onPress={canDelete && !deleting ? onConfirm : undefined}
        activeOpacity={0.8}
      >
        {deleting
          ? <ActivityIndicator color="#fff" />
          : <Text style={[st.btnText, { color: canDelete ? "#fff" : colors.textMuted }]}>
              {canDelete ? "⚠ Delete My Account" : "Complete the phrase above"}
            </Text>
        }
      </TouchableOpacity>
      <TouchableOpacity onPress={onBack} style={st.cancelBtn} disabled={deleting}>
        <Text style={[st.cancelText, { color: colors.textMuted }]}>← Go back</Text>
      </TouchableOpacity>
    </>
  );
}

// ─── Shared modal step styles ──────────────────────────────────────────────────

const st = StyleSheet.create({
  title:          { fontSize: 19, fontFamily: "Inter_700Bold", marginBottom: 6 },
  subtitle:       { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19, marginBottom: 16, color: "#8E8E93" },
  consequenceRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 12, borderRadius: 12, borderWidth: 1 },
  checkbox:       { width: 20, height: 20, borderRadius: 6, borderWidth: 1.5, alignItems: "center", justifyContent: "center", marginTop: 1, flexShrink: 0 },
  consequenceText:{ flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  btn:            { height: 52, borderRadius: 14, alignItems: "center", justifyContent: "center", marginTop: 6 },
  btnText:        { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  cancelBtn:      { alignItems: "center", paddingVertical: 12 },
  cancelText:     { fontSize: 14, fontFamily: "Inter_400Regular" },
  timerBox:       { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 12, marginBottom: 12 },
  timerLabel:     { fontSize: 13, fontFamily: "Inter_500Medium", flex: 1 },
  timerTrack:     { height: 4, borderRadius: 2, overflow: "hidden", marginTop: 5 },
  timerFill:      { height: "100%", borderRadius: 2, backgroundColor: "#FF9F0A" },
  fieldLabel:     { fontSize: 13, fontFamily: "Inter_500Medium", marginBottom: 8, lineHeight: 20 },
  input:          { borderRadius: 14, borderWidth: 1.5, padding: 14, fontSize: 15, fontFamily: "Inter_500Medium", marginBottom: 4 },
  mismatchText:   { fontSize: 12, fontFamily: "Inter_400Regular", color: "#FF3B30", marginBottom: 8 },
  finalWarnBox:   { flexDirection: "row", alignItems: "flex-start", gap: 12, padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 16 },
  finalWarnText:  { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 21 },
});

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function ManageAccountScreen() {
  const { colors, isDark } = useTheme();
  const { user, signOut } = useAuth();
  const insets = useSafeAreaInsets();

  // ── Download ────────────────────────────────────────────────────────────────
  const [showDownloadGate, setShowDownloadGate] = useState(false);
  const [downloading, setDownloading] = useState(false);

  async function handleDownloadData() {
    if (!user) return;
    setDownloading(true);
    try {
      // Get the current session JWT so the API server can verify identity
      const { data: sessionData } = await supabase.auth.getSession();
      const jwt = sessionData?.session?.access_token;
      if (!jwt) {
        showAlert("Session Error", "Please log out and log back in, then try again.");
        return;
      }

      const res = await fetch(`${API_URL}/api/data-export`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${jwt}`,
        },
        body: JSON.stringify({
          types: ["profile", "posts", "messages", "activity", "transactions"],
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || json?.error) {
        showAlert("Export Failed", json?.error ?? `Server error (${res.status}). Please try again.`);
        return;
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showAlert(
        "Export Sent ✓",
        `Your data has been compiled and sent to ${json?.email ?? user.email ?? "your email"}. Check your inbox — it may take a minute to arrive.`
      );
    } catch (err: any) {
      showAlert("Error", "Failed to request data export. Please check your connection and try again.");
    } finally {
      setDownloading(false);
    }
  }

  // ── Delete: multi-step state ─────────────────────────────────────────────────
  const [showDeleteGate, setShowDeleteGate] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteStep, setDeleteStep] = useState(0);               // 0 | 1 | 2
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [emailInput, setEmailInput] = useState("");
  const [phraseInput, setPhraseInput] = useState("");
  const [deleting, setDeleting] = useState(false);

  function openDeleteModal() {
    setDeleteStep(0);
    setChecked(new Set());
    setEmailInput("");
    setPhraseInput("");
    setShowDeleteModal(true);
  }

  function closeDeleteModal() {
    if (deleting) return;
    setShowDeleteModal(false);
  }

  function toggleCheck(id: string) {
    setChecked(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function handleDeleteAccount() {
    setDeleting(true);
    try {
      if (user) {
        const deletionDate = new Date();
        deletionDate.setDate(deletionDate.getDate() + 30);
        await supabase
          .from("profiles")
          .update({ scheduled_deletion_at: deletionDate.toISOString(), fcm_token: null })
          .eq("id", user.id);
      }
      await signOut();
      setShowDeleteModal(false);
      showAlert(
        "Account Scheduled for Deletion",
        "Your account will be permanently deleted after 30 days. Log back in within that period to cancel."
      );
      router.replace("/welcome");
    } catch {
      showAlert("Error", "Failed to schedule account deletion. Please try again.");
    }
    setDeleting(false);
  }

  const userEmail = user?.email ?? "";

  return (
    <View style={[s.root, { backgroundColor: colors.backgroundSecondary }]}>
      <GlassHeader title="Manage Account" />

      <ScrollView
        contentContainerStyle={[s.body, { paddingBottom: insets.bottom + 48 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Banner */}
        <View style={[s.banner, { backgroundColor: colors.card }]}>
          <View style={[s.bannerIcon, { backgroundColor: "#0A84FF18" }]}>
            <Ionicons name="person-circle-outline" size={24} color="#0A84FF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.bannerTitle, { color: colors.text }]}>Your Account</Text>
            <Text style={[s.bannerSub, { color: colors.textMuted }]}>
              Export a copy of your data or permanently delete your account from here.
            </Text>
          </View>
        </View>

        {/* Data portability */}
        <Section title="DATA PORTABILITY" colors={colors}>
          <Row
            icon="cloud-download-outline" iconColor="#0A84FF"
            label="Export My Data"
            sublabel="Download a copy of your profile, posts, messages and activity"
            loading={downloading}
            onPress={() => setShowDownloadGate(true)}
            last colors={colors}
          />
        </Section>

        {/* Danger zone */}
        <Section title="DANGER ZONE" colors={colors}>
          <Row
            icon="trash-outline" iconColor="#FF3B30"
            label="Delete Account"
            sublabel="Permanently delete your account after a 3-step confirmation process"
            danger
            onPress={() => setShowDeleteGate(true)}
            last colors={colors}
          />
        </Section>

        {/* Complexity note */}
        <View style={[s.complexityBox, { backgroundColor: "#FF9F0A10", borderColor: "#FF9F0A30" }]}>
          <Ionicons name="shield-checkmark-outline" size={15} color="#FF9F0A" style={{ marginTop: 1 }} />
          <Text style={[s.complexityText, { color: colors.textMuted }]}>
            Account deletion requires a{" "}
            <Text style={{ fontFamily: "Inter_600SemiBold", color: colors.text }}>3-step verification process</Text>
            {" "}to protect you from accidental or unauthorised deletion.
          </Text>
        </View>

        <View style={[s.disclaimerBox, { backgroundColor: "#FF3B3010", borderColor: "#FF3B3030" }]}>
          <Ionicons name="warning-outline" size={15} color="#FF3B30" style={{ marginTop: 1 }} />
          <Text style={[s.disclaimerText, { color: colors.textMuted }]}>
            Deletion is reversible within 30 days. After that, your data is permanently erased and cannot be recovered.
          </Text>
        </View>

        <Text style={[s.footerNote, { color: colors.textMuted }]}>
          Need help? Contact support before deleting your account.
        </Text>
      </ScrollView>

      {/* 2FA Gates */}
      <TwoFactorGate
        visible={showDownloadGate}
        title="Verify Your Identity"
        subtitle="Confirm your identity before exporting your data."
        onSuccess={() => { setShowDownloadGate(false); handleDownloadData(); }}
        onDismiss={() => setShowDownloadGate(false)}
      />
      <TwoFactorGate
        visible={showDeleteGate}
        title="Identity Verification"
        subtitle="Two-factor authentication is required to begin the account deletion process."
        onSuccess={() => { setShowDeleteGate(false); openDeleteModal(); }}
        onDismiss={() => setShowDeleteGate(false)}
      />

      {/* Multi-step delete modal */}
      <Modal visible={showDeleteModal} animationType="slide" transparent onRequestClose={closeDeleteModal}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
          <View style={s.modalOverlay}>
            <GlassCard style={s.modalSheet} variant="strong">
              {/* Drag handle */}
              <View style={s.dragHandle} />

              {/* Header row */}
              <View style={s.modalHeader}>
                <View style={[s.modalIconWrap, { backgroundColor: "#FF3B3018" }]}>
                  <Ionicons name="trash" size={18} color="#FF3B30" />
                </View>
                <StepIndicator step={deleteStep} total={3} />
                <TouchableOpacity onPress={closeDeleteModal} disabled={deleting}>
                  <Ionicons name="close" size={22} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              {/* Steps */}
              {deleteStep === 0 && (
                <Step1
                  checked={checked}
                  onToggle={toggleCheck}
                  onNext={() => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); setDeleteStep(1); }}
                  onCancel={closeDeleteModal}
                  colors={colors}
                />
              )}
              {deleteStep === 1 && (
                <Step2
                  userEmail={userEmail}
                  emailInput={emailInput}
                  onEmailChange={setEmailInput}
                  onNext={() => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); setDeleteStep(2); }}
                  onBack={() => setDeleteStep(0)}
                  colors={colors}
                  isDark={isDark}
                />
              )}
              {deleteStep === 2 && (
                <Step3
                  phraseInput={phraseInput}
                  onPhraseChange={setPhraseInput}
                  onConfirm={handleDeleteAccount}
                  onBack={() => { setPhraseInput(""); setDeleteStep(1); }}
                  deleting={deleting}
                  colors={colors}
                  isDark={isDark}
                />
              )}
            </GlassCard>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1 },
  body: { paddingHorizontal: 16, paddingTop: 16, gap: 0 },

  banner: { flexDirection: "row", alignItems: "flex-start", gap: 14, borderRadius: 18, padding: 16, marginBottom: 24 },
  bannerIcon: { width: 44, height: 44, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  bannerTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", marginBottom: 3 },
  bannerSub: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },

  section: { marginBottom: 20 },
  sectionLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.6, marginBottom: 8, paddingHorizontal: 4 },
  card: { borderRadius: 18, overflow: "hidden" },

  row: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 13, gap: 12 },
  iconWrap: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  rowText: { flex: 1 },
  rowLabel: { fontSize: 15, fontFamily: "Inter_500Medium" },
  rowSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2, lineHeight: 17 },
  divider: { height: 0.5, marginHorizontal: 16 },

  complexityBox: { flexDirection: "row", alignItems: "flex-start", gap: 10, borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 12 },
  complexityText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },

  disclaimerBox: { flexDirection: "row", alignItems: "flex-start", gap: 10, borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 16 },
  disclaimerText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },

  footerNote: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 18, paddingHorizontal: 16, marginBottom: 8 },

  modalOverlay:  { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.55)" },
  modalSheet:    { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 44, gap: 0 },
  dragHandle:    { width: 36, height: 4, borderRadius: 2, backgroundColor: "rgba(120,120,128,0.4)", alignSelf: "center", marginBottom: 16 },
  modalHeader:   { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  modalIconWrap: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
});
