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
import MiniAppDock from "@/components/superapp/MiniAppDock";

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
        // Reactivate from dock
        return prev.map((a) =>
          a.manifest.id === id
            ? { ...a, state: "active" as AppLifecycleState }
            : { ...a, state: "background" as AppLifecycleState }
        );
      }
      // Background any currently active app, then add new one
      return [
        ...prev.map((a) => ({ ...a, state: "background" as AppLifecycleState })),
        { manifest, state: "active" as AppLifecycleState, openedAt: Date.now() },
      ];
    });
    setActiveAppId(id);
  }, []);

  // Close always fully removes the app from the list (no keepAlive zombie state)
  const closeApp = useCallback((id: string) => {
    setOpenApps((prev) => prev.filter((a) => a.manifest.id !== id));
    setActiveAppId((cur) => (cur === id ? null : cur));
  }, []);

  // Minimize sends the app to the dock (background) without fully closing it
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

  // Android hardware back = minimize active app (not close)
  useEffect(() => {
    if (!activeAppId) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      minimizeApp(activeAppId);
      return true;
    });
    return () => sub.remove();
  }, [activeAppId, minimizeApp]);

  const value = useMemo<SuperAppContextValue>(
    () => ({ openApps, activeAppId, openApp, closeApp, minimizeApp, isSuperAppId }),
    [openApps, activeAppId, openApp, closeApp, minimizeApp, isSuperAppId]
  );

  return (
    <SuperAppContext.Provider value={value}>
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        {children}

        {/* Dock lives INSIDE the root View so it is a plain absolutely-positioned
            sibling of the content — no Modal, no touch-blocking overlay. */}
        <MiniAppDock
          openApps={openApps}
          activeAppId={activeAppId}
          onOpen={openApp}
          onClose={closeApp}
        />
      </View>

      {/* Mini App windows — each in its own Modal, stacks above tab bar */}
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
