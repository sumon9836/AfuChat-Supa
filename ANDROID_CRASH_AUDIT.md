# AfuChat Android Startup Crash Audit
### Splash screen shows → app immediately closes with "App Error" notification

> **Build context**: APK built via EAS preview profile. Works in Expo Go. Crashes on standalone APK. This means the crash is native-side — it happens before or at the point where the JS engine initializes, or it's caused by a native module that isn't available in Expo Go.

---

## Startup Execution Chain

```
Android OS launches AfuChat
    ↓
Application.onCreate() — FirebaseApp.initializeApp() (FCM), SoLoader.init()
    ↓
MainActivity.onCreate() — Expo splash screen shown (native layer)
    ↓
Hermes JS engine starts
    ↓
_layout.tsx module is evaluated (top-level statements, NOT inside React):
    1. import "@/polyfills"                    ← WeakRef/FinalizationRegistry polyfills
    2. import "react-native-gesture-handler"   ← native GH init (side-effect)
    3. import "@/lib/callService"              ← TaskManager.defineTask()
    4. enableScreens(true)                    ← react-native-screens native call
    5. initCrashReporter()                    ← ErrorUtils wiring
    6. SplashScreen.preventAutoHideAsync()    ← holds native splash open
    7. if (NativeModules.TrackPlayerModule)    ← RNTP registration
         TrackPlayer.registerPlaybackService()
    ↓
React renders RootLayout() component:
    8. Font.useFonts() — loads Inter fonts
    9. GestureHandlerRootView renders
   10. ThemeProvider → ThemedRoot → AppAccentProvider
   11. DataModeProvider → AuthProvider (reads SecureStore via accountStore)
   12. MiniAppRuntimeProvider (imports 14 mini-app modules statically)
   13. DesktopShell (imports ChatsListPanel from route file)
   14. Stack (Expo Router navigation)
    ↓
AppReadyGate fires when fonts + auth resolved → SplashScreen.hideAsync()
    ↓
JS splash overlay fades out
    ↓
First screen renders (index.tsx → redirect to tabs or welcome)
```

---

## Top 20 Suspicious Startup Components

| Rank | Component | Risk Level | Crash Probability | Recommended Action |
|------|-----------|------------|-------------------|-------------------|
| 1 | `react-native-worklets` SoLoader static block | **CRITICAL** | **Very High** | Verify patch applied; test worklets-disabled build |
| 2 | `react-native-reanimated` v4 (depends on worklets) | **CRITICAL** | **Very High** | Check Reanimated init; disable animations temporarily |
| 3 | `enableScreens(true)` at module-eval | **HIGH** | **High** | Move inside useEffect |
| 4 | `import "react-native-gesture-handler"` side-effect | **HIGH** | **High** | Verify linked correctly; test without |
| 5 | RNTP `MusicModule.kt` null-safety patch | **HIGH** | **High** | Verify patch applied correctly |
| 6 | `MiniAppRuntimeProvider` — 14 static module imports | **HIGH** | **High** | Lazy-load mini-app modules |
| 7 | `DesktopShell` circular import of route file | **HIGH** | **Medium-High** | Remove `ChatsListPanel` import from shell |
| 8 | `react-native-mmkv` v3 JSI bridge init | **HIGH** | **Medium** | Check `getStore()` never runs at module-eval |
| 9 | AuthContext + `SecureStore` on startup | **MEDIUM** | **Medium** | Wrap SecureStore calls defensively |
| 10 | `@react-native-google-signin/google-signin` | **MEDIUM** | **Medium** | Check SHA-1 fingerprint matches google-services.json |
| 11 | FirebaseApp native init (Application.onCreate) | **MEDIUM** | **Medium** | Validate google-services.json package name |
| 12 | `expo-notifications` + channel setup | **MEDIUM** | **Medium** | Already lazy — verify error handling |
| 13 | `expo-task-manager` background task registration | **MEDIUM** | **Low-Medium** | Already try/catch wrapped |
| 14 | `SplashScreen.preventAutoHideAsync()` | **LOW** | **Low** | Already has `.catch(() => {})` |
| 15 | Deep linking `Linking.getInitialURL()` | **LOW** | **Low** | Already guarded in useEffect |
| 16 | `expo-sqlite` (SQLite for conversations) | **LOW** | **Low** | Accessed only after native runtime ready |
| 17 | AsyncStorage offline queue flush | **LOW** | **Low** | All errors swallowed |
| 18 | `initCrashReporter()` — ErrorUtils wiring | **LOW** | **Low** | Itself safe; just wires handlers |
| 19 | `preloadConversations()` in useEffect | **LOW** | **Low** | Protected by platform check |
| 20 | Font loading (`expo-google-fonts/inter`) | **LOW** | **Low** | fontError handled; `fontsReady = loaded || !!error` |

