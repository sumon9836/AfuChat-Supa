import { useEffect } from "react";
import { Platform, View } from "react-native";
import { router } from "expo-router";
import { useSuperApp } from "@/lib/superapp/MiniAppRuntime";
import AfuEventsApp from "@/modules/afuevents";

export default function DigitalEventsPage() {
  const { openApp } = useSuperApp();

  useEffect(() => {
    if (Platform.OS !== "web") {
      openApp("afuevents");
      router.replace("/(tabs)/apps");
    }
  }, []);

  if (Platform.OS !== "web") return <View style={{ flex: 1 }} />;
  return <AfuEventsApp />;
}
