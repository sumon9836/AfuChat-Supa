import { useEffect, useState } from "react";
import { isOnline, onConnectivityChange } from "@/lib/offlineStore";

/**
 * Reactive hook that returns the current network connectivity state.
 * Updates automatically when connectivity changes. Safe to call from any
 * component — uses the same underlying listener as OfflineBanner.
 */
export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(isOnline);

  useEffect(() => {
    return onConnectivityChange((newOnline) => {
      setOnline(newOnline);
    });
  }, []);

  return online;
}