---

## Top 5 Most Likely Crash Causes (Detailed)

---

### 🔴 #1 — `react-native-worklets` SoLoader Static Block
**Probability: Very High**

**File**: `node_modules/react-native-worklets/android/src/experimentalBundling/com/swmansion/worklets/WorkletsModule.java`
and `…/legacyBundling/…/WorkletsModule.java`

**What happens**: The `WorkletsModule` class has a Java static initializer block:
```java
static {
    SoLoader.loadLibrary("worklets");
}
```
This runs the moment the Android class loader first references `WorkletsModule` — which happens during React Native's native module registration, **before the JS engine starts**. If `libworklets.so` fails to load for any reason (ABI mismatch, linker dependency missing, corrupted `.so`), it throws `UnsatisfiedLinkError`. Static initializer exceptions propagate as `ExceptionInInitializerError` and then `NoClassDefFoundError` on every subsequent access to the class — the entire JVM process becomes unstable and crashes.

**Why it can't be caught by JS**: This crash happens in the Java class loader, before Hermes initializes. No `try/catch` in JavaScript can intercept it. No `ErrorBoundary` can catch it. The app just dies.

**The postinstall.sh patch wraps this in try-catch** — but the patch uses `python3` string replacement and depends on an **exact match** of the static block text including specific whitespace/newlines. If:
- The `pnpm install` ran without executing postinstall (e.g. with `--ignore-scripts`)
- The worklets package was already installed from cache with different line endings
- The source file format changed in any worklets update

...then the patch silently fails to apply (the script prints "already patched or changed" but does NOT fail with `set -e`), and the unpatched static block remains.

**Silent failure**: Yes — the postinstall script never fails the build even if the patch doesn't apply.

**To verify**:
```bash
# In artifacts/mobile:
grep -A5 "static {" node_modules/react-native-worklets/android/src/experimentalBundling/com/swmansion/worklets/WorkletsModule.java
# Should show try { SoLoader.loadLibrary... } catch (Throwable __wt)
# If it shows the plain loadLibrary() call — THE PATCH DID NOT APPLY
```

**To disable safely**: In `_layout.tsx`, comment out `import "react-native-gesture-handler"` and all Reanimated-using components. (Reanimated v4 will crash at runtime anyway if worklets failed to load.)

---

### 🔴 #2 — `react-native-reanimated` v4 Failing Without Worklets
**Probability: Very High**

**File**: All files using `useAnimatedStyle`, `useSharedValue`, `Animated.*` from Reanimated, plus `babel.config.js` which adds the Reanimated Babel plugin to every compiled file.

