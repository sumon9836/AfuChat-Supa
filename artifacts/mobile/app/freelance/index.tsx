import { useEffect } from "react";
import { View } from "react-native";
import { useSuperApp } from "@/lib/superapp/MiniAppRuntime";
import { safeRouter } from "@/lib/navUtils";

/**
 * /freelance — opens the AfuFreelance mini app then replaces itself
 * with the Apps tab so the back stack is clean.
 */
export default function FreelanceLauncher() {
  const { openApp } = useSuperApp();
  useEffect(() => {
    openApp("afufreelance");
    safeRouter.replace("/(tabs)/apps");
  }, []);
  return <View style={{ flex: 1 }} />;
}
