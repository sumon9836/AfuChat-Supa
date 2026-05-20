import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { AppState, AppStateStatus, Platform } from "react-native";

import { IncomingCallModal } from "@/components/IncomingCallModal";
import { useAuth } from "@/context/AuthContext";
import {
  CallRecord,
  listenForIncomingCalls,
  updateCallStatus,
} from "@/lib/callSignaling";
import {
  displayIncomingCall,
  endCallkeepCall,
  initCallkeep,
  isCallkeepAvailable,
  reportCallEnded,
  setupCallkeepListeners,
} from "@/lib/calling/callkeepBridge";

let _activeCallId: string | null = null;

export function setActiveCallId(id: string | null) {
  _activeCallId = id;
}

export function CallManager() {
  const { user } = useAuth();
  const [incomingCall, setIncomingCall] = useState<CallRecord | null>(null);
  const pendingCallIdRef = useRef<string | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const ckInitRef = useRef(false);

  useEffect(() => {
    if (Platform.OS !== "android" || ckInitRef.current) return;
    ckInitRef.current = true;

    initCallkeep().then((ok) => {
      if (!ok) return;

      const cleanup = setupCallkeepListeners({
        onAnswerCall: (callUUID) => {
          const call = pendingCallIdRef.current;
          if (call === callUUID) {
            setIncomingCall(null);
            router.push({ pathname: "/call/[id]", params: { id: callUUID } });
          }
        },
        onEndCall: (callUUID) => {
          if (pendingCallIdRef.current === callUUID) {
            updateCallStatus(callUUID, "declined").catch(() => {});
            setIncomingCall(null);
            pendingCallIdRef.current = null;
          }
        },
        onToggleMute: () => {},
      });

      return cleanup;
    });
  }, []);

  useEffect(() => {
    if (!user) return;

    const unsubscribe = listenForIncomingCalls(user.id, (call) => {
      if (pendingCallIdRef.current === call.id) return;
      if (_activeCallId) return;

      pendingCallIdRef.current = call.id;

      if (Platform.OS === "android" && isCallkeepAvailable()) {
        const callerName = call.caller?.display_name || "Unknown";
        displayIncomingCall(call.id, callerName, call.call_type === "video");
      } else {
        setIncomingCall(call);
      }
    });

    return () => unsubscribe();
  }, [user?.id]);

  useEffect(() => {
    if (Platform.OS === "web") return;

    const sub = AppState.addEventListener("change", (nextState: AppStateStatus) => {
      const prev = appStateRef.current;
      appStateRef.current = nextState;

      if (nextState === "background" && prev === "active") {
        const call = incomingCall;
        if (!call) return;

        if (_activeCallId !== call.id) {
          if (Platform.OS === "android" && isCallkeepAvailable()) {
            reportCallEnded(call.id, 3);
          }
          updateCallStatus(call.id, "missed").catch(() => {});
          setIncomingCall(null);
          pendingCallIdRef.current = null;
        }
      }
    });

    return () => sub.remove();
  }, [incomingCall]);

  function handleDismiss() {
    const id = incomingCall?.id;
    if (id && Platform.OS === "android" && isCallkeepAvailable()) {
      endCallkeepCall(id);
    }
    pendingCallIdRef.current = null;
    setIncomingCall(null);
  }

  return <IncomingCallModal call={incomingCall} onDismiss={handleDismiss} />;
}
