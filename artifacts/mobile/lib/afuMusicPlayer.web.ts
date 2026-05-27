/**
 * AfuMusic player — web stub.
 *
 * AfuMusic only runs on Android/iOS.  This file is automatically selected by
 * Metro when bundling for the web platform (platform-specific file resolution),
 * keeping react-native-track-player out of the web bundle entirely.
 */
import type * as MediaLibraryTypes from "expo-media-library";

export type RepeatMode = "none" | "one" | "all";

export type MusicPlayerState = {
  tracks: MediaLibraryTypes.Asset[];
  currentIndex: number | null;
  isPlaying: boolean;
  position: number;
  duration: number;
  shuffle: boolean;
  repeat: RepeatMode;
};

type Listener = (state: MusicPlayerState) => void;

const STUB: MusicPlayerState = {
  tracks: [],
  currentIndex: null,
  isPlaying: false,
  position: 0,
  duration: 0,
  shuffle: false,
  repeat: "none",
};

class WebMusicPlayerStub {
  subscribe(listener: Listener): () => void {
    listener({ ...STUB });
    return () => {};
  }
  getState(): MusicPlayerState { return { ...STUB }; }
  setTracks(_: MediaLibraryTypes.Asset[]): void {}
  appendTracks(_: MediaLibraryTypes.Asset[]): void {}
  clearTracks(): void {}
  async loadAndPlay(_: number): Promise<void> {}
  async playPause(): Promise<void> {}
  async playNext(): Promise<void> {}
  async playPrev(): Promise<void> {}
  async seekTo(_: number): Promise<void> {}
  toggleShuffle(): void {}
  toggleRepeat(): void {}
  tapTrack(_: number): void {}
}

export const afuMusicPlayer = new WebMusicPlayerStub();
