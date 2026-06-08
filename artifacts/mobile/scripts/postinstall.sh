#!/usr/bin/env bash
# Patch 1: react-native-track-player@4.1.2 Kotlin null-safety incompatibility with React Native 0.83.
# Arguments.fromBundle() / Arguments.fromList() no longer accept Bundle? (nullable).
# originalItem is declared as Bundle? in Track.kt — add ?: Bundle() fallbacks everywhere it is
# passed to an Arguments factory method to avoid hard native NPE crashes.
#
# Patched call-sites in MusicModule.kt:
#   getTrack()       — Arguments.fromBundle(tracks[index].originalItem)
#   getQueue()       — Arguments.fromList(tracks.map { it.originalItem })   ← main crash on open
#   getActiveTrack() — Arguments.fromBundle(tracks[getCurrentIndex()].originalItem)
#
# NOTE: react-native-mmkv has been downgraded to v3 (stable JSI bridge).
# v4/Nitro caused an unrecoverable native crash on Android standalone builds.
# See lib/storage/mmkv.ts for full explanation.
#
# Patch 2: react-native-worklets SoLoader try-catch.
# WorkletsModule has a static { SoLoader.loadLibrary("worklets"); } block that runs
# when the class is first loaded (New Architecture, during early JS init). If libworklets.so
# fails to load (ABI mismatch, linker error, missing dep), it throws UnsatisfiedLinkError
# which escapes the Java exception handler and crashes the whole JVM before any JS error
# handler can catch it. Wrapping in try-catch degrades gracefully: Reanimated will
# report a JS error (caught by ErrorBoundary) instead of a silent native crash.

set -e

# ─── Patch 1: RNTP null-safety ────────────────────────────────────────────────

MUSIC_MODULE="node_modules/react-native-track-player/android/src/main/java/com/doublesymmetry/trackplayer/module/MusicModule.kt"

if [ ! -f "$MUSIC_MODULE" ]; then
  echo "[postinstall] react-native-track-player not found, skipping RNTP patch."
else
  sed -i 's/Arguments\.fromBundle(musicService\.tracks\[index\]\.originalItem)/Arguments.fromBundle(musicService.tracks[index].originalItem ?: Bundle())/g' "$MUSIC_MODULE"
  sed -i 's/musicService\.tracks\.map { it\.originalItem }/musicService.tracks.map { it.originalItem ?: Bundle() }/g' "$MUSIC_MODULE"
  sed -i 's/musicService\.tracks\[musicService\.getCurrentTrackIndex()\]\.originalItem$/musicService.tracks[musicService.getCurrentTrackIndex()].originalItem ?: Bundle()/g' "$MUSIC_MODULE"
  echo "[postinstall] react-native-track-player patch applied (getTrack + getQueue + getActiveTrack)."
fi

# ─── Patch 2: WorkletsModule SoLoader try-catch ───────────────────────────────
# Patch both bundling variants (experimentalBundling is used by New Architecture builds;
# legacyBundling is compiled by Old Architecture / fallback builds).

patch_worklets() {
  local FILE="$1"
  if [ ! -f "$FILE" ]; then
    return
  fi

  python3 - "$FILE" <<'PYEOF'
import sys
import pathlib

path = pathlib.Path(sys.argv[1])
txt = path.read_text()

OLD = '  static {\n    SoLoader.loadLibrary("worklets");\n  }'
NEW = ('  static {\n'
       '    try {\n'
       '      SoLoader.loadLibrary("worklets");\n'
       '    } catch (Throwable __wt) {\n'
       '      android.util.Log.e("WorkletsModule",\n'
       '          "libworklets.so failed to load — Reanimated will be disabled: " + __wt);\n'
       '    }\n'
       '  }')

if OLD in txt:
    path.write_text(txt.replace(OLD, NEW, 1))
    print("[postinstall] WorkletsModule patched:", path)
else:
    print("[postinstall] WorkletsModule static block not found (already patched or changed):", path)
PYEOF
}

WORKLETS_EXP="node_modules/react-native-worklets/android/src/experimentalBundling/com/swmansion/worklets/WorkletsModule.java"
WORKLETS_LEG="node_modules/react-native-worklets/android/src/legacyBundling/com/swmansion/worklets/WorkletsModule.java"

patch_worklets "$WORKLETS_EXP"
patch_worklets "$WORKLETS_LEG"
