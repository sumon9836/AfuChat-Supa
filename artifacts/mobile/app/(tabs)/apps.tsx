import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Redirect, router, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/hooks/useTheme";
import { Avatar } from "@/components/ui/Avatar";
import OfflineBanner from "@/components/ui/OfflineBanner";
import { showAlert } from "@/lib/alert";
import { showToast } from "@/lib/toast";

type Conversation = {
  id: string;
  name: string | null;
  avatar_url: string | null;
  is_group: boolean;
  is_channel: boolean;
  created_at: string;
  _memberCount?: number;
};

type UserItem = {
  id: string;
  handle: string;
  display_name: string;
  avatar_url: string | null;
  is_admin: boolean;
  created_at: string;
};

function SectionHeader({ title, onAction, actionLabel, colors }: {
  title: string;
  onAction?: () => void;
  actionLabel?: string;
  colors: any;
}) {
  return (
    <View style={sh.row}>
      <Text style={[sh.title, { color: colors.text }]}>{title}</Text>
      {onAction && (
        <TouchableOpacity
          style={[sh.btn, { backgroundColor: colors.accent }]}
          onPress={onAction}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={14} color="#fff" />
          <Text style={sh.btnText}>{actionLabel ?? "Create"}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
const sh = StyleSheet.create({
  row:     { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 },
  title:   { fontSize: 17, fontFamily: "Inter_700Bold" },
  btn:     { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  btnText: { color: "#fff", fontSize: 12, fontFamily: "Inter_600SemiBold" },
});

function CreateModal({ visible, onClose, onSubmit, title, isChannel, colors, isDark }: {
  visible: boolean;
  onClose: () => void;
  onSubmit: (name: string, desc: string) => Promise<void>;
  title: string;
  isChannel: boolean;
  colors: any;
  isDark: boolean;
}) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [loading, setLoading] = useState(false);
  const textColor  = isDark ? "#F1F1F1" : "#0F0F0F";
  const mutedColor = isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.45)";
  const inputBg    = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)";
  const borderCol  = isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.10)";

  async function handleSubmit() {
    if (!name.trim()) { showAlert("Required", "Please enter a name."); return; }
    setLoading(true);
    await onSubmit(name.trim(), desc.trim());
    setLoading(false);
    setName(""); setDesc("");
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={cm.overlay}>
        <View style={[cm.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={cm.topRow}>
            <Text style={[cm.cardTitle, { color: textColor }]}>{title}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={20} color={mutedColor} />
            </TouchableOpacity>
          </View>
          <View style={{ gap: 12, marginTop: 16 }}>
            <TextInput
              style={[cm.input, { backgroundColor: inputBg, borderColor: borderCol, color: textColor }]}
              placeholder={isChannel ? "Channel name" : "Group name"}
              placeholderTextColor={mutedColor}
              value={name}
              onChangeText={setName}
              autoFocus
            />
            <TextInput
              style={[cm.input, { backgroundColor: inputBg, borderColor: borderCol, color: textColor, height: 72 }]}
              placeholder="Description (optional)"
              placeholderTextColor={mutedColor}
              value={desc}
              onChangeText={setDesc}
              multiline
            />
          </View>
          <TouchableOpacity
            style={[cm.submitBtn, { backgroundColor: colors.accent }, loading && { opacity: 0.6 }]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={cm.submitText}>{isChannel ? "Create Channel" : "Create Group"}</Text>
            }
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
const cm = StyleSheet.create({
  overlay:    { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  card:       { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, borderWidth: 0.5 },
  topRow:     { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  cardTitle:  { fontSize: 18, fontFamily: "Inter_700Bold" },
  input:      { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontFamily: "Inter_400Regular", ...Platform.select({ web: { outlineStyle: "none" } as any }) },
  submitBtn:  { height: 50, borderRadius: 999, alignItems: "center", justifyContent: "center", marginTop: 16 },
  submitText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
});

export default function AdminPanel() {
  const { colors, isDark } = useTheme();
  const { user, profile } = useAuth();
  const insets = useSafeAreaInsets();

  const textColor  = isDark ? "#F1F1F1" : "#0F0F0F";
  const mutedColor = isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.45)";

  const [groups, setGroups] = useState<Conversation[]>([]);
  const [channels, setChannels] = useState<Conversation[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [createGroupVisible, setCreateGroupVisible] = useState(false);
  const [createChannelVisible, setCreateChannelVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<"groups" | "channels" | "users">("groups");

  if (!profile?.is_admin) {
    return <Redirect href="/(tabs)/chats" />;
  }

  const loadGroups = useCallback(async () => {
    setLoadingGroups(true);
    try {
      const { data } = await supabase
        .from("conversations")
        .select("id, name, avatar_url, is_group, is_channel, created_at")
        .eq("is_group", true)
        .eq("is_channel", false)
        .order("created_at", { ascending: false });
      setGroups((data as Conversation[]) ?? []);
    } catch {}
    setLoadingGroups(false);
  }, []);

  const loadChannels = useCallback(async () => {
    setLoadingGroups(true);
    try {
      const { data } = await supabase
        .from("conversations")
        .select("id, name, avatar_url, is_group, is_channel, created_at")
        .eq("is_channel", true)
        .order("created_at", { ascending: false });
      setChannels((data as Conversation[]) ?? []);
    } catch {}
    setLoadingGroups(false);
  }, []);

  const loadUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const { data } = await supabase
        .from("profiles")
        .select("id, handle, display_name, avatar_url, is_admin, created_at")
        .order("created_at", { ascending: false })
        .limit(50);
      setUsers((data as UserItem[]) ?? []);
    } catch {}
    setLoadingUsers(false);
  }, []);

  useFocusEffect(useCallback(() => {
    loadGroups();
    loadChannels();
  }, [loadGroups, loadChannels]));

  useEffect(() => {
    if (activeTab === "users") loadUsers();
  }, [activeTab, loadUsers]);

  async function createGroup(name: string, desc: string) {
    if (!user) return;
    const { error } = await supabase.from("conversations").insert({
      name,
      description: desc || null,
      is_group: true,
      is_channel: false,
      created_by: user.id,
    });
    if (error) {
      showAlert("Error", error.message);
    } else {
      showToast("Group created");
      loadGroups();
    }
  }

  async function createChannel(name: string, desc: string) {
    if (!user) return;
    const { error } = await supabase.from("conversations").insert({
      name,
      description: desc || null,
      is_group: true,
      is_channel: true,
      created_by: user.id,
    });
    if (error) {
      showAlert("Error", error.message);
    } else {
      showToast("Channel created");
      loadChannels();
    }
  }

  async function deleteConversation(id: string, type: "group" | "channel") {
    showAlert(
      `Delete ${type}`,
      `Are you sure you want to permanently delete this ${type}? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const { error } = await supabase.from("conversations").delete().eq("id", id);
            if (error) {
              showAlert("Error", error.message);
            } else {
              showToast(`${type === "group" ? "Group" : "Channel"} deleted`);
              if (type === "group") loadGroups(); else loadChannels();
            }
          },
        },
      ]
    );
  }

  async function toggleAdmin(userId: string, currentlyAdmin: boolean) {
    const { error } = await supabase
      .from("profiles")
      .update({ is_admin: !currentlyAdmin })
      .eq("id", userId);
    if (error) {
      showAlert("Error", error.message);
    } else {
      showToast(currentlyAdmin ? "Admin removed" : "Admin granted");
      loadUsers();
    }
  }

  const ADMIN_TABS = [
    { key: "groups", label: "Groups", icon: "people-outline" },
    { key: "channels", label: "Channels", icon: "megaphone-outline" },
    { key: "users", label: "Users", icon: "person-outline" },
  ] as const;

  function renderConv(item: Conversation, type: "group" | "channel") {
    return (
      <TouchableOpacity
        key={item.id}
        style={[convRow.wrap, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => router.push({ pathname: "/chat/[id]", params: { id: item.id } } as any)}
        activeOpacity={0.8}
      >
        <Avatar uri={item.avatar_url} size={42} />
        <View style={{ flex: 1 }}>
          <Text style={[convRow.name, { color: textColor }]} numberOfLines={1}>
            {item.name ?? "Untitled"}
          </Text>
          <Text style={[convRow.date, { color: mutedColor }]}>
            {new Date(item.created_at).toLocaleDateString()}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => router.push({ pathname: "/group/[id]", params: { id: item.id } } as any)}
          style={convRow.editBtn}
          hitSlop={8}
        >
          <Ionicons name="create-outline" size={18} color={colors.accent} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => deleteConversation(item.id, type)}
          style={[convRow.editBtn, { marginLeft: 4 }]}
          hitSlop={8}
        >
          <Ionicons name="trash-outline" size={18} color="#FF3B30" />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  }

  function renderUser(item: UserItem) {
    const isMe = item.id === user?.id;
    return (
      <View
        key={item.id}
        style={[convRow.wrap, { backgroundColor: colors.surface, borderColor: colors.border }]}
      >
        <Avatar uri={item.avatar_url} size={42} />
        <View style={{ flex: 1 }}>
          <Text style={[convRow.name, { color: textColor }]} numberOfLines={1}>
            {item.display_name || item.handle}
          </Text>
          <Text style={[convRow.date, { color: mutedColor }]}>@{item.handle}</Text>
        </View>
        {item.is_admin && (
          <View style={[adminBadge.wrap, { backgroundColor: colors.accent + "20" }]}>
            <Text style={[adminBadge.text, { color: colors.accent }]}>Admin</Text>
          </View>
        )}
        {!isMe && (
          <TouchableOpacity
            onPress={() => toggleAdmin(item.id, item.is_admin)}
            style={[convRow.editBtn, { marginLeft: 6 }]}
            hitSlop={8}
          >
            <Ionicons
              name={item.is_admin ? "shield" : "shield-outline"}
              size={18}
              color={item.is_admin ? colors.accent : mutedColor}
            />
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <OfflineBanner />

      <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 16, paddingBottom: 8 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View style={[adminHeader.iconWrap, { backgroundColor: colors.accent + "18" }]}>
            <Ionicons name="shield" size={20} color={colors.accent} />
          </View>
          <View>
            <Text style={[adminHeader.title, { color: textColor }]}>Admin Panel</Text>
            <Text style={[adminHeader.sub, { color: mutedColor }]}>Manage groups, channels & users</Text>
          </View>
        </View>
      </View>

      <View style={[tabBar.wrap, { borderBottomColor: colors.border }]}>
        {ADMIN_TABS.map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[tabBar.item, activeTab === t.key && { borderBottomColor: colors.accent, borderBottomWidth: 2 }]}
            onPress={() => setActiveTab(t.key)}
            activeOpacity={0.75}
          >
            <Ionicons
              name={t.icon as any}
              size={16}
              color={activeTab === t.key ? colors.accent : mutedColor}
            />
            <Text style={[tabBar.label, { color: activeTab === t.key ? colors.accent : mutedColor }]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === "groups" && (
        <>
          <SectionHeader
            title={`Groups (${groups.length})`}
            onAction={() => setCreateGroupVisible(true)}
            actionLabel="Create"
            colors={colors}
          />
          {loadingGroups ? (
            <ActivityIndicator color={colors.accent} style={{ marginTop: 32 }} />
          ) : groups.length === 0 ? (
            <View style={empty.wrap}>
              <Ionicons name="people-outline" size={48} color={mutedColor} />
              <Text style={[empty.text, { color: mutedColor }]}>No groups yet</Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingBottom: insets.bottom + 100 }}>
              {groups.map((g) => renderConv(g, "group"))}
            </ScrollView>
          )}
        </>
      )}

      {activeTab === "channels" && (
        <>
          <SectionHeader
            title={`Channels (${channels.length})`}
            onAction={() => setCreateChannelVisible(true)}
            actionLabel="Create"
            colors={colors}
          />
          {loadingGroups ? (
            <ActivityIndicator color={colors.accent} style={{ marginTop: 32 }} />
          ) : channels.length === 0 ? (
            <View style={empty.wrap}>
              <Ionicons name="megaphone-outline" size={48} color={mutedColor} />
              <Text style={[empty.text, { color: mutedColor }]}>No channels yet</Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingBottom: insets.bottom + 100 }}>
              {channels.map((c) => renderConv(c, "channel"))}
            </ScrollView>
          )}
        </>
      )}

      {activeTab === "users" && (
        <>
          <SectionHeader title={`Users (${users.length})`} colors={colors} />
          {loadingUsers ? (
            <ActivityIndicator color={colors.accent} style={{ marginTop: 32 }} />
          ) : (
            <ScrollView contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingBottom: insets.bottom + 100 }}>
              {users.map((u) => renderUser(u))}
            </ScrollView>
          )}
        </>
      )}

      <CreateModal
        visible={createGroupVisible}
        onClose={() => setCreateGroupVisible(false)}
        onSubmit={createGroup}
        title="Create Group"
        isChannel={false}
        colors={colors}
        isDark={isDark}
      />
      <CreateModal
        visible={createChannelVisible}
        onClose={() => setCreateChannelVisible(false)}
        onSubmit={createChannel}
        title="Create Channel"
        isChannel={true}
        colors={colors}
        isDark={isDark}
      />
    </View>
  );
}

const adminHeader = StyleSheet.create({
  iconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  title:    { fontSize: 20, fontFamily: "Inter_700Bold" },
  sub:      { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
});

const tabBar = StyleSheet.create({
  wrap:  { flexDirection: "row", borderBottomWidth: StyleSheet.hairlineWidth },
  item:  { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingVertical: 10, borderBottomWidth: 2, borderBottomColor: "transparent" },
  label: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
});

const convRow = StyleSheet.create({
  wrap:    { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, marginBottom: 0 },
  name:    { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  date:    { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  editBtn: { padding: 4 },
});

const adminBadge = StyleSheet.create({
  wrap: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  text: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
});

const empty = StyleSheet.create({
  wrap: { flex: 1, alignItems: "center", justifyContent: "center", paddingBottom: 80 },
  text: { fontSize: 15, fontFamily: "Inter_400Regular", marginTop: 12 },
});
