import { useEffect } from "react";
import { router } from "expo-router";

export default function ContactNative() {
  useEffect(() => {
    router.replace("/support" as any);
  }, []);
  return null;
}
