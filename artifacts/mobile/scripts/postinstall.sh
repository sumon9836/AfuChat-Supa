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
# NOTE: MMKV Old Arch patch removed — SDK 55 uses New Architecture exclusively.
# react-native-mmkv@4.x (Nitro) compiles correctly with New Arch out of the box.

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
