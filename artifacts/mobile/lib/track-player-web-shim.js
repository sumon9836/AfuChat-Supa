'use strict';
/**
 * Web shim for react-native-track-player.
 *
 * react-native-track-player's web implementation imports shaka-player which
 * is not installed in this project. On web the Music mini-app is either hidden
 * or uses a native HTML5 Audio element, so the full TrackPlayer API is not
 * needed. This shim replaces the entire library on web with safe no-op
 * implementations so Metro can bundle without resolving shaka-player.
 */

const State = {
  None: 'none',
  Ready: 'ready',
  Playing: 'playing',
  Paused: 'paused',
  Stopped: 'stopped',
  Buffering: 'buffering',
  Loading: 'loading',
  Error: 'error',
  Ended: 'ended',
};

const Event = {
  PlaybackState: 'playback-state',
  PlaybackError: 'playback-error',
  PlaybackQueueEnded: 'playback-queue-ended',
  PlaybackActiveTrackChanged: 'playback-active-track-changed',
  PlaybackProgressUpdated: 'playback-progress-updated',
  RemotePlay: 'remote-play',
  RemotePause: 'remote-pause',
  RemoteStop: 'remote-stop',
  RemoteSkip: 'remote-skip',
  RemoteNext: 'remote-next',
  RemotePrevious: 'remote-previous',
  RemoteSeek: 'remote-seek',
  RemoteJumpForward: 'remote-jump-forward',
  RemoteJumpBackward: 'remote-jump-backward',
  RemoteDuck: 'remote-duck',
  RemoteLike: 'remote-like',
  RemoteBookmark: 'remote-bookmark',
  RemotePlayId: 'remote-play-id',
  RemotePlaySearch: 'remote-play-search',
  RemoteSetRating: 'remote-set-rating',
  RemoteTransferPlayback: 'remote-transfer-playback',
  MetadataCommonReceived: 'metadata-common-received',
  MetadataId3Received: 'metadata-id3-received',
  MetadataIcy: 'metadata-icy',
  MetadataVorbis: 'metadata-vorbis',
};

const RepeatMode = { Off: 0, Track: 1, Queue: 2 };
const Capability = { Play: 0, Pause: 1, Stop: 2, SeekTo: 3, Skip: 4, SkipToNext: 5, SkipToPrevious: 6, JumpForward: 7, JumpBackward: 8, SetRating: 9, Like: 10, Dislike: 11, Bookmark: 12 };
const RatingType = { Heart: 0, ThumbsUpDown: 1, ThreeStars: 2, FourStars: 3, FiveStars: 4, Percentage: 5 };
const PitchAlgorithm = { Linear: 0, Music: 1, Voice: 2 };
const AppKilledPlaybackBehavior = { Default: 'default', ContinuePlayback: 'continue-playback', PausePlayback: 'pause-playback', StopPlaybackAndRemoveNotification: 'stop-playback-and-remove-notification' };
const IOSCategoryMode = {};
const IOSCategory = {};
const IOSCategoryOptions = {};

const noop = () => {};
const noopAsync = async () => {};
const noopAsyncNull = async () => null;
const noopAsyncZero = async () => 0;
const noopAsyncArr = async () => [];

const TrackPlayer = {
  setupPlayer: noopAsync,
  destroy: noopAsync,
  updateOptions: noopAsync,
  play: noopAsync,
  pause: noopAsync,
  stop: noopAsync,
  reset: noopAsync,
  add: noopAsync,
  remove: noopAsync,
  removeUpcomingTracks: noopAsync,
  skip: noopAsync,
  skipToNext: noopAsync,
  skipToPrevious: noopAsync,
  seekTo: noopAsync,
  seekBy: noopAsync,
  setVolume: noopAsync,
  setRate: noopAsync,
  setRepeatMode: noopAsync,
  setPlayWhenReady: noopAsync,
  getVolume: noopAsyncZero,
  getRate: async () => 1,
  getTrack: noopAsyncNull,
  getQueue: noopAsyncArr,
  getActiveTrack: noopAsyncNull,
  getActiveTrackIndex: noopAsyncNull,
  getProgress: async () => ({ position: 0, duration: 0, buffered: 0 }),
  getPlaybackState: async () => ({ state: State.None }),
  getRepeatMode: async () => RepeatMode.Off,
  getPlayWhenReady: async () => false,
  load: noopAsync,
  addEventListener: (event, handler) => ({ remove: noop }),
  registerPlaybackService: noop,
  updateMetadataForTrack: noopAsync,
  clearNowPlayingMetadata: noopAsync,
  updateNowPlayingMetadata: noopAsync,
  retry: noopAsync,
  move: noopAsync,
};

// Hooks (no-ops for web)
function useProgress() { return { position: 0, duration: 0, buffered: 0 }; }
function usePlaybackState() { return { state: State.None }; }
function useActiveTrack() { return null; }
function useQueue() { return []; }
function useActiveTrackIndex() { return null; }
function useIsPlaying() { return { playing: false, bufferingDuringPlay: false }; }
function useVolume() { return 0; }
function useRate() { return 1; }
function useRepeatMode() { return RepeatMode.Off; }
function usePlayWhenReady() { return false; }
function useTrackPlayerEvents(events, handler) {}

module.exports = {
  default: TrackPlayer,
  ...TrackPlayer,
  State,
  Event,
  RepeatMode,
  Capability,
  RatingType,
  PitchAlgorithm,
  AppKilledPlaybackBehavior,
  IOSCategoryMode,
  IOSCategory,
  IOSCategoryOptions,
  useProgress,
  usePlaybackState,
  useActiveTrack,
  useQueue,
  useActiveTrackIndex,
  useIsPlaying,
  useVolume,
  useRate,
  useRepeatMode,
  usePlayWhenReady,
  useTrackPlayerEvents,
};
