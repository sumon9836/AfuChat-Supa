// No-op shim for react-native-reanimated on web (Expo dev preview only).
const React = require("react");
const { View } = require("react-native");

function createAnimatedComponent(Component) { return Component; }
function useSharedValue(init) { return { value: init }; }
function useAnimatedStyle(fn) { return {}; }
function withTiming(val) { return val; }
function withSpring(val) { return val; }
function withDelay(_, val) { return val; }
function runOnJS(fn) { return fn; }
function runOnUI(fn) { return fn; }
function interpolate(val, input, output) { return output[0]; }
function useAnimatedGestureHandler() { return {}; }
function useAnimatedScrollHandler() { return {}; }
function useAnimatedRef() { return { current: null }; }
function useDerivedValue(fn) { return { value: fn() }; }
function cancelAnimation() {}
function withRepeat(val) { return val; }
function withSequence(...vals) { return vals[0]; }
function Extrapolation() {}
Extrapolation.CLAMP = "clamp";

const Animated = {
  View,
  Text: require("react-native").Text,
  Image: require("react-native").Image,
  ScrollView: require("react-native").ScrollView,
  FlatList: require("react-native").FlatList,
  createAnimatedComponent,
};

module.exports = {
  default: { createAnimatedComponent },
  Animated,
  createAnimatedComponent,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  withRepeat,
  withSequence,
  runOnJS,
  runOnUI,
  interpolate,
  Extrapolation,
  useAnimatedGestureHandler,
  useAnimatedScrollHandler,
  useAnimatedRef,
  useDerivedValue,
  cancelAnimation,
};
