import React, { useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useIsDesktop } from "@/hooks/useIsDesktop";

const SCREEN_H = Dimensions.get("window").height;
const CLOSE_THRESHOLD = 100;
const VELOCITY_THRESHOLD = 0.5;

interface Props {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  backgroundColor?: string;
  maxHeight?: string | number;
  overlayColor?: string;
  /** Optional max width for the desktop popup card (default 520) */
  desktopMaxWidth?: number;
}

export default function SwipeableBottomSheet({
  visible,
  onClose,
  children,
  backgroundColor,
  maxHeight = "85%",
  overlayColor,
  desktopMaxWidth = 520,
}: Props) {
  const { isDesktop } = useIsDesktop();

  // ─── Desktop: centered popup modal ────────────────────────────────────────
  if (Platform.OS === "web" && isDesktop) {
    const popupBg = backgroundColor ?? "#1a1a1a";
    if (!visible) return null;
    return (
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={onClose}
        statusBarTranslucent
      >
        <Pressable style={ds.backdrop} onPress={onClose}>
          <Pressable
            onPress={() => {}}
            style={[ds.popup, { backgroundColor: popupBg, maxWidth: desktopMaxWidth }]}
          >
            <View style={ds.header}>
              <TouchableOpacity onPress={onClose} style={ds.closeBtn} hitSlop={8}>
                <Ionicons name="close" size={20} color="rgba(180,180,180,0.9)" />
              </TouchableOpacity>
            </View>
            <ScrollView
              style={{ maxHeight: "80vh" as any }}
              contentContainerStyle={{ flexGrow: 1 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {children}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    );
  }

  // ─── Mobile: original swipeable bottom sheet (untouched) ──────────────────
  const mobileBg = backgroundColor ?? "rgba(18,22,28,0.96)";
  const mobileOverlay = overlayColor ?? "rgba(0,0,0,0.5)";

  const translateY = useRef(new Animated.Value(SCREEN_H)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, tension: 60, friction: 11 }).start();
    } else {
      translateY.setValue(SCREEN_H);
    }
  }, [visible]);

  function dismissMobile() {
    Animated.timing(translateY, { toValue: SCREEN_H, duration: 220, useNativeDriver: true }).start(() => onClose());
  }

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, g) => g.dy > 6 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) translateY.setValue(g.dy);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > CLOSE_THRESHOLD || g.vy > VELOCITY_THRESHOLD) {
          dismissMobile();
        } else {
          Animated.spring(translateY, { toValue: 0, useNativeDriver: true, tension: 80, friction: 12 }).start();
        }
      },
    }),
  ).current;

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="none" transparent onRequestClose={dismissMobile}>
      <View style={ms.overlay}>
        <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: mobileOverlay }]} onPress={dismissMobile} />
        <Animated.View
          style={[
            ms.sheet,
            { maxHeight: maxHeight as any, transform: [{ translateY }] },
          ]}
        >
          <View
            style={[
              StyleSheet.absoluteFill,
              {
                backgroundColor: mobileBg,
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
              },
            ]}
          />
          <View style={[ms.sheetBorder, { pointerEvents: "none" } as any]} />
          <View {...panResponder.panHandlers} style={ms.handleArea}>
            <View style={ms.handle} />
          </View>
          <View style={ms.sheetContent}>{children}</View>
        </Animated.View>
      </View>
    </Modal>
  );
}

// ─── Desktop styles ────────────────────────────────────────────────────────────
const ds = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.60)",
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  popup: {
    width: "100%",
    borderRadius: 16,
    overflow: "hidden",
    ...Platform.select({
      web: { boxShadow: "0 12px 48px rgba(0,0,0,0.35)" } as any,
      default: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 24,
        elevation: 16,
      },
    }),
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 4,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(128,128,128,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
});

// ─── Mobile styles (original, untouched) ──────────────────────────────────────
const ms = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: "hidden" },
  sheetBorder: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderLeftWidth: 0.5,
    borderRightWidth: 0.5,
    borderColor: "rgba(255,255,255,0.10)",
  },
  handleArea: { alignItems: "center", paddingTop: 12, paddingBottom: 4, zIndex: 1 },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.20)" },
  sheetContent: { zIndex: 1 },
});
