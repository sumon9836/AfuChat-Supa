/**
 * AfuMusic — native music player singleton backed by react-native-track-player.
 *
 * react-native-track-player (RNTP) provides:
 *  • Android MediaStyle notification — progress bar, artwork, track info
 *  • iOS Now Playing / Control Centre integration
 *  • Bluetooth AVRCP control (headphones, car audio, speakers)
 *  • Background foreground service — music keeps playing after app is killed
 *  • Lock-screen controls
 *
 * This singleton maintains the same public API as the old expo-av singleton so
 * the AfuMusicApp UI component requires zero changes.  Metro automatically
 * picks this file over afuMusicPlayer.web.ts on Android/iOS builds, keeping
 * react-native-track-player out of the web bundle.
 */

import TrackPlayer, {
  Event,
  RepeatMode as RNTPRepeatMode,
  State,
  Capability,
  AppKilledPlaybackBehavior,
} from "react-native-track-player";
import type * as MediaLibraryTypes from "expo-media-library";

export type RepeatMode = "none" | "one" | "all";

export type MusicPlayerState = {
  tracks: MediaLibraryTypes.Asset[];
  currentIndex: number | null;
  isPlaying: boolean;
  position: number;  // milliseconds
  duration: number;  // milliseconds
  shuffle: boolean;
  repeat: RepeatMode;
};

type Listener = (state: MusicPlayerState) => void;

function displayTitle(filename: string): string {
  return filename.replace(/\.[^.]+$/, "").replace(/[_-]/g, " ").trim();
}

function displayArtist(filename: string): string {
  const parts = filename.split(/[-–]/);
  return parts.length >= 2 ? parts[0].trim() : "Unknown Artist";
}

class AfuMusicPlayerSingleton {
  private _state: MusicPlayerState = {
    tracks: [],
    currentIndex: null,
    isPlaying: false,
    position: 0,
    duration: 0,
    shuffle: false,
    repeat: "none",
  };
  private _listeners = new Set<Listener>();

  // _queueMap[queuePosition] = originalTrackIndex
  // Allows shuffle to reorder the RNTP queue while the UI still highlights
  // the correct row in the flat track list.
  private _queueMap: number[] = [];

  private _ready = false;
  private _setupPromise: Promise<void>;

  constructor() {
    this._setupPromise = this._setup();
  }

  // ── Setup ─────────────────────────────────────────────────────────────────

  private async _setup(): Promise<void> {
    try {
      await TrackPlayer.setupPlayer({
        progressUpdateEventInterval: 1, // seconds between progress events
      });
    } catch {
      // Already set up on a hot reload — ignore the "already initialized" error
    }

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

    this._ready = true;
    this._registerEventListeners();
  }

  private async _ensureReady(): Promise<void> {
    if (!this._ready) await this._setupPromise;
  }

  // ── RNTP event listeners ──────────────────────────────────────────────────

  private _registerEventListeners(): void {
    // Track changed — fires on auto-advance AND manual skip
    TrackPlayer.addEventListener(Event.PlaybackActiveTrackChanged, (e) => {
      const qIdx = e.index;
      if (qIdx !== undefined && qIdx !== null) {
        const originalIdx = this._queueMap[qIdx];
        if (originalIdx !== undefined) {
          this._state.currentIndex = originalIdx;
        }
      } else {
        // Queue ended
        this._state.currentIndex = null;
        this._state.isPlaying = false;
      }
      this._emit();
    });

    // Playback state — playing / paused / buffering / stopped
    TrackPlayer.addEventListener(Event.PlaybackState, (e) => {
      const playing = e.state === State.Playing || e.state === State.Buffering;
      if (this._state.isPlaying !== playing) {
        this._state.isPlaying = playing;
        this._emit();
      }
    });

    // Progress update — 1 Hz tick for position/duration display
    TrackPlayer.addEventListener(Event.PlaybackProgressUpdated, (e) => {
      this._state.position = (e.position ?? 0) * 1000;
      this._state.duration = (e.duration ?? 0) * 1000;
      this._emit();
    });

    // Error — reset playing state so the UI doesn't get stuck
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
    return {
      url: asset.uri,
      title: displayTitle(asset.filename),
      artist: displayArtist(asset.filename),
      duration: asset.duration,
      // artwork is intentionally omitted — RNTP falls back to the app icon
    };
  }

