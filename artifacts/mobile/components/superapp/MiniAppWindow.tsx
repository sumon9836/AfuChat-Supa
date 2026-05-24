import React, { useEffect, useState } from "react";
import {
  Dimensions,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";
import { LinearGradient } from "@/components/ui/SafeGradient";
import type { OpenApp } from "@/lib/superapp/types";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

interface Props {
  app: OpenApp;
  onClose: () => void;
  onMinimize: () => void;
  children: React.ReactNode;
}

export default function MiniAppWindow({ app, onClose, onMinimize, children }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(SCREEN_HEIGHT);
  const backdropOpacity = useSharedValue(0);
  const isActive = app.state === "active";

  // Controls whether the Modal is mounted. We delay hiding it until the
  // slide-down animation finishes so the close feels smooth.
  const [showing, setShowing] = useState(false);

  useEffect(() => {
    if (isActive) {
      // Show immediately then animate open
      setShowing(true);
      translateY.value = withSpring(0, { damping: 26, stiffness: 260, mass: 0.9 });
      backdropOpacity.value = withTiming(1, { duration: 200 });
    } else {
      // Animate out, then hide the Modal so it can't freeze the UI
      translateY.value = withTiming(
        SCREEN_HEIGHT,
        { duration: 260, easing: Easing.out(Easing.cubic) },
        (finished) => {
          if (finished) runOnJS(setShowing)(false);
        }
      );
      backdropOpacity.value = withTiming(0, { duration: 220 });
    }
  }, [isActive]);

  const windowStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value * 0.55,
  }));

  if (!showing && !isActive) return null;

  return (
    <Modal
      visible={showing}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onMinimize}
    >
      <View style={styles.container}>
        <Animated.View style={[styles.backdrop, backdropStyle]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onMinimize} />
        </Animated.View>

        <Animated.View
          style={[styles.window, windowStyle, { backgroundColor: colors.background }]}
        >
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
                onPress={onMinimize}
                hitSlop={14}
                style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.55 }]}
              >
                <Ionicons name="remove" size={22} color={colors.textSecondary} />
              </Pressable>
              <Pressable
                onPress={onClose}
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
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
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
