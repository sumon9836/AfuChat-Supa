import React, { useEffect } from "react";
import { VideoView, useVideoPlayer } from "expo-video";
import type { StyleProp, ViewStyle } from "react-native";

type ContentFit = "contain" | "cover" | "fill";

interface VideoPreviewProps {
  uri: string;
  style?: StyleProp<ViewStyle>;
  contentFit?: ContentFit;
  shouldPlay?: boolean;
  isLooping?: boolean;
  isMuted?: boolean;
  nativeControls?: boolean;
}

export default function VideoPreview({
  uri,
  style,
  contentFit = "cover",
  shouldPlay = true,
  isLooping = true,
  isMuted = false,
  nativeControls = false,
}: VideoPreviewProps) {
  const player = useVideoPlayer(uri ? { uri } : null, (p) => {
    p.loop = isLooping;
    p.muted = isMuted;
    if (shouldPlay) p.play();
  });

  useEffect(() => {
    if (!uri) return;
    player.replace({ uri });
    player.loop = isLooping;
    player.muted = isMuted;
    if (shouldPlay) player.play(); else player.pause();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uri]);

  useEffect(() => {
    if (shouldPlay) player.play(); else player.pause();
  }, [shouldPlay]);

  useEffect(() => { player.muted = isMuted; }, [isMuted]);
  useEffect(() => { player.loop = isLooping; }, [isLooping]);

  return (
    <VideoView
      player={player}
      style={style}
      contentFit={contentFit}
      nativeControls={nativeControls}
    />
  );
}
