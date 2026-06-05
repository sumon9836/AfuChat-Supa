#!/usr/bin/env bash
# Patch 1: react-native-track-player@4.1.2 Kotlin null-safety incompatibility with React Native 0.81.
# Arguments.fromBundle() / Arguments.fromList() no longer accept Bundle? (nullable) in RN 0.81.
# originalItem is declared as Bundle? in Track.kt — add ?: Bundle() fallbacks everywhere it is
# passed to an Arguments factory method to avoid hard native NPE crashes.
#
# Patched call-sites in MusicModule.kt:
#   getTrack()       — Arguments.fromBundle(tracks[index].originalItem)
#   getQueue()       — Arguments.fromList(tracks.map { it.originalItem })   ← main crash on open
#   getActiveTrack() — Arguments.fromBundle(tracks[getCurrentIndex()].originalItem)
#
# Patch 2: react-native-mmkv@3.3.3 Old Arch (newArchEnabled:false) compilation fix.
# MmkvPlatformContextModule extends NativeMmkvPlatformContextSpec which is a codegen-generated
# TurboModule spec class that does NOT exist when newArchEnabled=false. This causes 8 Java
# compile errors. Fix: replace the superclass with ReactContextBaseJavaModule (Old Arch base),
# add the required NAME constant, and add the getName() override.

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

# ─── Patch 2: MMKV Old Arch fix ───────────────────────────────────────────────

MMKV_MODULE="node_modules/react-native-mmkv/android/src/main/java/com/mrousavy/mmkv/MmkvPlatformContextModule.java"

if [ ! -f "$MMKV_MODULE" ]; then
  echo "[postinstall] react-native-mmkv not found, skipping MMKV patch."
else
  cat > "$MMKV_MODULE" << 'MMKV_PATCH_EOF'
package com.mrousavy.mmkv;

import androidx.annotation.Nullable;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;

// Patched for Old Arch (newArchEnabled=false): the original file extended
// NativeMmkvPlatformContextSpec which is codegen-generated and not available
// when New Architecture is disabled. We extend ReactContextBaseJavaModule instead
// and expose the same two methods so the JSI layer can still read the base dir.
public class MmkvPlatformContextModule extends ReactContextBaseJavaModule {
    public static final String NAME = "MmkvPlatformContext";

    private final ReactApplicationContext context;

    public MmkvPlatformContextModule(ReactApplicationContext reactContext) {
        super(reactContext);
        context = reactContext;
    }

    @Override
    public String getName() {
        return NAME;
    }

    public String getBaseDirectory() {
        return context.getFilesDir().getAbsolutePath() + "/mmkv";
    }

    @Nullable
    public String getAppGroupDirectory() {
        // AppGroups do not exist on Android — iOS only.
        return null;
    }
}
MMKV_PATCH_EOF
  echo "[postinstall] react-native-mmkv Old Arch patch applied (MmkvPlatformContextModule)."
fi
