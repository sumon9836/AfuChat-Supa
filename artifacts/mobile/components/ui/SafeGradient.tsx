import React from "react";
import { View } from "react-native";
import type { ViewStyle } from "react-native";

let NativeLinearGradient: React.ComponentType<any> | null = null;
try {
  NativeLinearGradient = require("expo-linear-gradient").LinearGradient;
} catch (_) {}

type Props = {
  colors: readonly (string | number)[];
  start?: { x: number; y: number };
  end?: { x: number; y: number };
  locations?: number[];
  style?: ViewStyle | any;
  children?: React.ReactNode;
  [key: string]: any;
};

type BoundaryState = { failed: boolean };
type BoundaryProps = {
  fallback: string;
  style?: any;
  children: React.ReactNode;
};

class GradientBoundary extends React.Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { failed: false };
  static getDerivedStateFromError(): BoundaryState {
    return { failed: true };
  }
  render() {
    if (this.state.failed) {
      return (
        <View style={[this.props.style, { backgroundColor: this.props.fallback }]} />
      );
    }
    return this.props.children as React.ReactElement;
  }
}

export function LinearGradient({ colors, style, children, ...rest }: Props) {
  const fallback = typeof colors[0] === "string" ? (colors[0] as string) : "#00BCD4";

  if (!NativeLinearGradient) {
    return (
      <View style={[style, { backgroundColor: fallback }]}>
        {children}
      </View>
    );
  }

  const Grad = NativeLinearGradient;
  return (
    <GradientBoundary fallback={fallback} style={style}>
      <Grad colors={colors} style={style} {...rest}>
        {children}
      </Grad>
    </GradientBoundary>
  );
}
