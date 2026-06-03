import "react-native-gesture-handler";
import { enableScreens } from "react-native-screens";

enableScreens(true);

import React, { useEffect, useRef } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Linking, Platform, StyleSheet, Text, TextInput, View } from "react-native";
import { Stack, usePathname } from "expo-router";
import { setCurrentPage, resolvePageInfo } from "@/lib/pageTracker";
import { StatusBar } from "expo-status-bar";
import * as Font from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { useTheme } from "@/hooks/useTheme";

import { handleIncomingUrl } from "@/lib/deepLinkHandler";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";

import { AuthProvider, useAuth } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { AppAccentProvider } from "@/context/AppAccentContext";
import { LanguageProvider } from "@/context/LanguageContext";
import { AdvancedFeaturesProvider } from "@/context/AdvancedFeaturesContext";
import { ChatPreferencesProvider } from "@/context/ChatPreferencesContext";
import { DataModeProvider } from "@/context/DataModeContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ToastContainer } from "@/components/ui/ToastContainer";
import AlertModal from "@/components/ui/AlertModal";
import { PushNotificationManager } from "@/components/PushNotificationManager";
import { TrustpilotReviewPrompt } from "@/components/TrustpilotReviewPrompt";
import UpdatePrompt from "@/components/UpdatePrompt";
import { initActivityTracker } from "@/lib/activityTracker";
import { MiniAppRuntimeProvider } from "@/lib/superapp/MiniAppRuntime";

// ─── Splash screen — hold immediately at module-evaluation time ───────────────
// This runs before any component renders, ensuring the native splash stays
// visible until we explicitly call hideAsync() below. Without this, Expo
// auto-hides the splash when the first JS frame renders, which is before auth
// resolves — causing a flash of onboarding / welcome screens for signed-in users.
SplashScreen.preventAutoHideAsync().catch(() => {});

// ─── Background music service ─────────────────────────────────────────────────
// Must happen at module-evaluation time (before any component renders) so the
// foreground service survives app-kill and Bluetooth/notification controls
// continue to work when the user is not actively using the app.
if (Platform.OS !== "web") {
  try {
    const TrackPlayer = require("react-native-track-player").default;
    const { PlaybackService } = require("@/lib/musicService");
    TrackPlayer.registerPlaybackService(() => PlaybackService);
  } catch {}
}

// Lock out system-level font scaling so the app always renders at its
// intended sizes regardless of the device's accessibility font-size setting.
(Text as any).defaultProps = { ...((Text as any).defaultProps ?? {}), allowFontScaling: false };
(TextInput as any).defaultProps = { ...((TextInput as any).defaultProps ?? {}), allowFontScaling: false };

// ─── AppReadyGate ─────────────────────────────────────────────────────────────
// Sits inside AuthProvider so it can read auth loading state.
// Hides the splash screen the moment BOTH fonts and auth are resolved —
// preventing any intermediate screen (onboarding, welcome, login) from flashing.
function AppReadyGate({ fontsReady }: { fontsReady: boolean }) {
  const { loading } = useAuth();
  const hidden = useRef(false);

  useEffect(() => {
    if (!fontsReady || loading) return;
    if (hidden.current) return;
    hidden.current = true;
    SplashScreen.hideAsync().catch(() => {});
  }, [fontsReady, loading]);

  return null;
}

function ActivityTrackerSync() {
  const { user } = useAuth();
  useEffect(() => { initActivityTracker(user?.id ?? null); }, [user?.id]);
  return null;
}

function PageWatcher() {
  const pathname = usePathname();
  useEffect(() => {
    setCurrentPage(resolvePageInfo(pathname));
  }, [pathname]);
  return null;
}

function ThemedStatusBar() {
  const { isDark } = useTheme();
  return (
    <StatusBar
      style={isDark ? "light" : "dark"}
      translucent
      backgroundColor="transparent"
      animated
    />
  );
}

function ThemedRoot({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {children}
    </View>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = Font.useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const fontsReady = fontsLoaded || !!fontError;

  useEffect(() => {
    Linking.getInitialURL()
      .then(handleIncomingUrl)
      .catch(() => {});

    const sub = Linking.addEventListener("url", ({ url }) => handleIncomingUrl(url));
    return () => sub.remove();
  }, []);

  // On native: keep returning null (keeping the splash layer on top) until
  // fonts are ready. SplashScreen.preventAutoHideAsync() above ensures the
  // native splash is still visible. On web: render immediately with system
  // fonts (blocking causes a blank white screen in the browser).
  if (Platform.OS !== "web" && !fontsReady) {
    return null;
  }

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={styles.root}>
        <ThemeProvider>
          <ThemedRoot>
            <AppAccentProvider>
              <ThemedStatusBar />
              <DataModeProvider>
                <AuthProvider>
                  {/* Gate hides the splash only once fonts + auth are both done */}
                  <AppReadyGate fontsReady={fontsReady} />
                  <ActivityTrackerSync />
                  <PageWatcher />
                  <PushNotificationManager />
                  <TrustpilotReviewPrompt />
                  <UpdatePrompt />
                  <LanguageProvider>
                    <AdvancedFeaturesProvider>
                      <ChatPreferencesProvider>
                        <MiniAppRuntimeProvider>
                          <Stack
                            screenOptions={{
                              headerShown: false,
                              animation: Platform.OS === "android"
                                ? "slide_from_right"
                                : "ios_from_right",
                              contentStyle: { backgroundColor: "transparent" },
                              freezeOnBlur: true,
                            }}
                          >
                            <Stack.Screen name="index" options={{ animation: "none", contentStyle: { backgroundColor: "transparent" } }} />
                            <Stack.Screen name="welcome" options={{ animation: "none", gestureEnabled: false }} />
                            <Stack.Screen name="(tabs)" options={{ animation: "none" }} />
                            <Stack.Screen name="(auth)" options={{ animation: "fade" }} />
                            <Stack.Screen name="onboarding" options={{ animation: "none" }} />
                            <Stack.Screen name="+not-found" />
                          </Stack>
                          <ToastContainer />
                          <AlertModal />
                        </MiniAppRuntimeProvider>
                      </ChatPreferencesProvider>
                    </AdvancedFeaturesProvider>
                  </LanguageProvider>
                </AuthProvider>
              </DataModeProvider>
            </AppAccentProvider>
          </ThemedRoot>
        </ThemeProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
