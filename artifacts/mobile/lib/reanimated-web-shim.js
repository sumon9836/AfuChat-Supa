'use strict';
/**
 * Self-contained web shim for react-native-reanimated.
 *
 * On web, react-native-reanimated v4 uses react-native-worklets which crashes
 * with "createSerializableObject should never be called in JSWorklets".
 * This shim replaces the entire library on web with safe no-op implementations
 * that don't import anything from the real reanimated/worklets packages.
 *
 * Animations are disabled on web (components render without animate effects),
 * but layout, gestures, and all functionality remains fully intact.
 */

const { Animated, Easing: RNEasing, View, Text, Image, ScrollView, processColor } = require('react-native');

// ─── Shared Values ──────────────────────────────────────────────────────────

function useSharedValue(initialValue) {
  const ref = require('react').useRef({ value: initialValue });
  return ref.current;
}

// ─── Animated Style / Props ──────────────────────────────────────────────────

function useAnimatedStyle(updater) {
  try { return updater(); } catch (_) { return {}; }
}

function useAnimatedProps(updater) {
  try { return updater(); } catch (_) { return {}; }
}

function useDerivedValue(processor) {
  try {
    const result = processor();
    return { value: result, get: () => result };
  } catch (_) {
    return { value: undefined, get: () => undefined };
  }
}

function useAnimatedReaction() {}
function useAnimatedScrollHandler() { return {}; }
function useAnimatedRef() { return { current: null }; }
function useAnimatedSensor() {
  return {
    sensor: { value: { x: 0, y: 0, z: 0, interfaceOrientation: 0, qw: 1, qx: 0, qy: 0, qz: 0, yaw: 0, pitch: 0, roll: 0 } },
    unregister: () => {},
    isAvailable: false,
    config: { interval: 0, adjustToInterfaceOrientation: false, iosReferenceFrame: 0 },
  };
}

// ─── Animation Functions (return final value immediately on web) ──────────────

function withTiming(toValue) { return toValue; }
function withSpring(toValue) { return toValue; }
function withDelay(_delay, animation) { return animation; }
function withRepeat(animation) { return animation; }
function withSequence(...animations) { return animations[animations.length - 1]; }
function withDecay() { return 0; }

// ─── Thread Utilities ─────────────────────────────────────────────────────────

function runOnUI(fn) { return fn; }
function runOnJS(fn) { return fn; }
function cancelAnimation(_sv) {}
function makeShareable(value) { return value; }
function makeShareableCloneRecursive(value) { return value; }

// ─── Interpolation ───────────────────────────────────────────────────────────

const Extrapolation = { CLAMP: 'clamp', EXTEND: 'extend', IDENTITY: 'identity' };

function interpolate(value, inputRange, outputRange, extrapolate) {
  if (inputRange.length < 2 || outputRange.length < 2) return outputRange[0] || 0;
  const n = inputRange.length;
  let i = n - 2;
  for (let j = 1; j < n - 1; j++) {
    if (value < inputRange[j]) { i = j - 1; break; }
  }
  const inputMin = inputRange[i], inputMax = inputRange[i + 1];
  const outputMin = outputRange[i], outputMax = outputRange[i + 1];
  if (inputMin === inputMax) return outputMin;
  const t = (value - inputMin) / (inputMax - inputMin);
  const clampMode = extrapolate === 'clamp' || extrapolate === Extrapolation.CLAMP;
  const tClamped = clampMode ? Math.min(1, Math.max(0, t)) : t;
  return outputMin + tClamped * (outputMax - outputMin);
}

// ─── Easing ───────────────────────────────────────────────────────────────────

const Easing = {
  linear: t => t,
  ease: t => t,
  quad: t => t * t,
  cubic: t => t * t * t,
  sin: t => 1 - Math.cos((t * Math.PI) / 2),
  circle: t => 1 - Math.sqrt(1 - t * t),
  exp: t => Math.pow(2, 10 * (t - 1)),
  elastic: t => t,
  bounce: t => t,
  back: () => t => t,
  bezier: () => t => t,
  bezierFn: () => t => t,
  in: fn => fn,
  out: fn => fn,
  inOut: fn => fn,
  poly: () => t => t,
  steps: () => t => t,
  ...RNEasing,
};

