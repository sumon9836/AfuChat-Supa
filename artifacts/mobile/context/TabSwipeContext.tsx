import React, { createContext, useContext, useMemo, useRef } from "react";
import { Platform } from "react-native";

type SharedValueLike<T> = { value: T };

export type TabSwipeCtxType = {
  horizontalScrollActive: SharedValueLike<boolean>;
};

export const TabSwipeContext = createContext<TabSwipeCtxType>({
  horizontalScrollActive: { value: false },
});

// Lazy-load inside the call so a static import never crashes this module on
// Android Expo Go (NullPointerException in the native worklet runtime).
// The Platform.OS + __DEV__ guard is essential: the Java NPE thrown by
// reanimated's C++ worklet init CANNOT be caught by JS try/catch.
function createScrollLock(): SharedValueLike<boolean> {
  if (Platform.OS === "android" && __DEV__) return { value: false };
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { makeMutable } = require("react-native-reanimated");
    return makeMutable(false);
  } catch {
    return { value: false };
  }
}

export function TabSwipeProvider({ children }: { children: React.ReactNode }) {
  const horizontalScrollActive = useRef<SharedValueLike<boolean>>(
    createScrollLock()
  ).current;
  const ctx = useMemo(() => ({ horizontalScrollActive }), []);
  return (
    <TabSwipeContext.Provider value={ctx}>
      {children}
    </TabSwipeContext.Provider>
  );
}

export function useHorizontalScrollLock(): SharedValueLike<boolean> {
  return useContext(TabSwipeContext).horizontalScrollActive;
}
