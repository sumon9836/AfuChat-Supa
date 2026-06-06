---
name: EAS build on Replit — EAS_NO_VCS=1 workaround
description: How to trigger EAS CLI builds from Replit main agent without git errors
---

# EAS build on Replit

## The Rule
Always set `EAS_NO_VCS=1` when running `eas build` from the Replit main agent.

**Why:** Replit's main agent blocks all destructive git operations (git stash, git add, git commit, etc.). EAS CLI normally calls `git stash` when there are uncommitted changes (which there always are mid-session on Replit), then archives, then `git stash pop`. Both stash calls are blocked → build fails. `EAS_NO_VCS=1` skips all git interaction and uploads via file-system archive instead.

**How to apply:**
```bash
cd artifacts/mobile && EXPO_TOKEN=<token> EAS_NO_VCS=1 node_modules/.bin/eas build \
  --platform android --profile preview --non-interactive
```

Use `eas build:view <BUILD_ID>` to poll status. Build typically takes ~18 minutes.
The `--non-interactive` flag is required (stdin not available in Replit shell).

## Build history (most recent first)

### 2026-06-06 — v2.1.6 (post-auth lazy tab fix)
- Build ID: 1654aaa0-d90b-4b52-9642-702e3aa3dd89
- Build URL: https://expo.dev/accounts/afume/projects/afuchat/builds/1654aaa0-d90b-4b52-9642-702e3aa3dd89
- Profile: preview (APK, internal distribution)
- App version: 2.1.6 (com.afuchat.app)
- Fix: Removed `lazy: false` from tab screenOptions; discover/shorts/notifications/apps/me are now `lazy: true`. Only chats (default tab) loads eagerly after login. Prevents instant crash after login caused by all tabs mounting simultaneously (including ones with heavy native deps: Reanimated, expo-av, etc.)
- Submitted from: Replit (EAS_NO_VCS=1, --no-wait, 28.9 MB upload)
- Credentials: Keystore "Build Credentials 1Nj4newnzl" (default, remote)

### 2026-06-05 — v2.1.3 (WeakRef polyfill fix)
- Build ID: 68bcd4f6-c221-4f0b-9922-d9d34328abbf
- Build URL: https://expo.dev/accounts/afume/projects/afuchat/builds/68bcd4f6-c221-4f0b-9922-d9d34328abbf
- Profile: preview (APK, internal distribution)
- App version: 2.1.3 (com.afuchat.app)
- Fix: Added WeakRef + FinalizationRegistry polyfills in artifacts/mobile/polyfills.ts, imported first in _layout.tsx
- Submitted from: Replit (EAS_NO_VCS=1, file-system archive, 28.9 MB upload)
- Credentials: Keystore "Build Credentials 1Nj4newnzl" (default, remote)

### 2026-06-05 — v2.1.2 (SVG crash fixes)
- Build ID: c68dad8b-a52f-4137-9b6c-93c425d3d4e1
- Build URL: https://expo.dev/accounts/afume/projects/afuchat/builds/c68dad8b-a52f-4137-9b6c-93c425d3d4e1
- Profile: preview (APK, internal distribution)
- App version: 2.1.2 (com.afuchat.app)
- Submitted from: Replit (EAS_NO_VCS=1, file-system archive, 28.7 MB upload)
- Credentials: Keystore "Build Credentials 1Nj4newnzl" (default, remote)

### 2026-xx-xx — previous build
- Build ID: 0fe77e49-c219-469f-9192-d6dad81b479a
- Profile: preview (APK, internal distribution)
- APK: https://expo.dev/artifacts/eas/2XUDKNQVvhgJsJvLHjHodA.apk
