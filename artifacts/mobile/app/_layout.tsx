import "react-native-gesture-handler";
import { enableScreens } from "react-native-screens";

enableScreens(true);

import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Linking, Platform, StyleSheet, Text, TextInput } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as Font from "expo-font";
import { useTheme } from "@/hooks/useTheme";
import * as SplashScreen from "expo-splash-screen";
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
import { initConnectivityToasts } from "@/lib/toast";
import { initActivityTracker } from "@/lib/activityTracker";

// Keep the native splash visible until fonts are ready so we never flash
// a blank screen between the system launch image and the app UI.
// Must be called before any component renders.
if (Platform.OS !== "web") {
  SplashScreen.preventAutoHideAsync().catch(() => {});
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

function ThemedStatusBar() {
  const { isDark } = useTheme();
  return (
    <StatusBar
      style={isDark ? "light" : "dark"}
      translucent
      backgroundColor="transparent"
    />
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = Font.useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  // Hide the splash screen as soon as fonts have resolved (loaded or errored).
  // This replaces the previous pattern of returning null — the splash stays
  // visible (via preventAutoHideAsync above) instead of showing a blank frame,
  // eliminating the double-flash caused by the Android system splash → blank
  // → Expo splash sequence.
  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError]);

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
          <AppAccentProvider>
            <ThemedStatusBar />
            <DataModeProvider>
              <AuthProvider>
                <ActivityTrackerSync />
                <PushNotificationManager />
                <TrustpilotReviewPrompt />
                <LanguageProvider>
                  <AdvancedFeaturesProvider>
                    <ChatPreferencesProvider>
                      <Stack
                        screenOptions={{
                          headerShown: false,
                          // Android uses a slide transition; iOS uses the native
                          // push animation. Both feel platform-correct.
                          animation: Platform.OS === "android"
                            ? "slide_from_right"
                            : "ios_from_right",
                          // Transparent so each screen's own background shows —
                          // prevents the cyan flash visible between navigations.
                          contentStyle: { backgroundColor: "transparent" },
                          freezeOnBlur: true,
                        }}
                      >
                        <Stack.Screen name="index" options={{ animation: "none", contentStyle: { backgroundColor: "#ffffff" } }} />
                        <Stack.Screen name="(tabs)" options={{ animation: "none" }} />
                        <Stack.Screen name="(auth)" options={{ animation: "fade" }} />
                        <Stack.Screen name="+not-found" />
                      </Stack>
                      <ToastContainer />
                      <AlertModal />
                    </ChatPreferencesProvider>
                  </AdvancedFeaturesProvider>
                </LanguageProvider>
              </AuthProvider>
            </DataModeProvider>
          </AppAccentProvider>
        </ThemeProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