// ─── Layout Animations (no-op on web) ────────────────────────────────────────

function makeLayoutAnimation() { return undefined; }

const FadeIn = makeLayoutAnimation();
const FadeOut = makeLayoutAnimation();
const FadeInUp = makeLayoutAnimation();
const FadeInDown = makeLayoutAnimation();
const FadeInLeft = makeLayoutAnimation();
const FadeInRight = makeLayoutAnimation();
const FadeOutUp = makeLayoutAnimation();
const FadeOutDown = makeLayoutAnimation();
const FadeOutLeft = makeLayoutAnimation();
const FadeOutRight = makeLayoutAnimation();
const SlideInLeft = makeLayoutAnimation();
const SlideInRight = makeLayoutAnimation();
const SlideInUp = makeLayoutAnimation();
const SlideInDown = makeLayoutAnimation();
const SlideOutLeft = makeLayoutAnimation();
const SlideOutRight = makeLayoutAnimation();
const SlideOutUp = makeLayoutAnimation();
const SlideOutDown = makeLayoutAnimation();
const BounceIn = makeLayoutAnimation();
const BounceOut = makeLayoutAnimation();
const BounceInDown = makeLayoutAnimation();
const BounceInUp = makeLayoutAnimation();
const BounceInLeft = makeLayoutAnimation();
const BounceInRight = makeLayoutAnimation();
const ZoomIn = makeLayoutAnimation();
const ZoomOut = makeLayoutAnimation();
const ZoomInDown = makeLayoutAnimation();
const ZoomInUp = makeLayoutAnimation();
const ZoomInLeft = makeLayoutAnimation();
const ZoomInRight = makeLayoutAnimation();
const LightSpeedInLeft = makeLayoutAnimation();
const LightSpeedInRight = makeLayoutAnimation();
const LightSpeedOutLeft = makeLayoutAnimation();
const LightSpeedOutRight = makeLayoutAnimation();
const FlipInEasyX = makeLayoutAnimation();
const FlipInEasyY = makeLayoutAnimation();
const FlipOutEasyX = makeLayoutAnimation();
const FlipOutEasyY = makeLayoutAnimation();
const Layout = makeLayoutAnimation();
const LinearTransition = makeLayoutAnimation();
const JumpingTransition = makeLayoutAnimation();
const CurvedTransition = makeLayoutAnimation();
const EntryExitTransition = makeLayoutAnimation();
const SequencedTransition = makeLayoutAnimation();
const PinwheelIn = makeLayoutAnimation();
const PinwheelOut = makeLayoutAnimation();
const RollInLeft = makeLayoutAnimation();
const RollInRight = makeLayoutAnimation();
const RollOutLeft = makeLayoutAnimation();
const RollOutRight = makeLayoutAnimation();
const RotateInDownLeft = makeLayoutAnimation();
const RotateInDownRight = makeLayoutAnimation();
const RotateOutDownLeft = makeLayoutAnimation();
const RotateOutDownRight = makeLayoutAnimation();
const StretchInX = makeLayoutAnimation();
const StretchInY = makeLayoutAnimation();
const StretchOutX = makeLayoutAnimation();
const StretchOutY = makeLayoutAnimation();

// ─── Animated Components (use RN's built-in Animated) ──────────────────────

const ReanimatedAnimated = {
  View: Animated.View,
  Text: Animated.Text,
  Image: Animated.Image,
  ScrollView: Animated.ScrollView,
  FlatList: Animated.FlatList,
  createAnimatedComponent: Animated.createAnimatedComponent,
};

// ─── Misc ────────────────────────────────────────────────────────────────────

