/**
 * useAnimationGuard — React hooks for the AnimationGuard OOM prevention system.
 *
 * ── useAnimationGuard(...values) ──────────────────────────────────────────────
 * Registers one or more stable animated values (SharedValue or Animated.Value)
 * created via useSharedValue() or useRef(new Animated.Value()).current.
 * Unregisters automatically on component unmount.
 *
 *   const opacity = useSharedValue(0);
 *   const scale   = useSharedValue(1);
 *   useAnimationGuard(opacity, scale);
 *
 *   const anim = useRef(new Animated.Value(0)).current;
 *   useAnimationGuard(anim);
 *
 * ── useAnimationGuardComposite() ──────────────────────────────────────────────
 * Returns a stable register() function for CompositeAnimations (Animated.loop /
 * Animated.sequence / Animated.parallel) that are created dynamically inside
 * effects or event handlers.  All registrations made through the returned
 * function are cleaned up when the component unmounts.
 *
 *   const register = useAnimationGuardComposite();
 *
 *   useEffect(() => {
 *     const loop = Animated.loop(Animated.timing(val, { ... }));
 *     register(loop);   // guard will call loop.stop() on background
 *     loop.start();
 *     return () => loop.stop();
 *   }, []);
 */

import { useEffect, useRef } from "react";
import {
  registerAnimations,
  registerAnimation,
  type GuardedValue,
} from "@/lib/animationGuard";

// ── useAnimationGuard ─────────────────────────────────────────────────────────

/**
 * Register one or more stable animation values with the OOM guard.
 *
 * Values MUST be stable across renders:
 *   • Reanimated:  useSharedValue()
 *   • Legacy API:  useRef(new Animated.Value()).current
 *
 * The dependency array is intentionally empty because re-registering the same
 * stable object on every render would be wasteful — the guard already deduplicates.
 */
export function useAnimationGuard(...values: GuardedValue[]): void {
  useEffect(() => {
    const valid = values.filter(
      (v): v is GuardedValue => v !== null && v !== undefined
    );
    if (!valid.length) return;
    return registerAnimations(valid);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // stable refs — empty deps is intentional
}

// ── useAnimationGuardComposite ────────────────────────────────────────────────

/**
 * Returns a stable register() callback for dynamically created animations.
 * Each call to register() returns an individual unregister function, AND
 * automatically tracks the registration for cleanup on component unmount.
 *
 * Designed for Animated.loop / Animated.sequence refs stored in useRef().
 */
export function useAnimationGuardComposite(): (value: GuardedValue) => () => void {
  const cleanups = useRef<Array<() => void>>([]);

  useEffect(() => {
    return () => {
      cleanups.current.forEach((fn) => fn());
      cleanups.current = [];
    };
  }, []);

  return (value: GuardedValue): (() => void) => {
    const unregister = registerAnimation(value);
    cleanups.current.push(unregister);
    return unregister;
  };
}
