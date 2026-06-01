#!/usr/bin/env bash
# Fix react-native-track-player@4.1.2 Kotlin null-safety incompatibility with React Native 0.81.
# Arguments.fromBundle() no longer accepts Bundle? (nullable) in RN 0.81; originalItem is Bundle?.
# Fix: add ?: Bundle() fallback so null originalItem yields an empty bundle instead of crashing.

set -e

MUSIC_MODULE="node_modules/react-native-track-player/android/src/main/java/com/doublesymmetry/trackplayer/module/MusicModule.kt"

if [ ! -f "$MUSIC_MODULE" ]; then
  echo "[postinstall] react-native-track-player not found, skipping patch."
  exit 0
fi

# Fix getTrack (line ~548): originalItem passed directly to Arguments.fromBundle
sed -i 's/Arguments\.fromBundle(musicService\.tracks\[index\]\.originalItem)/Arguments.fromBundle(musicService.tracks[index].originalItem ?: Bundle())/g' "$MUSIC_MODULE"

# Fix getActiveTrack (line ~588): originalItem in multi-line call
sed -i 's/musicService\.tracks\[musicService\.getCurrentTrackIndex()\]\.originalItem$/musicService.tracks[musicService.getCurrentTrackIndex()].originalItem ?: Bundle()/g' "$MUSIC_MODULE"

echo "[postinstall] react-native-track-player patch applied."
