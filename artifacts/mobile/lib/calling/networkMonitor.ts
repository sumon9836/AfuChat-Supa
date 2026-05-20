/**
 * networkMonitor.ts — detects WiFi ↔ cellular handoffs and notifies callers.
 *
 * This is the key layer that makes calls survive network switches:
 * instead of waiting for WebRTC's 4-second ICE-disconnected timer to fire
 * (during which audio goes silent), we detect the interface change immediately
 * and trigger an ICE restart proactively, cutting reconnect time from ~4–8s
 * down to ~1–2s.
 */

import { Platform } from "react-native";

/**
 * Subscribe to network type changes (wifi ↔ cellular ↔ other).
 * `onNetworkChange(newType, prevType)` is called whenever the connection type
 * transitions between different non-empty states. Changes to/from "none" or
 * "unknown" are filtered out — they are handled by the ICE disconnect logic.
 *
 * Returns an unsubscribe function.
 */
export function watchNetworkChanges(
  onNetworkChange: (newType: string, prevType: string) => void
): () => void {
  if (Platform.OS === "web") return () => {};

  let NetInfo: any;
  try {
    NetInfo = require("@react-native-community/netinfo").default;
  } catch {
    return () => {};
  }

  let prevType: string | null = null;
  let debounce: ReturnType<typeof setTimeout> | null = null;

  const unsubscribe = NetInfo.addEventListener((state: any) => {
    const cur = (state?.type as string) ?? "unknown";

    if (cur === "none" || cur === "unknown") {
      prevType = cur;
      return;
    }

    if (
      prevType !== null &&
      prevType !== cur &&
      prevType !== "none" &&
      prevType !== "unknown"
    ) {
      if (debounce) clearTimeout(debounce);
      const prev = prevType;
      debounce = setTimeout(() => onNetworkChange(cur, prev), 300);
    }

    prevType = cur;
  });

  return () => {
    if (debounce) clearTimeout(debounce);
    unsubscribe?.();
  };
}