**What happens**: Reanimated v4 uses `react-native-worklets` as its C++ runtime. The Reanimated Babel plugin (`react-native-reanimated/plugin` in `babel.config.js`) wraps animated functions at compile time. When these run at startup:
1. Reanimated tries to initialize its native module
2. Its native module depends on WorkletsModule being loaded
3. If WorkletsModule crashed (see #1), Reanimated's own module registration fails
4. The first animated component that renders throws a native exception

**`SplashScreenView`** uses `Animated.timing` with `useNativeDriver: true` — this runs as soon as the splash screen overlay is visible, which is one of the **very first things that renders**. If native driver is broken, it crashes immediately.

**Silent failure**: Yes — native driver failures can crash the process without a JS error.

**To disable safely**: In `SplashScreenView.tsx`, change `useNativeDriver: true` to `useNativeDriver: false` temporarily to test.

---

### 🔴 #3 — `enableScreens(true)` Called at Module-Evaluation Time
**Probability: High**

**File**: `artifacts/mobile/app/_layout.tsx`, line ~8

**Code**:
```typescript
import { enableScreens } from "react-native-screens";
enableScreens(true);  // ← runs at module eval, before React
```

**What happens**: `enableScreens` calls into the native `RNScreensModule` synchronously, during module evaluation — before any React component mounts and before any error boundary exists. On some Android versions and devices, `ScreensModule` JNI initialization can fail if the activity isn't fully initialized yet.

**This is the documented correct place** to call it for Expo Router, but if `react-native-screens` v4.23.0 has a regression on the target Android version, it crashes here with no recovery path.

**To verify**: Comment out `enableScreens(true)` temporarily. Expo Router will still work without it (just without screen optimization).

---

### 🔴 #4 — RNTP `MusicModule.kt` Null-Safety Patch Failure
**Probability: High**

**File**: `node_modules/react-native-track-player/android/src/main/java/com/doublesymmetry/trackplayer/module/MusicModule.kt`

**What happens**: The postinstall.sh applies `sed` replacements to fix Kotlin null-safety crashes in MusicModule.kt. If the patch doesn't apply (wrong RNTP version, different file path, different source format), the original nullable `Bundle?` values are passed to `Arguments.fromBundle()` which expects non-null, causing a `NullPointerException` that crashes the service.

**Unlike worklets**, this crash usually happens when the music service is first **used** (e.g., when a track is loaded) rather than on startup — so it's less likely to be the root cause of the splash crash but remains a risk.

**To verify**:
```bash
grep "originalItem ?: Bundle()" node_modules/react-native-track-player/android/src/main/java/com/doublesymmetry/trackplayer/module/MusicModule.kt | wc -l
# Should return 3 if patch applied
```

**To disable safely**: In `_layout.tsx`, comment out the TrackPlayer registration block entirely.

---

### 🔴 #5 — `MiniAppRuntimeProvider` Static Import of 14 Mini-App Modules
**Probability: High**

**File**: `artifacts/mobile/lib/superapp/MiniAppRuntime.tsx`

**Code**:
```typescript
import AfuAIApp from "@/modules/afuai";
import AfuPayApp from "@/modules/afupay";
import AfuMarketApp from "@/modules/afumarket";
import AfuGamesApp from "@/modules/afugames";
import AfuMusicApp from "@/modules/afumusic";
// ... 9 more
```

**What happens**: All 14 mini-app modules are statically imported at module-evaluation time. Any one of these modules that has a top-level statement accessing a native module, or a module that has a bad import chain, will crash during the initial bundle evaluation. The app directory shows 15+ mini-app folders — that's 15+ module graphs being eagerly loaded before the first screen renders.

**If any mini-app module has a static native call or bad import**: The crash happens during Hermes bundle evaluation, before any component renders.

**To disable safely**: Convert static imports to lazy `React.lazy()` or `require()` calls inside the component body.

---

## Silent Crash Components (No JS Error Shown)

These components can terminate the app without producing a visible JavaScript error or red-box:

| Component | Why Silent |
|-----------|-----------|
| WorkletsModule SoLoader | JVM crash before Hermes starts |
| enableScreens() native call | Native exception during module eval |
| GestureHandler side-effect import | Native init before error handlers |
| Firebase Application.onCreate | Native crash before any JS |
| RNTP foreground service | Service crash logged to logcat only |

---

## Recommended Isolation Testing Order

Test these **one at a time** by commenting out/disabling and rebuilding the APK each time. Start with the most likely cause:

### Step 1: Verify the postinstall patches actually applied
```bash
# Run from artifacts/mobile:
grep -c "try {" node_modules/react-native-worklets/android/src/experimentalBundling/com/swmansion/worklets/WorkletsModule.java
# Must be > 0 (means patch applied)

grep -c "originalItem ?: Bundle()" node_modules/react-native-track-player/android/src/main/java/com/doublesymmetry/trackplayer/module/MusicModule.kt
# Must be 3 (3 patch sites)
```

### Step 2: Disable Reanimated native driver temporarily
In `SplashScreenView.tsx`, change both `useNativeDriver: true` to `useNativeDriver: false`. Rebuild. If the crash disappears: the issue is Reanimated/worklets native initialization.

### Step 3: Disable the TrackPlayer registration
Comment out the `if (NativeModules.TrackPlayerModule)` block in `_layout.tsx`. Rebuild. Tests whether RNTP foreground service registration causes the crash.

### Step 4: Lazy-load MiniAppRuntimeProvider modules
Replace the 14 static imports with `React.lazy()`. Rebuild. Tests whether a mini-app module has a bad top-level statement.

### Step 5: Comment out `enableScreens(true)`
Remove the call in `_layout.tsx`. Rebuild. Tests react-native-screens initialization.

### Step 6: Remove GestureHandler side-effect import
Comment out `import "react-native-gesture-handler"` at the top of `_layout.tsx`. Rebuild. Tests gesture handler native init.

### Step 7: Strip to a minimal `_layout.tsx`
Replace the entire `RootLayout` with just:
```tsx
export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{flex:1}}>
      <Stack />
    </GestureHandlerRootView>
  );
}
```
If this minimal version works, add providers back one at a time.

---

## Required Fixes (Concrete)

### Fix 1: Make the worklets patch failure a build-breaking error
**File**: `artifacts/mobile/scripts/postinstall.sh`

After `patch_worklets "$WORKLETS_LEG"`, add:
```bash
# Verify at least one file was patched
if ! grep -q 'catch (Throwable __wt)' "$WORKLETS_EXP" 2>/dev/null && \
   ! grep -q 'catch (Throwable __wt)' "$WORKLETS_LEG" 2>/dev/null; then
  echo "[postinstall] ERROR: WorkletsModule patch failed to apply. Build will crash on Android." >&2
  exit 1
fi
echo "[postinstall] Worklets patch verified OK."
```

### Fix 2: Lazy-load MiniAppRuntimeProvider modules
**File**: `artifacts/mobile/lib/superapp/MiniAppRuntime.tsx`

Replace static imports with lazy requires:
```typescript
// Instead of: import AfuAIApp from "@/modules/afuai";
// Use inside component:
const AfuAIApp = React.lazy(() => import("@/modules/afuai"));
```

### Fix 3: Move `enableScreens` inside a useEffect or component
**File**: `artifacts/mobile/app/_layout.tsx`

```typescript
// Move from module-eval to component body or useEffect:
useEffect(() => {
  enableScreens(true);
}, []);
```

### Fix 4: Fix the DesktopShell circular route import
**File**: `artifacts/mobile/components/desktop/DesktopShell.tsx`

The import `import { ChatsListPanel } from "@/app/(tabs)/index"` imports a route file from a component — this is a circular dependency in Expo Router's module graph. Extract `ChatsListPanel` to a shared component file (e.g., `components/chat/ChatsListPanel.tsx`) and import from there.

### Fix 5: Ensure postinstall runs with every install
**File**: `artifacts/mobile/package.json`

Verify `"postinstall": "bash scripts/postinstall.sh"` is present in scripts. Also ensure pnpm installs are never run with `--ignore-scripts`.

---

## Minimal Startup Configuration for Testing

Use this stripped `_layout.tsx` to confirm the crash is in a provider/module (not the native build itself). If this version runs, add complexity back piece by piece:

```tsx
import "@/polyfills";
import "react-native-gesture-handler";
import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }} />
    </GestureHandlerRootView>
  );
}
```

If **this also crashes**: the issue is in the native build itself (google-services.json, Firebase init, a plugin, or a .so file). Check Android logcat for a crash before JS starts.

If **this runs**: the crash is in one of the disabled providers/modules. Re-add them one at a time.

---

## How to Get the Actual Crash Logs

The single most important step: **read Android logcat during the crash**. The crash notification says nothing useful, but logcat shows the exact exception, stack trace, and class name.

**Options**:
1. Connect device via USB, run: `adb logcat --pid=$(adb shell pidof com.afuchat.app) -T 1`
2. Or: `adb logcat *:E | grep -E "(afuchat|com\.swmansion|SoLoader|WorkletsModule|TrackPlayer|FATAL|AndroidRuntime)"`
3. The crash will show up as `AndroidRuntime: FATAL EXCEPTION: main` followed by the exception class and stack trace

The logcat output will immediately identify which of the above suspects is the actual root cause.

---

## Summary

The crash pattern — **launch → splash → immediate close** — on a standalone APK that works in Expo Go is a strong fingerprint for a **native module initialization failure**. Expo Go pre-loads and pre-initializes all supported native modules; your own APK must initialize them cold.

The **#1 suspect is the WorkletsModule SoLoader static block**. The postinstall.sh patch is the right fix but its silent failure mode (no build error when patch doesn't apply) means it may not have applied in the EAS build environment. Combined with Reanimated v4's hard dependency on worklets, this creates a cascade that would crash the app before a single React component renders.

**Get the logcat output first** — it will confirm or rule out this suspect in 30 seconds.
