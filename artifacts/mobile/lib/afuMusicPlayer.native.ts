/**
 * AfuMusic — native music player singleton backed by react-native-track-player.
 *
 * NEVER add a static `import … from "react-native-track-player"` to this file.
 * The native module is absent in Expo Go — any static import throws an
 * uncatchable native exception before any JS runs.  We guard with
 * NativeModules.TrackPlayerModule (always safe) and lazy-require only when
 * the native module is confirmed present.
 */

import { NativeModules } from "react-native";
import type * as MediaLibraryTypes from "expo-media-library";
import { getMetaSync } from "./musicMetadata";

export type RepeatMode = "none" | "one" | "all";

export type MusicPlayerState = {
  tracks: MediaLibraryTypes.Asset[];
  currentIndex: number | null;
  isPlaying: boolean;
  position: number;    // ms
  duration: number;    // ms
  shuffle: boolean;
  repeat: RepeatMode;
  rate: number;                    // playback speed (0.5–2.0)
  sleepTimerEnd: number | null;    // unix timestamp ms when timer fires; null = off
  queueMap: number[];              // track indices in current play order
  unavailable?: boolean;
};

type Listener = (state: MusicPlayerState) => void;

// ── Lazy RNTP loader ──────────────────────────────────────────────────────────

let TrackPlayer: any = null;
let Event: any = {};
let RNTPRepeatMode: any = { Off: 0, Track: 1, Queue: 2 };
let State: any = { Playing: "playing", Buffering: "buffering" };
let Capability: any = {};
let AppKilledPlaybackBehavior: any = {};
let rntpAvailable = false;

