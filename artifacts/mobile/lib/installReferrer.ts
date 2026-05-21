import { Platform } from "react-native";

export type InstallReferrerInfo = {
  installReferrer: string | null;
  referrerClickTimestampSeconds: number | null;
  installBeginTimestampSeconds: number | null;
  googlePlayInstantParam: boolean | null;
};

let _referrerInfo: InstallReferrerInfo | null = null;

export function getInstallReferrerInfo(): InstallReferrerInfo | null {
  return _referrerInfo;
}

export function initInstallReferrer(): void {
  if (Platform.OS !== "android") return;
  try {
    const { PlayInstallReferrer } = require("react-native-play-install-referrer");
    PlayInstallReferrer.getInstallReferrerInfo(
      (info: InstallReferrerInfo, error: unknown) => {
        if (error) return;
        _referrerInfo = info;
      }
    );
  } catch {
    // Native module not available (Expo Go / web) — silently skip
  }
}
