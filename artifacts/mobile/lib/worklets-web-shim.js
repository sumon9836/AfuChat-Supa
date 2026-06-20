// No-op shim for react-native-worklets on web (Expo dev preview only).
module.exports = {
  runOnUI: (fn) => fn,
  runOnJS: (fn) => fn,
  useWorkletCallback: (fn) => fn,
  createRunOnJS: (fn) => fn,
};
