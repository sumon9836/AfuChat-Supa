import { useEffect } from "react";
import { Platform, View } from "react-native";
import { router } from "expo-router";
import { useSuperApp } from "@/lib/superapp/MiniAppRuntime";
import AfuUsernamesApp from "@/modules/afuusernames";

export default function UsernameMarketPage() {
  const { openApp } = useSuperApp();

  useEffect(() => {
    if (Platform.OS !== "web") {
      openApp("afuusernames");
      router.replace("/(tabs)/apps");
    }
  }, []);

  if (Platform.OS !== "web") return <View style={{ flex: 1 }} />;
  return <AfuUsernamesApp />;
}
