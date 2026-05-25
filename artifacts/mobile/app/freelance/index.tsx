import { useEffect } from "react";
import { Platform, View } from "react-native";
import { useSuperApp } from "@/lib/superapp/MiniAppRuntime";
import { safeRouter } from "@/lib/navUtils";
import AfuFreelanceApp from "@/modules/afufreelance";

export default function FreelancePage() {
  const { openApp } = useSuperApp();

  useEffect(() => {
    if (Platform.OS !== "web") {
      openApp("afufreelance");
      safeRouter.replace("/(tabs)/apps");
    }
  }, []);

  if (Platform.OS !== "web") return <View style={{ flex: 1 }} />;
  return <AfuFreelanceApp />;
}
