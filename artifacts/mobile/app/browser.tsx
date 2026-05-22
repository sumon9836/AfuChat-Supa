import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Animated,
  Keyboard,
  Linking,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { WebView, WebViewNavigation } from "react-native-webview";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/hooks/useTheme";
import { useAppAccent } from "@/context/AppAccentContext";

function normaliseUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^[a-z0-9-]+\.[a-z]{2,}/i.test(trimmed)) return `https://${trimmed}`;
  return `https://www.google.com/search?q=${encodeURIComponent(trimmed)}`;
}

function prettyUrl(url: string): string {
  try {
    const u = new URL(url);
    return (u.hostname + u.pathname).replace(/\/$/, "");
  } catch {
    return url;
  }
}

function isSecure(url: string): boolean {
  try { return new URL(url).protocol === "https:"; }
  catch { return false; }
}

export default function InAppBrowser() {
  const { url } = useLocalSearchParams<{ url?: string }>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { accent } = useAppAccent();

  const targetUrl = normaliseUrl(url ?? "");

  const webRef = useRef<WebView>(null);
  const [currentUrl, setCurrentUrl] = useState(targetUrl);
  const [displayUrl, setDisplayUrl] = useState(prettyUrl(targetUrl));
  const [isEditing, setIsEditing] = useState(!targetUrl);
  const [inputText, setInputText] = useState(prettyUrl(targetUrl));

  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const progressAnim = useRef(new Animated.Value(0)).current;
  const urlBarAnim = useRef(new Animated.Value(0)).current;

  const startProgress = useCallback(() => {
    progressAnim.setValue(0.1);
    Animated.timing(progressAnim, {
      toValue: 0.85,
      duration: 8000,
      useNativeDriver: false,
    }).start();
  }, []);

  const finishProgress = useCallback(() => {
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: 180,
      useNativeDriver: false,
    }).start(() => {
      setTimeout(() => {
        progressAnim.setValue(0);
      }, 200);
    });
  }, []);

  const handleNavigationChange = useCallback((nav: WebViewNavigation) => {
    setCanGoBack(nav.canGoBack);
    setCanGoForward(nav.canGoForward);
    setCurrentUrl(nav.url);
    setDisplayUrl(prettyUrl(nav.url));
    if (!isEditing) setInputText(prettyUrl(nav.url));
  }, [isEditing]);

  const handleLoadStart = useCallback(() => {
    setLoading(true);
    setHasError(false);
    startProgress();
  }, [startProgress]);

  const handleLoadEnd = useCallback(() => {
    setLoading(false);
    finishProgress();
  }, [finishProgress]);

  const handleError = useCallback(() => {
    setLoading(false);
    setHasError(true);
    progressAnim.setValue(0);
  }, []);

  const navigate = useCallback((rawUrl: string) => {
    const nav = normaliseUrl(rawUrl);
    if (!nav) return;
    setCurrentUrl(nav);
    setDisplayUrl(prettyUrl(nav));
    setInputText(prettyUrl(nav));
    setHasError(false);
  }, []);

  const commitUrl = useCallback(() => {
    Keyboard.dismiss();
    setIsEditing(false);
    navigate(inputText);
    Animated.timing(urlBarAnim, { toValue: 0, duration: 200, useNativeDriver: false }).start();
  }, [inputText, navigate]);

  const startEditing = useCallback(() => {
    setIsEditing(true);
    setInputText(currentUrl);
    Animated.timing(urlBarAnim, { toValue: 1, duration: 200, useNativeDriver: false }).start();
  }, [currentUrl]);

  const cancelEditing = useCallback(() => {
    setIsEditing(false);
    setInputText(displayUrl);
    Keyboard.dismiss();
    Animated.timing(urlBarAnim, { toValue: 0, duration: 200, useNativeDriver: false }).start();
  }, [displayUrl]);

  async function handleShare() {
    try {
      await Share.share({ url: currentUrl, message: currentUrl });
    } catch {}
  }

  async function handleOpenExternal() {
    try { await Linking.openURL(currentUrl); } catch {}
  }

  const secure = isSecure(currentUrl);

  const barBg = isDark ? "#1C1C1E" : "#FFFFFF";
  const pageBg = isDark ? "#0F0F0F" : "#F2F2F7";
  const inputBg = isDark ? "#2C2C2E" : "#EBEBF0";
  const borderColor = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";
  const muted = isDark ? "rgba(235,235,245,0.6)" : "rgba(60,60,67,0.6)";

  if (Platform.OS === "web") {
    return (
      <View style={{ flex: 1, backgroundColor: pageBg, justifyContent: "center", alignItems: "center" }}>
        <Ionicons name="globe-outline" size={40} color={muted} />
        <Text style={{ color: muted, marginTop: 12, fontFamily: "Inter_400Regular" }}>
          Open this link in your browser
        </Text>
        <TouchableOpacity
          style={[st.webBtn, { backgroundColor: accent, marginTop: 20 }]}
          onPress={() => { if (currentUrl) Linking.openURL(currentUrl); }}
        >
          <Text style={{ color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 15 }}>Open</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[st.root, { backgroundColor: pageBg }]}>
      {/* ── Status-bar spacer ───────────────────────────── */}
      <View style={{ height: insets.top, backgroundColor: barBg }} />

      {/* ── Top bar ─────────────────────────────────────── */}
      <View style={[st.topBar, { backgroundColor: barBg, borderBottomColor: borderColor }]}>
        {/* Close */}
        <TouchableOpacity onPress={() => router.back()} style={st.iconBtn} hitSlop={8}>
          <Ionicons name="close" size={22} color={colors.text} />
        </TouchableOpacity>

        {/* URL bar */}
        <Pressable
          style={[st.urlBar, { backgroundColor: inputBg }]}
          onPress={startEditing}
        >
          {isEditing ? (
            <TextInput
              style={[st.urlInput, { color: colors.text }]}
              value={inputText}
              onChangeText={setInputText}
              autoFocus
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              returnKeyType="go"
              onSubmitEditing={commitUrl}
              selectTextOnFocus
              placeholderTextColor={muted}
              placeholder="Search or enter address"
            />
          ) : (
            <View style={st.urlDisplay}>
              <Ionicons
                name={secure ? "lock-closed" : "warning-outline"}
                size={12}
                color={secure ? "#34C759" : "#FF9500"}
                style={{ marginRight: 4 }}
              />
              <Text style={[st.urlText, { color: colors.text }]} numberOfLines={1}>
                {displayUrl || currentUrl}
              </Text>
            </View>
          )}
        </Pressable>

        {/* Cancel / Refresh */}
        {isEditing ? (
          <TouchableOpacity onPress={cancelEditing} style={st.iconBtn} hitSlop={8}>
            <Text style={{ color: accent, fontFamily: "Inter_500Medium", fontSize: 15 }}>Cancel</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={() => {
              if (loading) {
                webRef.current?.stopLoading();
              } else {
                webRef.current?.reload();
              }
            }}
            style={st.iconBtn}
            hitSlop={8}
          >
            <Ionicons
              name={loading ? "close" : "refresh"}
              size={20}
              color={colors.text}
            />
          </TouchableOpacity>
        )}
      </View>

      {/* ── Progress bar ────────────────────────────────── */}
      <View style={st.progressTrack}>
        <Animated.View
          style={[
            st.progressBar,
            {
              backgroundColor: accent,
              opacity: loading ? 1 : 0,
              width: progressAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ["0%", "100%"],
              }),
            },
          ]}
        />
      </View>

      {/* ── WebView ─────────────────────────────────────── */}
      {currentUrl ? (
        <WebView
          ref={webRef}
          source={{ uri: currentUrl }}
          style={[st.webview, { backgroundColor: pageBg }]}
          onNavigationStateChange={handleNavigationChange}
          onLoadStart={handleLoadStart}
          onLoadEnd={handleLoadEnd}
          onError={handleError}
          onHttpError={handleError}
          allowsBackForwardNavigationGestures
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          javaScriptEnabled
          domStorageEnabled
          startInLoadingState={false}
          decelerationRate="normal"
          renderError={() => (
            <View style={[st.errorBox, { backgroundColor: pageBg }]}>
              <Ionicons name="wifi-outline" size={48} color={muted} />
              <Text style={[st.errorTitle, { color: colors.text }]}>Page not available</Text>
              <Text style={[st.errorSub, { color: muted }]}>
                Could not load {displayUrl}. Check your connection and try again.
              </Text>
              <TouchableOpacity
                style={[st.retryBtn, { backgroundColor: accent }]}
                onPress={() => webRef.current?.reload()}
              >
                <Ionicons name="refresh" size={16} color="#fff" />
                <Text style={st.retryText}>Try Again</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[st.externalBtn, { borderColor: borderColor }]}
                onPress={handleOpenExternal}
              >
                <Ionicons name="open-outline" size={16} color={colors.text} />
                <Text style={[st.externalText, { color: colors.text }]}>Open in Browser</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      ) : (
        <View style={[st.errorBox, { backgroundColor: pageBg }]}>
          <Ionicons name="link-outline" size={48} color={muted} />
          <Text style={[st.errorTitle, { color: colors.text }]}>No URL provided</Text>
          <TouchableOpacity style={[st.retryBtn, { backgroundColor: accent }]} onPress={startEditing}>
            <Ionicons name="search" size={16} color="#fff" />
            <Text style={st.retryText}>Search</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Bottom nav bar ──────────────────────────────── */}
      <View
        style={[
          st.bottomBar,
          { backgroundColor: barBg, borderTopColor: borderColor, paddingBottom: Math.max(insets.bottom, 8) },
        ]}
      >
        <TouchableOpacity
          style={st.navBtn}
          onPress={() => webRef.current?.goBack()}
          disabled={!canGoBack}
          hitSlop={8}
        >
          <Ionicons name="chevron-back" size={24} color={canGoBack ? colors.text : muted} />
        </TouchableOpacity>

        <TouchableOpacity
          style={st.navBtn}
          onPress={() => webRef.current?.goForward()}
          disabled={!canGoForward}
          hitSlop={8}
        >
          <Ionicons name="chevron-forward" size={24} color={canGoForward ? colors.text : muted} />
        </TouchableOpacity>

        <TouchableOpacity style={st.navBtn} onPress={handleShare} hitSlop={8}>
          <Ionicons name="share-outline" size={22} color={colors.text} />
        </TouchableOpacity>

        <TouchableOpacity style={st.navBtn} onPress={handleOpenExternal} hitSlop={8}>
          <Ionicons name="open-outline" size={21} color={colors.text} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1 },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 8,
    gap: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },

  iconBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  urlBar: {
    flex: 1,
    height: 36,
    borderRadius: 10,
    paddingHorizontal: 10,
    justifyContent: "center",
  },

  urlDisplay: {
    flexDirection: "row",
    alignItems: "center",
  },

  urlText: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },

  urlInput: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    padding: 0,
  },

  progressTrack: {
    height: 2.5,
    width: "100%",
    overflow: "hidden",
  },

  progressBar: {
    height: 2.5,
  },

  webview: { flex: 1 },

  bottomBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },

  navBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
  },

  errorBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 36,
    gap: 14,
  },

  errorTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
    marginTop: 4,
  },

  errorSub: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
  },

  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 4,
  },

  retryText: {
    color: "#fff",
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },

  externalBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },

  externalText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },

  webBtn: {
    paddingHorizontal: 28,
    paddingVertical: 13,
    borderRadius: 12,
  },
});
