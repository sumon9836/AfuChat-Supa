import React, { useState } from "react";
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

// ─── Section ──────────────────────────────────────────────────────────────────
function Section({
  title,
  children,
  colors,
}: {
  title?: string;
  children: React.ReactNode;
  colors: ReturnType<typeof useTheme>["colors"];
}) {
  return (
    <View style={s.section}>
      {title && (
        <Text style={[s.sectionLabel, { color: colors.textMuted }]}>{title}</Text>
      )}
      <View style={[s.card, { backgroundColor: colors.card }]}>{children}</View>
    </View>
  );
}

// ─── Row ──────────────────────────────────────────────────────────────────────
function Row({
  icon,
  iconColor,
  label,
  sublabel,
  last,
  danger,
  loading,
  onPress,
  colors,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  iconColor?: string;
  label: string;
  sublabel?: string;
  last?: boolean;
  danger?: boolean;
  loading?: boolean;
  onPress?: () => void;
  colors: ReturnType<typeof useTheme>["colors"];
}) {
  const ic = iconColor ?? (danger ? "#FF3B30" : colors.accent);
  const bg = ic + "18";
  return (
    <>
      <TouchableOpacity
        style={s.row}
        onPress={onPress}
        activeOpacity={onPress ? 0.7 : 1}
        disabled={!onPress || loading}
      >
        <View style={[s.iconWrap, { backgroundColor: bg }]}>
          {loading ? (
            <ActivityIndicator size="small" color={ic} />
          ) : (
            <Ionicons name={icon} size={18} color={ic} />
          )}
        </View>
        <View style={s.rowText}>
          <Text style={[s.rowLabel, { color: danger ? "#FF3B30" : colors.text }]}>
            {label}
          </Text>
          {sublabel && (
            <Text style={[s.rowSub, { color: colors.textMuted }]} numberOfLines={2}>
              {sublabel}
            </Text>
          )}
        </View>
        {onPress && !loading && (
          <Ionicons
            name="chevron-forward"
            size={15}
            color={danger ? "#FF3B3088" : colors.textMuted}
            style={{ marginLeft: 2 }}
          />
        )}
      </TouchableOpacity>
      {!last && <View style={[s.divider, { backgroundColor: colors.separator }]} />}
    </>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function ManageAccountScreen() {
  const { colors, isDark } = useTheme();
  const { user, signOut } = useAuth();
  const insets = useSafeAreaInsets();

  // ── Download / export ──────────────────────────────────────────────────────
  const [showDownloadGate, setShowDownloadGate] = useState(false);
  const [downloading, setDownloading] = useState(false);

  async function handleDownloadData() {
    if (!user) return;
    setDownloading(true);
    try {
      const { data, error } = await supabase.functions.invoke("data-export", {
        body: { types: ["profile", "posts", "messages", "activity", "transactions"] },
      });
      if (error || data?.error) {
        showAlert("Export Failed", data?.error ?? error?.message ?? "Something went wrong.");
        return;
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const email = data?.email ?? user.email ?? "your registered email";
      showAlert(
        "Export Sent",
        `Your data has been sent to ${email}. Check your inbox for the attached JSON file.`
      );
    } catch {
      showAlert("Error", "Failed to request data export. Please check your connection and try again.");
    } finally {
      setDownloading(false);
    }
  }

  // ── Delete account ─────────────────────────────────────────────────────────
  const [showDeleteGate, setShowDeleteGate] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteText, setDeleteText] = useState("");
  const [deleting, setDeleting] = useState(false);

  async function handleDeleteAccount() {
    if (deleteText !== "DELETE") {
      showAlert("Confirmation required", 'Type "DELETE" to confirm.');
      return;
    }
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
      showAlert(
        "Account Scheduled for Deletion",
        "Your account will be permanently deleted after 30 days. Log back in within that period to restore it."
      );
      router.replace("/(auth)/login");
    } catch {
      showAlert("Error", "Failed to schedule account deletion. Please try again.");
    }
    setDeleting(false);
  }

  return (
    <View style={[s.root, { backgroundColor: colors.backgroundSecondary }]}>
      <GlassHeader title="Manage Account" />

      <ScrollView
        contentContainerStyle={[s.body, { paddingBottom: insets.bottom + 48 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Info banner ───────────────────────────────────────────────── */}
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

        {/* ── DATA PORTABILITY ─────────────────────────────────────────── */}
        <Section title="DATA PORTABILITY" colors={colors}>
          <Row
            icon="cloud-download-outline"
            iconColor="#0A84FF"
            label="Export My Data"
            sublabel="Download a copy of your profile, posts, messages and activity"
            loading={downloading}
            onPress={() => setShowDownloadGate(true)}
            last
            colors={colors}
          />
        </Section>

        {/* ── DANGER ZONE ───────────────────────────────────────────────── */}
        <Section title="DANGER ZONE" colors={colors}>
          <Row
            icon="trash-outline"
            iconColor="#FF3B30"
            label="Delete Account"
            sublabel="Schedule your account for permanent deletion after 30 days"
            danger
            onPress={() => setShowDeleteGate(true)}
            last
            colors={colors}
          />
        </Section>

        {/* ── Disclaimer ────────────────────────────────────────────────── */}
        <View style={[s.disclaimerBox, { backgroundColor: "#FF3B3010", borderColor: "#FF3B3030" }]}>
          <Ionicons name="warning-outline" size={15} color="#FF3B30" style={{ marginTop: 1 }} />
          <Text style={[s.disclaimerText, { color: colors.textMuted }]}>
            Account deletion is reversible within 30 days. After that, your data is permanently erased and cannot be recovered.
          </Text>
        </View>

        <Text style={[s.footerNote, { color: colors.textMuted }]}>
          Need help? Contact support before deleting your account.
        </Text>
      </ScrollView>

      {/* ── 2FA Gates ─────────────────────────────────────────────────────── */}
      <TwoFactorGate
        visible={showDownloadGate}
        title="Verify Your Identity"
        subtitle="Confirm your identity before exporting your data."
        onSuccess={() => { setShowDownloadGate(false); handleDownloadData(); }}
        onDismiss={() => setShowDownloadGate(false)}
      />
      <TwoFactorGate
        visible={showDeleteGate}
        title="Verify Your Identity"
        subtitle="2FA is required before deleting your account."
        onSuccess={() => { setShowDeleteGate(false); setDeleteText(""); setShowDeleteModal(true); }}
        onDismiss={() => setShowDeleteGate(false)}
      />

      {/* ── Delete Account Modal ───────────────────────────────────────────── */}
      <Modal visible={showDeleteModal} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
          <View style={s.modalOverlay}>
            <GlassCard style={s.modalSheet} variant="strong">
              <View style={s.dragHandle} />
              <View style={s.modalHeader}>
                <Text style={[s.modalTitle, { color: "#FF3B30" }]}>Delete Account</Text>
                <TouchableOpacity onPress={() => setShowDeleteModal(false)}>
                  <Ionicons name="close" size={22} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              <View style={s.warningBox}>
                <Ionicons name="warning" size={22} color="#FF3B30" />
                <Text style={[s.warningText, { color: colors.text }]}>
                  Your account will be deactivated immediately and permanently deleted after 30 days.
                  All posts, messages, and data will be removed.
                </Text>
              </View>

              <View style={s.checklistBox}>
                {[
                  "All posts and stories deleted",
                  "Chats and messages removed",
                  "ACoin balance forfeited",
                  "Cannot be recovered after 30 days",
                ].map((item) => (
                  <View key={item} style={s.checklistRow}>
                    <Ionicons name="close-circle-outline" size={15} color="#FF3B30" />
                    <Text style={[s.checklistText, { color: colors.textMuted }]}>{item}</Text>
                  </View>
                ))}
              </View>

              <Text style={[s.confirmLabel, { color: colors.textMuted }]}>
                Type{" "}
                <Text style={{ fontFamily: "Inter_700Bold", color: colors.text, letterSpacing: 1 }}>DELETE</Text>
                {" "}to confirm:
              </Text>
              <TextInput
                style={[s.input, {
                  color: colors.text,
                  backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
                  borderColor: deleteText === "DELETE" ? "#FF3B30" : colors.border,
                }]}
                placeholder='Type "DELETE"'
                placeholderTextColor={colors.textMuted}
                value={deleteText}
                onChangeText={setDeleteText}
                autoCapitalize="characters"
                autoCorrect={false}
              />

              <TouchableOpacity
                style={[s.deleteBtnWrap, (deleting || deleteText !== "DELETE") && { opacity: 0.4 }]}
                onPress={handleDeleteAccount}
                disabled={deleting || deleteText !== "DELETE"}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={["#FF3B30", "#CC2B22"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={s.modalBtnGradient}
                >
                  {deleting
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={s.modalBtnText}>Delete My Account</Text>
                  }
                </LinearGradient>
              </TouchableOpacity>
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

  banner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
    borderRadius: 18,
    padding: 16,
    marginBottom: 24,
  },
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

  disclaimerBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
  },
  disclaimerText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },

  footerNote: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 18,
    paddingHorizontal: 16,
    marginBottom: 8,
  },

  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.50)" },
  modalSheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 44, gap: 14 },
  dragHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: "rgba(120,120,128,0.4)", alignSelf: "center", marginBottom: 4 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  modalTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold" },

  warningBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: "rgba(255,59,48,0.10)",
    borderRadius: 14,
    padding: 14,
  },
  warningText: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },

  checklistBox: { gap: 8, paddingVertical: 4 },
  checklistRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  checklistText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular" },

  confirmLabel: { fontSize: 14, fontFamily: "Inter_500Medium" },
  input: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  deleteBtnWrap: { borderRadius: 14, overflow: "hidden" },
  modalBtnGradient: { paddingVertical: 15, alignItems: "center", justifyContent: "center" },
  modalBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
});
