import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as WebBrowser from "expo-web-browser";
import { makeRedirectUri } from "expo-auth-session";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/hooks/useTheme";
import { useAppAccent } from "@/context/AppAccentContext";
import { showAlert } from "@/lib/alert";
import { googleSignIn } from "@/lib/googleAuth";
import AfuLogo from "@/components/ui/AfuLogo";
import { GoogleLogo } from "@/components/ui/OAuthLogos";

export default function SignInScreen() {
  const { isDark, colors } = useTheme();
  const { accent } = useAppAccent();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) router.replace("/(tabs)/chats");
  }, [user]);

  const textColor   = isDark ? "#F1F1F1" : "#0F0F0F";
  const mutedColor  = isDark ? "rgba(255,255,255,0.42)" : "rgba(0,0,0,0.42)";
  const surfaceColor = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)";
  const borderColor  = isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.09)";

  async function nativeGoogleSignIn() {
    setLoading(true);
    const result = await googleSignIn();
    if (!result.ok) {
      setLoading(false);
      if (result.cancelled) return;
      return webGoogleSignIn();
    }
    const uid = result.userId;
    if (uid) {
      const { data: prof } = await supabase
        .from("profiles")
        .select("onboarding_completed")
        .eq("id", uid)
        .maybeSingle();
      if (!prof?.onboarding_completed) {
        setLoading(false);
        router.replace({ pathname: "/onboarding", params: { userId: uid } } as any);
        return;
      }
    }
    setLoading(false);
    router.replace("/(tabs)/chats");
  }

  async function webGoogleSignIn() {
    try {
      setLoading(true);
      const redirectUrl = makeRedirectUri({ native: "afuchat://(auth)/login" });
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
          queryParams: { prompt: "select_account" },
        },
      });
      if (error) { showAlert("Error", error.message); setLoading(false); return; }
      if (!data?.url) { setLoading(false); return; }

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl, { showInRecents: false });
      if (result.type === "success" && result.url) {
        const url = new URL(result.url);
        const code = url.searchParams.get("code");
        if (code) {
          const { data: sd, error: e } = await supabase.auth.exchangeCodeForSession(code);
          if (e) {
            showAlert("Error", e.message);
          } else {
            const uid = sd.user?.id;
            if (uid) {
              const { data: prof } = await supabase
                .from("profiles")
                .select("onboarding_completed")
                .eq("id", uid)
                .maybeSingle();
              if (!prof?.onboarding_completed) {
                setLoading(false);
                router.replace({ pathname: "/onboarding", params: { userId: uid } } as any);
                return;
              }
            }
            setLoading(false);
            router.replace("/(tabs)/chats");
            return;
          }
        }
        let at = url.hash ? new URLSearchParams(url.hash.substring(1)).get("access_token") : null;
        let rt = url.hash ? new URLSearchParams(url.hash.substring(1)).get("refresh_token") : null;
        if (!at) { at = url.searchParams.get("access_token"); rt = url.searchParams.get("refresh_token"); }
        if (at && rt) {
          const { error: e } = await supabase.auth.setSession({ access_token: at, refresh_token: rt });
          if (e) showAlert("Error", e.message);
          else router.replace("/(tabs)/chats");
        }
      }
      setLoading(false);
    } catch {
      setLoading(false);
      showAlert("Error", "Could not complete Google sign-in.");
    }
  }

  function handleGoogle() {
    Platform.OS === "web" ? webGoogleSignIn() : nativeGoogleSignIn();
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      <View style={{
        flex: 1,
        paddingHorizontal: 28,
        paddingTop: insets.top + 64,
        paddingBottom: insets.bottom + 32,
      }}>
        <View style={{ alignItems: "center", marginBottom: 56 }}>
          <AfuLogo size={72} />
        </View>

        <Text style={[sc.heading, { color: textColor }]}>Welcome to AfuChat</Text>
        <Text style={[sc.subheading, { color: mutedColor }]}>
          Sign in to start chatting with friends and groups
        </Text>

        <View style={{ marginTop: 40 }}>
          <TouchableOpacity
            style={[sc.googleBtn, { backgroundColor: surfaceColor, borderColor }]}
            onPress={handleGoogle}
            disabled={loading}
            activeOpacity={0.78}
          >
            {loading ? (
              <ActivityIndicator size="small" color={accent} />
            ) : (
              <>
                <GoogleLogo size={22} />
                <Text style={[sc.googleBtnText, { color: textColor }]}>Continue with Google</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={{ marginTop: "auto", paddingTop: 28, alignItems: "center", gap: 6 }}>
          <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
            <Text
              style={[sc.footerLink, { color: accent }]}
              onPress={() => Linking.openURL("https://afuchat.com/terms").catch(() => {})}
            >
              Terms
            </Text>
            <Text style={{ color: mutedColor, fontSize: 12 }}>·</Text>
            <Text
              style={[sc.footerLink, { color: accent }]}
              onPress={() => Linking.openURL("https://afuchat.com/privacy").catch(() => {})}
            >
              Privacy
            </Text>
            <Text style={{ color: mutedColor, fontSize: 12 }}>·</Text>
            <Text
              style={[sc.footerLink, { color: accent }]}
              onPress={() => router.push("/help" as any)}
            >
              Help
            </Text>
          </View>
          <Text style={{ fontSize: 10.5, fontFamily: "Inter_400Regular", color: isDark ? "rgba(255,255,255,0.16)" : "rgba(0,0,0,0.16)" }}>
            © {new Date().getFullYear()} AfuChat Technologies Limited
          </Text>
        </View>
      </View>
    </View>
  );
}

const sc = StyleSheet.create({
  heading: {
    fontSize: 32,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.8,
    lineHeight: 40,
    marginBottom: 10,
  },
  subheading: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    lineHeight: 22,
  },
  googleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    height: 56,
    borderRadius: 999,
    borderWidth: 1.5,
  },
  googleBtnText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.1,
  },
  footerLink: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
});
