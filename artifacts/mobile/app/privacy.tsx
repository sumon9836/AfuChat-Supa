import { useEffect } from "react";
import { Linking } from "react-native";
import { router } from "expo-router";

export default function PrivacyRedirect() {
  useEffect(() => {
    Linking.openURL("https://afuchat.com/privacy");
    router.back();
  }, []);
  return null;
}
