/**
 * SplashScreenView
 *
 * A JS-side splash overlay that mirrors the native splash screen appearance
 * (white logo on black) and animates out smoothly once the app is ready.
 *
 * Usage:
 *   <SplashScreenView ready={fontsReady && !authLoading} onDone={hideSplash} />
 *
 * The component fades itself out over 350ms once `ready` becomes true, then
 * calls `onDone` so the parent can call SplashScreen.hideAsync().
 */

import React, { useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  Image,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";

const LOGO = require("../../assets/images/logo_white.png");
const { width } = Dimensions.get("window");
const LOGO_SIZE = Math.min(width * 0.28, 120);

interface Props {
  ready: boolean;
  onDone: () => void;
}

export function SplashScreenView({ ready, onDone }: Props) {
  const opacity = useRef(new Animated.Value(1)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const doneFired = useRef(false);

  useEffect(() => {
    if (!ready || doneFired.current) return;
    doneFired.current = true;

    if (Platform.OS === "web") {
      // On web: opacity-only fade (scale transform can silently block .start callback)
      Animated.timing(opacity, {
        toValue: 0,
        duration: 350,
        delay: 80,
        useNativeDriver: false,
      }).start(() => onDone());
    } else {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 380,
          delay: 120,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1.08,
          duration: 380,
          delay: 120,
          useNativeDriver: true,
        }),
      ]).start(() => onDone());
    }
  }, [ready, opacity, scale, onDone]);

  return (
    <Animated.View style={[styles.container, { opacity, pointerEvents: "none" } as any]}>
      <Animated.View style={[styles.logoWrap, { transform: [{ scale }] }]}>
        <Image
          source={LOGO}
          style={styles.logo}
          resizeMode="contain"
          accessibilityLabel="AfuChat logo"
        />
      </Animated.View>
      <View style={styles.wordmarkRow}>
        <Text style={styles.wordmark}>
          Afu<Text style={styles.wordmarkAccent}>Chat</Text>
        </Text>
      </View>
      {Platform.OS !== "web" && (
        <View style={styles.taglineWrap}>
          <Text style={styles.tagline}>Connect · Discover · Create</Text>
        </View>
      )}
    </Animated.View>
  );
}

export default SplashScreenView;

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000000",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
  },
  logoWrap: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  logo: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
  },
  wordmarkRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  wordmark: {
    fontSize: 28,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.5,
    fontFamily: Platform.select({ ios: "System", android: "sans-serif-medium", default: "System" }),
  },
  wordmarkAccent: {
    color: "#1f95ff",
  },
  taglineWrap: {
    marginTop: 10,
  },
  tagline: {
    fontSize: 12,
    color: "rgba(255,255,255,0.45)",
    letterSpacing: 1.2,
    fontFamily: Platform.select({ ios: "System", android: "sans-serif", default: "System" }),
  },
});
