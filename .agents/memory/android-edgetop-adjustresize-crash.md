---
name: Android startup crash — edgeToEdge + adjustResize conflict
description: edgeToEdgeEnabled:true + softwareKeyboardLayoutMode:resize causes instant IllegalStateException on Android 15+
---

## Rule
Never set `softwareKeyboardLayoutMode: "resize"` when `edgeToEdgeEnabled: true` in app.json android section.

**Why:** Android 15 (API 35) enforces edge-to-edge mode by default. `adjustResize` (set by `softwareKeyboardLayoutMode: "resize"`) throws `IllegalStateException: SOFT_INPUT_ADJUST_RESIZE is not supported on edge-to-edge windows` before any UI renders. The crash happens in native code, bypasses ErrorBoundary, and shows as "App Error" Android System notification.

**How to apply:** If edgeToEdgeEnabled is true, omit softwareKeyboardLayoutMode entirely (defaults to adjustNothing, compatible with edge-to-edge). The chat keyboard avoidance already uses direct keyboardHeight tracking and does NOT rely on adjustResize.

**Fixed in:** app.json — removed `softwareKeyboardLayoutMode: "resize"` line. versionCode set to 20081.
