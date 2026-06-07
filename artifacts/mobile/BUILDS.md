# EAS Build History

## v2.2.3 — Android APK (preview) [BUILD #3 — `2ef798c0-f6ba-42e8-be17-13e9e3213aca` — ✅ FINISHED]

- **APK Download**: https://expo.dev/artifacts/eas/6NodquY5T6VUFBKDGwb5V9.apk
- **Dashboard**: https://expo.dev/accounts/amkaweesi1/projects/afuchat/builds/2ef798c0-f6ba-42e8-be17-13e9e3213aca
- **Build time**: ~20 min (11:43:35 → 12:03:46 UTC, June 7 2026)
- **versionCode**: 2071

- **Platform**: Android
- **Profile**: preview (APK, internal distribution)
- **Root cause fix**: Standalone APK crash-on-launch (2-week regression)
- **Changes in this build**:
  - **CRITICAL FIX — APK crash-on-launch**: Replaced `react-native-mmkv` v4 (Nitro Modules) with v3 (stable JSI bridge)
    - v4 used `react-native-nitro-modules` C++ runtime which had a JNI load-order race on Android standalone builds
    - v3 uses the traditional synchronous JSI bridge — always available when JS runs, no race condition possible
  - **REMOVED**: `react-native-nitro-modules` — was only a dependency of mmkv v4, no longer needed
  - **compileSdkVersion + targetSdkVersion: 36** — required by AndroidX activity:1.11+ / core:1.17+
  - **kotlinVersion: 2.1.21** — EAS SDK 55 image uses Gradle 9.0.0 + KSP, which requires Kotlin 2.0+; 1.9.25 is unsupported
  - **MMKV wrapper uses v3 API**: `new MMKV({ id })` (not `createMMKV`)
  - Expo Go unaffected — MMKV falls back to in-memory store in Expo Go

### Build #1 (FAILED) — `a0dc20ae-ecf8-45da-8d71-afe030b37b16`
- Failure: `compileSdkVersion: 35` caused `checkReleaseAarMetadata` Gradle failure
- Fix: bumped back to 36

### Build #2 (FAILED) — `0f340428-3762-430b-806f-71cf54f368ef`
- Failure: `kotlinVersion: 1.9.25` — EAS SDK 55 image (Gradle 9.0.0) requires KSP which only supports Kotlin 2.0+
- Fix: bumped to `kotlinVersion: 2.1.21`

---

## v2.0.78 — Android APK (preview)

- **Build ID**: `7f3fbb2f-6224-485b-97cf-671ec288acb2`
- **Dashboard**: https://expo.dev/accounts/afume/projects/afuchat/builds/7f3fbb2f-6224-485b-97cf-671ec288acb2
- **Status**: IN QUEUE ✅ (confirmed via EAS CLI)
- **Platform**: Android
- **Profile**: preview (APK, internal distribution)
- **versionCode**: 2062 (auto-incremented by EAS remote)
- **Keystore**: Build Credentials 1Nj4newnzl (default, managed by Expo)
- **Triggered**: 2026-05-26
- **Changes in this build**:
  - Removed home page search bar (replaced by compact header search icon)
  - Added search icon (→ chat-search) next to notification bell in header
  - Folder tabs now fill the area previously occupied by the search bar
  - Native Android alerts: `showAlert` now always uses `Alert.alert` on Android/iOS (custom modal web-only)
  - Toast auto-dismiss: exit animation plays when duration elapses (not only on tap)
  - FlatList numColumns crash fixed: stable `key` prop on all 9 grid FlatLists
- **Method**: EAS CLI `npx eas-cli@latest` with `EAS_NO_VCS=1` + `EXPO_NO_INTERACTIVE=1`

---

## v2.0.73 — Android APK (preview)

- **Build ID**: `db5dc5e0-d2b3-454b-821d-79586d869281`
- **Dashboard**: https://expo.dev/accounts/afume/projects/afuchat/builds/db5dc5e0-d2b3-454b-821d-79586d869281
- **APK Download**: https://expo.dev/artifacts/eas/t67ZEhG2VwKpXAfcamRFmV.apk
- **Status**: FINISHED ✓
- **Platform**: Android
- **Profile**: preview (APK, internal distribution)
- **versionCode**: 2050
- **Keystore**: managed by Expo (account: afume)
- **SDK Version**: 54.0.0
- **Triggered**: 2026-05-22
- **Completed**: 2026-05-22T14:23:31Z (~22 min build time)

