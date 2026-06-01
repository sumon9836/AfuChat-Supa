import { useEffect } from "react";
import { router } from "expo-router";

export default function LandingNative() {
  useEffect(() => {
    router.replace("/welcome");
  }, []);
  return null;
}
