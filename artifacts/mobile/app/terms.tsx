import { useEffect } from "react";
import { Linking } from "react-native";
import { router } from "expo-router";

export default function TermsRedirect() {
  useEffect(() => {
    Linking.openURL("https://afuchat.com/terms");
    router.back();
  }, []);
  return null;
}
