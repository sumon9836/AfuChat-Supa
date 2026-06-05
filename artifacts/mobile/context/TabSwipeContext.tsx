import React, { createContext, useContext, useMemo, useRef } from "react";
import { makeMutable } from "react-native-reanimated";

type SharedValueLike<T> = { value: T };

export type TabSwipeCtxType = {
  horizontalScrollActive: SharedValueLike<boolean>;
};

export const TabSwipeContext = createContext<TabSwipeCtxType>({
  horizontalScrollActive: { value: false },
});

function createScrollLock(): SharedValueLike<boolean> {
  try {
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
