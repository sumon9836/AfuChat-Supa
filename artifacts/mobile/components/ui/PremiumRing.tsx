import React, { useEffect, useRef } from "react";
import { Animated, Platform, View } from "react-native";
const ND = Platform.OS !== "web";
import Svg, { Circle, Rect } from "react-native-svg";
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

  let ringShape: React.ReactNode;

  if (square) {
    // Rounded-rect ring that matches the avatar's corner radius (size * 0.2)
    const avatarRadius = size * 0.2;
    const rx = avatarRadius + gap + ring / 2;
    const rectW = outerSize - ring;
    const rectH = outerSize - ring;
    // Perimeter of rounded rect with corner radius rx
    const straight = 2 * (rectW + rectH) - 8 * rx;
    const curved = 2 * Math.PI * rx;
    const perimeter = straight + curved;
    const halfPerim = perimeter / 2;

    ringShape = (
      <Svg width={outerSize} height={outerSize}>
        <Rect
          x={ring / 2}
          y={ring / 2}
          width={rectW}
          height={rectH}
          rx={rx}
          ry={rx}
          stroke={Colors.gold}
          strokeWidth={ring}
          fill="none"
          strokeDasharray={`${halfPerim - arcGap} ${halfPerim + arcGap}`}
          strokeDashoffset={0}
          strokeLinecap="round"
        />
        <Rect
          x={ring / 2}
          y={ring / 2}
          width={rectW}
          height={rectH}
          rx={rx}
          ry={rx}
          stroke={accent}
          strokeWidth={ring}
          fill="none"
          strokeDasharray={`${halfPerim - arcGap} ${halfPerim + arcGap}`}
          strokeDashoffset={-(halfPerim)}
          strokeLinecap="round"
        />
      </Svg>
    );
  } else {
    const radius = (outerSize - ring) / 2;
    const circumference = 2 * Math.PI * radius;
    const halfCirc = circumference / 2;

    ringShape = (
      <Svg width={outerSize} height={outerSize}>
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={Colors.gold}
          strokeWidth={ring}
          fill="none"
          strokeDasharray={`${halfCirc - arcGap} ${halfCirc + arcGap}`}
          strokeDashoffset={0}
          strokeLinecap="round"
          rotation={-90}
          origin={`${center}, ${center}`}
        />
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={accent}
          strokeWidth={ring}
          fill="none"
          strokeDasharray={`${halfCirc - arcGap} ${halfCirc + arcGap}`}
          strokeDashoffset={-(halfCirc)}
          strokeLinecap="round"
          rotation={-90}
          origin={`${center}, ${center}`}
        />
      </Svg>
    );
  }

  return (
    <Animated.View
      style={{
        width: outerSize,
        height: outerSize,
        alignItems: "center",
        justifyContent: "center",
        transform: [{ scale: pulse }],
      }}
    >
      <Animated.View
        style={{
          position: "absolute",
          width: outerSize,
          height: outerSize,
          transform: [{ rotate }],
        }}
      >
        {ringShape}
      </Animated.View>
      <View style={{ position: "absolute" }}>
        {children}
      </View>
    </Animated.View>
  );
}
