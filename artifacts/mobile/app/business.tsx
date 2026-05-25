import { useEffect } from "react";
import { Platform, View } from "react-native";
import { router } from "expo-router";
import { useSuperApp } from "@/lib/superapp/MiniAppRuntime";
import AfuBusinessApp from "@/modules/afubusiness";

export default function BusinessPage() {
  const { openApp } = useSuperApp();

  useEffect(() => {
    if (Platform.OS !== "web") {
      openApp("afubusiness");
      router.replace("/(tabs)/apps");
    }
  }, []);

  if (Platform.OS !== "web") return <View style={{ flex: 1 }} />;
  return <AfuBusinessApp />;
}
