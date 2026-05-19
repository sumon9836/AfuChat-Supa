import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/hooks/useTheme";
import { useAppAccent } from "@/context/AppAccentContext";

function prettifyDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export default function InAppBrowser() {
  const { url } = useLocalSearchParams<{ url: string }>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { accent } = useAppAccent();
  const [opened, setOpened] = useState(false);
  const [error, setError] = useState(false);

  const targetUrl = url ?? "";
  const domain = prettifyDomain(targetUrl);

  async function openExternal() {
    if (!targetUrl) { setError(true); return; }
    try {
      const supported = await Linking.canOpenURL(targetUrl);
      if (supported) {
        await Linking.openURL(targetUrl);
        setOpened(true);
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    }
  }

  // Auto-open on mount
  useEffect(() => {
    openExternal();
  }, []);

  const bg = isDark ? "#0F0F0F" : "#F2F2F7";
  const cardBg = colors.surface;

  return (
    <View style={[st.root, { backgroundColor: bg, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={[st.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={st.backBtn} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[st.headerTitle, { color: colors.text }]} numberOfLines={1}>
          {domain || "External Link"}
        </Text>
        <View style={{ width: 44 }} />
      </View>

      {/* Card */}
      <View style={st.body}>
        <View style={[st.card, { backgroundColor: cardBg, shadowColor: isDark ? "#000" : "#00000018" }]}>
          {/* Icon */}
          <View style={[st.iconWrap, { backgroundColor: accent + "18" }]}>
            <Ionicons name="globe-outline" size={40} color={accent} />
          </View>

          {/* Domain */}
          <Text style={[st.domain, { color: colors.text }]} numberOfLines={1}>
            {domain || "Website"}
          </Text>

          {/* Status message */}
          {error ? (
            <Text style={[st.statusText, { color: "#FF3B30" }]}>
              Could not open this URL. Please check the link and try again.
            </Text>
          ) : opened ? (
            <Text style={[st.statusText, { color: colors.textMuted }]}>
              Opened in your default browser. Come back here when you're done.
            </Text>
          ) : (
            <View style={st.loadingRow}>
              <ActivityIndicator size="small" color={accent} />
              <Text style={[st.statusText, { color: colors.textMuted, marginTop: 0 }]}>
                Opening browser…
              </Text>
            </View>
          )}

          {/* URL pill */}
          {!!targetUrl && (
            <View style={[st.urlPill, { backgroundColor: isDark ? "#2C2C2E" : "#EBEBF0" }]}>
              <Ionicons name="lock-closed" size={11} color="#34C759" />
              <Text style={[st.urlText, { color: colors.textMuted }]} numberOfLines={1}>
                {targetUrl}
              </Text>
            </View>
          )}

          {/* Open / Retry button */}
          <TouchableOpacity
            style={[st.openBtn, { backgroundColor: accent }]}
            onPress={openExternal}
            activeOpacity={0.82}
          >
            <Ionicons name="open-outline" size={18} color="#fff" />
            <Text style={st.openBtnText}>
              {error ? "Retry" : opened ? "Open Again" : "Open in Browser"}
            </Text>
          </TouchableOpacity>

          {/* Back link */}
          <TouchableOpacity style={st.backLink} onPress={() => router.back()}>
            <Text style={[st.backLinkText, { color: colors.textMuted }]}>← Go back to AfuChat</Text>
          </TouchableOpacity>
        </View>

        {/* Notice */}
        <View style={st.noticeRow}>
          <Ionicons name="shield-checkmark-outline" size={14} color={colors.textMuted} />
          <Text style={[st.noticeText, { color: colors.textMuted }]}>
            This link opens in your device's browser for your privacy and security.
          </Text>
        </View>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, textAlign: "center", fontSize: 15, fontFamily: "Inter_600SemiBold" },

  body: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 20,
  },

  card: {
    width: "100%",
    borderRadius: 20,
    padding: 28,
    alignItems: "center",
    gap: 12,
    ...Platform.select({
      android: { elevation: 6 },
      ios: { shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.10, shadowRadius: 16 },
      default: {},
    }),
  },

  iconWrap: {
    width: 76,
    height: 76,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },

  domain: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },

  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  statusText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
    marginTop: 2,
  },

  urlPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    maxWidth: "100%",
  },
  urlText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    flex: 1,
  },

  openBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    width: "100%",
    height: 50,
    borderRadius: 14,
    marginTop: 6,
  },
  openBtnText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },

  backLink: { paddingVertical: 6 },
  backLinkText: { fontSize: 13, fontFamily: "Inter_400Regular" },

  noticeRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 7,
    paddingHorizontal: 8,
  },
  noticeText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    flex: 1,
    lineHeight: 17,
  },
});
