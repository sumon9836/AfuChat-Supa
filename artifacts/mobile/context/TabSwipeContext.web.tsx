import React, { createContext, useContext, useMemo, useRef } from "react";
import type { SharedValue } from "react-native-reanimated";

export type TabSwipeCtxType = {
  horizontalScrollActive: SharedValue<boolean>;
};

function makeFakeSharedValue(initial: boolean): SharedValue<boolean> {
  const ref = { value: initial } as SharedValue<boolean>;
  return ref;
}

export const TabSwipeContext = createContext<TabSwipeCtxType>({
  horizontalScrollActive: makeFakeSharedValue(false),
});

export function TabSwipeProvider({ children }: { children: React.ReactNode }) {
  const sv = useRef(makeFakeSharedValue(false)).current;
  const ctx = useMemo(() => ({ horizontalScrollActive: sv }), [sv]);
  return (
    <TabSwipeContext.Provider value={ctx}>
      {children}
    </TabSwipeContext.Provider>
  );
}

export function useHorizontalScrollLock(): SharedValue<boolean> {
  return useContext(TabSwipeContext).horizontalScrollActive;
}
