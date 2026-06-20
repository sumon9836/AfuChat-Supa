// No-op shim for react-native-pager-view on web (Expo dev preview only).
// The real native module is only available in Android/iOS builds.
const React = require("react");
const { View } = require("react-native");

function PagerView({ children, style, ...rest }) {
  return React.createElement(View, { style }, children);
}
PagerView.displayName = "PagerView";

module.exports = { PagerView, default: PagerView };
