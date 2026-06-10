import { useEffect } from "react";
import { Linking, Platform } from "react-native";
import { router } from "expo-router";

export default function PrivacyRedirect() {
  useEffect(() => {
    if (Platform.OS !== "web") {
      Linking.openURL("https://afuchat.com/privacy");
    }
    try {
      if (router.canGoBack()) router.back();
      else router.replace("/");
    } catch {
      try { router.replace("/"); } catch {}
    }
  }, []);
  return null;
}
