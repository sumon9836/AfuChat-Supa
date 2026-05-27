/**
 * AfuMusic — react-native-track-player background playback service.
 *
 * This function is registered with TrackPlayer.registerPlaybackService() and
 * runs in a headless JS context on Android when the app is killed but the
 * media foreground service keeps music alive.  It handles all remote control
 * events: notification buttons, Bluetooth AVRCP commands, lock screen controls,
 * and audio focus changes (duck/resume for calls, other apps, etc.).
 */
import TrackPlayer, { Event } from "react-native-track-player";

export async function PlaybackService() {
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

  TrackPlayer.addEventListener(Event.RemoteSeek, ({ position }) => {
    TrackPlayer.seekTo(position);
  });

  TrackPlayer.addEventListener(Event.RemoteDuck, async ({ permanent, paused }) => {
    if (permanent) {
      await TrackPlayer.pause();
    } else if (paused) {
      await TrackPlayer.pause();
    } else {
      await TrackPlayer.play();
    }
  });

  TrackPlayer.addEventListener(Event.RemoteJumpForward, async ({ interval }) => {
    const progress = await TrackPlayer.getProgress();
    await TrackPlayer.seekTo(Math.min(progress.position + (interval ?? 10), progress.duration));
  });

  TrackPlayer.addEventListener(Event.RemoteJumpBackward, async ({ interval }) => {
    const progress = await TrackPlayer.getProgress();
    await TrackPlayer.seekTo(Math.max(progress.position - (interval ?? 10), 0));
  });
}
