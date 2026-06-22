import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/hooks/useTheme";
import { showAlert } from "@/lib/alert";
import { Avatar } from "@/components/ui/Avatar";
import { GlassHeader } from "@/components/ui/GlassHeader";
import { deleteAllLocalMessages } from "@/lib/storage/localMessages";
import Colors from "@/constants/colors";

const DISAPPEAR_OPTIONS = [
  { label: "Off",       seconds: 0 },
  { label: "5 minutes", seconds: 300 },
  { label: "1 hour",   seconds: 3600 },
  { label: "24 hours", seconds: 86400 },
  { label: "7 days",   seconds: 604800 },
  { label: "4 weeks",  seconds: 2419200 },
];

const MUTE_OPTIONS: { label: string; hours: number | null }[] = [
  { label: "For 1 hour",  hours: 1 },
  { label: "For 8 hours", hours: 8 },
  { label: "For 1 week",  hours: 24 * 7 },
  { label: "Forever",     hours: null },
];

type ChatMeta = {
  is_group: boolean;
  is_channel: boolean;
  name: string;
  avatar_url: string | null;
  other_id: string | null;
  other_name: string | null;
  other_avatar: string | null;
};

export default function ChatInfoScreen() {
  const { id, name: nameParam, avatar: avatarParam, otherId: otherIdParam, isGroup: isGroupParam, isChannel: isChannelParam } = useLocalSearchParams<{
    id: string;
    name?: string;
    avatar?: string;
    otherId?: string;
    isGroup?: string;
    isChannel?: string;
  }>();

  const { colors, accent } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const [meta, setMeta] = useState<ChatMeta | null>(null);

  const [muteUntil, setMuteUntil]     = useState<string | null | undefined>(undefined);
  const [showMutePicker, setShowMutePicker] = useState(false);

  const [disappearingEnabled, setDisappearingEnabled] = useState(false);
  const [disappearingTimer,   setDisappearingTimer]   = useState(86400);
  const [showDisappearPicker, setShowDisappearPicker] = useState(false);

  const [isBlocked, setIsBlocked] = useState(false);

  const isMuted = muteUntil === null || (muteUntil !== undefined && new Date(muteUntil) > new Date());
  const isGroup   = meta?.is_group   ?? isGroupParam   === "1";
  const isChannel = meta?.is_channel ?? isChannelParam === "1";
  const isDM      = !isGroup && !isChannel;
  const otherId   = meta?.other_id   ?? otherIdParam ?? null;
  const displayName = meta
    ? (isGroup || isChannel ? meta.name : meta.other_name ?? meta.name)
    : (nameParam ?? "Chat");
  const avatarUri = meta
    ? (isGroup || isChannel ? meta.avatar_url : meta.other_avatar)
    : (avatarParam ?? null);

  const BRAND = accent ?? Colors.brand;

  const load = useCallback(async () => {
    if (!id || !user) return;
    const [chatRes, muteRes, disappearOn, disappearTimer] = await Promise.all([
      supabase
        .from("conversations")
        .select("is_group, is_channel, name, avatar_url, chat_members!inner(user_id, profiles(display_name, avatar_url, id))")
        .eq("id", id)
        .single(),
      supabase
        .from("chat_mutes")
        .select("muted_until")
        .eq("user_id", user.id)
        .eq("chat_id", id)
        .maybeSingle(),
      AsyncStorage.getItem(`afu_disappearing_${id}`).catch(() => null),
      AsyncStorage.getItem(`afu_disappearing_timer_${id}`).catch(() => null),
    ]);

    if (chatRes.data) {
      const c = chatRes.data as any;
      const members: any[] = c.chat_members ?? [];
      const other = members.find((m: any) => m.user_id !== user.id);
      const op = other?.profiles ?? null;
      setMeta({
        is_group: !!c.is_group,
        is_channel: !!c.is_channel,
        name: c.name ?? "Chat",
        avatar_url: c.avatar_url ?? null,
        other_id: op?.id ?? null,
        other_name: op?.display_name ?? null,
        other_avatar: op?.avatar_url ?? null,
      });
      if (op?.id) {
        const blockRes = await supabase
          .from("blocks")
          .select("id")
          .eq("blocker_id", user.id)
          .eq("blocked_id", op.id)
          .maybeSingle();
        setIsBlocked(!!blockRes.data);
      }
    }

    if (muteRes.data) {
      setMuteUntil(muteRes.data.muted_until ?? null);
    } else {
      setMuteUntil(undefined);
    }

    setDisappearingEnabled(disappearOn === "1");
    if (disappearTimer) setDisappearingTimer(Number(disappearTimer));
  }, [id, user]);

  useEffect(() => { load(); }, [load]);

  function muteLabel(): string {
    if (!isMuted || muteUntil === undefined) return "";
    if (muteUntil === null) return "Muted forever";
    const diff = new Date(muteUntil).getTime() - Date.now();
    if (diff <= 0) return "";
    const h = Math.floor(diff / 3_600_000);
    const m = Math.floor((diff % 3_600_000) / 60_000);
    if (h >= 24 * 6) return `Muted for ${Math.floor(h / 24)}d`;
    if (h > 0) return `Muted for ${h}h ${m}m`;
    return `Muted for ${m}m`;
  }

  const disappearLabel = disappearingEnabled
    ? (DISAPPEAR_OPTIONS.find((o) => o.seconds === disappearingTimer)?.label ?? "On")
    : "Off";

  async function handleMute(hours: number | null) {
    if (!user) return;
    const val = hours === null ? null : new Date(Date.now() + hours * 3_600_000).toISOString();
    setMuteUntil(val);
    setShowMutePicker(false);
    await supabase.from("chat_mutes").upsert(
      { user_id: user.id, chat_id: id, muted_until: val, created_at: new Date().toISOString() },
      { onConflict: "user_id,chat_id" },
    );
  }

  async function handleUnmute() {
    if (!user) return;
    setMuteUntil(undefined);
    await supabase.from("chat_mutes").delete().eq("user_id", user.id).eq("chat_id", id);
  }

  async function handleDisappear(seconds: number) {
    setShowDisappearPicker(false);
    if (seconds === 0) {
      setDisappearingEnabled(false);
      setDisappearingTimer(86400);
      await AsyncStorage.setItem(`afu_disappearing_${id}`, "0");
      await AsyncStorage.removeItem(`afu_disappearing_timer_${id}`);
    } else {
      setDisappearingEnabled(true);
      setDisappearingTimer(seconds);
      await AsyncStorage.setItem(`afu_disappearing_${id}`, "1");
      await AsyncStorage.setItem(`afu_disappearing_timer_${id}`, String(seconds));
    }
  }

  async function handleBlock() {
    if (!user || !otherId) return;
    if (isBlocked) {
      showAlert("Unblock User", `Allow ${displayName} to message you again?`, [
        { text: "Cancel", style: "cancel" },
        { text: "Unblock", onPress: async () => {
          await supabase.from("blocks").delete().eq("blocker_id", user.id).eq("blocked_id", otherId);
          setIsBlocked(false);
        }},
      ]);
    } else {
      showAlert("Block User", `Block ${displayName}? They won't be able to send you messages.`, [
        { text: "Cancel", style: "cancel" },
        { text: "Block", style: "destructive", onPress: async () => {
          await supabase.from("blocks").insert({ blocker_id: user.id, blocked_id: otherId });
          setIsBlocked(true);
        }},
      ]);
    }
  }

  async function handleReport() {
    if (!user || !otherId) return;
    showAlert("Report User", `Why are you reporting ${displayName}?`, [
      { text: "Spam", onPress: async () => {
        await supabase.from("user_reports").insert({ reporter_id: user.id, reported_id: otherId, reason: "spam" });
        showAlert("Reported", "Thank you. We'll review this report.");
      }},
      { text: "Harassment", onPress: async () => {
        await supabase.from("user_reports").insert({ reporter_id: user.id, reported_id: otherId, reason: "harassment" });
        showAlert("Reported", "Thank you. We'll review this report.");
      }},
      { text: "Inappropriate Content", onPress: async () => {
        await supabase.from("user_reports").insert({ reporter_id: user.id, reported_id: otherId, reason: "inappropriate" });
        showAlert("Reported", "Thank you. We'll review this report.");
      }},
      { text: "Cancel", style: "cancel" },
    ]);
  }

  async function handleClearChat() {
    if (!user) return;
    const subtitle = (isGroup || isChannel)
      ? "This clears the chat for you only — other members won't be affected. This cannot be undone."
      : "This clears the chat for you only. This cannot be undone.";
    showAlert("Clear Chat", subtitle, [
      { text: "Cancel", style: "cancel" },
      { text: "Clear", style: "destructive", onPress: async () => {
        try {
          const clearedAt = new Date().toISOString();
          await AsyncStorage.setItem(`chat_cleared_${user.id}_${id}`, clearedAt);
          if (Platform.OS !== "web") {
            await deleteAllLocalMessages(id);
          }
          showAlert("Cleared", "Chat history has been cleared.");
        } catch {
          showAlert("Error", "Could not clear chat. Please try again.");
        }
      }},
    ]);
  }

  async function handleDeleteOrLeave() {
    if (!user) return;
    const title = (isGroup || isChannel) ? "Leave" : "Delete Chat";
    const msg = (isGroup || isChannel)
      ? `Leave this ${isChannel ? "channel" : "group"}? You won't receive messages anymore.`
      : "Delete this conversation? All messages will be removed for you.";
    showAlert(title, msg, [
      { text: "Cancel", style: "cancel" },
      { text: title, style: "destructive", onPress: async () => {
        try {
          if (isGroup || isChannel) {
            await supabase.from("chat_members").delete().eq("chat_id", id).eq("user_id", user.id);
          } else {
            await supabase.from("messages").delete().eq("chat_id", id);
            await supabase.from("conversations").delete().eq("id", id);
          }
          router.replace("/(tabs)/chats" as any);
        } catch {
          showAlert("Error", "Could not complete this action. Please try again.");
        }
      }},
    ]);
  }

  return (
    <View style={[s.root, { backgroundColor: colors.backgroundSecondary }]}>
      <GlassHeader title="Chat Info" />

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 48, paddingTop: 8 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Avatar + name banner ── */}
        <View style={[s.banner, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Avatar uri={avatarUri} name={displayName} size={64} />
          <View style={{ flex: 1, gap: 3 }}>
            <Text style={[s.bannerName, { color: colors.text }]} numberOfLines={1}>{displayName}</Text>
            <Text style={[s.bannerSub, { color: colors.textMuted }]}>
              {isChannel ? "Channel" : isGroup ? "Group" : "Direct Message"}
            </Text>
          </View>
          {isDM && otherId && (
            <TouchableOpacity
              style={[s.viewProfileBtn, { backgroundColor: BRAND + "18", borderColor: BRAND + "44" }]}
              onPress={() => router.push({ pathname: "/contact/[id]", params: { id: otherId } })}
              activeOpacity={0.7}
            >
              <Text style={[s.viewProfileText, { color: BRAND }]}>View Profile</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── Quick links ── */}
        <SectionTitle label="GENERAL" colors={colors} />
        <View style={[s.group, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Row
            colors={colors}
            icon="star-outline"
            bg="#FF9500"
            label="Starred Messages"
            onPress={() => router.push({ pathname: "/saved-posts", params: { tab: "messages" } } as any)}
          />
          <Sep color={colors.border} />
          <Row
            colors={colors}
            icon="color-palette-outline"
            bg={BRAND}
            label="Chat Appearance"
            onPress={() => router.push("/settings/chat" as any)}
          />
          <Sep color={colors.border} />
          <Row
            colors={colors}
            icon="settings-outline"
            bg="#5856D6"
            label="Chat Settings"
            sub="Bubbles, fonts, media & more"
            onPress={() => router.push("/settings/chat" as any)}
          />
        </View>

        {/* ── Notifications ── */}
        <SectionTitle label="NOTIFICATIONS" colors={colors} />
        <View style={[s.group, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Row
            colors={colors}
            icon={isMuted ? "notifications-off-outline" : "notifications-outline"}
            bg={isMuted ? "#8E8E93" : "#007AFF"}
            label={isMuted ? "Unmute Notifications" : "Mute Notifications"}
            sub={muteLabel() || undefined}
            chevron={!isMuted}
            onPress={() => {
              if (isMuted) { handleUnmute(); } else { setShowMutePicker((v) => !v); }
            }}
          />
          {showMutePicker && !isMuted && (
            <View style={[s.subGroup, { borderTopColor: colors.border }]}>
              {MUTE_OPTIONS.map((o) => (
                <SubRow
                  key={o.label}
                  colors={colors}
                  label={o.label}
                  onPress={() => handleMute(o.hours)}
                />
              ))}
            </View>
          )}
        </View>

        {/* ── Disappearing Messages ── */}
        {!isChannel && (
          <>
            <SectionTitle label="PRIVACY" colors={colors} />
            <View style={[s.group, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Row
                colors={colors}
                icon="timer-outline"
                bg="#34C759"
                label="Disappearing Messages"
                sub={disappearLabel}
                chevron
                onPress={() => setShowDisappearPicker((v) => !v)}
              />
              {showDisappearPicker && (
                <View style={[s.subGroup, { borderTopColor: colors.border }]}>
                  {DISAPPEAR_OPTIONS.map((o) => {
                    const active = o.seconds === 0 ? !disappearingEnabled : (disappearingEnabled && disappearingTimer === o.seconds);
                    return (
                      <SubRow
                        key={o.seconds}
                        colors={colors}
                        label={o.label}
                        checked={active}
                        onPress={() => handleDisappear(o.seconds)}
                      />
                    );
                  })}
                </View>
              )}
            </View>
          </>
        )}

        {/* ── Danger zone (DM only) ── */}
        {isDM && otherId && (
          <>
            <SectionTitle label="SAFETY" colors={colors} />
            <View style={[s.group, { backgroundColor: colors.surface, borderColor: "#FF3B3033" }]}>
              <Row
                colors={colors}
                icon={isBlocked ? "checkmark-circle-outline" : "ban-outline"}
                bg={isBlocked ? "#34C759" : "#FF3B30"}
                label={isBlocked ? `Unblock ${displayName}` : `Block ${displayName}`}
                danger={!isBlocked}
                onPress={handleBlock}
              />
              <Sep color={colors.border} />
              <Row
                colors={colors}
                icon="flag-outline"
                bg="#FF3B30"
                label={`Report ${displayName}`}
                danger
                onPress={handleReport}
              />
            </View>
          </>
        )}

        {/* ── Destructive ── */}
        <SectionTitle label="DANGER ZONE" colors={colors} />
        <View style={[s.group, { backgroundColor: colors.surface, borderColor: "#FF3B3033" }]}>
          <Row
            colors={colors}
            icon="trash-outline"
            bg="#FF3B30"
            label="Clear Chat"
            sub="Removes all messages for you only"
            danger
            onPress={handleClearChat}
          />
          <Sep color={colors.border} />
          <Row
            colors={colors}
            icon={isGroup || isChannel ? "exit-outline" : "close-circle-outline"}
            bg="#FF3B30"
            label={isChannel ? "Leave Channel" : isGroup ? "Leave Group" : "Delete Chat"}
            danger
            onPress={handleDeleteOrLeave}
          />
        </View>
      </ScrollView>
    </View>
  );
}

function SectionTitle({ label, colors }: { label: string; colors: any }) {
  return (
    <Text style={[s.sectionTitle, { color: colors.textMuted }]}>{label}</Text>
  );
}

function Sep({ color }: { color: string }) {
  return <View style={[s.sep, { backgroundColor: color }]} />;
}

function Row({
  colors, icon, bg, label, sub, danger, chevron, onPress,
}: {
  colors: any; icon: string; bg: string; label: string;
  sub?: string; danger?: boolean; chevron?: boolean; onPress: () => void;
}) {
  return (
    <TouchableOpacity style={s.row} onPress={onPress} activeOpacity={0.6}>
      <View style={[s.iconBadge, { backgroundColor: bg }]}>
        <Ionicons name={icon as any} size={16} color="#fff" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[s.rowLabel, { color: danger ? "#FF3B30" : colors.text }]}>{label}</Text>
        {sub ? <Text style={[s.rowSub, { color: colors.textMuted }]}>{sub}</Text> : null}
      </View>
      {chevron
        ? <Ionicons name="chevron-down" size={14} color={colors.textMuted} />
        : <Ionicons name="chevron-forward" size={15} color={colors.textMuted} />}
    </TouchableOpacity>
  );
}

function SubRow({ colors, label, checked, onPress }: {
  colors: any; label: string; checked?: boolean; onPress: () => void;
}) {
  return (
    <TouchableOpacity style={s.subRow} onPress={onPress} activeOpacity={0.6}>
      <Ionicons name="time-outline" size={15} color={colors.textMuted} style={{ width: 20 }} />
      <Text style={[s.subRowLabel, { color: colors.text }]}>{label}</Text>
      {checked && <Ionicons name="checkmark" size={14} color="#34C759" />}
    </TouchableOpacity>
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

  banner: {
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 18,
    borderWidth: 0.5,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    ...Platform.select({
      web: { boxShadow: "0 2px 8px rgba(0,0,0,0.06)" } as any,
      default: { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
    }),
  },
  bannerName: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
  },
  bannerSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  viewProfileBtn: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  viewProfileText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
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

  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
    minHeight: 52,
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  rowLabel: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
  rowSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 1,
  },

  subGroup: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  subRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 11,
    gap: 10,
  },
  subRowLabel: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },

  sep: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 58,
  },
});
