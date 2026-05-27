/**
 * AfuMusic — module-level singleton audio player.
 *
 * Lives outside the React tree so it survives component unmounts (mini-app
 * close, route navigation, etc.).  The AfuMusicApp component just subscribes
 * to state updates and delegates all controls here.
 *
 * Audio continues playing in the background because:
 *   • Audio.setAudioModeAsync staysActiveInBackground:true is called once here
 *   • The Audio.Sound object is never unloaded when the UI component unmounts
 *   • AppState changes are handled to re-assert background audio mode on resume
 */

import { Audio } from "expo-av";
import { AppState, Platform } from "react-native";
import type * as MediaLibraryTypes from "expo-media-library";
import {
  initMusicNotification,
  updateMusicNotification,
  dismissMusicNotification,
} from "./musicNotification";

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

const INITIAL_STATE: MusicPlayerState = {
  tracks: [],
  currentIndex: null,
  isPlaying: false,
  position: 0,
  duration: 0,
  shuffle: false,
  repeat: "none",
};

class AfuMusicPlayerSingleton {
  private _sound: Audio.Sound | null = null;
  private _state: MusicPlayerState = { ...INITIAL_STATE };
  private _listeners = new Set<Listener>();
  private _shuffleOrder: number[] = [];
  private _shufflePos = 0;
  private _loading = false;

  constructor() {
    if (Platform.OS === "web") return;
    this._initAudioMode();
    initMusicNotification().catch(() => {});
    AppState.addEventListener("change", (next) => {
      if (next === "active") this._initAudioMode();
    });
  }

  private _initAudioMode() {
    Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      staysActiveInBackground: true,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    }).catch(() => {});
  }

  // ── Subscription ─────────────────────────────────────────────────────────

  subscribe(listener: Listener): () => void {
    this._listeners.add(listener);
    listener({ ...this._state });
    return () => this._listeners.delete(listener);
  }

  private _lastNotifIndex: number | null = undefined as any;
  private _lastNotifPlaying: boolean = false;

  private _emit() {
    const snap = { ...this._state };
    this._listeners.forEach((l) => {
      try { l(snap); } catch {}
    });
    const indexChanged = snap.currentIndex !== this._lastNotifIndex;
    const playingChanged = snap.isPlaying !== this._lastNotifPlaying;
    if (indexChanged || playingChanged) {
      this._lastNotifIndex = snap.currentIndex;
      this._lastNotifPlaying = snap.isPlaying;
      updateMusicNotification(snap).catch(() => {});
    }
  }

  // ── State accessors ───────────────────────────────────────────────────────

  getState(): MusicPlayerState {
    return { ...this._state };
  }

  // ── Tracks ────────────────────────────────────────────────────────────────

  setTracks(tracks: MediaLibraryTypes.Asset[]) {
    this._state.tracks = tracks;
    this._emit();
  }

  appendTracks(tracks: MediaLibraryTypes.Asset[]) {
    this._state.tracks = [...this._state.tracks, ...tracks];
    this._emit();
  }

  clearTracks() {
    this._state.tracks = [];
    this._emit();
  }

  // ── Shuffle ───────────────────────────────────────────────────────────────

  private _buildShuffleOrder(length: number) {
    const order = Array.from({ length }, (_, i) => i);
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    this._shuffleOrder = order;
    this._shufflePos = 0;
  }

  // ── Auto-advance on finish ────────────────────────────────────────────────

  private _onFinish = () => {
    const { repeat, shuffle, tracks, currentIndex } = this._state;
    const ci = currentIndex ?? 0;

    if (repeat === "one") {
      this._sound?.replayAsync().catch(() => {});
      return;
    }
    if (shuffle) {
      this._shufflePos = (this._shufflePos + 1) % Math.max(1, this._shuffleOrder.length);
      this.loadAndPlay(this._shuffleOrder[this._shufflePos] ?? 0);
    } else {
      const next = (ci + 1) % tracks.length;
      if (repeat === "all" || next !== 0) {
        this.loadAndPlay(next);
      } else {
        this._state.isPlaying = false;
        this._emit();
      }
    }
  };

  // ── Core playback ─────────────────────────────────────────────────────────

  async loadAndPlay(index: number): Promise<void> {
    if (Platform.OS === "web") return;
    if (this._loading) return;
    const { tracks } = this._state;
    if (index < 0 || index >= tracks.length) return;

    this._loading = true;
    try {
      if (this._sound) {
        await this._sound.stopAsync().catch(() => {});
        await this._sound.unloadAsync().catch(() => {});
        this._sound = null;
      }

      this._state.currentIndex = index;
      this._state.position = 0;
      this._state.duration = 0;
      this._state.isPlaying = false;
      this._emit();

      const { sound } = await Audio.Sound.createAsync(
        { uri: tracks[index].uri },
        { shouldPlay: true, progressUpdateIntervalMillis: 500 },
        (status) => {
          if (!status.isLoaded) return;
          this._state.position = status.positionMillis ?? 0;
          this._state.duration = (status as any).durationMillis ?? 0;
          this._state.isPlaying = status.isPlaying ?? false;
          if ((status as any).didJustFinish) {
            this._onFinish();
          } else {
            this._emit();
          }
        },
      );
      this._sound = sound;
      this._state.isPlaying = true;
      this._emit();
    } catch {
      this._state.isPlaying = false;
      this._emit();
    } finally {
      this._loading = false;
    }
  }

  async playPause(): Promise<void> {
    if (!this._sound) {
      if (this._state.currentIndex !== null) {
        await this.loadAndPlay(this._state.currentIndex);
      }
      return;
    }
    try {
      const status = await this._sound.getStatusAsync();
      if (!status.isLoaded) return;
      if (status.isPlaying) await this._sound.pauseAsync();
      else await this._sound.playAsync();
    } catch {}
  }

  async playNext(): Promise<void> {
    const { tracks, currentIndex, shuffle } = this._state;
    if (tracks.length === 0) return;
    const ci = currentIndex ?? 0;
    if (shuffle) {
      this._shufflePos = (this._shufflePos + 1) % Math.max(1, this._shuffleOrder.length);
      await this.loadAndPlay(this._shuffleOrder[this._shufflePos] ?? 0);
    } else {
      await this.loadAndPlay((ci + 1) % tracks.length);
    }
  }

  async playPrev(): Promise<void> {
    const { tracks, currentIndex } = this._state;
    if (tracks.length === 0) return;
    if (this._state.position > 3000) {
      await this._sound?.setPositionAsync(0);
      return;
    }
    const ci = currentIndex ?? 0;
    await this.loadAndPlay((ci - 1 + tracks.length) % tracks.length);
  }

  async seekTo(ratio: number): Promise<void> {
    if (!this._sound || this._state.duration === 0) return;
    const ms = Math.floor(ratio * this._state.duration);
    await this._sound.setPositionAsync(ms);
    this._state.position = ms;
    this._emit();
  }

  toggleShuffle(): void {
    this._state.shuffle = !this._state.shuffle;
    if (this._state.shuffle) this._buildShuffleOrder(this._state.tracks.length);
    this._emit();
  }

  toggleRepeat(): void {
    const r = this._state.repeat;
    this._state.repeat = r === "none" ? "all" : r === "all" ? "one" : "none";
    this._emit();
  }

  tapTrack(index: number): void {
    if (this._state.shuffle && this._shuffleOrder.length !== this._state.tracks.length) {
      this._buildShuffleOrder(this._state.tracks.length);
    }
    this.loadAndPlay(index);
  }
}

export const afuMusicPlayer = new AfuMusicPlayerSingleton();
