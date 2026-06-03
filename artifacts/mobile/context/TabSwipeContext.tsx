import React, { createContext, useContext, useMemo, useRef } from "react";

type SharedValueLike<T> = { value: T };

export type TabSwipeCtxType = {
  horizontalScrollActive: SharedValueLike<boolean>;
};

export const TabSwipeContext = createContext<TabSwipeCtxType>({
  horizontalScrollActive: { value: false },
});

/**
 * Creates a Reanimated SharedValue<boolean> if Reanimated is available,
 * otherwise falls back to a plain { value } object.
 *
 * Uses lazy require() instead of a static import so that this module file
 * can be evaluated at module-load time WITHOUT forcing react-native-reanimated
 * to initialize its worklet runtime immediately — which crashes on Android
 * in environments where the native worklet module isn't ready yet.
 */
function createScrollLock(): SharedValueLike<boolean> {
  try {
    const rnr = require("react-native-reanimated");
    const makeMutable = rnr.makeMutable;
    if (typeof makeMutable === "function") return makeMutable(false);
  } catch {}
  return { value: false };
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