const ReduceMotion = { System: 'system', Always: 'always', Never: 'never' };
const SensorType = { ACCELEROMETER: 1, GYROSCOPE: 2, GRAVITY: 3, MAGNETIC_FIELD: 4, ROTATION: 5 };
const IOSReferenceFrame = { XArbitraryZVertical: 0, XArbitraryCorrectedZVertical: 1, XMagneticNorthZVertical: 2, XTrueNorthZVertical: 3, Auto: 4 };
const InterfaceOrientation = { ROTATION_0: 0, ROTATION_90: 90, ROTATION_180: 180, ROTATION_270: 270 };
const KeyboardState = { UNKNOWN: 0, OPENING: 1, OPEN: 2, CLOSING: 3, CLOSED: 4 };

function useReducedMotion() { return false; }
function useWorkletCallback(fn) { return fn; }
function useEvent() { return () => {}; }
function useHandler() { return { handler: () => {}, doDependenciesDiffer: false, useEvent: () => {} }; }
function useAnimatedGestureHandler() { return {}; }
function measure() { return { x: 0, y: 0, width: 0, height: 0, pageX: 0, pageY: 0 }; }
function scrollTo() {}
function setNativeProps() {}
function getReanimatedVersion() { return '4.x-web-mock'; }
function isReanimatedSharedValue() { return false; }
function isWorkletFunction() { return false; }
function createWorkletRuntime() { return null; }
function runOnRuntime() { return () => {}; }

module.exports = {
  // Default (Animated component)
  default: ReanimatedAnimated,
  ...ReanimatedAnimated,

  // Hooks
  useSharedValue,
  useAnimatedStyle,
  useAnimatedProps,
  useDerivedValue,
  useAnimatedReaction,
  useAnimatedScrollHandler,
  useAnimatedRef,
  useAnimatedSensor,
  useReducedMotion,
  useWorkletCallback,
  useEvent,
  useHandler,
  useAnimatedGestureHandler,

  // Animations
  withTiming,
  withSpring,
  withDelay,
  withRepeat,
  withSequence,
  withDecay,
  cancelAnimation,

  // Thread
  runOnUI,
  runOnJS,
  makeShareable,
  makeShareableCloneRecursive,

  // Utils
  interpolate,
  interpolateColor: (v, inRange, outRange) => outRange[0] || 0,
  Extrapolate: Extrapolation,
  Extrapolation,
  Easing,
  processColor,

  // Layout animations
  FadeIn, FadeOut, FadeInUp, FadeInDown, FadeInLeft, FadeInRight,
  FadeOutUp, FadeOutDown, FadeOutLeft, FadeOutRight,
  SlideInLeft, SlideInRight, SlideInUp, SlideInDown,
  SlideOutLeft, SlideOutRight, SlideOutUp, SlideOutDown,
  BounceIn, BounceOut, BounceInDown, BounceInUp, BounceInLeft, BounceInRight,
  ZoomIn, ZoomOut, ZoomInDown, ZoomInUp, ZoomInLeft, ZoomInRight,
  LightSpeedInLeft, LightSpeedInRight, LightSpeedOutLeft, LightSpeedOutRight,
  FlipInEasyX, FlipInEasyY, FlipOutEasyX, FlipOutEasyY,
  Layout, LinearTransition, JumpingTransition, CurvedTransition,
  EntryExitTransition, SequencedTransition,
  PinwheelIn, PinwheelOut, RollInLeft, RollInRight, RollOutLeft, RollOutRight,
  RotateInDownLeft, RotateInDownRight, RotateOutDownLeft, RotateOutDownRight,
  StretchInX, StretchInY, StretchOutX, StretchOutY,

  // Misc
  ReduceMotion,
  SensorType,
  IOSReferenceFrame,
  InterfaceOrientation,
  KeyboardState,
  measure,
  scrollTo,
  setNativeProps,
  getReanimatedVersion,
  isReanimatedSharedValue,
  isWorkletFunction,
  createWorkletRuntime,
  runOnRuntime,
};
