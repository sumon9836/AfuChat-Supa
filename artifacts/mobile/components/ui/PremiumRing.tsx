import React, { useEffect, useRef } from "react";
import { Animated, Platform, View } from "react-native";
const ND = Platform.OS !== "web";

let _svgMod: any = null;
function getSvgMod() {
  if (_svgMod !== null) return _svgMod;
  try { _svgMod = require("react-native-svg"); } catch { _svgMod = {}; }
  return _svgMod;
}
function hasSvg() {
  const M = getSvgMod();
  return !!(M.default ?? M.Svg);
}
const SvgRoot = (props: any) => {
  const M = getSvgMod();
  const C = M.default ?? M.Svg;
  if (!C) return null;
  return require("react").createElement(C, props);
};
const Circle = (props: any) => {
  const M = getSvgMod();
  const C = M.Circle ?? M.default?.Circle;
  if (!C) return null;
  return require("react").createElement(C, props);
};
const Rect = (props: any) => {
  const M = getSvgMod();
  const C = M.Rect ?? M.default?.Rect;
  if (!C) return null;
  return require("react").createElement(C, props);
};

import Colors from "@/constants/colors";
import { useAppAccent } from "@/context/AppAccentContext";

type Props = {
  size: number;
  children: React.ReactNode;
  square?: boolean;
};

export function PremiumRing({ size, children, square }: Props) {
  const { accent } = useAppAccent();
  const spin = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const spinAnim = Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 3200, useNativeDriver: ND })
    );
    const pulseAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.06, duration: 1200, useNativeDriver: ND }),
        Animated.timing(pulse, { toValue: 1, duration: 1200, useNativeDriver: ND }),
      ])
    );
    spinAnim.start();
    pulseAnim.start();
    return () => { spinAnim.stop(); pulseAnim.stop(); };
  }, []);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });

  const ring = 2.5;
  const gap = 2;
  const outerSize = size + (ring + gap) * 2;
  const center = outerSize / 2;
  const arcGap = 5;

  if (!hasSvg() || Platform.OS === "web") {
    return (
      <Animated.View style={{ width: outerSize, height: outerSize, alignItems: "center", justifyContent: "center", transform: [{ scale: pulse }] }}>
        <View style={{
          position: "absolute", width: outerSize, height: outerSize,
          borderRadius: square ? outerSize * 0.2 : outerSize / 2,
          borderWidth: ring,
          borderColor: Colors.gold,
        }} />
        <View style={{ position: "absolute" }}>{children}</View>
      </Animated.View>
    );
  }

  let ringShape: React.ReactNode;

  if (square) {
    const avatarRadius = size * 0.2;
    const rx = avatarRadius + gap + ring / 2;
    const rectW = outerSize - ring;
    const rectH = outerSize - ring;
    const straight = 2 * (rectW + rectH) - 8 * rx;
    const curved = 2 * Math.PI * rx;
    const perimeter = straight + curved;
    const halfPerim = perimeter / 2;

    ringShape = (
      <SvgRoot width={outerSize} height={outerSize}>
        <Rect
          x={ring / 2} y={ring / 2} width={rectW} height={rectH} rx={rx} ry={rx}
          stroke={Colors.gold} strokeWidth={ring} fill="none"
          strokeDasharray={`${halfPerim - arcGap} ${halfPerim + arcGap}`}
          strokeDashoffset={0} strokeLinecap="round"
        />
        <Rect
          x={ring / 2} y={ring / 2} width={rectW} height={rectH} rx={rx} ry={rx}
          stroke={accent} strokeWidth={ring} fill="none"
          strokeDasharray={`${halfPerim - arcGap} ${halfPerim + arcGap}`}
          strokeDashoffset={-(halfPerim)} strokeLinecap="round"
        />
      </SvgRoot>
    );
  } else {
    const radius = (outerSize - ring) / 2;
    const circumference = 2 * Math.PI * radius;
    const halfCirc = circumference / 2;

    ringShape = (
      <SvgRoot width={outerSize} height={outerSize}>
        <Circle
          cx={center} cy={center} r={radius}
          stroke={Colors.gold} strokeWidth={ring} fill="none"
          strokeDasharray={`${halfCirc - arcGap} ${halfCirc + arcGap}`}
          strokeDashoffset={0} strokeLinecap="round"
          rotation={-90} origin={`${center}, ${center}`}
        />
        <Circle
          cx={center} cy={center} r={radius}
          stroke={accent} strokeWidth={ring} fill="none"
          strokeDasharray={`${halfCirc - arcGap} ${halfCirc + arcGap}`}
          strokeDashoffset={-(halfCirc)} strokeLinecap="round"
          rotation={-90} origin={`${center}, ${center}`}
        />
      </SvgRoot>
    );
  }

  return (
    <Animated.View style={{ width: outerSize, height: outerSize, alignItems: "center", justifyContent: "center", transform: [{ scale: pulse }] }}>
      <Animated.View style={{ position: "absolute", width: outerSize, height: outerSize, transform: [{ rotate }] }}>
        {ringShape}
      </Animated.View>
      <View style={{ position: "absolute" }}>
        {children}
      </View>
    </Animated.View>
  );
}
