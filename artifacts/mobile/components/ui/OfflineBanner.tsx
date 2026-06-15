import React, { useEffect, useRef, useState } from "react";
import { Animated, Platform, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { isOnline, onConnectivityChange } from "@/lib/offlineStore";

type BannerStatus = "online" | "offline" | "reconnecting";

const BANNER_HEIGHT = 36;

export default function OfflineBanner() {
  const initialOnline = isOnline();
  const [status, setStatus] = useState<BannerStatus>(initialOnline ? "online" : "offline");
  const slideAnim = useRef(new Animated.Value(initialOnline ? 0 : 1)).current;
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const unsub = onConnectivityChange((online) => {
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
        reconnectTimer.current = null;
      }

      if (online) {
        setStatus("reconnecting");
        Animated.timing(slideAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: Platform.OS !== "web",
        }).start();
        reconnectTimer.current = setTimeout(() => {
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: Platform.OS !== "web",
          }).start(() => setStatus("online"));
        }, 2200);
      } else {
        setStatus("offline");
        Animated.timing(slideAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: Platform.OS !== "web",
        }).start();
      }
    });

    return () => {
      unsub();
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    };
  }, []);

  if (status === "online") return null;

  const isReconnecting = status === "reconnecting";
  const bgColor = isReconnecting ? "#34C759" : "#FF3B30";
  const iconName: React.ComponentProps<typeof Ionicons>["name"] = isReconnecting
    ? "wifi"
    : "wifi-outline";
  const label = isReconnecting
    ? "Back online"
    : "No internet · Content loaded from device";

  const animatedHeight = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, BANNER_HEIGHT],
  });

  return (
    <Animated.View
      style={[styles.wrap, { backgroundColor: bgColor, height: animatedHeight }]}
    >
      <View style={styles.row}>
        <Ionicons name={iconName} size={13} color="#fff" />
        <Text style={styles.text} numberOfLines={1}>
          {label}
        </Text>
        {isReconnecting && (
          <Ionicons name="checkmark-circle" size={13} color="#fff" />
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
  },
  text: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.1,
    flexShrink: 1,
  },
});
