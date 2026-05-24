import { createContext, useContext } from "react";
import type { SuperAppContextValue } from "./types";

const NOOP_CTX: SuperAppContextValue = {
  openApps: [],
  activeAppId: null,
  openApp: () => {},
  closeApp: () => {},
  minimizeApp: () => {},
  isSuperAppId: () => false,
  navigateOutside: () => {},
};

export const SuperAppContext = createContext<SuperAppContextValue>(NOOP_CTX);

export function useSuperApp(): SuperAppContextValue {
  return useContext(SuperAppContext);
}
