import React, { useEffect } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "@/components/ui/SafeGradient";
import { useTheme } from "@/hooks/useTheme";
import type { OpenApp } from "@/lib/superapp/types";

interface Props {
  openApps: OpenApp[];
  activeAppId: string | null;
  onOpen: (id: string) => void;
  onClose: (id: string) => void;
}

export default function MiniAppDock({ openApps, activeAppId, onOpen, onClose }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  // Only show dock entries for apps that are background (minimized)
  const dockApps = openApps.filter((a) => a.state === "background");
  // Hide dock entirely when another app is active — its Modal would sit on top
  // of the active app's Modal and intercept touches, blocking interaction.
  const visible = dockApps.length > 0 && activeAppId === null;

  const translateY = useSharedValue(80);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, { damping: 22, stiffness: 280 });
      opacity.value = withTiming(1, { duration: 180 });
    } else {
      translateY.value = withTiming(80, { duration: 200 });
      opacity.value = withTiming(0, { duration: 160 });
    }
  }, [visible]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  // Don't render at all if no minimized apps or another app is currently active
  if (dockApps.length === 0 || activeAppId !== null) return null;

  return (
    <Modal
      visible={true}
      transparent
      animationType="none"
      statusBarTranslucent
    >
      <View style={[styles.overlay, { pointerEvents: "box-none" } as any]}>
        <Animated.View
          style={[
            styles.dock,
            animStyle,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              bottom: insets.bottom + 64,
            },
          ]}
        >
          {dockApps.map((app, i) => {
            const isActive = app.manifest.id === activeAppId;
            return (
              <View key={app.manifest.id} style={styles.dockItem}>
                <TouchableOpacity
                  style={styles.dockBtn}
                  onPress={() => onOpen(app.manifest.id)}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={app.manifest.gradient as [string, string]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[styles.dockIcon, isActive && styles.dockIconActive]}
                  >
                    <Ionicons name={app.manifest.icon as any} size={18} color="#fff" />
                  </LinearGradient>
                  <Text style={[styles.dockLabel, { color: colors.textSecondary }]} numberOfLines={1}>
                    {app.manifest.name.replace("Afu", "").replace(" App", "")}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.dockClose}
                  onPress={() => onClose(app.manifest.id)}
                  hitSlop={8}
                >
                  <View style={[styles.dockCloseInner, { backgroundColor: colors.backgroundSecondary }]}>
                    <Ionicons name="close" size={10} color={colors.textMuted} />
                  </View>
                </TouchableOpacity>
              </View>
            );
          })}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: "center",
  },
  dock: {
    position: "absolute",
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 12,
    maxWidth: "90%",
  },
  dockItem: {
    alignItems: "center",
    position: "relative",
    marginHorizontal: 4,
  },
  dockBtn: {
    alignItems: "center",
    gap: 4,
  },
  dockIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  dockIconActive: {
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  dockLabel: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
    maxWidth: 52,
  },
  dockClose: {
    position: "absolute",
    top: -4,
    right: -4,
    zIndex: 10,
  },
  dockCloseInner: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
});
