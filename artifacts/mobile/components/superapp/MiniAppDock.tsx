import React from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "@/components/ui/SafeGradient";
import { useTheme } from "@/hooks/useTheme";
import { SafeTouchableOpacity } from "@/components/ui/SafePressable";
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

  const dockApps = openApps.filter((a) => a.state === "background");

  if (dockApps.length === 0 || activeAppId !== null) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <View
        pointerEvents="box-none"
        style={[styles.positioner, { bottom: insets.bottom + 64 }]}
      >
        <View
          style={[
            styles.dock,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          {dockApps.map((app) => (
            <View key={app.manifest.id} style={styles.dockItem}>
              {/* SafeTouchableOpacity uses the global nav lock — prevents
                  opening the same mini-app twice on a rapid double-tap. */}
              <SafeTouchableOpacity
                style={styles.dockBtn}
                onPress={() => onOpen(app.manifest.id)}
                activeOpacity={0.75}
              >
                <LinearGradient
                  colors={app.manifest.gradient as [string, string]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.dockIcon}
                >
                  <Ionicons name={app.manifest.icon as any} size={18} color="#fff" />
                </LinearGradient>
                <Text
                  style={[styles.dockLabel, { color: colors.textSecondary }]}
                  numberOfLines={1}
                >
                  {app.manifest.name.replace("Afu", "").replace(" App", "")}
                </Text>
              </SafeTouchableOpacity>

              {/* Close button — lightweight local Pressable; closing a docked
                  app is a UI removal, not a navigation event. */}
              <Pressable
                style={styles.dockClose}
                onPress={() => onClose(app.manifest.id)}
                hitSlop={10}
              >
                <View style={[styles.dockCloseInner, { backgroundColor: colors.backgroundSecondary }]}>
                  <Ionicons name="close" size={10} color={colors.textMuted} />
                </View>
              </Pressable>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  positioner: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
  },
  dock: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
    ...Platform.select({
      web: { boxShadow: "0 3px 12px rgba(0,0,0,0.18)" } as any,
      default: { shadowColor: "#000", shadowOpacity: 0.18, shadowRadius: 12, shadowOffset: { width: 0, height: 3 }, elevation: 10 },
    }),
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
