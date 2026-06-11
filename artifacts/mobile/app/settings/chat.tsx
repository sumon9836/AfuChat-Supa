import React, { useState } from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { GlassHeader } from "@/components/ui/GlassHeader";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/hooks/useTheme";
import { ListRowSkeleton } from "@/components/ui/Skeleton";
import { showAlert } from "@/lib/alert";
import {
  useChatPreferences,
  CHAT_THEME_COLORS,
  ACCENT_SWATCHES,
  ChatTheme,
  BubbleStyle,
  MediaQuality,
  BUBBLE_RADIUS,
} from "@/context/ChatPreferencesContext";
import { requestGalleryPermissionOnce } from "@/lib/storage/chatAttachmentCache";
import { useAppAccent } from "@/context/AppAccentContext";

const FONT_SIZES = [13, 15, 17, 19];
const MEDIA_QUALITIES: MediaQuality[] = ["Auto", "High", "Low"];

export default function ChatSettingsScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { prefs, loading, updatePref } = useChatPreferences();
  const { setAppTheme } = useAppAccent();
  const [clearing, setClearing] = useState(false);
  const [backingUp, setBackingUp] = useState(false);

  const themeColor = CHAT_THEME_COLORS[prefs.chat_theme]?.accent ?? "#1f95ff";
  const bubbleRadius = BUBBLE_RADIUS[prefs.bubble_style] ?? 18;

  async function handleColorPick(key: ChatTheme) {
    await updatePref("chat_theme", key);
    setAppTheme(key);
  }

  async function handleClearAllChats() {
    showAlert(
      "Clear All Chats",
      "This will permanently delete all your chat history across all conversations. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear All",
          style: "destructive",
          onPress: async () => {
            if (!user) return;
            setClearing(true);
            try {
              const { data: memberRows } = await supabase
                .from("chat_members")
                .select("chat_id")
                .eq("user_id", user.id);
              if (memberRows && memberRows.length > 0) {
                const chatIds = memberRows.map((r) => r.chat_id);
                if (prefs.archive_on_delete) {
                  await supabase.from("messages").update({ is_archived: true }).in("chat_id", chatIds).eq("sender_id", user.id);
                } else {
                  await supabase.from("messages").delete().in("chat_id", chatIds).eq("sender_id", user.id);
                }
              }
              showAlert("Done", prefs.archive_on_delete ? "Your messages have been archived." : "All chat history has been cleared.");
            } catch (e: any) {
              showAlert("Error", e?.message || "Failed to clear chats");
            } finally {
              setClearing(false);
            }
          },
        },
      ]
    );
  }

  async function handleBackupNow() {
    if (!user) return;
    setBackingUp(true);
    try {
      const { count } = await supabase
        .from("chat_members")
        .select("chat_id", { count: "exact", head: true })
        .eq("user_id", user.id);
      const n = count ?? 0;
      if (n === 0) { showAlert("Backup", "No chats to back up."); return; }
      showAlert(
        "Cloud sync is automatic",
        `Your ${n} chat${n === 1 ? "" : "s"} are continuously synced to AfuChat cloud while you're online — no manual backup needed.`,
      );
    } finally {
      setBackingUp(false);
    }
  }

  if (loading) {
    return (
      <View style={[s.root, { backgroundColor: colors.backgroundSecondary }]}>
        <GlassHeader title="Chat Settings" />
        <View style={{ padding: 16, gap: 10 }}>
          {[1,2,3,4,5,6].map(i => <ListRowSkeleton key={i} />)}
        </View>
      </View>
    );
  }

  return (
    <View style={[s.root, { backgroundColor: colors.backgroundSecondary }]}>
      <GlassHeader title="Chat Settings" />

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 48, paddingTop: 4 }}
        showsVerticalScrollIndicator={false}
      >

        {/* ── THEME COLOR ──────────────────────────────────── */}
        <SectionTitle label="APP COLOR" />
        <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={s.cardHeaderRow}>
            <View style={[s.iconBadge, { backgroundColor: themeColor }]}>
              <Ionicons name="color-palette" size={16} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.cardTitle, { color: colors.text }]}>Accent Colour</Text>
              <Text style={[s.cardSub, { color: colors.textMuted }]}>
                Applies to bubbles, tabs and buttons
              </Text>
            </View>
            <View style={[s.accentPill, { backgroundColor: themeColor + "20", borderColor: themeColor + "55" }]}>
              <Text style={[s.accentPillText, { color: themeColor }]}>{prefs.chat_theme}</Text>
            </View>
          </View>

          <View style={s.swatchGrid}>
            {ACCENT_SWATCHES.map(({ key }) => {
              const hex = CHAT_THEME_COLORS[key]?.accent ?? "#ccc";
              const active = prefs.chat_theme === key;
              return (
                <TouchableOpacity
                  key={key}
                  onPress={() => handleColorPick(key)}
                  style={[
                    s.swatch,
                    { backgroundColor: hex },
                    active && { borderWidth: 3, borderColor: "#fff", transform: [{ scale: 1.12 }] },
                  ]}
                  activeOpacity={0.8}
                >
                  {active && <Ionicons name="checkmark" size={17} color="#fff" />}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── LIVE PREVIEW ─────────────────────────────────── */}
        <View style={[s.previewCard, { backgroundColor: colors.backgroundTertiary ?? colors.background, borderColor: colors.border }]}>
          <Text style={[s.previewLabel, { color: colors.textMuted }]}>PREVIEW</Text>

          <View style={s.previewBubbleRow}>
            <View style={[s.previewBubble, s.previewBubbleLeft, {
              backgroundColor: colors.surface,
              borderRadius: bubbleRadius,
              borderColor: colors.border,
              borderWidth: 0.5,
            }]}>
              <Text style={[s.previewBubbleText, { color: colors.text, fontSize: prefs.font_size * 0.78 }]}>
                Hey, how are you? 👋
              </Text>
            </View>
          </View>

          <View style={s.previewBubbleRow}>
            <View style={{ flex: 1 }} />
            <View style={[s.previewBubble, s.previewBubbleRight, {
              backgroundColor: themeColor,
              borderRadius: bubbleRadius,
            }]}>
              <Text style={[s.previewBubbleText, { color: "#fff", fontSize: prefs.font_size * 0.78 }]}>
                I'm great, thanks! 😊
              </Text>
              <View style={s.previewTsRow}>
                <Text style={[s.previewTs, { color: "rgba(255,255,255,0.75)" }]}>12:35</Text>
                <Ionicons name="checkmark-done" size={11} color="rgba(255,255,255,0.75)" />
              </View>
            </View>
          </View>
        </View>

        {/* ── BUBBLE STYLE ─────────────────────────────────── */}
        <SectionTitle label="BUBBLE STYLE" />
        <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={s.cardHeaderRow}>
            <View style={[s.iconBadge, { backgroundColor: "#AF52DE" }]}>
              <Ionicons name="chatbubble" size={16} color="#fff" />
            </View>
            <Text style={[s.cardTitle, { color: colors.text }]}>Shape of message bubbles</Text>
          </View>
          <View style={s.bubbleStyleRow}>
            {(["Rounded", "Sharp", "Minimal"] as BubbleStyle[]).map((name) => {
              const active = prefs.bubble_style === name;
              const r = BUBBLE_RADIUS[name];
              return (
                <TouchableOpacity
                  key={name}
                  onPress={() => updatePref("bubble_style", name)}
                  style={[
                    s.bubbleTile,
                    { borderColor: active ? themeColor : colors.border },
                    active && { backgroundColor: themeColor + "14" },
                  ]}
                  activeOpacity={0.8}
                >
                  <View style={[s.bubbleShape, {
                    borderRadius: r,
                    backgroundColor: active ? themeColor : colors.backgroundSecondary,
                    borderColor: active ? themeColor : colors.border,
                    borderWidth: active ? 0 : 1.5,
                  }]} />
                  <Text style={[s.bubbleTileLabel, { color: active ? themeColor : colors.textSecondary ?? colors.textMuted }]}>
                    {name}
                  </Text>
                  {active && (
                    <View style={[s.activeDot, { backgroundColor: themeColor }]} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── FONT SIZE ────────────────────────────────────── */}
        <SectionTitle label="FONT SIZE" />
        <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={s.cardHeaderRow}>
            <View style={[s.iconBadge, { backgroundColor: "#FF9500" }]}>
              <Ionicons name="text" size={16} color="#fff" />
            </View>
            <Text style={[s.cardTitle, { color: colors.text, flex: 1 }]}>Message text size</Text>
            <Text style={[s.accentPillText, { color: "#FF9500" }]}>{prefs.font_size}px</Text>
          </View>
          <View style={s.fontRow}>
            {FONT_SIZES.map((sz) => {
              const active = prefs.font_size === sz;
              return (
                <TouchableOpacity
                  key={sz}
                  onPress={() => updatePref("font_size", sz)}
                  style={[
                    s.fontTile,
                    { borderColor: active ? themeColor : colors.border },
                    active && { backgroundColor: themeColor + "14" },
                  ]}
                  activeOpacity={0.8}
                >
                  <Text style={{ fontSize: sz * 0.85, color: active ? themeColor : colors.textSecondary ?? colors.textMuted, fontFamily: "Inter_700Bold" }}>
                    Aa
                  </Text>
                  <Text style={[s.fontSzLabel, { color: active ? themeColor : colors.textMuted }]}>{sz}px</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── MESSAGES ─────────────────────────────────────── */}
        <SectionTitle label="MESSAGES" />
        <View style={[s.group, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <TogRow colors={colors} themeColor={themeColor} icon="volume-high" bg="#007AFF"
            label="Sound Effects" desc="Play sounds for sent and received messages"
            value={prefs.sounds_enabled} onChange={(v) => updatePref("sounds_enabled", v)} />
          <Sep color={colors.border} />
          <TogRow colors={colors} themeColor={themeColor} icon="checkmark-done" bg="#34C759"
            label="Read Receipts" desc="Senders see when you've read their messages"
            value={prefs.read_receipts} onChange={(v) => updatePref("read_receipts", v)} />
          <Sep color={colors.border} />
          <TogRow colors={colors} themeColor={themeColor} icon="ellipsis-horizontal" bg="#5856D6"
            label="Typing Indicators" desc="Show when others are composing a message"
            value={prefs.typing_indicators} onChange={(v) => updatePref("typing_indicators", v)} />
          <Sep color={colors.border} />
          <TogRow colors={colors} themeColor={themeColor} icon="link" bg="#FF2D55"
            label="Link Previews" desc="Show rich previews for URLs in messages"
            value={prefs.link_previews} onChange={(v) => updatePref("link_previews", v)} />
          {Platform.OS !== "web" && (
            <>
              <Sep color={colors.border} />
              <TogRow colors={colors} themeColor={themeColor} icon="return-down-back" bg="#64748B"
                label="Enter Key to Send" desc="Use Enter to send instead of new line"
                value={prefs.enter_to_send} onChange={(v) => updatePref("enter_to_send", v)} />
            </>
          )}
        </View>

        {/* ── MEDIA ────────────────────────────────────────── */}
        <SectionTitle label="MEDIA" />
        <View style={[s.group, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <TogRow colors={colors} themeColor={themeColor} icon="cloud-download" bg="#007AFF"
            label="Auto-Download Media" desc="Automatically download photos and videos"
            value={prefs.auto_download} onChange={(v) => updatePref("auto_download", v)} />
          <Sep color={colors.border} />
          <View style={s.row}>
            <View style={[s.iconBadge, { backgroundColor: "#FF9500" }]}>
              <Ionicons name="image" size={16} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.rowLabel, { color: colors.text }]}>Media Quality</Text>
              <Text style={[s.rowDesc, { color: colors.textMuted }]}>Upload quality for photos & videos</Text>
            </View>
            <View style={[s.seg, { borderColor: colors.border }]}>
              {MEDIA_QUALITIES.map((q) => (
                <TouchableOpacity
                  key={q}
                  onPress={() => updatePref("media_quality", q)}
                  style={[s.segBtn, prefs.media_quality === q && { backgroundColor: themeColor }]}
                >
                  <Text style={[s.segTxt, { color: prefs.media_quality === q ? "#fff" : colors.textMuted }]}>{q}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          {Platform.OS !== "web" && (
            <>
              <Sep color={colors.border} />
              <View style={s.row}>
                <View style={[s.iconBadge, { backgroundColor: "#34C759" }]}>
                  <Ionicons name="download" size={16} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.rowLabel, { color: colors.text }]}>Save to Gallery</Text>
                  <Text style={[s.rowDesc, { color: colors.textMuted }]}>Auto-save received photos to camera roll</Text>
                </View>
                <Switch
                  value={prefs.save_to_gallery}
                  onValueChange={async (enabled) => {
                    if (enabled) {
                      const granted = await requestGalleryPermissionOnce();
                      if (!granted) {
                        showAlert("Permission Required", "AfuChat needs access to your photo library. Please enable it in device Settings.");
                        return;
                      }
                    }
                    updatePref("save_to_gallery", enabled);
                  }}
                  trackColor={{ true: themeColor, false: colors.border }}
                  thumbColor="#fff"
                />
              </View>
            </>
          )}
        </View>

        {/* ── SECURITY ─────────────────────────────────────── */}
        <SectionTitle label="SECURITY" />
        <View style={[s.group, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <TogRow colors={colors} themeColor={themeColor} icon="lock-closed" bg="#FF3B30"
            label="Chat Lock" desc="Require Face ID / fingerprint to open chats"
            value={prefs.chat_lock} onChange={(v) => updatePref("chat_lock", v)} />
          <Sep color={colors.border} />
          <TogRow colors={colors} themeColor={themeColor} icon="archive" bg="#FF9500"
            label="Archive on Delete" desc="Move messages to archive instead of deleting"
            value={prefs.archive_on_delete} onChange={(v) => updatePref("archive_on_delete", v)} />
        </View>

        {/* ── BACKUP ───────────────────────────────────────── */}
        <SectionTitle label="BACKUP" />
        <View style={[s.group, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <TogRow colors={colors} themeColor={themeColor} icon="cloud-upload" bg="#5856D6"
            label="Auto Chat Backup" desc="Automatically back up your chats to the cloud"
            value={prefs.chat_backup} onChange={(v) => updatePref("chat_backup", v)} />
          {prefs.chat_backup && (
            <>
              <Sep color={colors.border} />
              <TouchableOpacity
                style={s.row}
                onPress={handleBackupNow}
                activeOpacity={0.7}
                disabled={backingUp}
              >
                <View style={[s.iconBadge, { backgroundColor: "#5856D6" }]}>
                  {backingUp
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <Ionicons name="refresh" size={16} color="#fff" />}
                </View>
                <Text style={[s.rowLabel, { color: colors.text, flex: 1 }]}>Back Up Now</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* ── DANGER ZONE ──────────────────────────────────── */}
        <SectionTitle label="DANGER ZONE" />
        <View style={[s.group, { backgroundColor: colors.surface, borderColor: "#FF3B3033" }]}>
          <TouchableOpacity
            style={s.row}
            activeOpacity={0.7}
            onPress={handleClearAllChats}
            disabled={clearing}
          >
            <View style={[s.iconBadge, { backgroundColor: "#FF3B30" }]}>
              {clearing
                ? <ActivityIndicator size="small" color="#fff" />
                : <Ionicons name="trash" size={16} color="#fff" />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.rowLabel, { color: "#FF3B30" }]}>
                {clearing ? "Clearing…" : "Clear All Chats"}
              </Text>
              <Text style={[s.rowDesc, { color: colors.textMuted }]}>
                {prefs.archive_on_delete ? "Archives your sent messages" : "Permanently deletes your sent messages"}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        <View style={s.footer}>
          <Ionicons name="information-circle-outline" size={14} color={colors.textMuted} />
          <Text style={[s.footerText, { color: colors.textMuted }]}>
            Settings are saved automatically and synced across your devices.
          </Text>
        </View>

      </ScrollView>
    </View>
  );
}

function SectionTitle({ label }: { label: string }) {
  const { colors } = useTheme();
  return (
    <Text style={[s.sectionTitle, { color: colors.textMuted }]}>{label}</Text>
  );
}

function Sep({ color }: { color: string }) {
  return <View style={[s.sep, { backgroundColor: color }]} />;
}

function TogRow({
  colors, themeColor, icon, bg, label, desc, value, onChange,
}: {
  colors: any; themeColor: string; icon: string; bg: string;
  label: string; desc?: string; value: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <View style={s.row}>
      <View style={[s.iconBadge, { backgroundColor: bg }]}>
        <Ionicons name={icon as any} size={16} color="#fff" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[s.rowLabel, { color: colors.text }]}>{label}</Text>
        {desc && <Text style={[s.rowDesc, { color: colors.textMuted }]}>{desc}</Text>}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ true: themeColor, false: colors.border }}
        thumbColor="#fff"
      />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },

  sectionTitle: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.9,
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 8,
  },

  card: {
    marginHorizontal: 16,
    borderRadius: 18,
    borderWidth: 0.5,
    overflow: "hidden",
    padding: 16,
    ...Platform.select({
      web: { boxShadow: "0 2px 8px rgba(0,0,0,0.06)" } as any,
      default: { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
    }),
  },

  group: {
    marginHorizontal: 16,
    borderRadius: 18,
    borderWidth: 0.5,
    overflow: "hidden",
    ...Platform.select({
      web: { boxShadow: "0 2px 8px rgba(0,0,0,0.06)" } as any,
      default: { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
    }),
  },

  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  cardTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  cardSub:   { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },

  accentPill: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  accentPillText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },

  swatchGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "flex-start",
  },
  swatch: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      default: { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.18, shadowRadius: 4, elevation: 3 },
    }),
  },

  previewCard: {
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 18,
    borderWidth: 0.5,
    padding: 14,
    gap: 8,
  },
  previewLabel: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  previewBubbleRow: { flexDirection: "row" },
  previewBubble: { maxWidth: "72%", paddingHorizontal: 12, paddingVertical: 8 },
  previewBubbleLeft: {},
  previewBubbleRight: {},
  previewBubbleText: { fontFamily: "Inter_400Regular", lineHeight: 18 },
  previewTsRow: { flexDirection: "row", alignItems: "center", gap: 2, alignSelf: "flex-end", marginTop: 4 },
  previewTs: { fontSize: 10, fontFamily: "Inter_400Regular" },

  bubbleStyleRow: {
    flexDirection: "row",
    gap: 10,
  },
  bubbleTile: {
    flex: 1,
    alignItems: "center",
    gap: 8,
    borderRadius: 14,
    borderWidth: 1.5,
    paddingVertical: 14,
    paddingHorizontal: 8,
  },
  bubbleShape: { width: 40, height: 26 },
  bubbleTileLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  activeDot: { width: 6, height: 6, borderRadius: 3 },

  fontRow: {
    flexDirection: "row",
    gap: 10,
  },
  fontTile: {
    flex: 1,
    alignItems: "center",
    gap: 5,
    borderRadius: 14,
    borderWidth: 1.5,
    paddingVertical: 12,
  },
  fontSzLabel: { fontSize: 10, fontFamily: "Inter_400Regular" },

  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 12,
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  rowLabel: { fontSize: 15, fontFamily: "Inter_500Medium" },
  rowDesc:  { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2, lineHeight: 16 },
  sep: { height: 0.5, marginLeft: 58 },

  seg: {
    flexDirection: "row",
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 1,
  },
  segBtn: { paddingHorizontal: 10, paddingVertical: 6 },
  segTxt: { fontSize: 12, fontFamily: "Inter_600SemiBold" },

  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 4,
  },
  footerText: { fontSize: 12, fontFamily: "Inter_400Regular", flex: 1 },
});
