import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { BackHandler, Platform, StyleSheet, View } from "react-native";
import { safeRouter } from "@/lib/navUtils";
import { useTheme } from "@/hooks/useTheme";

import type { AppLifecycleState, OpenApp, SuperAppContextValue } from "./types";
import { findModule, SUPER_APP_ID_SET } from "./registry";
import { SuperAppContext } from "./SuperAppContext";
import MiniAppWindow from "@/components/superapp/MiniAppWindow";
import MiniAppDock from "@/components/superapp/MiniAppDock";

import AfuAIApp from "@/modules/afuai";
import AfuPayApp from "@/modules/afupay";
import AfuMarketApp from "@/modules/afumarket";
import AfuGamesApp from "@/modules/afugames";
import AfuMusicApp from "@/modules/afumusic";
import AfuBusinessApp from "@/modules/afubusiness";
import AfuSearchApp from "@/modules/afusearch";
import AfuLensApp from "@/modules/afulens";
import AfuIDApp from "@/modules/afuid";
import AfuQRApp from "@/modules/afuqr";
import AfuSavedApp from "@/modules/afusaved";
import AfuNearbyApp from "@/modules/afunearby";
import AfuReferralApp from "@/modules/afureferral";
import AfuServicesApp from "@/modules/afuservices";
import AfuFreelanceApp from "@/modules/afufreelance";
import AfuCollectionsApp from "@/modules/afucollections";
import AfuEventsApp from "@/modules/afuevents";
import AfuUsernamesApp from "@/modules/afuusernames";

function getMiniAppComponent(id: string): React.ComponentType | null {
  switch (id) {
    case "afuai":          return AfuAIApp;
    case "afupay":         return AfuPayApp;
    case "afumarket":      return AfuMarketApp;
    case "afugames":       return AfuGamesApp;
    case "afumusic":       return AfuMusicApp;
    case "afubusiness":    return AfuBusinessApp;
    case "afusearch":      return AfuSearchApp;
    case "afulens":        return AfuLensApp;
    case "afuid":          return AfuIDApp;
    case "afuqr":          return AfuQRApp;
    case "afusaved":       return AfuSavedApp;
    case "afunearby":      return AfuNearbyApp;
    case "afureferral":    return AfuReferralApp;
    case "afuservices":    return AfuServicesApp;
    case "afufreelance":   return AfuFreelanceApp;
    case "afucollections": return AfuCollectionsApp;
    case "afuevents":      return AfuEventsApp;
    case "afuusernames":   return AfuUsernamesApp;
    default:               return null;
  }
}

/** Re-export so callers can import from either location. */
export { useSuperApp } from "./SuperAppContext";

export function MiniAppRuntimeProvider({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  const [openApps, setOpenApps] = useState<OpenApp[]>([]);
  const [activeAppId, setActiveAppId] = useState<string | null>(null);

  const openApp = useCallback((id: string) => {
    if (Platform.OS === "web") return;
    const manifest = findModule(id);
    if (!manifest || manifest.comingSoon) return;
    if (manifest.nativeOnly && Platform.OS === "web") return;

    setOpenApps((prev) => {
      const existing = prev.find((a) => a.manifest.id === id);
      if (existing) {
        return prev.map((a) =>
          a.manifest.id === id
            ? { ...a, state: "active" as AppLifecycleState }
            : { ...a, state: "background" as AppLifecycleState }
        );
      }
      return [
        ...prev.map((a) => ({ ...a, state: "background" as AppLifecycleState })),
        { manifest, state: "active" as AppLifecycleState, openedAt: Date.now() },
      ];
    });
    setActiveAppId(id);
  }, []);

  const closeApp = useCallback((id: string) => {
    setOpenApps((prev) => prev.filter((a) => a.manifest.id !== id));
    setActiveAppId((cur) => (cur === id ? null : cur));
  }, []);

  const minimizeApp = useCallback((id: string) => {
    setOpenApps((prev) =>
      prev.map((a) =>
        a.manifest.id === id
          ? { ...a, state: "background" as AppLifecycleState }
          : a
      )
    );
    setActiveAppId((cur) => (cur === id ? null : cur));
  }, []);

  const isSuperAppId = useCallback((id: string) => SUPER_APP_ID_SET.has(id), []);

  /**
   * Navigate to a main-app route while auto-minimizing the currently active
   * mini app so the destination screen is reachable in milliseconds.
   */
  const navigateOutside = useCallback(
    (route: string, params?: Record<string, string>) => {
      if (activeAppId) minimizeApp(activeAppId);
      // Small delay lets the modal slide down before the route changes,
      // then safeRouter applies the global nav lock.
      setTimeout(() => {
        try {
          if (params && Object.keys(params).length > 0) {
            safeRouter.push({ pathname: route as any, params } as any);
          } else {
            safeRouter.push(route as any);
          }
        } catch {}
      }, 80);
    },
    [activeAppId, minimizeApp]
  );

  useEffect(() => {
    if (!activeAppId) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      minimizeApp(activeAppId);
      return true;
    });
    return () => sub.remove();
  }, [activeAppId, minimizeApp]);

  const value = useMemo<SuperAppContextValue>(
    () => ({ openApps, activeAppId, openApp, closeApp, minimizeApp, isSuperAppId, navigateOutside }),
    [openApps, activeAppId, openApp, closeApp, minimizeApp, isSuperAppId, navigateOutside]
  );

  return (
    <SuperAppContext.Provider value={value}>
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        {children}

        {Platform.OS !== "web" && (
          <>
            <MiniAppDock
              openApps={openApps}
              activeAppId={activeAppId}
              onOpen={openApp}
              onClose={closeApp}
            />

            {openApps.map((app) => {
              const AppComponent = getMiniAppComponent(app.manifest.id);
              if (!AppComponent) return null;
              return (
                <MiniAppWindow
                  key={app.manifest.id}
                  app={app}
                  onClose={() => closeApp(app.manifest.id)}
                  onMinimize={() => minimizeApp(app.manifest.id)}
                >
                  <AppComponent />
                </MiniAppWindow>
              );
            })}
          </>
        )}
      </View>
    </SuperAppContext.Provider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
