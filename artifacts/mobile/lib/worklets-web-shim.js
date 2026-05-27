'use strict';
/**
 * Self-contained no-op shim for react-native-worklets on web.
 * The real package crashes with "createSerializableObject should never be
 * called in JSWorklets" because its JSWorklets mode doesn't support
 * object serialization. This shim replaces the entire module on web with
 * safe no-ops so gestures, reanimated, and all other consumers stay stable.
 */

const NOOP = () => {};
const ID = v => v;
const NOOP_OBJ = {};

// Shared value mappings (weak maps just for memory management)
const shareableMappingCache = { has: () => false, get: () => undefined, set: NOOP, delete: NOOP };
const serializableMappingCache = { has: () => false, get: () => undefined, set: NOOP, delete: NOOP };

// Thread utils — on web everything runs on the JS thread
function runOnUI(fn) { return fn; }
function runOnJS(fn) { return fn; }
function runOnUIAsync(fn) { return fn; }
function runOnUISync(fn) { return fn; }
function scheduleOnUI(fn) { if (typeof fn === 'function') fn(); }
function scheduleOnRN(fn) { if (typeof fn === 'function') fn(); }
function callMicrotasks() {}
function executeOnUIRuntimeSync(fn) { if (typeof fn === 'function') return fn(); }
function unstable_eventLoopTask(fn) { return fn; }
function createWorkletRuntime() { return null; }
function runOnRuntime() { return NOOP; }

// Shareable / serializable
function makeShareable(value) { return value; }
function makeShareableCloneRecursive(value) { return value; }
function makeShareableCloneOnUIRecursive(value) { return value; }
function isShareableRef() { return false; }
function createSerializable(value) { return value; }
function isSerializableRef() { return false; }
function createSynchronizable(value) { return { value }; }
function isSynchronizable() { return false; }

// Worklet function detection
function isWorkletFunction() { return false; }

// Feature flags (no-op)
function getStaticFeatureFlag() { return false; }
function setDynamicFeatureFlag() {}

// Runtime kind
const RuntimeKind = { JS: 'JS', UI: 'UI', Node: 'Node' };
function getRuntimeKind() { return RuntimeKind.JS; }

// WorkletsModule mock
const WorkletsModule = {
  makeShareableClone: ID,
  scheduleOnUI: scheduleOnUI,
  scheduleOnRN: scheduleOnRN,
  createWorkletRuntime: createWorkletRuntime,
  scheduleOnRuntime: NOOP,
  executeSync: (fn) => { if (typeof fn === 'function') return fn(); },
};

// Set up global APIs that Babel-transformed worklet functions look for
// so they fail gracefully instead of crashing
if (typeof global !== 'undefined') {
  global._makeShareableClone = ID;
  global._scheduleOnRuntime = NOOP;
  global._IS_FABRIC = false;
}
if (typeof globalThis !== 'undefined') {
  globalThis._makeShareableClone = ID;
  globalThis._scheduleOnRuntime = NOOP;
  globalThis._IS_FABRIC = false;
}

module.exports = {
  // Thread
  runOnUI,
  runOnJS,
  runOnUIAsync,
  runOnUISync,
  scheduleOnUI,
  scheduleOnRN,
  callMicrotasks,
  executeOnUIRuntimeSync,
  unstable_eventLoopTask,

  // Runtime
  createWorkletRuntime,
  runOnRuntime,
  getRuntimeKind,
  RuntimeKind,

  // Shareable
  makeShareable,
  makeShareableCloneRecursive,
  makeShareableCloneOnUIRecursive,
  isShareableRef,
  shareableMappingCache,

  // Serializable
  createSerializable,
  isSerializableRef,
  serializableMappingCache,

  // Synchronizable
  createSynchronizable,
  isSynchronizable,

  // Worklet functions
  isWorkletFunction,

  // Feature flags
  getStaticFeatureFlag,
  setDynamicFeatureFlag,

  // Module
  WorkletsModule,
};
