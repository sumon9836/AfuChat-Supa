/**
 * AfuMusic — Android notification-bar media player controls.
 *
 * Shows an ongoing (non-dismissable) notification with ⏮ / ▶⏸ / ⏭ action
 * buttons while music is playing.  Notification responses are dispatched
 * through the global notificationActions handler.
 *
 * Only active on Android; all calls are no-ops on iOS / web.
 */

import { Platform } from "react-native";
import type { MusicPlayerState } from "./afuMusicPlayer";

const IS_ANDROID = Platform.OS === "android";

let Notifications: typeof import("expo-notifications") | null = null;
if (IS_ANDROID) {
  try { Notifications = require("expo-notifications"); } catch {}
}

export const MUSIC_CHANNEL_ID = "afuchat_music_player";
export const MUSIC_CATEGORY_ID = "afu_music_player";
export const MUSIC_NOTIF_IDENTIFIER = "afu_music_now_playing";

let _channelReady = false;
let _categoryReady = false;
let _activeId: string | null = null;

async function ensureChannel() {
  if (_channelReady || !Notifications) return;
  try {
    await Notifications.setNotificationChannelAsync(MUSIC_CHANNEL_ID, {
      name: "AfuMusic – Now Playing",
      importance: Notifications.AndroidImportance.LOW,
      showBadge: false,
      sound: null,
      enableVibrate: false,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
    _channelReady = true;
  } catch {}
}

async function ensureCategory() {
  if (_categoryReady || !Notifications) return;
  try {
    await Notifications.setNotificationCategoryAsync(MUSIC_CATEGORY_ID, [
      {
        identifier: "music_prev",
        buttonTitle: "⏮",
        options: { opensAppToForeground: false },
      },
      {
        identifier: "music_toggle",
        buttonTitle: "⏯",
        options: { opensAppToForeground: false },
      },
      {
        identifier: "music_next",
        buttonTitle: "⏭",
        options: { opensAppToForeground: false },
      },
    ]);
    _categoryReady = true;
  } catch {}
}

export async function initMusicNotification() {
  if (!IS_ANDROID || !Notifications) return;
  await ensureChannel();
  await ensureCategory();
}

function trackDisplayTitle(filename: string): string {
  return filename.replace(/\.[^.]+$/, "").replace(/[_-]/g, " ").trim();
}

export async function updateMusicNotification(state: MusicPlayerState): Promise<void> {
  if (!IS_ANDROID || !Notifications) return;

  const { currentIndex, tracks, isPlaying } = state;

  if (currentIndex === null || tracks.length === 0) {
    await dismissMusicNotification();
    return;
  }

  await ensureChannel();
  await ensureCategory();

  const track = tracks[currentIndex];
  const title = trackDisplayTitle(track.filename);
  const playIcon = isPlaying ? "⏸" : "▶";

  try {
    if (_activeId) {
      await Notifications!.dismissNotificationAsync(_activeId).catch(() => {});
      _activeId = null;
    }

    const id = await Notifications!.scheduleNotificationAsync({
      identifier: MUSIC_NOTIF_IDENTIFIER,
      content: {
        title,
        body: `AfuMusic  ${playIcon}`,
        categoryIdentifier: MUSIC_CATEGORY_ID,
        data: {
          type: "music_player",
          isPlaying: String(isPlaying),
          trackIndex: String(currentIndex),
        },
        sound: undefined,
        badge: undefined,
      } as any,
      trigger: null,
    });
    _activeId = id;
  } catch {}
}

export async function dismissMusicNotification(): Promise<void> {
  if (!IS_ANDROID || !Notifications) return;
  try {
    if (_activeId) {
      await Notifications!.dismissNotificationAsync(_activeId).catch(() => {});
      _activeId = null;
    }
    await Notifications!.dismissNotificationAsync(MUSIC_NOTIF_IDENTIFIER).catch(() => {});
  } catch {}
}
