import "react-native-gesture-handler";
import { enableScreens } from "react-native-screens";

enableScreens(true);

import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Linking, Platform, StyleSheet, Text, TextInput, View } from "react-native";
import { Stack, usePathname } from "expo-router";
import { setCurrentPage, resolvePageInfo } from "@/lib/pageTracker";
import { StatusBar } from "expo-status-bar";
import * as Font from "expo-font";
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
import { initConnectivityToasts } from "@/lib/toast";
import { initActivityTracker } from "@/lib/activityTracker";
import { MiniAppRuntimeProvider } from "@/lib/superapp/MiniAppRuntime";

// Register react-native-track-player's background playback service.
// Must happen at module-evaluation time (before any component renders) so the
// foreground service survives app-kill and Bluetooth/notification controls
// continue to work when the user is not actively using the app.
// The Platform guard + dynamic require keeps this out of the web bundle.
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

function ActivityTrackerSync() {
  const { user } = useAuth();
  useEffect(() => { initActivityTracker(user?.id ?? null); }, [user?.id]);
  return null;
}

/**
 * Watches the active Expo Router pathname and writes it to the module-level
 * PageTracker store so mini apps (which are always-mounted) can always read
 * the most recent main-app route without needing their own usePathname() hook.
 */
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

  useEffect(() => {
    initConnectivityToasts();
  }, []);

  useEffect(() => {
    // Cold start — app was killed and opened via a link
    Linking.getInitialURL()
      .then(handleIncomingUrl)
      .catch(() => {});

    // Warm start — app already running, link tapped in foreground/background
    const sub = Linking.addEventListener("url", ({ url }) => handleIncomingUrl(url));
    return () => sub.remove();
  }, []);

  // On native, block until fonts are ready to avoid flash-of-unstyled-text.
  // On web, render immediately with system fonts then swap in Inter once loaded
  // — blocking here causes a blank white screen in the browser.
  if (Platform.OS !== "web" && !fontsLoaded && !fontError) {
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
                          <Stack.Screen name="index" options={{ animation: "none", contentStyle: { backgroundColor: "#ffffff" } }} />
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
