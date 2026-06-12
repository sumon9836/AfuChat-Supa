import React, { useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "@/lib/haptics";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/hooks/useTheme";
import { showAlert } from "@/lib/alert";
import { GlassHeader } from "@/components/ui/GlassHeader";
import { GlassMenuSection, GlassMenuItem, GlassMenuSeparator } from "@/components/ui/GlassMenuItem";
import { Avatar } from "@/components/ui/Avatar";

const MODE_OPTIONS = [
  { key: "light"  as const, label: "Light",  icon: "sunny"                  as const },
  { key: "system" as const, label: "System", icon: "phone-portrait-outline"  as const },
  { key: "dark"   as const, label: "Dark",   icon: "moon"                   as const },
];

export default function SettingsScreen() {
  const { colors, themeMode, setThemeMode, accent } = useTheme();
  const { langLabel } = useLanguage();
  const { user, profile, isPremium, linkedAccounts, switchAccount, signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const [switchingId, setSwitchingId] = useState<string | null>(null);

  async function handleSwitch(userId: string) {
    if (userId === user?.id || switchingId) return;
    showAlert(
      "Switch account?",
      "Your current session will be saved and you'll switch to the selected account.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Switch",
          onPress: async () => {
            setSwitchingId(userId);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            const result = await switchAccount(userId);
            setSwitchingId(null);
            if (!result.success) {
              showAlert("Switch Failed", result.error || "Could not switch account. Please add it again.");
            }
          },
        },
      ]
    );
  }

  const activeAccount = linkedAccounts.find((a) => a.userId === user?.id);
  const otherAccounts = linkedAccounts.filter((a) => a.userId !== user?.id);
  const displayAccounts =
    linkedAccounts.length === 0 && user && profile
      ? [{ userId: user.id, displayName: profile.display_name, handle: profile.handle, avatarUrl: profile.avatar_url, email: user.email || "", accessToken: "", refreshToken: "" }]
      : activeAccount
      ? [activeAccount, ...otherAccounts]
      : linkedAccounts;
  const hasOtherAccounts = otherAccounts.length > 0;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <GlassHeader title="Settings" />

      {switchingId && (
        <View style={styles.switchOverlay}>
          <View style={[styles.switchCard, { backgroundColor: colors.surface }]}>
            <ActivityIndicator size="large" color={accent} />
            <Text style={[styles.switchingText, { color: colors.text }]}>Switching account…</Text>
            <Text style={[styles.switchingSub, { color: colors.textMuted }]}>Clearing data and loading your other account</Text>
          </View>
        </View>
      )}

      <ScrollView
        contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 48 }]}
        showsVerticalScrollIndicator={false}
        style={[{ pointerEvents: switchingId ? "none" : "auto" } as any]}
      >

        {/* ── ACCOUNTS ─────────────────────────────────────────────────── */}
        <GlassMenuSection title="ACCOUNTS">
          {displayAccounts.map((account, index) => {
            const isCurrent = account.userId === user?.id;
            const isSwitching = switchingId === account.userId;
            const isLast = index === displayAccounts.length - 1;
            return (
              <View key={account.userId}>
                <Pressable
                  style={({ pressed }) => [
                    styles.accountRow,
                    pressed && !isCurrent && !switchingId && { backgroundColor: colors.backgroundSecondary },
                  ]}
                  onPress={() => !isCurrent && !switchingId && handleSwitch(account.userId)}
                  disabled={isCurrent || !!switchingId}
                >
                  <View style={styles.avatarWrap}>
                    <Avatar uri={account.avatarUrl} name={account.displayName} size={46} />
                    {isCurrent && (
                      <View style={[styles.activeIndicator, { backgroundColor: accent, borderColor: colors.surface }]}>
                        <Ionicons name="checkmark" size={9} color="#fff" />
                      </View>
                    )}
                  </View>
                  <View style={styles.accountInfo}>
                    <Text style={[styles.accountName, { color: colors.text }]} numberOfLines={1}>{account.displayName}</Text>
                    <Text style={[styles.accountHandle, { color: colors.textMuted }]} numberOfLines={1}>@{account.handle}</Text>
                    {isCurrent && user?.email && (
                      <Text style={[styles.accountEmail, { color: colors.textMuted }]} numberOfLines={1}>{user.email}</Text>
                    )}
                    {isCurrent && (
                      <View style={[styles.activeBadge, { backgroundColor: accent + "22" }]}>
                        <Text style={[styles.activeBadgeText, { color: accent }]}>Active</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.accountRight}>
                    {isSwitching ? (
                      <ActivityIndicator size="small" color={accent} />
                    ) : isCurrent ? (
                      <Ionicons name="radio-button-on" size={20} color={accent} />
                    ) : (
                      <TouchableOpacity
                        style={[styles.switchBtn, { backgroundColor: accent }]}
                        onPress={() => handleSwitch(account.userId)}
                        disabled={!!switchingId}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="swap-horizontal" size={13} color="#fff" />
                        <Text style={styles.switchBtnText}>Switch</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </Pressable>
              </View>
            );
          })}

          <TouchableOpacity
            style={styles.manageRow}
            onPress={() => router.push("/linked-accounts")}
            activeOpacity={0.7}
            disabled={!!switchingId}
          >
            <Ionicons name="people-outline" size={16} color={colors.textMuted} />
            <Text style={[styles.manageText, { color: colors.textMuted }]}>
              {hasOtherAccounts ? "Manage accounts" : "Add another account"}
            </Text>
            <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
          </TouchableOpacity>
        </GlassMenuSection>

        {/* ── THEME & APPEARANCE ────────────────────────────────────────── */}
        <GlassMenuSection title="THEME & APPEARANCE">

          {/* Mode selector */}
          <View style={styles.modeRow}>
            {MODE_OPTIONS.map(({ key, label, icon }) => {
              const active = themeMode === key;
              return (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.modeBtn,
                    {
                      backgroundColor: active ? accent : colors.backgroundSecondary,
                      borderColor: active ? accent : colors.border,
                    },
                  ]}
                  onPress={() => { Haptics.selectionAsync(); setThemeMode(key); }}
                  activeOpacity={0.75}
                >
                  <Ionicons name={icon} size={15} color={active ? "#fff" : colors.textMuted} />
                  <Text style={[styles.modeBtnText, { color: active ? "#fff" : colors.textMuted }]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

        </GlassMenuSection>

        {/* ── PREFERENCES ─────────────────────────────────────────────── */}
        <GlassMenuSection title="PREFERENCES">
          <GlassMenuItem
            icon="language-outline"
            label="Language"
            value={langLabel}
            onPress={() => router.push("/language-settings")}
          />
          {Platform.OS !== "web" && (
            <>
              <GlassMenuSeparator />
              <GlassMenuItem
                icon="notifications-outline"
                label="Notifications"
                onPress={() => router.push("/settings/notifications")}
              />
            </>
          )}
          <GlassMenuSeparator />
          <GlassMenuItem
            icon="chatbubbles-outline"
            label="Chat Settings"
            onPress={() => router.push("/settings/chat")}
          />
          <GlassMenuSeparator />
          <GlassMenuItem
            icon="cloud-outline"
            label="Storage & Cache"
            onPress={() => router.push("/settings/storage")}
          />
          {Platform.OS !== "web" && (
            <>
              <GlassMenuSeparator />
              <GlassMenuItem
                icon="cloud-download-outline"
                label="Offline Videos"
                onPress={() => router.push("/settings/offline-videos" as any)}
              />
            </>
          )}
          <GlassMenuSeparator />
          <GlassMenuItem
            icon="flash-outline"
            label="Advanced Features"
            subtitle="Power settings, chat and feed customisation"
            onPress={() => router.push("/advanced-features" as any)}
          />
        </GlassMenuSection>

        {/* ── PRIVACY & SECURITY ──────────────────────────────────────── */}
        <GlassMenuSection title="PRIVACY & SECURITY">
          <GlassMenuItem
            icon="shield-checkmark-outline"
            label="Privacy"
            subtitle="Visibility, messages, interactions, blocked users"
            onPress={() => router.push("/settings/privacy")}
          />
          <GlassMenuSeparator />
          <GlassMenuItem
            icon="lock-closed-outline"
            label="Security & Password"
            subtitle="Password, 2FA, device security, data download"
            onPress={() => router.push("/settings/security")}
          />
        </GlassMenuSection>

        {/* ── CONNECTED ACCOUNTS ───────────────────────────────────────── */}
        <GlassMenuSection title="CONNECTED ACCOUNTS">
          <GlassMenuItem
            icon="logo-google"
            label="Login Methods"
            subtitle="Google, Apple and other sign-in options"
            onPress={() => router.push("/settings/oauth-providers")}
          />
        </GlassMenuSection>

        {/* ── HELP & ABOUT ─────────────────────────────────────────────── */}
        <GlassMenuSection title="HELP & ABOUT">
          <GlassMenuItem
            icon="help-buoy-outline"
            label="Support Center"
            onPress={() => router.push("/support" as any)}
          />
          <GlassMenuSeparator />
          <GlassMenuItem
            icon="document-text-outline"
            label="Terms of Service"
            onPress={() => Linking.openURL("https://afuchat.com/terms")}
          />
          <GlassMenuSeparator />
          <GlassMenuItem
            icon="shield-outline"
            label="Privacy Policy"
            onPress={() => Linking.openURL("https://afuchat.com/privacy")}
          />
          <GlassMenuSeparator />
          <GlassMenuItem
            icon="information-circle-outline"
            label="About AfuChat"
            onPress={() => router.push("/about" as any)}
          />
        </GlassMenuSection>

        <GlassMenuSection title="SESSION">
          <GlassMenuItem
            icon="log-out-outline"
            label="Sign Out"
            danger
            noChevron
            onPress={() =>
              showAlert("Sign Out", "Are you sure you want to sign out?", [
                { text: "Cancel", style: "cancel" },
                { text: "Sign Out", style: "destructive", onPress: () => signOut() },
              ])
            }
          />
        </GlassMenuSection>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  body: { gap: 0, paddingTop: 8, paddingHorizontal: 0 },

  switchOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.55)", alignItems: "center", justifyContent: "center", zIndex: 100 },
  switchCard: {
    borderRadius: 24, padding: 32, alignItems: "center", gap: 14, minWidth: 240,
    ...Platform.select({
      web: { boxShadow: "0 8px 24px rgba(0,0,0,0.2)" } as any,
      default: { shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 24, elevation: 12 },
    }),
  },
  switchingText: { fontSize: 17, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  switchingSub: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 18 },

  accountRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 12, gap: 12 },
  avatarWrap: { position: "relative" },
  activeIndicator: { position: "absolute", bottom: -1, right: -1, width: 16, height: 16, borderRadius: 8, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  accountInfo: { flex: 1, gap: 1 },
  accountName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  accountHandle: { fontSize: 13, fontFamily: "Inter_400Regular" },
  accountEmail: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  activeBadge: { alignSelf: "flex-start", borderRadius: 5, paddingHorizontal: 6, paddingVertical: 1, marginTop: 3 },
  activeBadgeText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  accountRight: { alignItems: "flex-end", justifyContent: "center" },
  switchBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 11, paddingVertical: 6, borderRadius: 16 },
  switchBtnText: { color: "#fff", fontSize: 12, fontFamily: "Inter_600SemiBold" },

  separator: { height: 0 },
  manageRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, paddingVertical: 12 },
  manageText: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular" },

  modeRow: { flexDirection: "row", gap: 8, paddingHorizontal: 14, paddingTop: 14, paddingBottom: 10 },
  modeBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, paddingVertical: 10, borderRadius: 12, borderWidth: 1,
  },
  modeBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },

});
