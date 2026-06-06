import React, { createContext, useContext, useMemo, useRef } from "react";

type ScrollLock = { value: boolean };

export type TabSwipeCtxType = {
  horizontalScrollActive: ScrollLock;
};

export const TabSwipeContext = createContext<TabSwipeCtxType>({
  horizontalScrollActive: { value: false },
});

export function TabSwipeProvider({ children }: { children: React.ReactNode }) {
  const horizontalScrollActive = useRef<ScrollLock>({ value: false }).current;
  const ctx = useMemo(() => ({ horizontalScrollActive }), []);
  return (
    <TabSwipeContext.Provider value={ctx}>
      {children}
    </TabSwipeContext.Provider>
  );
}

export function useHorizontalScrollLock(): ScrollLock {
  return useContext(TabSwipeContext).horizontalScrollActive;
}
