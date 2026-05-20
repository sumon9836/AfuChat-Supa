/**
 * callkeepBridge.ts — wraps react-native-callkeep for native Android call management.
 *
 * Integrates with Android's TelecomManager / ConnectionService (selfManaged mode):
 *   • Native lock-screen call UI when a call arrives
 *   • Proper Bluetooth / earpiece / speaker audio routing
 *   • Call persists in the background
 *   • Answer / decline from the native Android call screen
 *
 * All APIs are no-ops on iOS and web (those platforms are handled separately).
 */

import { Platform } from "react-native";

export interface CallkeepCallbacks {
  onAnswerCall: (callUUID: string) => void;
  onEndCall: (callUUID: string) => void;
  onToggleMute: (muted: boolean, callUUID: string) => void;
}

let _ck: any = null;
let _initialized = false;
let _listenersActive = false;

function ck(): any | null {
  if (Platform.OS !== "android") return null;
  if (!_ck) {
    try {
      _ck = require("react-native-callkeep").default;
    } catch {
      return null;
    }
  }
  return _ck;
}

export async function initCallkeep(): Promise<boolean> {
  const mod = ck();
  if (!mod || _initialized) return _initialized;
  try {
    await mod.setup({
      android: {
        alertTitle: "Phone account permission",
        alertDescription:
          "AfuChat needs phone-account permission to make and receive calls.",
        cancelButton: "Cancel",
        okButton: "Grant",
        additionalPermissions: [],
        selfManaged: true,
      },
    });
    _initialized = true;
    return true;
  } catch (e) {
    console.warn("[callkeep] setup failed:", e);
    return false;
  }
}

export function setupCallkeepListeners(cbs: CallkeepCallbacks): () => void {
  const mod = ck();
  if (!mod) return () => {};

  if (_listenersActive) _removeListeners(mod);
  _listenersActive = true;

  mod.addEventListener("answerCall", ({ callUUID }: any) =>
    cbs.onAnswerCall(callUUID)
  );
  mod.addEventListener("endCall", ({ callUUID }: any) =>
    cbs.onEndCall(callUUID)
  );
  mod.addEventListener(
    "didPerformSetMutedCallAction",
    ({ muted, callUUID }: any) => cbs.onToggleMute(muted, callUUID)
  );

  return () => _removeListeners(mod);
}

function _removeListeners(mod: any) {
  try {
    mod.removeEventListener("answerCall");
    mod.removeEventListener("endCall");
    mod.removeEventListener("didPerformSetMutedCallAction");
  } catch {}
  _listenersActive = false;
}

export function displayIncomingCall(
  callUUID: string,
  callerName: string,
  isVideo: boolean
) {
  try {
    ck()?.displayIncomingCall(
      callUUID,
      callerName,
      callerName,
      isVideo ? "video" : "generic",
      isVideo
    );
  } catch (e) {
    console.warn("[callkeep] displayIncomingCall:", e);
  }
}

export function startOutgoingCall(
  callUUID: string,
  callerName: string,
  isVideo: boolean
) {
  try {
    ck()?.startCall(
      callUUID,
      callerName,
      callerName,
      isVideo ? "video" : "generic",
      isVideo
    );
  } catch {}
}

export function reportCallConnected(callUUID: string) {
  try {
    ck()?.reportConnectedOutgoingCallWithUUID(callUUID);
  } catch {}
}

export function reportCallEnded(callUUID: string, reason = 6) {
  try {
    ck()?.reportEndCallWithUUID(callUUID, reason);
  } catch {}
}

export function endCallkeepCall(callUUID: string) {
  try {
    ck()?.endCall(callUUID);
  } catch {}
}

export function setCallkeepMuted(callUUID: string, muted: boolean) {
  try {
    ck()?.setMutedCall(callUUID, muted);
  } catch {}
}

export function setCallkeepSpeaker(callUUID: string, speaker: boolean) {
  try {
    ck()?.toggleAudioRouteSpeaker(callUUID, speaker);
  } catch {}
}

export function isCallkeepAvailable(): boolean {
  return Platform.OS === "android" && _initialized && !!ck();
}
