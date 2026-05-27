import React, { useCallback, useEffect, useRef } from "react";
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
const ND = Platform.OS !== "web";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { dismissToast, registerToastListener, type ToastItem } from "@/lib/toast";

// ─── Type-based defaults ──────────────────────────────────────────────────────

const TYPE_ICON: Record<ToastItem["type"], keyof typeof Ionicons.glyphMap> = {
  error:   "alert-circle",
  success: "checkmark-circle",
  info:    "information-circle",
  warning: "warning",
};

const TYPE_COLOR: Record<ToastItem["type"], string> = {
  error:   "#FF3B30",
  success: "#30D158",
  info:    "#0A84FF",
  warning: "#FF9F0A",
};

// ─── Default toast (WhatsApp-style dark pill) ─────────────────────────────────

function DefaultToast({
  item,
  onAnimatedOut,
}: {
  item: ToastItem;
  onAnimatedOut: (id: string) => void;
}) {
  const translateY    = useRef(new Animated.Value(60)).current;
  const opacity       = useRef(new Animated.Value(0)).current;
  const scale         = useRef(new Animated.Value(0.92)).current;
  const dismissingRef = useRef(false);

  const icon = (item.icon ?? TYPE_ICON[item.type]) as keyof typeof Ionicons.glyphMap;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(translateY, { toValue: 0, tension: 220, friction: 20, useNativeDriver: ND }),
      Animated.timing(opacity,    { toValue: 1, duration: 160, useNativeDriver: ND }),
      Animated.spring(scale,      { toValue: 1, tension: 220, friction: 20, useNativeDriver: ND }),
    ]).start();
  }, []);

  const animateOut = useCallback(() => {
    if (dismissingRef.current) return;
    dismissingRef.current = true;
    Animated.parallel([
      Animated.timing(translateY, { toValue: 60,  duration: 200, useNativeDriver: ND }),
      Animated.timing(opacity,    { toValue: 0,   duration: 160, useNativeDriver: ND }),
      Animated.timing(scale,      { toValue: 0.9, duration: 200, useNativeDriver: ND }),
    ]).start(() => onAnimatedOut(item.id));
  }, [item.id, onAnimatedOut]);

  // Auto-dismiss: start exit animation when the toast's duration elapses.
  useEffect(() => {
    if (!item.duration || item.duration <= 0) return;
    const t = setTimeout(animateOut, item.duration);
    return () => clearTimeout(t);
  }, [item.duration, animateOut]);

  return (
    <Animated.View style={[s.pill, { opacity, transform: [{ translateY }, { scale }] }]}>
      <Pressable
        onPress={() => { animateOut(); dismissToast(item.id); }}
        style={s.pillInner}
        android_ripple={{ color: "rgba(255,255,255,0.08)", borderless: false }}
      >
        <View style={[s.pillIconWrap, { backgroundColor: TYPE_COLOR[item.type] + "22" }]}>
          <Ionicons name={icon} size={16} color={TYPE_COLOR[item.type]} />
        </View>
        <Text style={s.pillText} numberOfLines={2}>
          {item.message}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

// ─── Action toast (connectivity-style with action button) ─────────────────────

function ActionToast({
  item,
  onAnimatedOut,
}: {
  item: ToastItem;
  onAnimatedOut: (id: string) => void;
}) {
  const translateY    = useRef(new Animated.Value(60)).current;
  const opacity       = useRef(new Animated.Value(0)).current;
  const dismissingRef = useRef(false);

  const icon      = (item.icon ?? TYPE_ICON[item.type]) as keyof typeof Ionicons.glyphMap;
  const accentBg  = TYPE_COLOR[item.type];

  useEffect(() => {
    Animated.parallel([
      Animated.spring(translateY, { toValue: 0, tension: 220, friction: 20, useNativeDriver: ND }),
      Animated.timing(opacity,    { toValue: 1, duration: 160, useNativeDriver: ND }),
    ]).start();
  }, []);

  const animateOut = useCallback(() => {
    if (dismissingRef.current) return;
    dismissingRef.current = true;
    Animated.parallel([
      Animated.timing(translateY, { toValue: 60, duration: 200, useNativeDriver: ND }),
      Animated.timing(opacity,    { toValue: 0,  duration: 160, useNativeDriver: ND }),
    ]).start(() => onAnimatedOut(item.id));
  }, [item.id, onAnimatedOut]);

  // Auto-dismiss: start exit animation when the toast's duration elapses.
  useEffect(() => {
    if (!item.duration || item.duration <= 0) return;
    const t = setTimeout(animateOut, item.duration);
    return () => clearTimeout(t);
  }, [item.duration, animateOut]);

  function handleAction() {
    item.onAction?.();
    animateOut();
    dismissToast(item.id);
  }

  function handleDismiss() {
    animateOut();
    dismissToast(item.id);
  }

  return (
    <Animated.View
      style={[
        s.actionToast,
        { backgroundColor: accentBg, opacity, transform: [{ translateY }] },
      ]}
    >
      <Pressable
        style={s.actionInner}
        onPress={handleDismiss}
        android_ripple={{ color: "rgba(0,0,0,0.12)", borderless: false }}
      >
        <Ionicons name={icon} size={18} color="#fff" />
        <Text style={s.actionText} numberOfLines={2}>
          {item.message}
        </Text>
        {!!item.actionLabel && (
          <TouchableOpacity
            onPress={handleAction}
            hitSlop={8}
            style={s.actionBtn}
            activeOpacity={0.75}
          >
            <Text style={s.actionBtnText}>{item.actionLabel.toUpperCase()}</Text>
          </TouchableOpacity>
        )}
      </Pressable>
    </Animated.View>
  );
}

// ─── Dismiss-timer progress bar (shows inside action toasts) ─────────────────

// ─── Container ────────────────────────────────────────────────────────────────

export function ToastContainer() {
  const insets = useSafeAreaInsets();
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);
  const visibleRef          = useRef<Set<string>>(new Set());

  useEffect(() => {
    return registerToastListener((incoming) => {
      setToasts((prev) => {
        const incomingIds  = new Set(incoming.map((t) => t.id));
        const kept         = prev.filter((t) => incomingIds.has(t.id) || visibleRef.current.has(t.id));
        const existingIds  = new Set(kept.map((t) => t.id));
        const brandNew     = incoming.filter((t) => !existingIds.has(t.id));
        const merged       = [...kept];
        for (const t of brandNew) {
          visibleRef.current.add(t.id);
          merged.push(t);
        }
        return merged.slice(-3);
      });
    });
  }, []);

  const handleAnimatedOut = useCallback((id: string) => {
    visibleRef.current.delete(id);
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  if (toasts.length === 0) return null;

  return (
    <View
      style={[s.container, { bottom: insets.bottom + 86 }]}
      pointerEvents="box-none"
    >
      {toasts.map((item) =>
        item.variant === "action" ? (
          <ActionToast
            key={item.id}
            item={item}
            onAnimatedOut={handleAnimatedOut}
          />
        ) : (
          <DefaultToast
            key={item.id}
            item={item}
            onAnimatedOut={handleAnimatedOut}
          />
        ),
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const SHADOW = Platform.select({
  ios: {
    shadowColor: "#000",
    shadowOpacity: 0.28,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
  },
  android: { elevation: 12 },
  default: {},
});

const s = StyleSheet.create({
  container: {
    position: "absolute",
    left: 16,
    right: 16,
    gap: 8,
    zIndex: 9999,
    alignItems: "center",
  },

  // ── Default (dark pill) ────────────────────────────────────────────────────
  pill: {
    alignSelf: "center",
    backgroundColor: "#1C1C1F",
    borderRadius: 100,
    maxWidth: 340,
    minWidth: 120,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.09)",
    overflow: "hidden",
    ...SHADOW,
  },
  pillInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 11,
    paddingHorizontal: 16,
  },
  pillIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  pillText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    lineHeight: 20,
    flexShrink: 1,
  },

  // ── Action (colored banner) ────────────────────────────────────────────────
  actionToast: {
    alignSelf: "stretch",
    borderRadius: 14,
    overflow: "hidden",
    ...SHADOW,
  },
  actionInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 13,
    paddingHorizontal: 14,
  },
  actionText: {
    flex: 1,
    color: "#fff",
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    lineHeight: 20,
  },
  actionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.20)",
  },
  actionBtnText: {
    color: "#fff",
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
  },
});
