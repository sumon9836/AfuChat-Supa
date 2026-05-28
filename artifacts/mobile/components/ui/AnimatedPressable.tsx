import React, { useCallback, useRef } from "react";
import { Animated, Easing, Platform, Pressable, type PressableProps, type StyleProp, type ViewStyle } from "react-native";
import * as Haptics from "@/lib/haptics";

interface AnimatedPressableProps extends Omit<PressableProps, "style"> {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
  haptic?: boolean;
}

export default function AnimatedPressable({
  children,
  style,
  scaleTo = 0.95,
  haptic = false,
  onPress,
  ...rest
}: AnimatedPressableProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const USE_ND = Platform.OS !== "web";

  const pressIn = useCallback(() => {
    Animated.spring(scale, {
      toValue: scaleTo,
      useNativeDriver: USE_ND,
      tension: 200,
      friction: 10,
    }).start();
  }, [scaleTo]);

  const pressOut = useCallback(() => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: USE_ND,
      tension: 180,
      friction: 8,
    }).start();
  }, []);

  const handlePress = useCallback(
    (e: any) => {
      if (haptic) Haptics.selectionAsync();
      onPress?.(e);
    },
    [onPress, haptic],
  );

  return (
    <Pressable
      onPressIn={pressIn}
      onPressOut={pressOut}
      onPress={handlePress}
      {...rest}
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}
