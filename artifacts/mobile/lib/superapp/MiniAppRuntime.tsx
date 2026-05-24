import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { BackHandler, Platform, StyleSheet, View } from "react-native";
import { useTheme } from "@/hooks/useTheme";

import type { AppLifecycleState, OpenApp, SuperAppContextValue } from "./types";
import { findModule, SUPER_APP_ID_SET } from "./registry";
import MiniAppWindow from "@/components/superapp/MiniAppWindow";

import AfuAIApp from "@/modules/afuai";
import AfuPayApp from "@/modules/afupay";
import AfuMarketApp from "@/modules/afumarket";
import AfuChannelApp from "@/modules/afuchannel";
import AfuGamesApp from "@/modules/afugames";
import AfuMusicApp from "@/modules/afumusic";
import AfuBusinessApp from "@/modules/afubusiness";
import AfuSearchApp from "@/modules/afusearch";
import AfuIDApp from "@/modules/afuid";
import AfuQRApp from "@/modules/afuqr";
import AfuSavedApp from "@/modules/afusaved";
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
    case "afuchannel":     return AfuChannelApp;
    case "afugames":       return AfuGamesApp;
    case "afumusic":       return AfuMusicApp;
    case "afubusiness":    return AfuBusinessApp;
    case "afusearch":      return AfuSearchApp;
    case "afuid":          return AfuIDApp;
    case "afuqr":          return AfuQRApp;
    case "afusaved":       return AfuSavedApp;
    case "afureferral":    return AfuReferralApp;
    case "afuservices":    return AfuServicesApp;
    case "afufreelance":   return AfuFreelanceApp;
    case "afucollections": return AfuCollectionsApp;
    case "afuevents":      return AfuEventsApp;
    case "afuusernames":   return AfuUsernamesApp;
    default:               return null;
  }
}

const SuperAppContext = createContext<SuperAppContextValue | null>(null);

const NOOP_CTX: SuperAppContextValue = {
  openApps: [],
  activeAppId: null,
  openApp: () => {},
  closeApp: () => {},
  minimizeApp: () => {},
  isSuperAppId: () => false,
};

export function useSuperApp(): SuperAppContextValue {
  return useContext(SuperAppContext) ?? NOOP_CTX;
}

export function MiniAppRuntimeProvider({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  const [openApps, setOpenApps] = useState<OpenApp[]>([]);
  const [activeAppId, setActiveAppId] = useState<string | null>(null);

  const openApp = useCallback((id: string) => {
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
    setOpenApps((prev) => {
      const app = prev.find((a) => a.manifest.id === id);
      if (!app) return prev;
      if (app.manifest.keepAlive) {
        return prev.map((a) =>
          a.manifest.id === id
            ? { ...a, state: "closed" as AppLifecycleState }
            : a
        );
      }
      return prev.filter((a) => a.manifest.id !== id);
    });
    setActiveAppId(null);
  }, []);

  const minimizeApp = useCallback((id: string) => {
    setOpenApps((prev) =>
      prev.map((a) =>
        a.manifest.id === id
          ? { ...a, state: "background" as AppLifecycleState }
          : a
      )
    );
    setActiveAppId(null);
  }, []);

  const isSuperAppId = useCallback((id: string) => SUPER_APP_ID_SET.has(id), []);

  useEffect(() => {
    if (!activeAppId) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      closeApp(activeAppId);
      return true;
    });
    return () => sub.remove();
  }, [activeAppId, closeApp]);

  const value = useMemo<SuperAppContextValue>(
    () => ({ openApps, activeAppId, openApp, closeApp, minimizeApp, isSuperAppId }),
    [openApps, activeAppId, openApp, closeApp, minimizeApp, isSuperAppId]
  );

  return (
    <SuperAppContext.Provider value={value}>
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        {children}
      </View>
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
    </SuperAppContext.Provider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