if (NativeModules.TrackPlayerModule) {
  try {
    const rntp = require("react-native-track-player");
    TrackPlayer = rntp.default ?? rntp;
    Event = rntp.Event ?? {};
    RNTPRepeatMode = rntp.RepeatMode ?? RNTPRepeatMode;
    State = rntp.State ?? State;
    Capability = rntp.Capability ?? {};
    AppKilledPlaybackBehavior = rntp.AppKilledPlaybackBehavior ?? {};
    rntpAvailable = true;
  } catch {
    rntpAvailable = false;
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function displayTitle(filename: string): string {
  return filename.replace(/\.[^.]+$/, "").replace(/[_-]/g, " ").trim();
}

function displayArtist(filename: string): string {
  const parts = filename.split(/[-–]/);
  return parts.length >= 2 ? parts[0].trim() : "Unknown Artist";
}

// ── Singleton ─────────────────────────────────────────────────────────────────

class AfuMusicPlayerSingleton {
  private _state: MusicPlayerState = {
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
    unavailable: !rntpAvailable,
  };
  private _listeners = new Set<Listener>();

  private _queueMap: number[] = [];
  private _ready = false;
  private _setupPromise: Promise<void> | null = null;
  private _sleepTimerTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor() {}

  // ── Setup ──────────────────────────────────────────────────────────────────

  private async _setup(): Promise<void> {
    try {
      await TrackPlayer.setupPlayer({ progressUpdateEventInterval: 1 });
    } catch {
      // Already set up on hot reload — safe to ignore
    }

    try {
      await TrackPlayer.updateOptions({
        android: {
          appKilledPlaybackBehavior: AppKilledPlaybackBehavior.ContinuePlayback,
        },
        capabilities: [
          Capability.Play,
          Capability.Pause,
          Capability.SkipToNext,
          Capability.SkipToPrevious,
          Capability.SeekTo,
          Capability.Stop,
        ],
        compactCapabilities: [
          Capability.Play,
          Capability.Pause,
          Capability.SkipToNext,
        ],
        notificationCapabilities: [
          Capability.Play,
          Capability.Pause,
          Capability.SkipToNext,
          Capability.SkipToPrevious,
          Capability.SeekTo,
        ],
        progressUpdateEventInterval: 1,
      });
    } catch {}

    this._ready = true;
    this._registerEventListeners();
  }

  private async _ensureReady(): Promise<void> {
    if (!rntpAvailable) return;
    if (this._ready) return;
    if (!this._setupPromise) this._setupPromise = this._setup();
    await this._setupPromise;
  }

  // ── RNTP event listeners ───────────────────────────────────────────────────

  private _registerEventListeners(): void {
    if (!rntpAvailable) return;

    TrackPlayer.addEventListener(Event.PlaybackActiveTrackChanged, (e: any) => {
      const qIdx = e.index;
      if (qIdx !== undefined && qIdx !== null) {
        const originalIdx = this._queueMap[qIdx];
        if (originalIdx !== undefined) this._state.currentIndex = originalIdx;
      } else {
        this._state.currentIndex = null;
        this._state.isPlaying = false;
      }
      this._emit();
    });

    TrackPlayer.addEventListener(Event.PlaybackState, (e: any) => {
      const playing = e.state === State.Playing || e.state === State.Buffering;
      if (this._state.isPlaying !== playing) {
        this._state.isPlaying = playing;
        this._emit();
      }
    });

    TrackPlayer.addEventListener(Event.PlaybackProgressUpdated, (e: any) => {
      this._state.position = (e.position ?? 0) * 1000;
      this._state.duration = (e.duration ?? 0) * 1000;
      this._emit();
    });

    TrackPlayer.addEventListener(Event.PlaybackError, () => {
      this._state.isPlaying = false;
      this._emit();
    });
  }

  // ── Subscription ──────────────────────────────────────────────────────────

  subscribe(listener: Listener): () => void {
    this._listeners.add(listener);
    listener({ ...this._state });
    return () => this._listeners.delete(listener);
  }

  private _emit(): void {
    const snap = { ...this._state };
    this._listeners.forEach((l) => { try { l(snap); } catch {} });
  }

  getState(): MusicPlayerState {
    return { ...this._state };
  }

  // ── Track list management ─────────────────────────────────────────────────

  setTracks(tracks: MediaLibraryTypes.Asset[]): void {
    this._state.tracks = tracks;
    this._emit();
  }

  appendTracks(tracks: MediaLibraryTypes.Asset[]): void {
    this._state.tracks = [...this._state.tracks, ...tracks];
    this._emit();
  }

  clearTracks(): void {
    this._state.tracks = [];
    this._emit();
  }

  // ── RNTP queue helpers ────────────────────────────────────────────────────

  private _toRntpTrack(asset: MediaLibraryTypes.Asset) {
    // Use enriched MusicBrainz metadata when already cached; fall back to
    // filename-parsed values so the lock screen always shows something useful.
    const meta = getMetaSync(asset.filename);
    return {
      url: asset.uri,
      title: meta?.title ?? displayTitle(asset.filename),
      artist: meta?.artist ?? displayArtist(asset.filename),
      album: meta?.album ?? undefined,
      duration: asset.duration,
      // App icon shown on Android lock screen, notification, and Bluetooth AVRCP.
      artwork: require("../assets/images/icon.png"),
    };
  }

  /**
   * Update the RNTP queue entry for a track in-place so the lock screen
   * reflects real MusicBrainz metadata without interrupting playback.
   * Called by the UI whenever the metadata service returns enriched data.
   */
  async updateTrackMeta(
    trackIndex: number,
    meta: { title: string | null; artist: string | null; album: string | null }
  ): Promise<void> {
    if (!rntpAvailable) return;
    try {
      await this._ensureReady();
      const queuePos = this._queueMap.indexOf(trackIndex);
      if (queuePos < 0) return; // track not in current queue
      await TrackPlayer.updateMetadataForTrack(queuePos, {
        title: meta.title ?? undefined,
        artist: meta.artist ?? undefined,
        album: meta.album ?? undefined,
      });
    } catch {
      // Ignore — method may not exist in older RNTP builds; lock screen falls
      // back to the values baked into the queue at load time.
    }
  }

  private async _buildAndSetQueue(order: number[]): Promise<void> {
    if (!rntpAvailable) return;
    const { tracks } = this._state;
    this._queueMap = [...order];
    this._state.queueMap = [...order];
    const rntpTracks = order.map((i) => this._toRntpTrack(tracks[i]));
    await TrackPlayer.setQueue(rntpTracks);
  }

  // ── Shuffle helper ────────────────────────────────────────────────────────

  private _shuffledOrder(length: number, startWith?: number): number[] {
    const indices = Array.from({ length }, (_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    if (startWith !== undefined && startWith >= 0 && startWith < length) {
      const pos = indices.indexOf(startWith);
      if (pos > 0) { indices.splice(pos, 1); indices.unshift(startWith); }
    }
    return indices;
  }

  // ── Core playback ─────────────────────────────────────────────────────────

  async loadAndPlay(index: number): Promise<void> {
    if (!rntpAvailable) return;
    try {
      await this._ensureReady();
      const { tracks, shuffle } = this._state;
      if (index < 0 || index >= tracks.length) return;

      const order = shuffle
        ? this._shuffledOrder(tracks.length, index)
        : Array.from({ length: tracks.length }, (_, i) => i);

      await this._buildAndSetQueue(order);
      await this._applyRepeatMode(this._state.repeat);

      const queuePos = order.indexOf(index);
      await TrackPlayer.skip(Math.max(0, queuePos));
      await TrackPlayer.play();

      // Re-apply speed — RNTP may reset rate to 1.0 after setQueue/skip
      if (this._state.rate !== 1.0) {
        await TrackPlayer.setRate(this._state.rate).catch(() => {});
      }

      this._state.currentIndex = index;
      this._state.isPlaying = true;
      this._state.position = 0;
      this._emit();
    } catch (e) {
      console.warn("[AfuMusic] loadAndPlay error:", e);
    }
  }

  async playPause(): Promise<void> {
    if (!rntpAvailable) return;
    try {
      await this._ensureReady();
      if (this._state.isPlaying) {
        await TrackPlayer.pause();
      } else {
        if (this._state.currentIndex === null && this._state.tracks.length > 0) {
          await this.loadAndPlay(0);
          return;
        }
        await TrackPlayer.play();
      }
    } catch (e) {
      console.warn("[AfuMusic] playPause error:", e);
    }
  }

  async playNext(): Promise<void> {
    if (!rntpAvailable) return;
    try {
      await this._ensureReady();
      await TrackPlayer.skipToNext().catch(() => {});
    } catch (e) {
      console.warn("[AfuMusic] playNext error:", e);
    }
  }

  async playPrev(): Promise<void> {
    if (!rntpAvailable) return;
    try {
      await this._ensureReady();
      if (this._state.position > 3000) {
        await TrackPlayer.seekTo(0);
        return;
      }
      await TrackPlayer.skipToPrevious().catch(() => {});
    } catch (e) {
      console.warn("[AfuMusic] playPrev error:", e);
    }
  }

  async seekTo(ratio: number): Promise<void> {
    if (!rntpAvailable) return;
    try {
      await this._ensureReady();
      if (this._state.duration === 0) return;
      const seconds = ratio * (this._state.duration / 1000);
      await TrackPlayer.seekTo(seconds);
      this._state.position = ratio * this._state.duration;
      this._emit();
    } catch (e) {
      console.warn("[AfuMusic] seekTo error:", e);
    }
  }

  // ── Playback speed ────────────────────────────────────────────────────────

  async setRate(rate: number): Promise<void> {
    this._state.rate = rate;
    this._emit();
    if (!rntpAvailable) return;
    try {
      await this._ensureReady();
      await TrackPlayer.setRate(rate);
    } catch (e) {
      console.warn("[AfuMusic] setRate error:", e);
    }
  }

  // ── Sleep timer ───────────────────────────────────────────────────────────

  setSleepTimer(minutes: number | null): void {
    if (this._sleepTimerTimeout !== null) {
      clearTimeout(this._sleepTimerTimeout);
      this._sleepTimerTimeout = null;
    }
    if (minutes === null || minutes <= 0) {
      this._state.sleepTimerEnd = null;
      this._emit();
      return;
    }
    const ms = minutes * 60 * 1000;
    this._state.sleepTimerEnd = Date.now() + ms;
    this._sleepTimerTimeout = setTimeout(() => {
      this._sleepTimerTimeout = null;
      this._state.sleepTimerEnd = null;
      this._state.isPlaying = false;
      if (rntpAvailable) TrackPlayer.pause().catch(() => {});
      this._emit();
    }, ms);
    this._emit();
  }

  // ── Shuffle ───────────────────────────────────────────────────────────────

  toggleShuffle(): void {
    this._state.shuffle = !this._state.shuffle;
    if (!rntpAvailable) { this._emit(); return; }

    const { currentIndex, tracks } = this._state;
    if (tracks.length > 0 && this._queueMap.length > 0) {
      const wasPlaying = this._state.isPlaying;
      const order = this._state.shuffle
        ? this._shuffledOrder(tracks.length, currentIndex ?? undefined)
        : Array.from({ length: tracks.length }, (_, i) => i);

      this._buildAndSetQueue(order)
        .then(async () => {
          if (currentIndex !== null) {
            const newPos = order.indexOf(currentIndex);
            if (newPos >= 0) {
              await TrackPlayer.skip(newPos);
              if (wasPlaying) await TrackPlayer.play();
            }
          }
        })
        .catch(() => {});
    }
    this._emit();
  }

  // ── Repeat ────────────────────────────────────────────────────────────────

  private async _applyRepeatMode(mode: RepeatMode): Promise<void> {
    if (!rntpAvailable) return;
    const rnMode =
      mode === "none" ? RNTPRepeatMode.Off
      : mode === "one" ? RNTPRepeatMode.Track
      : RNTPRepeatMode.Queue;
    await TrackPlayer.setRepeatMode(rnMode);
  }

  toggleRepeat(): void {
    const next: RepeatMode =
      this._state.repeat === "none" ? "all"
      : this._state.repeat === "all" ? "one"
      : "none";
    this._state.repeat = next;
    this._applyRepeatMode(next).catch(() => {});
    this._emit();
  }

  tapTrack(index: number): void {
    this.loadAndPlay(index).catch((e) => console.warn("[AfuMusic] tapTrack error:", e));
  }
}

export const afuMusicPlayer = new AfuMusicPlayerSingleton();
