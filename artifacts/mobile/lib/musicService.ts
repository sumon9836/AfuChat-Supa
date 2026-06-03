/**
 * AfuMusic — react-native-track-player background playback service.
 *
 * This function is registered with TrackPlayer.registerPlaybackService() and
 * runs in a headless JS context on Android when the app is killed but the
 * media foreground service keeps music alive.  It handles all remote control
 * events: notification buttons, Bluetooth AVRCP commands, lock screen controls,
 * and audio focus changes (duck/resume for calls, other apps, etc.).
 */
/**
 * IMPORTANT: Do NOT add a static `import … from "react-native-track-player"` here.
 * This file is required at runtime inside a try/catch in _layout.tsx.  A static
 * import would be hoisted and evaluated when the module loads — crashing Expo Go
 * (and any build without the native module) with an uncatchable native exception.
 * Always use lazy require() inside the function body instead.
 */

export async function PlaybackService() {
  const rntp = require("react-native-track-player");
  const TrackPlayer: any = rntp.default ?? rntp;
  const Event: any = rntp.Event ?? {};

  TrackPlayer.addEventListener(Event.RemotePlay, () => {
    TrackPlayer.play();
  });

  TrackPlayer.addEventListener(Event.RemotePause, () => {
    TrackPlayer.pause();
  });

  TrackPlayer.addEventListener(Event.RemoteStop, () => {
    TrackPlayer.stop();
  });

  TrackPlayer.addEventListener(Event.RemoteNext, () => {
    TrackPlayer.skipToNext().catch(() => {});
  });

  TrackPlayer.addEventListener(Event.RemotePrevious, () => {
    TrackPlayer.skipToPrevious().catch(() => {});
  });

  TrackPlayer.addEventListener(Event.RemoteSeek, ({ position }: { position: number }) => {
    TrackPlayer.seekTo(position);
  });

  TrackPlayer.addEventListener(Event.RemoteDuck, async ({ permanent, paused }: { permanent: boolean; paused: boolean }) => {
    if (permanent) {
      await TrackPlayer.pause();
    } else if (paused) {
      await TrackPlayer.pause();
    } else {
      await TrackPlayer.play();
    }
  });

  TrackPlayer.addEventListener(Event.RemoteJumpForward, async ({ interval }: { interval?: number }) => {
    const progress = await TrackPlayer.getProgress();
    await TrackPlayer.seekTo(Math.min(progress.position + (interval ?? 10), progress.duration));
  });

  TrackPlayer.addEventListener(Event.RemoteJumpBackward, async ({ interval }: { interval?: number }) => {
    const progress = await TrackPlayer.getProgress();
    await TrackPlayer.seekTo(Math.max(progress.position - (interval ?? 10), 0));
  });
}
