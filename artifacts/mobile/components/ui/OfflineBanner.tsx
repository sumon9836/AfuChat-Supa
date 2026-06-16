import React, { useEffect, useRef, useState } from "react";
import { Animated, Platform, StyleSheet, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { isOnline, onConnectivityChange } from "@/lib/offlineStore";
import { STATUS } from "@/constants/colors";
import { T } from "@/constants/theme";

type State = "hidden" | "offline" | "reconnected";

export default function OfflineBanner() {
  const initial = isOnline();
  const [state, setState] = useState<State>(initial ? "hidden" : "offline");
  const translateY = useRef(new Animated.Value(initial ? -60 : 0)).current;
  const opacity = useRef(new Animated.Value(initial ? 0 : 1)).current;
  const insets = useSafeAreaInsets();
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function slideIn() {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 100,
        friction: 14,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: T.motion.fast + 30,
        useNativeDriver: true,
      }),
    ]).start();
  }

  function slideOut(then?: () => void) {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -60,
        duration: T.motion.slow - 120,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: T.motion.slow - 120,
        useNativeDriver: true,
      }),
    ]).start(() => then?.());
  }

  useEffect(() => {
    const unsub = onConnectivityChange((online) => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      if (!online) {
        setState("offline");
        slideIn();
      } else {
        setState("reconnected");
        slideIn();
        hideTimer.current = setTimeout(() => {
          slideOut(() => setState("hidden"));
        }, 2400);
      }
    });
    return () => {
      unsub();
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, []);

  if (state === "hidden") return null;

  const isReconnected = state === "reconnected";

  return (
    <Animated.View
      style={[
        { pointerEvents: "none" },
        st.pill,
        {
          top: insets.top + (Platform.OS === "android" ? 10 : 6),
          opacity,
          transform: [{ translateY }],
          // STATUS tokens — success for reconnected, neutral dark for offline
          backgroundColor: isReconnected ? STATUS.success : "rgba(20,20,20,0.86)",
        },
      ]}
    >
      <Ionicons
        name={isReconnected ? "checkmark-circle" : "cloud-offline-outline"}
        size={13}
        color="#fff"
      />
      <Text style={st.label} numberOfLines={1}>
        {isReconnected ? "Back online" : "Offline · showing cached data"}
      </Text>
    </Animated.View>
  );
}

const st = StyleSheet.create({
  pill: {
    position: "absolute",
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: T.space.sm - 2,
    paddingHorizontal: T.space.lg - 2,
    paddingVertical: T.space.sm - 2,
    borderRadius: T.radius.pill,
    zIndex: 99999,
    elevation: T.elevation.overlay,
    ...Platform.select({
      web: {},
      default: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.22,
      shadowRadius: T.space.sm,
      },
    })
  },
  label: {
    color: "#fff",
    ...T.caption,
    fontSize: 12,
    letterSpacing: 0.1,
  },
});