---

## v2.0.68 — Android APK (preview)

- **Build ID**: `b9ea03d0-6213-42ff-b0a3-cc6276680129`
- **Dashboard**: https://expo.dev/accounts/afuchat/projects/afuchat/builds/b9ea03d0-6213-42ff-b0a3-cc6276680129
- **Platform**: Android
- **Profile**: preview (APK, internal distribution)
- **versionCode**: 2075 (auto-incremented by EAS remote from 2074)
- **Keystore**: Build Credentials 3ohDBvKUsq (default, managed by Expo)
- **Triggered**: 2026-05-14
- **Fixes in this build**:
  - Offline hardening: feed load-more from SQLite, post detail SQLite fallback, proactive chat message pre-caching
  - Dynamic post timestamps (minutes, hours, days, weeks, months, years)
- **Method**: EAS CLI with `EAS_NO_VCS=1` (filesystem archiver, bypasses Replit git sandbox)

## v2.0.70 — Android APK (preview)

- **Build ID**: `5f38a277-036a-4e82-9180-7be1b4a81252`
- **Dashboard**: https://expo.dev/accounts/afuchat/projects/afuchat/builds/5f38a277-036a-4e82-9180-7be1b4a81252
- **Platform**: Android
- **Profile**: preview (APK, internal distribution)
- **versionCode**: 2070 (auto-incremented by EAS remote from 2069)
- **Keystore**: Build Credentials 3ohDBvKUsq (default, managed by Expo)
- **Archive size**: 1.3 MB
- **Triggered**: 2026-05-16
- **Fixes in this build**:
  - Installed `expo-sqlite@~16.0.10` — resolves "Unable to resolve expo-sqlite" crash on Android
  - Added plus/camera button in chat header left when no active stories exist
  - Added `mediaDownloader.web.ts` stub — fixes blank web preview
  - Added Video Analytics dashboard screen (`/video-analytics`)
- **Method**: EAS CLI from isolated /tmp dir with absolute pnpm symlinks

## v2.0.69 — Android APK (preview)

- **Build ID**: `e9f3b9ec-2951-4db0-af08-e5ea1e8242a9`
- **Dashboard**: https://expo.dev/accounts/afuchat/projects/afuchat/builds/e9f3b9ec-2951-4db0-af08-e5ea1e8242a9
- **Platform**: Android
- **Profile**: preview (APK, internal distribution)
- **versionCode**: 2069 (auto-incremented by EAS remote from 2068)
- **Keystore**: Build Credentials 3ohDBvKUsq (default, managed by Expo)
- **Archive size**: 1.3 MB
- **Triggered**: 2026-05-16
- **Fixes in this build**:
  - Added `runtimeVersion: { policy: "appVersion" }` + `fallbackToCacheTimeout: 0` to fix OTA update crash
  - Removed `expo-sqlite` from app.json plugins (was causing plugin resolution failure in EAS)
  - DB columns added: `overlay_metadata`, `filter`, `avatar_overlay`, `comment_count`, `share_count`, `repost_count`
- **Method**: EAS CLI from isolated /tmp dir with absolute pnpm symlinks (bypasses Replit git sandbox)

## v2.0.66 — Android APK (preview)

- **Build ID**: `9b6bd5ac-bb95-42f4-9756-27e9b2e74676`
- **Dashboard**: https://expo.dev/accounts/amkaweesi1/projects/afuchat/builds/9b6bd5ac-bb95-42f4-9756-27e9b2e74676
- **Platform**: Android
- **Profile**: preview (APK, internal distribution)
- **versionCode**: 2068 (auto-incremented by EAS remote from 2065)
- **Keystore**: Build Credentials I56-2eELc3 (default, managed by Expo)
- **Archive size**: 1.2 MB
- **Triggered**: 2026-05-12
- **Method**: `eas build --platform android --profile preview --non-interactive --no-wait`
  with `EAS_NO_VCS=1` (filesystem archiver, bypasses Replit git sandbox restriction)
