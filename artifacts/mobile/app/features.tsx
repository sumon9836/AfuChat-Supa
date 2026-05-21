import { useEffect } from "react";
import { router } from "expo-router";

export default function FeaturesNative() {
  useEffect(() => {
    router.replace("/(tabs)/chats" as any);
  }, []);
  return null;
}
