---
name: Offline reboot logout bug
description: Root cause and fix for users being logged out after device reboot when offline
---

## Rule
Never gate the synthetic-user bootstrap on both `effectiveUserId && primaryAccount`.
Use only `effectiveUserId` (MMKV). Handle null `primaryAccount` (SecureStore) with a retry.

## Why
Android Keystore (used by expo-secure-store) has a timing race on fresh device reboot.
The Keystore is locked until biometric/PIN unlock, which can happen milliseconds before
the app opens. On the very first read, SecureStore can return null even for a valid token.
With the old `effectiveUserId && primaryAccount` guard, MMKV had the user ID but
`primaryAccount` was null, so no synthetic user was set, and the router sent the user
to the welcome screen (logout).

## How to apply
- Bootstrap condition in AuthContext.tsx: `if (effectiveUserId)` only
- If SecureStore returns null, schedule a 3-second retry to upgrade to real session
- User stays in-app with cached MMKV identity; real session promoted silently in background
- This is especially important in AuthContext's `restoreSession` / bootstrap logic
