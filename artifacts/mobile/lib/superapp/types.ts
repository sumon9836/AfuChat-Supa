import type { ComponentProps } from "react";
import type { Ionicons } from "@expo/vector-icons";

export type ModuleManifest = {
  id: string;
  name: string;
  description: string;
  version: string;
  icon: ComponentProps<typeof Ionicons>["name"];
  gradient: readonly [string, string];
  keepAlive: boolean;
  badge?: string;
  comingSoon?: boolean;
  nativeOnly?: boolean;
};

export type AppLifecycleState = "active" | "background" | "closed";

export type OpenApp = {
  manifest: ModuleManifest;
  state: AppLifecycleState;
  openedAt: number;
};

export type SuperAppContextValue = {
  openApps: OpenApp[];
  activeAppId: string | null;
  openApp: (id: string) => void;
  closeApp: (id: string) => void;
  minimizeApp: (id: string) => void;
  isSuperAppId: (id: string) => boolean;
};
