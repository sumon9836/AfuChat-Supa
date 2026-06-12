import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

type ThemeMode = "system" | "light" | "dark";

type ThemeContextType = {
  themeMode: ThemeMode;
  isDark: boolean;
  setThemeMode: (mode: ThemeMode) => void;
  setForceDark: (v: boolean) => void;
};

const THEME_KEY = "@afuchat_theme";

const ThemeContext = createContext<ThemeContextType>({
  themeMode: "system",
  isDark: false,
  setThemeMode: () => {},
  setForceDark: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>("system");
  const [forceDark, setForceDarkState] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY)
      .then((val) => {
        if (val === "light" || val === "dark" || val === "system") {
          setThemeModeState(val);
        }
      })
      .catch(() => {});
  }, []);

  function setThemeMode(mode: ThemeMode) {
    setThemeModeState(mode);
    AsyncStorage.setItem(THEME_KEY, mode).catch(() => {});
  }

  const setForceDark = useCallback((v: boolean) => {
    setForceDarkState(v);
  }, []);

  const baseIsDark = themeMode === "system" ? systemScheme === "dark" : themeMode === "dark";
  const isDark = forceDark || baseIsDark;

  return (
    <ThemeContext.Provider value={{ themeMode, isDark, setThemeMode, setForceDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useThemeContext = () => useContext(ThemeContext);
