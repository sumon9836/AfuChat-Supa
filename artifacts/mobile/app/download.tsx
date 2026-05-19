import { useEffect } from "react";
import { router } from "expo-router";

export default function DownloadNative() {
  useEffect(() => {
    router.replace("/login");
  }, []);
  return null;
}
