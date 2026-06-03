/**
 * AfuMusic player — web stub.
 * Metro selects this file automatically for the web platform.
 * react-native-track-player stays completely out of the web bundle.
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
  rate: number;
  sleepTimerEnd: number | null;
  queueMap: number[];
  unavailable?: boolean;
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
  rate: 1.0,
  sleepTimerEnd: null,
  queueMap: [],
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
  async setRate(_: number): Promise<void> {}
  setSleepTimer(_: number | null): void {}
  toggleShuffle(): void {}
  toggleRepeat(): void {}
  tapTrack(_: number): void {}
}

export const afuMusicPlayer = new WebMusicPlayerStub();
