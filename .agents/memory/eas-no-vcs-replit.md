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

## Confirmed working
- Build ID: 0fe77e49-c219-469f-9192-d6dad81b479a
- Profile: preview (APK, internal distribution)
- APK: https://expo.dev/artifacts/eas/2XUDKNQVvhgJsJvLHjHodA.apk
