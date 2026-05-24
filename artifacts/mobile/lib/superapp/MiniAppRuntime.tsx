import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { BackHandler, StyleSheet, View } from "react-native";
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

function getMiniAppComponent(id: string): React.ComponentType | null {
  switch (id) {
    case "afuai":       return AfuAIApp;
    case "afupay":      return AfuPayApp;
    case "afumarket":   return AfuMarketApp;
    case "afuchannel":  return AfuChannelApp;
    case "afugames":    return AfuGamesApp;
    case "afumusic":    return AfuMusicApp;
    case "afubusiness": return AfuBusinessApp;
    default:            return null;
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

  // Android hardware back: dismiss active mini app
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

  const hasActiveApp = openApps.some((a) => a.state === "active");

  return (
    <SuperAppContext.Provider value={value}>
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        {children}
        {openApps.length > 0 && (
          <View
            style={[styles.overlay, { pointerEvents: hasActiveApp ? "auto" : "none" } as any]}
          >
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
          </View>
        )}
      </View>
    </SuperAppContext.Provider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
  },
});