  private async _buildAndSetQueue(order: number[]): Promise<void> {
    const { tracks } = this._state;
    this._queueMap = [...order];
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
    // Put the seed track first so it plays immediately
    if (startWith !== undefined && startWith >= 0 && startWith < length) {
      const pos = indices.indexOf(startWith);
      if (pos > 0) {
        indices.splice(pos, 1);
        indices.unshift(startWith);
      }
    }
    return indices;
  }

  // ── Core playback ─────────────────────────────────────────────────────────

  async loadAndPlay(index: number): Promise<void> {
    await this._ensureReady();
    const { tracks, shuffle } = this._state;
    if (index < 0 || index >= tracks.length) return;

    // Build queue in correct playback order
    const order = shuffle
      ? this._shuffledOrder(tracks.length, index)
      : Array.from({ length: tracks.length }, (_, i) => i);

    await this._buildAndSetQueue(order);

    // Set RNTP repeat mode to match current setting
    await this._applyRepeatMode(this._state.repeat);

    const queuePos = order.indexOf(index);
    await TrackPlayer.skip(Math.max(0, queuePos));
    await TrackPlayer.play();

    this._state.currentIndex = index;
    this._state.isPlaying = true;
    this._state.position = 0;
    this._emit();
  }

  async playPause(): Promise<void> {
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
  }

  async playNext(): Promise<void> {
    await this._ensureReady();
    await TrackPlayer.skipToNext().catch(() => {});
  }

  async playPrev(): Promise<void> {
    await this._ensureReady();
    // If more than 3 s in, restart current track (standard music-app behaviour)
    if (this._state.position > 3000) {
      await TrackPlayer.seekTo(0);
      return;
    }
    await TrackPlayer.skipToPrevious().catch(() => {});
  }

  async seekTo(ratio: number): Promise<void> {
    await this._ensureReady();
    if (this._state.duration === 0) return;
    const seconds = ratio * (this._state.duration / 1000);
    await TrackPlayer.seekTo(seconds);
    this._state.position = ratio * this._state.duration;
    this._emit();
  }

  // ── Shuffle ───────────────────────────────────────────────────────────────

  toggleShuffle(): void {
    this._state.shuffle = !this._state.shuffle;
    const { currentIndex, tracks } = this._state;

    if (tracks.length > 0 && this._queueMap.length > 0) {
      const wasPlaying = this._state.isPlaying;
      const order = this._state.shuffle
        ? this._shuffledOrder(tracks.length, currentIndex ?? undefined)
        : Array.from({ length: tracks.length }, (_, i) => i);

      this._buildAndSetQueue(order)
        .then(async () => {
          // Restore position at the current track
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
    const rnMode =
      mode === "none"
        ? RNTPRepeatMode.Off
        : mode === "one"
          ? RNTPRepeatMode.Track
          : RNTPRepeatMode.Queue;
    await TrackPlayer.setRepeatMode(rnMode);
  }

  toggleRepeat(): void {
    const next: RepeatMode =
      this._state.repeat === "none"
        ? "all"
        : this._state.repeat === "all"
          ? "one"
          : "none";
    this._state.repeat = next;
    this._applyRepeatMode(next).catch(() => {});
    this._emit();
  }

  // ── Tap a track from the library list ────────────────────────────────────

  tapTrack(index: number): void {
    this.loadAndPlay(index);
  }
}

export const afuMusicPlayer = new AfuMusicPlayerSingleton();
