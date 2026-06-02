import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";
import { LinearGradient } from "@/components/ui/SafeGradient";
import type { OpenApp } from "@/lib/superapp/types";

const BUTTON_COOLDOWN_MS = 500;

interface Props {
  app: OpenApp;
  onClose: () => void;
  onMinimize: () => void;
  children: React.ReactNode;
}

export default function MiniAppWindow({ app, onClose, onMinimize, children }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const isActive = app.state === "active";
  const [showing, setShowing] = useState(false);

  const screenHeight = Dimensions.get("window").height;

  const translateY     = useRef(new Animated.Value(screenHeight)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  const minimizeBusy = useRef(false);
  const closeBusy    = useRef(false);

  const handleMinimize = useCallback(() => {
    if (minimizeBusy.current) return;
    minimizeBusy.current = true;
    setTimeout(() => { minimizeBusy.current = false; }, BUTTON_COOLDOWN_MS);
    onMinimize();
  }, [onMinimize]);

  const handleClose = useCallback(() => {
    if (closeBusy.current) return;
    closeBusy.current = true;
    setTimeout(() => { closeBusy.current = false; }, BUTTON_COOLDOWN_MS);
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (isActive) {
      setShowing(true);
      translateY.setValue(screenHeight);
      backdropOpacity.setValue(0);
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          damping: 26,
          stiffness: 260,
          mass: 0.9,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0.55,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: screenHeight,
          duration: 260,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) setShowing(false);
      });
    }
  }, [isActive]);

  if (!showing && !isActive) return null;

  return (
    <View style={[styles.container, { pointerEvents: showing ? "box-none" : "none" } as any]}>
      {/* Backdrop */}
      <Animated.View
        style={[styles.backdrop, { opacity: backdropOpacity }]}
        pointerEvents="box-none"
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={handleMinimize} />
      </Animated.View>

      {/* Sliding window */}
      <Animated.View
        style={[
          styles.window,
          { transform: [{ translateY }], backgroundColor: colors.background },
        ]}
      >
        {/* Header */}
        <View
          style={[
            styles.header,
            {
              paddingTop: insets.top + 6,
              backgroundColor: colors.surface,
              borderBottomColor: colors.border,
            },
          ]}
        >
          <View style={styles.headerLeft}>
            <LinearGradient
              colors={app.manifest.gradient as [string, string]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.appIcon}
            >
              <Ionicons name={app.manifest.icon as any} size={14} color="#fff" />
            </LinearGradient>
            <Text style={[styles.appName, { color: colors.text }]}>
              {app.manifest.name}
            </Text>
            {app.manifest.badge ? (
              <View style={[styles.badge, { backgroundColor: colors.accent + "20" }]}>
                <Text style={[styles.badgeText, { color: colors.accent }]}>
                  {app.manifest.badge}
                </Text>
              </View>
            ) : null}
          </View>

          <View style={styles.headerRight}>
            <Pressable
              onPress={handleMinimize}
              hitSlop={14}
              style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.55 }]}
            >
              <Ionicons name="remove" size={22} color={colors.textSecondary} />
            </Pressable>
            <Pressable
              onPress={handleClose}
              hitSlop={14}
              style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.55 }]}
            >
              <View style={[styles.closeCircle, { backgroundColor: colors.backgroundSecondary }]}>
                <Ionicons name="close" size={15} color={colors.text} />
              </View>
            </Pressable>
          </View>
        </View>

        <View style={styles.content}>{children}</View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    elevation: 9999,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000",
  },
  window: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 9 },
  appIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  appName: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: { fontSize: 10, fontFamily: "Inter_700Bold" },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 2 },
  iconBtn: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  closeCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  content: { flex: 1 },
});
