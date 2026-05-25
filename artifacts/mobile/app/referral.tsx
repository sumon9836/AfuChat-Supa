import { useEffect } from "react";
import { Platform, View } from "react-native";
import { router } from "expo-router";
import { useSuperApp } from "@/lib/superapp/MiniAppRuntime";
import AfuReferralApp from "@/modules/afureferral";

export default function ReferralPage() {
  const { openApp } = useSuperApp();

  useEffect(() => {
    if (Platform.OS !== "web") {
      openApp("afureferral");
      router.replace("/(tabs)/apps");
    }
  }, []);

  if (Platform.OS !== "web") return <View style={{ flex: 1 }} />;
  return <AfuReferralApp />;
}
