/**
 * VideoPlayerScreen — TikTok-style vertical video feed.
 *
 * Scroll architecture (why it works):
 *  1. pagingEnabled on FlatList — simplest, most reliable native snap.
 *  2. TapHandler uses react-native-gesture-handler's native Gesture API
 *     (GestureDetector + Gesture.Tap/LongPress). Running on the UI thread
 *     via JSI means zero JS negotiation — FlatList scroll starts the instant
 *     the finger moves, no "hard push" needed.
 *  3. getItemLayout uses stable window dimensions — never dynamic state.
 *  4. onViewableItemsChanged stored in a stable ref — FlatList never re-wires.
 *  5. windowSize=3, removeClippedSubviews=false so neighbours preload smoothly.
 */
import { showAlert } from "@/lib/alert";
import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Keyboard,
  Linking,
  Modal,
  Platform,
  Pressable,
  Share,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ViewToken,
  useWindowDimensions,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { Image as ExpoImage } from "expo-image";
import { LinearGradient } from "@/components/ui/SafeGradient";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { VideoView, useVideoPlayer } from "expo-video";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import * as MediaLibrary from "expo-media-library";
import { Gesture, GestureDetector } from "react-native-gesture-handler";

import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { Avatar } from "@/components/ui/Avatar";
import { useAppAccent } from "@/context/AppAccentContext";
import { useTheme } from "@/hooks/useTheme";
import { notifyPostLike, notifyPostReply } from "@/lib/notifyUser";
import { RichText } from "@/components/ui/RichText";
import { encodeId, decodeId, isUuid } from "@/lib/shortId";
import { getCachedVideoUri, cacheVideo, markVideoWatched } from "@/lib/videoCache";
import { onShortsRefresh } from "@/lib/shortsRefresh";
import { getLocalFeedPost } from "@/lib/storage/localFeed";
import { showActionToast as globalShowActionToast } from "@/lib/toast";
import { trackEvent } from "@/lib/activityTracker";
import { saveVideoProgress, clearVideoProgress } from "@/lib/videoProgress";
import { useResolvedVideoSource } from "@/hooks/useResolvedVideoSource";
import { getPostVideoManifest, pickBestSource } from "@/lib/videoApi";
import { getPreferredVideoHeight } from "@/lib/networkQuality";
import { ChatBubbleSkeleton, ShortsFeedSkeleton } from "@/components/ui/Skeleton";
import SignInPromptModal from "@/components/ui/SignInPromptModal";
import {
  computeFeedScore,
  getLearnedInterestBoosts,
  matchInterestsWeighted,
  diversifyFeed,
  getSeenVideoIds,
  markVideosSeen,
  weightedSample,
  extractHashtags,
  type FeedSignals,
} from "../../lib/feedAlgorithm";
import * as Haptics from "@/lib/haptics";
import { VideoCommentsSheet } from "@/components/ui/VideoCommentsSheet";
import { activateKeepAwakeAsync, deactivateKeepAwakeAsync } from "expo-keep-awake";

// ─── Constants ────────────────────────────────────────────────────────────────

const USE_NATIVE = Platform.OS !== "web";
const VIDEO_PAGE_SIZE = 50;
const VID_THREAD_COLORS = ["#1f95ff", "#5C6BC0", "#26A69A", "#EF6C00", "#8E24AA"];
const QUICK_EMOJIS = ["🔥", "❤️", "😂", "😮", "👏", "💯", "🙌", "😍"];
const SOCIAL_PLATFORMS = [
  { id: "whatsapp",  label: "WhatsApp",  icon: "logo-whatsapp",  color: "#25D366", scheme: (u: string) => `https://wa.me/?text=${encodeURIComponent(u)}` },
  { id: "twitter",   label: "X",         icon: "logo-twitter",   color: "#000",    scheme: (u: string) => `https://x.com/intent/tweet?text=${encodeURIComponent(u)}` },
  { id: "facebook",  label: "Facebook",  icon: "logo-facebook",  color: "#1877F2", scheme: (u: string) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(u)}` },
  { id: "instagram", label: "Instagram", icon: "logo-instagram", color: "#E1306C", scheme: (_: string) => `instagram://app` },
  { id: "copy",      label: "Copy link", icon: "link-outline",   color: "#8E8E93", scheme: null },
  { id: "more",      label: "More",      icon: "share-social",   color: "#1f95ff", scheme: null },
];

// ─── Types ────────────────────────────────────────────────────────────────────

type VideoPost = {
  id: string; author_id: string; content: string; video_url: string;
  image_url: string | null; created_at: string; view_count: number;
  audio_name: string | null;
  profile: { display_name: string; handle: string; avatar_url: string | null };
  liked: boolean; bookmarked: boolean; likeCount: number; replyCount: number;
};

// ─── Utilities ────────────────────────────────────────────────────────────────

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

// ─── GradientOverlay ──────────────────────────────────────────────────────────

const GRADIENT_BASE: any = { position: "absolute", left: 0, right: 0 };

function GradientOverlay({
  position,
  height,
}: {
  position: "top" | "bottom";
  height: number;
}) {
  const posStyle = position === "bottom" ? { bottom: 0 } : { top: 0 };
  if (Platform.OS === "web") {
    const gradient =
      position === "bottom"
        ? "linear-gradient(to top, rgba(0,0,0,0.88) 0%, transparent 100%)"
        : "linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, transparent 100%)";
    return (
      <View
        style={[GRADIENT_BASE, posStyle, { height, background: gradient, pointerEvents: "none" } as any]}
      />
    );
  }
  return (
    <LinearGradient
      colors={
        position === "bottom"
          ? ["transparent", "rgba(0,0,0,0.88)"]
          : ["rgba(0,0,0,0.55)", "transparent"]
      }
      style={[GRADIENT_BASE, posStyle, { height, pointerEvents: "none" } as any]}
    />
  );
}

// ─── TapHandler ───────────────────────────────────────────────────────────────
/**
 * Transparent layer that detects taps/double-taps/long-presses using
 * react-native-gesture-handler's native Gesture API.
 *
 * Running on the UI thread via JSI means this NEVER competes with the
 * FlatList's scroll gesture — the scroll starts the instant the finger
 * moves, with zero JS-thread negotiation delay.
 */
function TapHandler({
  onTap,
  onDoubleTap,
  onLongPress,
}: {
  onTap: () => void;
  onDoubleTap?: () => void;
  onLongPress?: () => void;
}) {
  const singleTap = Gesture.Tap()
    .maxDuration(300)
    .maxDistance(10)
    .runOnJS(true)
    .onEnd(() => { onTap(); });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .maxDuration(250)
    .maxDistance(10)
    .runOnJS(true)
    .onEnd(() => { onDoubleTap?.(); });

  const longPress = Gesture.LongPress()
    .minDuration(500)
    .runOnJS(true)
    .onStart(() => { onLongPress?.(); });

  // Exclusive: double-tap wins over single-tap (waits to confirm no second tap)
  // Race: long-press fires as soon as threshold met, cancels tap
  const composed = Gesture.Race(
    longPress,
    Gesture.Exclusive(doubleTap, singleTap),
  );

  return (
    <GestureDetector gesture={composed}>
      {/* Exclude the right 80 px where the action-rail buttons live.
          On Android the GestureDetector claims the entire touch area of its
          child view, which would swallow taps on Like / Comment / etc. */}
      <View style={[StyleSheet.absoluteFill, { right: 80 }]} />
    </GestureDetector>
  );
}

// ─── Web video player ─────────────────────────────────────────────────────────

function WebVideoPlayer({
  src, poster, active, paused, preloadOnly,
  onTogglePause, onDoubleTap, onLongPress,
  onProgress, onBuffering, onFirstPlay, externalRef,
}: {
  src: string; poster?: string | null; active: boolean; paused: boolean; preloadOnly: boolean;
  onTogglePause: () => void; onDoubleTap?: () => void; onLongPress?: () => void;
  onProgress: (posMs: number, durMs: number) => void; onBuffering: (b: boolean) => void;
  onFirstPlay?: () => void;
  externalRef?: React.MutableRefObject<HTMLVideoElement | null>;
}) {
  const innerRef = useRef<HTMLVideoElement | null>(null);
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTapRef = useRef(0);
  const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);
  const movedRef = useRef(false);

  function setRef(el: HTMLVideoElement | null) {
    innerRef.current = el;
    if (externalRef) externalRef.current = el;
  }

  useEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    if (active && !paused && !preloadOnly) {
      el.play().catch(() => {});
    } else {
      el.pause();
    }
  }, [active, paused, src, preloadOnly]);

  useEffect(() => {
    const el = innerRef.current;
    if (!el || active) return;
    try { el.currentTime = 0; } catch {}
  }, [active]);

  function handlePointerDown(e: any) {
    movedRef.current = false;
    pointerStartRef.current = { x: e.clientX, y: e.clientY };
    if (onLongPress) {
      longPressRef.current = setTimeout(() => {
        longPressRef.current = null;
        if (!movedRef.current) onLongPress();
      }, 500);
    }
  }

  function handlePointerMove(e: any) {
    if (!pointerStartRef.current) return;
    const dx = Math.abs(e.clientX - pointerStartRef.current.x);
    const dy = Math.abs(e.clientY - pointerStartRef.current.y);
    if (dx > 8 || dy > 8) {
      movedRef.current = true;
      if (longPressRef.current) { clearTimeout(longPressRef.current); longPressRef.current = null; }
    }
  }

  function handlePointerUp() {
    if (longPressRef.current) { clearTimeout(longPressRef.current); longPressRef.current = null; }
    pointerStartRef.current = null;
  }

  function handleClick(e: any) {
    if (preloadOnly || movedRef.current) return;
    e?.stopPropagation?.();
    const now = Date.now();
    if (onDoubleTap && now - lastTapRef.current < 300) {
      if (tapTimerRef.current) { clearTimeout(tapTimerRef.current); tapTimerRef.current = null; }
      lastTapRef.current = 0;
      onDoubleTap();
    } else {
      lastTapRef.current = now;
      tapTimerRef.current = setTimeout(() => {
        tapTimerRef.current = null;
        onTogglePause();
      }, 250);
    }
  }

  return (
    <>
      {/* @ts-ignore */}
      <video
        ref={setRef}
        src={src}
        poster={poster || undefined}
        playsInline
        loop
        preload="auto"
        onTimeUpdate={(e: any) => {
          const v = e.currentTarget as HTMLVideoElement;
          if (v.duration) onProgress(v.currentTime * 1000, v.duration * 1000);
        }}
        onWaiting={() => onBuffering(true)}
        onPlaying={() => { onBuffering(false); onFirstPlay?.(); }}
        onCanPlay={() => onBuffering(false)}
        style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "contain", backgroundColor: "#000", pointerEvents: "none" }}
      />
      {/* @ts-ignore */}
      <div
        onClick={handleClick}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, cursor: preloadOnly ? "default" : "pointer", touchAction: "pan-y" }}
      />
    </>
  );
}

// ─── SocialShareSheet ─────────────────────────────────────────────────────────

function SocialShareSheet({ visible, onClose, url, title }: { visible: boolean; onClose: () => void; url: string; title: string }) {
  if (!visible) return null;
  async function handlePlatform(p: typeof SOCIAL_PLATFORMS[number]) {
    if (p.id === "copy") { Clipboard.setStringAsync(url); onClose(); return; }
    if (p.id === "more") { onClose(); setTimeout(async () => { await Share.share({ message: `${title} ${url}`, url, title }); }, 300); return; }
    onClose();
    const deepUrl = p.scheme!(url);
    const canOpen = await Linking.canOpenURL(deepUrl).catch(() => false);
    if (canOpen) await Linking.openURL(deepUrl).catch(() => {});
    else await Share.share({ message: `${title} ${url}`, url, title });
  }
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={ssStyles.backdrop} activeOpacity={1} onPress={onClose} />
      <View style={ssStyles.sheet}>
        <View style={ssStyles.handle} />
        <Text style={ssStyles.title}>Share video</Text>
        <View style={ssStyles.grid}>
          {SOCIAL_PLATFORMS.map((p) => (
            <TouchableOpacity key={p.id} style={ssStyles.cell} onPress={() => handlePlatform(p)}>
              <View style={[ssStyles.iconCircle, { backgroundColor: p.color }]}>
                <Ionicons name={p.icon as any} size={22} color="#fff" />
              </View>
              <Text style={ssStyles.cellLabel}>{p.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity style={ssStyles.cancelBtn} onPress={onClose}>
          <Text style={ssStyles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}
const ssStyles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.4)" },
  sheet: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "#1a1a1a", borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 20, paddingBottom: 36, paddingTop: 12 },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.2)", alignSelf: "center", marginBottom: 14 },
  title: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold", textAlign: "center", marginBottom: 20 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12, justifyContent: "center" },
  cell: { width: 72, alignItems: "center", gap: 6 },
  iconCircle: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  cellLabel: { color: "rgba(255,255,255,0.7)", fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "center" },
  cancelBtn: { marginTop: 16, backgroundColor: "rgba(255,255,255,0.07)", borderRadius: 14, paddingVertical: 14, alignItems: "center" },
  cancelText: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },
});

// ─── VideoContextMenu ─────────────────────────────────────────────────────────

function VideoContextMenu({ visible, item, onClose, onShare, onRepost, onDownload, onCopyLink, onNotInterested, onReport }: {
  visible: boolean; item: VideoPost | null; onClose: () => void;
  onShare: () => void; onRepost: () => void; onDownload: () => void;
  onCopyLink: () => void; onNotInterested: () => void; onReport: () => void;
}) {
  if (!visible || !item) return null;
  const OPTIONS = [
    { id: "download",      label: "Save to device",  icon: "download-outline",     action: onDownload,      color: "#fff" },
    { id: "share",         label: "Share to...",     icon: "share-social-outline", action: onShare,         color: "#fff" },
    { id: "repost",        label: "Repost",          icon: "repeat-outline",       action: onRepost,        color: "#fff" },
    { id: "copylink",      label: "Copy link",       icon: "link-outline",         action: onCopyLink,      color: "#fff" },
    { id: "notinterested", label: "Not interested",  icon: "eye-off-outline",      action: onNotInterested, color: "rgba(255,255,255,0.65)" },
    { id: "report",        label: "Report",          icon: "flag-outline",         action: onReport,        color: "#FF453A" },
  ];
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={cmStyles.backdrop} activeOpacity={1} onPress={onClose} />
      <View style={cmStyles.sheet}>
        <View style={cmStyles.handle} />
        <View style={cmStyles.authorPreview}>
          <Avatar uri={item.profile.avatar_url} name={item.profile.display_name} size={36} />
          <View>
            <Text style={cmStyles.previewHandle}>@{item.profile.handle}</Text>
            <Text style={cmStyles.previewCaption} numberOfLines={1}>{item.content || "Video"}</Text>
          </View>
        </View>
        <View style={cmStyles.divider} />
        {OPTIONS.map((opt) => (
          <TouchableOpacity key={opt.id} style={cmStyles.row} onPress={() => { onClose(); setTimeout(opt.action, 200); }}>
            <View style={[cmStyles.rowIcon, opt.id === "report" && { backgroundColor: "rgba(255,69,58,0.12)" }]}>
              <Ionicons name={opt.icon as any} size={22} color={opt.color} />
            </View>
            <Text style={[cmStyles.rowLabel, { color: opt.color }]}>{opt.label}</Text>
            <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.2)" />
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={cmStyles.cancelBtn} onPress={onClose}>
          <Text style={cmStyles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}
const cmStyles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.55)" },
  sheet: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "#1a1a1a", borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 20, paddingBottom: 36, paddingTop: 12 },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.2)", alignSelf: "center", marginBottom: 14 },
  authorPreview: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8 },
  previewHandle: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" },
  previewCaption: { color: "rgba(255,255,255,0.45)", fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  divider: { height: 1, backgroundColor: "rgba(255,255,255,0.08)", marginVertical: 8 },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 14, gap: 14 },
  rowIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.08)", alignItems: "center", justifyContent: "center" },
  rowLabel: { flex: 1, fontSize: 15, fontFamily: "Inter_500Medium" },
  cancelBtn: { marginTop: 6, backgroundColor: "rgba(255,255,255,0.07)", borderRadius: 14, paddingVertical: 14, alignItems: "center" },
  cancelText: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },
});

// ─── VideoItem ────────────────────────────────────────────────────────────────

const VideoItem = React.memo(function VideoItem({
  item, isActive, isNearActive, screenH, screenW, isFollowing, isSelf,
  onLike, onBookmark, onOpenComments, onShare, onFollow, onRecordView, onOpenMenu,
  navOffset = 0, tabFocused = true,
}: {
  item: VideoPost; isActive: boolean; isNearActive: boolean; screenH: number; screenW: number;
  isFollowing: boolean; isSelf: boolean;
  onLike: (id: string, liked: boolean) => void; onBookmark: (id: string, bookmarked: boolean) => void;
  onOpenComments: (id: string) => void; onShare: (item: VideoPost) => void;
  onFollow: (authorId: string, isFollowing: boolean) => void; onRecordView: (postId: string) => void;
  onOpenMenu: (item: VideoPost) => void;
  navOffset?: number; tabFocused?: boolean;
}) {
  const { accent } = useAppAccent();
  const insets = useSafeAreaInsets();
  const player = useVideoPlayer(null, (p) => { p.loop = true; p.muted = false; });
  const webVideoRef = useRef<HTMLVideoElement | null>(null);
  const [paused, setPaused] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [showBuffering, setShowBuffering] = useState(false);
  const [videoStarted, setVideoStarted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [durationMs, setDurationMs] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [cachedUri, setCachedUri] = useState<string | null>(null);
  const [videoError, setVideoError] = useState(false);
  const [progressBarWidth, setProgressBarWidth] = useState(0);
  const heartScale = useRef(new Animated.Value(1)).current;
  const doubleTapOpacity = useRef(new Animated.Value(0)).current;
  const doubleTapScale = useRef(new Animated.Value(0.3)).current;
  const viewRecorded = useRef(false);
  const offlineSaved = useRef(false);
  const cacheAttempted = useRef(false);
  const bufferingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Perf refs — avoid setState on every video frame
  const bufferingRef = useRef(false);
  const videoStartedRef = useRef(false);
  const lastProgressFrameRef = useRef(0);   // timestamp of last setProgress call
  const lastSavedProgressRef = useRef(0);   // timestamp of last AsyncStorage save
  const cacheDelayRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resolved = useResolvedVideoSource(item.id, item.video_url, { targetHeight: getPreferredVideoHeight() });
  // When an error occurs fall back directly to the raw video_url, bypassing cache/manifest
  const playbackUri = videoError ? item.video_url : (cachedUri || resolved.uri || item.video_url);
  const shouldMountVideo = isActive || isNearActive;
  const preloadOnly = !isActive && isNearActive;
  const showExpand = !!item.content && (item.content.split("\n").length > 2 || item.content.length > 120);

  // Start pre-caching once the video enters the preload window.
  // Delay by 500 ms so the download does NOT compete with the swipe animation.
  useEffect(() => {
    if (!isNearActive || cacheAttempted.current || !item.video_url) return;
    cacheAttempted.current = true;
    cacheDelayRef.current = setTimeout(() => {
      getCachedVideoUri(item.video_url).then((ex) => {
        if (ex) setCachedUri(ex);
        else cacheVideo(item.video_url).then((l) => { if (l) setCachedUri(l); });
      });
    }, 500);
    return () => { if (cacheDelayRef.current) { clearTimeout(cacheDelayRef.current); cacheDelayRef.current = null; } };
  }, [isNearActive]);

  // Pause and show poster when app/tab loses focus; resume seamlessly on return.
  // Resetting videoStarted shows the poster image immediately so there's no black
  // frame while the AVPlayer re-syncs after the screen regains focus.
  useEffect(() => {
    if (!tabFocused) {
      setVideoStarted(false);
      videoStartedRef.current = false;
      if (Platform.OS === "web" && webVideoRef.current) {
        webVideoRef.current.pause();
      }
    } else if (isActive && Platform.OS === "web" && webVideoRef.current && !paused) {
      webVideoRef.current.play().catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabFocused]);

  // Reset when leaving viewport; record view when becoming active
  useEffect(() => {
    if (!isActive) {
      setPaused(false);
      setProgress(0);
      setExpanded(false);
      setVideoStarted(false);
      setShowBuffering(false);
      setVideoError(false);
      if (bufferingTimerRef.current) { clearTimeout(bufferingTimerRef.current); bufferingTimerRef.current = null; }
      // Do NOT call unloadAsync() here — it fires on first mount too (isActive=false
      // while preloading) and permanently breaks the underlying AVPlayer before it
      // has a chance to buffer. The Video component is unmounted automatically by
      // the shouldMountVideo gate when the item leaves the ±2 nearActive window,
      // which is the correct place to free native resources.
      // Reset per-frame perf refs when leaving viewport
      bufferingRef.current = false;
      videoStartedRef.current = false;
      lastProgressFrameRef.current = 0;
      lastSavedProgressRef.current = 0;
      // Reset offline-save flag so it retries on next view if the save failed
      offlineSaved.current = false;
    } else {
      if (!viewRecorded.current) {
        viewRecorded.current = true;
        onRecordView(item.id);
      }
      if (!offlineSaved.current) {
        offlineSaved.current = true;
        const title = (item.profile?.display_name ?? "") +
          (item.content ? `: ${item.content.slice(0, 60)}` : "");
        markVideoWatched(item.id, item.video_url, {
          title,
          thumbnail: item.image_url ?? null,
        }).catch(() => {
          // Reset so the next time the user views this video it tries again
          offlineSaved.current = false;
        });
      }
    }
  }, [isActive]);

  // ── Player source update ───────────────────────────────────────────────
  useEffect(() => {
    if (!playbackUri || !shouldMountVideo) return;
    player.replaceAsync({ uri: playbackUri }).catch(() => {
      // replaceAsync failed (bad URI, network error, codec unsupported).
      // Flip videoError so playbackUri falls back to the raw video_url on
      // the next render; guard prevents a re-render loop if the raw URL
      // itself also fails.
      if (!videoError) setVideoError(true);
    });
  }, [playbackUri, shouldMountVideo]);

  // ── Play / pause control ───────────────────────────────────────────────
  useEffect(() => {
    // player.play() / player.pause() throw when the AVPlayer has been
    // deallocated or enters an unrecoverable error state (rapid swipes,
    // background audio session conflicts, etc.).
    try {
      if (!shouldMountVideo) { player.pause(); return; }
      if (!isActive || paused || preloadOnly || !tabFocused) { player.pause(); } else { player.play(); }
    } catch {}
  }, [isActive, paused, preloadOnly, tabFocused, shouldMountVideo]);

  // ── Progress + started + buffering polling (100 ms) ────────────────────
  useEffect(() => {
    if (!isActive) return;
    const timer = setInterval(() => {
      // Wrap the entire body — expo-video property accesses (player.playing,
      // player.status, player.duration, player.currentTime) throw when the
      // underlying AVPlayer has been deallocated mid-interval (e.g. rapid
      // swipe away) or when the player enters an unrecoverable error state.
      // A silent swallow here is intentional: one failed tick is harmless,
      // and the interval cleans up on unmount via the return below.
      try {
        if (player.playing && !videoStartedRef.current) {
          videoStartedRef.current = true;
          setVideoStarted(true);
          if (bufferingTimerRef.current) { clearTimeout(bufferingTimerRef.current); bufferingTimerRef.current = null; }
          setShowBuffering(false);
        }
        const isLoading = (player.status as string) === "loading";
        if (isLoading !== bufferingRef.current) {
          bufferingRef.current = isLoading;
          setBuffering(isLoading);
          if (isLoading) {
            if (!bufferingTimerRef.current) bufferingTimerRef.current = setTimeout(() => { setShowBuffering(true); bufferingTimerRef.current = null; }, 400);
          } else {
            if (bufferingTimerRef.current) { clearTimeout(bufferingTimerRef.current); bufferingTimerRef.current = null; }
            setShowBuffering(false);
          }
        }
        const dur = player.duration;
        if (dur > 0) {
          const frac = player.currentTime / dur;
          const now = Date.now();
          if (now - lastProgressFrameRef.current >= 250) {
            lastProgressFrameRef.current = now;
            setDurationMs(dur * 1000);
            setProgress(frac);
            if (frac >= 0.97) clearVideoProgress(item.id);
            else if (now - lastSavedProgressRef.current >= 2000) { lastSavedProgressRef.current = now; saveVideoProgress(item.id, frac); }
          }
        }
      } catch {}
    }, 100);
    return () => clearInterval(timer);
  }, [isActive]);

  function handleTap() { setPaused((p) => !p); }

  function triggerDoubleTapLike() {
    if (!item.liked) onLike(item.id, false);
    Animated.sequence([
      Animated.parallel([
        Animated.timing(doubleTapOpacity, { toValue: 1, duration: 100, useNativeDriver: USE_NATIVE }),
        Animated.spring(doubleTapScale, { toValue: 1, tension: 200, friction: 8, useNativeDriver: USE_NATIVE }),
      ]),
      Animated.delay(500),
      Animated.parallel([
        Animated.timing(doubleTapOpacity, { toValue: 0, duration: 250, useNativeDriver: USE_NATIVE }),
        Animated.timing(doubleTapScale, { toValue: 0.3, duration: 250, useNativeDriver: USE_NATIVE }),
      ]),
    ]).start();
  }

  function handleLike() {
    Animated.sequence([
      Animated.timing(heartScale, { toValue: 0.6, duration: 80, useNativeDriver: USE_NATIVE }),
      Animated.spring(heartScale, { toValue: 1, tension: 300, friction: 7, useNativeDriver: USE_NATIVE }),
    ]).start();
    onLike(item.id, item.liked);
  }

  function handleProgressBarPress(locationX: number) {
    if (!progressBarWidth || !durationMs) return;
    const pct = Math.max(0, Math.min(1, locationX / progressBarWidth));
    player.currentTime = (durationMs / 1000) * pct;
  }

  const videoElement = Platform.OS === "web" ? (
    <View style={StyleSheet.absoluteFill}>
      {shouldMountVideo ? (
        <WebVideoPlayer
          src={playbackUri} poster={item.image_url} active={isActive && tabFocused} paused={paused} preloadOnly={preloadOnly}
          onTogglePause={() => setPaused((p) => !p)} onDoubleTap={triggerDoubleTapLike}
          onLongPress={() => onOpenMenu(item)}
          onProgress={(pos, dur) => {
            if (!dur) return;
            setDurationMs(dur);
            const frac = pos / dur;
            setProgress(frac);
            if (frac >= 0.97) clearVideoProgress(item.id); else saveVideoProgress(item.id, frac);
          }}
          onBuffering={(b) => {
            setBuffering(b);
            if (b) {
              if (!bufferingTimerRef.current) {
                bufferingTimerRef.current = setTimeout(() => { setShowBuffering(true); bufferingTimerRef.current = null; }, 400);
              }
            } else {
              if (bufferingTimerRef.current) { clearTimeout(bufferingTimerRef.current); bufferingTimerRef.current = null; }
              setShowBuffering(false);
            }
          }}
          onFirstPlay={() => setVideoStarted(true)}
          externalRef={webVideoRef}
        />
      ) : <View style={[StyleSheet.absoluteFill, { backgroundColor: "#000" }]} />}
    </View>
  ) : (
    <View style={StyleSheet.absoluteFill}>
      {shouldMountVideo ? (
        <VideoView
          player={player}
          style={StyleSheet.absoluteFill}
          contentFit="contain"
          nativeControls={false}
        />
      ) : <View style={[StyleSheet.absoluteFill, { backgroundColor: "#000" }]} />}

      {/* TapHandler on native — uses Responder, does NOT block scroll */}
      <TapHandler
        onTap={handleTap}
        onDoubleTap={triggerDoubleTapLike}
        onLongPress={() => onOpenMenu(item)}
      />
    </View>
  );

  return (
    <View style={[vStyles.item, { width: screenW, height: screenH }]}>
      {videoElement}

      {/* Overlays — pointerEvents="none" so touches pass through to TapHandler */}
      {/* Poster thumbnail: persists until first frame renders, eliminates black flash on swipe */}
      {item.image_url && !videoStarted && (
        <View style={[StyleSheet.absoluteFill, { pointerEvents: "none" }]}>
          <ExpoImage
            source={{ uri: item.image_url }}
            style={StyleSheet.absoluteFill}
            contentFit="contain"
            priority="high"
          />
        </View>
      )}

      {showBuffering && isActive && (
        <View style={[vStyles.centerOverlay, { pointerEvents: "none" } as any]}>
          <ActivityIndicator color="rgba(255,255,255,0.7)" size="small" />
        </View>
      )}
      {paused && !buffering && (
        <View style={[vStyles.centerOverlay, { pointerEvents: "none" } as any]}>
          <View style={vStyles.pauseCircle}>
            <Ionicons name="play" size={32} color="#fff" style={{ marginLeft: 3 }} />
          </View>
        </View>
      )}

      {/* Double-tap like burst */}
      <Animated.View
        style={[vStyles.centerOverlay, { opacity: doubleTapOpacity, transform: [{ scale: doubleTapScale }], pointerEvents: "none" } as any]}
      >
        <Ionicons name="heart" size={90} color="#FF3B30" />
      </Animated.View>

      {/* Gradient — bottom only, no top shadow */}
      <GradientOverlay position="bottom" height={440} />

      {/* Bottom info — author + caption */}
      <View style={[vStyles.bottomArea, { bottom: insets.bottom + 56 + navOffset, pointerEvents: "box-none" } as any]}>
        <TouchableOpacity
          onPress={() => router.push(`/@${item.profile.handle}` as any)}
          style={vStyles.authorRow} activeOpacity={0.8}
        >
          <View style={[vStyles.avatarWrap, { borderColor: accent }]}>
            <Avatar uri={item.profile.avatar_url} name={item.profile.display_name} size={40} />
          </View>
          <View style={vStyles.authorInfo}>
            <Text style={vStyles.authorHandle}>@{item.profile.handle}</Text>
            <Text style={vStyles.authorName}>{item.profile.display_name}</Text>
          </View>
          {!isSelf && (
            <TouchableOpacity
              onPress={() => onFollow(item.author_id, isFollowing)}
              style={[vStyles.inlineFollow, isFollowing && vStyles.inlineFollowActive]}
              activeOpacity={0.8}
            >
              <Text style={vStyles.inlineFollowText}>
                {isFollowing ? "Following" : "Follow"}
              </Text>
            </TouchableOpacity>
          )}
        </TouchableOpacity>

        {!!item.content && (
          <TouchableOpacity
            activeOpacity={showExpand ? 0.75 : 1}
            onPress={() => showExpand && setExpanded((e) => !e)}
            disabled={!showExpand}
            style={vStyles.captionWrap}
          >
            <RichText style={vStyles.caption} numberOfLines={expanded ? undefined : 2} linkColor="#1f95ff">
              {item.content}
            </RichText>
            {showExpand && !expanded && (
              <Text style={vStyles.captionMore}>
                <Text style={vStyles.captionEllipsis}>... </Text>
                <Text style={vStyles.captionMoreLink}>more</Text>
              </Text>
            )}
          </TouchableOpacity>
        )}

      </View>

      {/* Right action rail */}
      <View style={[vStyles.rightCol, { bottom: insets.bottom + 36 + navOffset, pointerEvents: "box-none" } as any]}>
        {/* Like */}
        <View style={vStyles.actionItem}>
          <Animated.View style={{ transform: [{ scale: heartScale }] }}>
            <TouchableOpacity onPress={handleLike} hitSlop={8} activeOpacity={0.75}>
              <View style={[vStyles.actionBtnCircle, item.liked && { backgroundColor: "rgba(255,59,48,0.25)" }]}>
                <Ionicons name={item.liked ? "heart" : "heart-outline"} size={26} color={item.liked ? "#FF3B30" : "#fff"} />
              </View>
            </TouchableOpacity>
          </Animated.View>
          <Text style={vStyles.actionLabel}>{formatCount(item.likeCount)}</Text>
        </View>

        {/* Comment */}
        <View style={vStyles.actionItem}>
          <TouchableOpacity onPress={() => onOpenComments(item.id)} hitSlop={8} activeOpacity={0.75}>
            <View style={vStyles.actionBtnCircle}>
              <Ionicons name="chatbubble-ellipses" size={24} color="#fff" />
            </View>
          </TouchableOpacity>
          <Text style={vStyles.actionLabel}>{formatCount(item.replyCount)}</Text>
        </View>

        {/* Bookmark */}
        <View style={vStyles.actionItem}>
          <TouchableOpacity onPress={() => onBookmark(item.id, item.bookmarked)} hitSlop={8} activeOpacity={0.75}>
            <View style={[vStyles.actionBtnCircle, item.bookmarked && { backgroundColor: "rgba(0,188,212,0.25)" }]}>
              <Ionicons name={item.bookmarked ? "bookmark" : "bookmark-outline"} size={24} color={item.bookmarked ? "#1f95ff" : "#fff"} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Share */}
        <View style={vStyles.actionItem}>
          <TouchableOpacity onPress={() => onShare(item)} hitSlop={8} activeOpacity={0.75}>
            <View style={vStyles.actionBtnCircle}>
              <Ionicons name="arrow-redo-outline" size={24} color="#fff" />
            </View>
          </TouchableOpacity>
        </View>

        {/* More */}
        <View style={vStyles.actionItem}>
          <TouchableOpacity onPress={() => onOpenMenu(item)} hitSlop={8} activeOpacity={0.75}>
            <View style={vStyles.actionBtnCircle}>
              <Ionicons name="ellipsis-horizontal" size={22} color="#fff" />
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Progress bar */}
      <TouchableOpacity
        activeOpacity={1}
        style={[vStyles.progressBar, { bottom: Math.max(insets.bottom, 0) + navOffset }]}
        onLayout={(e) => setProgressBarWidth(e.nativeEvent.layout.width)}
        onPress={(e) => handleProgressBarPress(e.nativeEvent.locationX)}
        hitSlop={{ top: 12, bottom: 12 }}
      >
        <View style={[vStyles.progressFill, { width: `${progress * 100}%` as any }]} />
        <View style={[vStyles.progressThumb, { left: `${progress * 100}%` as any }]} />
      </TouchableOpacity>
    </View>
  );
}); // React.memo

const vStyles = StyleSheet.create({
  item: { backgroundColor: "#000", overflow: "hidden" },
  centerOverlay: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" },
  pauseCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: "rgba(0,0,0,0.4)", borderWidth: 1.5, borderColor: "rgba(255,255,255,0.25)", alignItems: "center", justifyContent: "center" },
  gradientBase: { position: "absolute", left: 0, right: 0 },
  bottomArea: { position: "absolute", left: 14, right: 80, gap: 10 },
  authorRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 4 },
  avatarWrap: { borderWidth: 2, borderRadius: 25, padding: 1 },
  authorInfo: { flex: 1 },
  authorHandle: { color: "#fff", fontSize: 15, fontFamily: "Inter_700Bold", ...Platform.select({ web: { textShadow: "0 1px 4px rgba(0,0,0,0.65)" } as any, default: { textShadowColor: "rgba(0,0,0,0.65)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 } }) },
  authorName: { color: "rgba(255,255,255,0.6)", fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  inlineFollow: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999, borderWidth: 1.5, borderColor: "rgba(255,255,255,0.7)", backgroundColor: "rgba(0,0,0,0.25)" },
  inlineFollowActive: { borderColor: "rgba(255,255,255,0.3)", backgroundColor: "rgba(255,255,255,0.1)" },
  inlineFollowText: { color: "#fff", fontSize: 12, fontFamily: "Inter_600SemiBold" },
  captionWrap: { marginTop: 2 },
  caption: { color: "rgba(255,255,255,0.93)", fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20, ...Platform.select({ web: { textShadow: "0 1px 4px rgba(0,0,0,0.65)" } as any, default: { textShadowColor: "rgba(0,0,0,0.65)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 } }) },
  captionMore: { marginTop: 2, fontSize: 14, lineHeight: 20 },
  captionEllipsis: { color: "rgba(255,255,255,0.5)", fontFamily: "Inter_400Regular" },
  captionMoreLink: { color: "#1f95ff", fontFamily: "Inter_600SemiBold" },
  viewRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  viewText: { color: "rgba(255,255,255,0.45)", fontSize: 11, fontFamily: "Inter_400Regular" },
  rightCol: { position: "absolute", right: 10, gap: 14, alignItems: "center" },
  actionItem: { alignItems: "center", gap: 5 },
  actionBtnCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: "rgba(0,0,0,0.35)", borderWidth: 1, borderColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },
  actionLabel: { color: "#fff", fontSize: 12, fontFamily: "Inter_700Bold", ...Platform.select({ web: { textShadow: "0 1px 3px rgba(0,0,0,0.6)" } as any, default: { textShadowColor: "rgba(0,0,0,0.6)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 } }) },
  progressBar: { position: "absolute", left: 0, right: 0, height: 3, backgroundColor: "rgba(255,255,255,0.2)", justifyContent: "center" },
  progressFill: { position: "absolute", left: 0, top: 0, bottom: 0, backgroundColor: "#fff", borderRadius: 2 },
  progressThumb: { position: "absolute", width: 12, height: 12, borderRadius: 6, backgroundColor: "#fff", top: -4.5, marginLeft: -6, elevation: 4 },
});

// ─── VideoFeed (embeddable) ───────────────────────────────────────────────────

export function VideoFeed({ isEmbedded = false }: { isEmbedded?: boolean } = {}) {
  const { accent } = useAppAccent();
  const { colors, isDark } = useTheme();
  const params = useLocalSearchParams<{ id: string }>();
  const rawId = isEmbedded ? undefined : params.id;
  const id = rawId && !isUuid(rawId) ? decodeId(rawId) : rawId;
  const { user, profile } = useAuth();
  const insets = useSafeAreaInsets();
  const { width: SCREEN_W, height: SCREEN_H } = useWindowDimensions();
  // Height taken by the floating tab bar when this feed is embedded in the tabs navigator.
  // We add this as paddingBottom on the root View so the FlatList (and each video item)
  // measures the correct available height and never renders behind the tab bar.
  const tabOffset = isEmbedded ? Math.max(insets.bottom, 4) + 66 : 0;

  const [videoTab, setVideoTab] = useState<"for_you" | "following">("for_you");
  const [videos, setVideos] = useState<VideoPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [followingSet, setFollowingSet] = useState<Set<string>>(new Set());
  const [commentPostId, setCommentPostId] = useState<string | null>(null);
  const [menuItem, setMenuItem] = useState<VideoPost | null>(null);
  const [shareSheetItem, setShareSheetItem] = useState<VideoPost | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadToast, setDownloadToast] = useState<string | null>(null);
  const [showSignInPrompt, setShowSignInPrompt] = useState(false);
  const [tabFocused, setTabFocused] = useState(true);

  useFocusEffect(
    useCallback(() => {
      setTabFocused(true);
      if (Platform.OS !== "web") {
        activateKeepAwakeAsync?.("video-feed")?.catch(() => {});
      }
      return () => {
        setTabFocused(false);
        if (Platform.OS !== "web") {
          deactivateKeepAwakeAsync?.("video-feed")?.catch(() => {});
        }
      };
    }, [])
  );

  const listRef = useRef<FlatList>(null);
  const webScrollRef = useRef<HTMLDivElement | null>(null);
  const cursorRef = useRef<string | null>(null);
  const loadingMoreRef = useRef(false);
  const hasMoreRef = useRef(hasMore);
  const videoTabRef = useRef(videoTab);
  // Tracks loaded video IDs so the realtime callback can skip posts not in feed
  const loadedVideoIdsRef = useRef<Set<string>>(new Set());
  const activeIndexRef = useRef(activeIndex);
  const videosLenRef = useRef(videos.length);
  // Stable ref for user — lets fetchVideos read the current user without
  // having it as a dep, so auth-context refreshes never reset the feed.
  const userRef = useRef(user);
  // Stable ref for videos — lets interaction callbacks (like/bookmark) always
  // read the latest videos array without being in every useCallback dep list.
  const videosRef = useRef(videos);
  // Tab indicator is driven purely by videoTab state — no Animated needed.

  useEffect(() => { hasMoreRef.current = hasMore; }, [hasMore]);
  useEffect(() => { videoTabRef.current = videoTab; }, [videoTab]);
  useEffect(() => { activeIndexRef.current = activeIndex; }, [activeIndex]);
  useEffect(() => {
    videosLenRef.current = videos.length;
    videosRef.current = videos;
    loadedVideoIdsRef.current = new Set(videos.map((v) => v.id));
  }, [videos]);
  useEffect(() => { userRef.current = user; }, [user]);

  // Web: hide scrollbar CSS
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const style = document.createElement("style");
    style.textContent = "#vf-web-scroll::-webkit-scrollbar { display: none; }";
    document.head.appendChild(style);
    return () => { document.head.removeChild(style); };
  }, []);

  // Web: lock page scroll
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const prevBody = document.body.style.overflow;
    const prevHtml = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevBody;
      document.documentElement.style.overflow = prevHtml;
    };
  }, []);

  // ── Data fetching ──────────────────────────────────────────────────────────

  const fetchVideos = useCallback(async (tab: "for_you" | "following", cursor?: string | null) => {
    const isLoadMore = !!cursor;
    if (isLoadMore) {
      if (loadingMoreRef.current) return;
      loadingMoreRef.current = true;
      setLoadingMore(true);
    } else {
      cursorRef.current = null; setHasMore(true);

      // ── Offline-first: show the target video from local cache immediately ────
      // This lets the video open instantly even with no internet connection.
      let showedLocalVideo = false;
      if (id) {
        const local = await getLocalFeedPost(id);
        if (local?.video_url) {
          showedLocalVideo = true;
          setVideos([{
            id: local.id,
            author_id: local.author_id,
            content: local.content ?? "",
            video_url: local.video_url!,
            image_url: local.image_url,
            created_at: local.created_at,
            view_count: local.view_count,
            audio_name: null,
            profile: {
              display_name: local.author_name ?? "User",
              handle: local.author_handle ?? "user",
              avatar_url: local.author_avatar ?? null,
            },
            liked: local.liked,
            bookmarked: local.bookmarked,
            likeCount: local.like_count,
            replyCount: local.reply_count,
          }]);
          setLoading(false);
        }
      }
      if (!showedLocalVideo) {
        setLoading(true); setVideos([]);
      }
    }

    const currentUser = userRef.current;
    let followingIds: string[] = [];

    try {
    if (tab === "following" && currentUser) {
      const { data: followData } = await supabase.from("follows").select("following_id").eq("follower_id", currentUser.id);
      followingIds = (followData || []).map((f: any) => f.following_id);
      if (followingIds.length === 0) {
        setVideos([]); setLoading(false); loadingMoreRef.current = false; setLoadingMore(false); return;
      }
    }

    // For the "For You" feed on initial load, fetch a larger diverse pool from
    // the last 30 days so the scoring algorithm can surface viral evergreen
    // content — not just the newest N posts. On load-more, we fall back to
    // standard cursor pagination to avoid re-fetching the same window.
    const FOR_YOU_POOL = isLoadMore ? VIDEO_PAGE_SIZE : VIDEO_PAGE_SIZE * 4;
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    let query = supabase
      .from("posts")
      .select(`id, author_id, content, video_url, image_url, created_at, audio_name, profiles!posts_author_id_fkey(display_name, handle, avatar_url)`)
      .not("video_url", "is", null)
      .or("post_type.eq.video,post_type.is.null")
      .order("created_at", { ascending: false })
      .limit(tab === "for_you" && !cursor ? FOR_YOU_POOL : VIDEO_PAGE_SIZE);

    if (tab === "for_you" && !cursor) {
      // Wide discovery window: last 30 days so the algo can rank evergreen content
      query = query.gte("created_at", thirtyDaysAgo).or("visibility.eq.public,visibility.is.null");
    } else if (tab === "following" && followingIds.length > 0) {
      query = query.in("author_id", followingIds).or("visibility.eq.public,visibility.eq.followers,visibility.is.null");
      if (cursor) query = query.lt("created_at", cursor);
    } else {
      query = query.or("visibility.eq.public,visibility.is.null");
      if (cursor) query = query.lt("created_at", cursor);
    }

    const { data, error: qErr } = await query;
    if (qErr) console.warn("[VideoFeed] query error:", qErr.message);

    if (data && data.length > 0) {
      const postIds = data.map((p: any) => p.id);
      const authorIds = [...new Set(data.map((p: any) => p.author_id))] as string[];

      const [
        { data: likesData }, { data: repliesData }, { data: viewsData },
        { data: myLikes }, { data: myBookmarks }, { data: myFollows },
      ] = await Promise.all([
        supabase.from("post_acknowledgments").select("post_id").in("post_id", postIds),
        supabase.from("post_replies").select("post_id").in("post_id", postIds),
        supabase.from("post_views").select("post_id").in("post_id", postIds),
        currentUser ? supabase.from("post_acknowledgments").select("post_id").in("post_id", postIds).eq("user_id", currentUser.id) : { data: [] },
        currentUser ? supabase.from("post_bookmarks").select("post_id").in("post_id", postIds).eq("user_id", currentUser.id) : { data: [] },
        currentUser ? supabase.from("follows").select("following_id").eq("follower_id", currentUser.id).in("following_id", authorIds) : { data: [] },
      ]);

      setFollowingSet(new Set((myFollows || []).map((f: any) => f.following_id)));

      const likeMap: Record<string, number> = {};
      for (const l of (likesData || [])) likeMap[l.post_id] = (likeMap[l.post_id] || 0) + 1;
      const replyMap: Record<string, number> = {};
      for (const r of (repliesData || [])) replyMap[r.post_id] = (replyMap[r.post_id] || 0) + 1;
      const viewMap: Record<string, number> = {};
      for (const v of (viewsData || [])) viewMap[v.post_id] = (viewMap[v.post_id] || 0) + 1;
      const myLikeSet = new Set((myLikes || []).map((l: any) => l.post_id));
      const myBookmarkSet = new Set((myBookmarks || []).map((b: any) => b.post_id));
      const followedSet = new Set((myFollows || []).map((f: any) => f.following_id as string));

      const mapped: VideoPost[] = data.map((p: any) => ({
        id: p.id, author_id: p.author_id, content: p.content || "",
        video_url: p.video_url, image_url: p.image_url || null, created_at: p.created_at,
        view_count: viewMap[p.id] || 0, audio_name: p.audio_name || null,
        profile: { display_name: p.profiles?.display_name || "User", handle: p.profiles?.handle || "user", avatar_url: p.profiles?.avatar_url || null },
        liked: myLikeSet.has(p.id), bookmarked: myBookmarkSet.has(p.id),
        likeCount: likeMap[p.id] || 0, replyCount: replyMap[p.id] || 0,
      }));

      // ── Rank by quality algorithm ───────────────────────────────────────────
      const [learnedWeights, seenVideoIds] = await Promise.all([
        getLearnedInterestBoosts(),
        getSeenVideoIds(),
      ]);
      const now = Date.now();

      // Count how many times each author appears in this page (for diversity penalty)
      const authorPageCount: Record<string, number> = {};
      for (const v of mapped) authorPageCount[v.author_id] = (authorPageCount[v.author_id] || 0) + 1;

      let diversified: VideoPost[];

      if (tab === "for_you") {
        // Full quality algorithm: freshness + velocity + interest + seen-video demotion
        const scored = mapped.map((v) => {
          const interestMatches = matchInterestsWeighted(v.content, [], learnedWeights);
          const isSeen = seenVideoIds.has(v.id);
          const hashtags = extractHashtags(v.content);
          const engagementRate = v.likeCount / Math.max(v.view_count, 1);
          const completionProxy = Math.min(v.likeCount / Math.max(v.view_count, 0.5), 1);
          const signals: FeedSignals = {
            likeCount: v.likeCount,
            replyCount: v.replyCount,
            viewCount: v.view_count,
            createdAt: v.created_at,
            interestMatches,
            isFollowing: followedSet.has(v.author_id),
            authorInteractionCount: v.liked ? 3 : 0,
            isVerified: false,
            isOrgVerified: false,
            hasImages: !!v.image_url,
            sameCountry: false,
            authorPostCountInFeed: authorPageCount[v.author_id] || 1,
            contentLength: v.content?.length || 0,
            postType: "video",
            isSeen,
            engagementRate,
            hashtagCount: hashtags.length,
            completionProxy,
          };
          const score = computeFeedScore(signals);
          return { id: v.id, author_id: v.author_id, score, postType: "video" as const, video: v };
        });

        // Weighted random sampling from top candidates so every session feels
        // different even with the same pool of videos. Pick from top-40 scored
        // videos proportional to their score so quality still wins, just not always.
        const topPool = [...scored].sort((a, b) => b.score - a.score).slice(0, 40);
        const sampled = weightedSample(topPool, Math.min(topPool.length, VIDEO_PAGE_SIZE));

        // Diversify to prevent same-creator back-to-back slots
        const diversifiedScored = diversifyFeed(sampled);
        diversified = diversifiedScored.map((s) => s.video as VideoPost);
      } else {
        // Following tab: newest-first with light engagement velocity boost.
        const scored = mapped.map((v) => {
          const ageHours = (now - new Date(v.created_at).getTime()) / 3600000;
          const recency = Math.max(0, 100 - ageHours * 1.5);
          const velocity = Math.min((v.likeCount + v.replyCount * 2) / Math.max(ageHours, 0.5) * 6, 20);
          // Larger jitter so following tab isn't purely chronological every time
          const score = recency + velocity + Math.random() * 8;
          return { id: v.id, author_id: v.author_id, score, postType: "video" as const, video: v };
        });
        scored.sort((a, b) => b.score - a.score);
        diversified = scored.map((s) => s.video);
      }

      let newVideos = diversified;
      cursorRef.current = data[data.length - 1].created_at;
      setHasMore(data.length === VIDEO_PAGE_SIZE);

      if (isLoadMore) {
        setVideos((prev) => {
          const seen = new Set(prev.map((v) => v.id));
          return [...prev, ...newVideos.filter((v) => !seen.has(v.id))];
        });
      } else {
        // Bubble up the requested video ID to position 0
        if (id) {
          const existingIdx = newVideos.findIndex((v) => v.id === id);
          if (existingIdx > 0) {
            const [target] = newVideos.splice(existingIdx, 1);
            newVideos = [target, ...newVideos];
          } else if (existingIdx === -1) {
            const { data: tRow } = await supabase
              .from("posts")
              .select(`id, author_id, content, video_url, image_url, created_at, audio_name, profiles!posts_author_id_fkey(display_name, handle, avatar_url)`)
              .eq("id", id).not("video_url", "is", null).maybeSingle();
            if (tRow) {
              newVideos = [{
                id: tRow.id, author_id: tRow.author_id, content: tRow.content || "",
                video_url: tRow.video_url, image_url: tRow.image_url || null, created_at: tRow.created_at,
                view_count: 0, audio_name: tRow.audio_name || null,
                profile: { display_name: (tRow.profiles as any)?.display_name || "User", handle: (tRow.profiles as any)?.handle || "user", avatar_url: (tRow.profiles as any)?.avatar_url || null },
                liked: false, bookmarked: false, likeCount: 0, replyCount: 0,
              }, ...newVideos];
            }
          }
        }
        setVideos(newVideos);
      }
    } else {
      setHasMore(false);
      if (!isLoadMore) setVideos([]);
    }

    if (isLoadMore) { loadingMoreRef.current = false; setLoadingMore(false); }
    else setLoading(false);
    } catch (networkErr: any) {
      // Network unavailable (offline) — keep whatever is already shown.
      // If nothing is loaded yet, loading will resolve to the empty state.
      console.warn("[VideoFeed] offline or network error:", networkErr?.message ?? networkErr);
      if (isLoadMore) { loadingMoreRef.current = false; setLoadingMore(false); }
      else setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]); // user intentionally omitted — read via userRef so auth refreshes never reset the feed

  useEffect(() => {
    // videoTab is the only thing that should trigger a full reset (user switched tabs).
    // fetchVideos intentionally omitted — it's stable (dep is only `id`).
    fetchVideos(videoTab).catch(() => { setLoading(false); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoTab]);

  // Double-tap the Shorts tab to refresh: scroll to top and reload feed.
  useEffect(() => {
    if (!isEmbedded) return;
    const unsub = onShortsRefresh(() => {
      setActiveIndex(0);
      listRef.current?.scrollToOffset({ offset: 0, animated: false });
      if (webScrollRef.current) webScrollRef.current.scrollTop = 0;
      fetchVideos(videoTabRef.current).catch(() => { setLoading(false); });
    });
    return unsub;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEmbedded]);

  // Realtime like/reply count updates — only fire DB calls for videos that
  // are actually loaded in this feed (avoids count queries for unrelated posts).
  useEffect(() => {
    const channel = supabase.channel(`video-feed-realtime:${id ?? "embed"}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "post_acknowledgments" }, (payload: any) => {
        const postId = payload.new?.post_id || payload.old?.post_id;
        if (!postId || !loadedVideoIdsRef.current.has(postId)) return;
        supabase.from("post_acknowledgments").select("id", { count: "exact", head: true }).eq("post_id", postId)
          .then(({ count }) => { setVideos((prev) => prev.map((v) => v.id === postId ? { ...v, likeCount: count || 0 } : v)); });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "post_replies" }, (payload: any) => {
        const postId = payload.new?.post_id || payload.old?.post_id;
        if (!postId || !loadedVideoIdsRef.current.has(postId)) return;
        supabase.from("post_replies").select("id", { count: "exact", head: true }).eq("post_id", postId)
          .then(({ count }) => { setVideos((prev) => prev.map((v) => v.id === postId ? { ...v, replyCount: count || 0 } : v)); });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // ── FlatList config ────────────────────────────────────────────────────────

  // Stable ref — never changes identity so FlatList never re-wires the handler
  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0 && viewableItems[0].index !== null) {
      const idx = viewableItems[0].index;
      setActiveIndex(idx);
      activeIndexRef.current = idx;
      // Mark this video (and its neighbors) as seen so it gets demoted next session
      const seenBatch: string[] = [];
      for (const vt of viewableItems) {
        if (vt.item?.id) seenBatch.push(vt.item.id);
      }
      if (seenBatch.length > 0) markVideosSeen(seenBatch).catch(() => {});
      // Preload more when 3 from end
      if (idx >= videosLenRef.current - 3 && !loadingMoreRef.current && hasMoreRef.current && cursorRef.current) {
        fetchVideos(videoTabRef.current, cursorRef.current).catch(() => { loadingMoreRef.current = false; setLoadingMore(false); });
      }
    }
  }).current;

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;

  // Use measured FlatList height for perfect snap on all Android devices.
  // useWindowDimensions() may include status/nav bar pixels that the FlatList
  // itself does not occupy (common on Infinix, Tecno, OPPO with gesture nav),
  // causing pagingEnabled to snap to the wrong position.
  const [listHeight, setListHeight] = useState(SCREEN_H);
  const listHeightRef = useRef(SCREEN_H);
  const onListLayout = useCallback((e: any) => {
    const h = e.nativeEvent.layout.height;
    if (h > 0 && Math.abs(h - listHeightRef.current) > 2) {
      listHeightRef.current = h;
      setListHeight(h);
    }
  }, []);

  const getItemLayout = useCallback((_: any, index: number) => ({
    length: listHeight, offset: listHeight * index, index,
  }), [listHeight]);

  // ── Interactions ───────────────────────────────────────────────────────────

  const handleLike = useCallback(async (postId: string, currentlyLiked: boolean) => {
    const currentUser = userRef.current;
    if (!currentUser) { setShowSignInPrompt(true); return; }

    // Optimistic update — update UI immediately before any await
    if (currentlyLiked) {
      setVideos((prev) => prev.map((v) => v.id === postId ? { ...v, liked: false, likeCount: Math.max(0, v.likeCount - 1) } : v));
    } else {
      setVideos((prev) => prev.map((v) => v.id === postId ? { ...v, liked: true, likeCount: v.likeCount + 1 } : v));
    }

    if (currentlyLiked) {
      const { error } = await supabase.from("post_acknowledgments").delete().eq("post_id", postId).eq("user_id", currentUser.id);
      if (error) {
        // Rollback on failure
        setVideos((prev) => prev.map((v) => v.id === postId ? { ...v, liked: true, likeCount: v.likeCount + 1 } : v));
      }
    } else {
      const { error } = await supabase.from("post_acknowledgments").upsert(
        { post_id: postId, user_id: currentUser.id },
        { onConflict: "post_id,user_id", ignoreDuplicates: true }
      );
      if (error) {
        // Rollback on failure
        setVideos((prev) => prev.map((v) => v.id === postId ? { ...v, liked: false, likeCount: Math.max(0, v.likeCount - 1) } : v));
      } else {
        // Fire notification after confirmed DB write — use latest videos ref
        const post = videosRef.current.find((v) => v.id === postId);
        if (post && post.author_id !== currentUser.id) {
          notifyPostLike({ postAuthorId: post.author_id, likerName: profile?.display_name || "Someone", likerUserId: currentUser.id, postId });
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleBookmark = useCallback(async (postId: string, currentlyBookmarked: boolean) => {
    const currentUser = userRef.current;
    if (!currentUser) { setShowSignInPrompt(true); return; }
    // Optimistic update first
    setVideos((prev) => prev.map((v) => v.id === postId ? { ...v, bookmarked: !currentlyBookmarked } : v));
    if (currentlyBookmarked) {
      const { error } = await supabase.from("post_bookmarks").delete().eq("post_id", postId).eq("user_id", currentUser.id);
      if (error) setVideos((prev) => prev.map((v) => v.id === postId ? { ...v, bookmarked: true } : v));
    } else {
      const { error } = await supabase.from("post_bookmarks").upsert({ post_id: postId, user_id: currentUser.id }, { onConflict: "post_id,user_id", ignoreDuplicates: true });
      if (error) setVideos((prev) => prev.map((v) => v.id === postId ? { ...v, bookmarked: false } : v));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFollow = useCallback(async (authorId: string, isFollowing: boolean) => {
    const currentUser = userRef.current;
    if (!currentUser) { setShowSignInPrompt(true); return; }
    // Optimistic update first
    setFollowingSet((prev) => { const next = new Set(prev); if (isFollowing) next.delete(authorId); else next.add(authorId); return next; });
    if (isFollowing) {
      const { error } = await supabase.from("follows").delete().eq("follower_id", currentUser.id).eq("following_id", authorId);
      if (error) setFollowingSet((prev) => { const next = new Set(prev); next.add(authorId); return next; });
    } else {
      const { error } = await supabase.from("follows").upsert({ follower_id: currentUser.id, following_id: authorId }, { onConflict: "follower_id,following_id", ignoreDuplicates: true });
      if (error) setFollowingSet((prev) => { const next = new Set(prev); next.delete(authorId); return next; });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleReplyCountChange(postId: string, delta: number) {
    setVideos((prev) => prev.map((v) => v.id === postId ? { ...v, replyCount: v.replyCount + delta } : v));
  }

  const recordedViews = useRef(new Set<string>());
  const handleRecordView = useCallback(async (postId: string) => {
    if (!user || recordedViews.current.has(postId)) return;
    recordedViews.current.add(postId);
    supabase.from("post_views").upsert({ post_id: postId, viewer_id: user.id }, { onConflict: "post_id,viewer_id" }).then(null, () => {});
    setVideos((prev) => prev.map((v) => v.id === postId ? { ...v, view_count: v.view_count + 1 } : v));
    const video = videosRef.current.find((v) => v.id === postId);
    trackEvent("view_video", { post_id: postId, author_id: video?.author_id ?? "" });
  }, [user]);

  function getVideoUrl(item: VideoPost): string {
    const shortId = encodeId(item.id);
    return Platform.OS === "web" && typeof window !== "undefined"
      ? `${window.location.origin}/video/${shortId}`
      : `https://afuchat.com/video/${shortId}`;
  }

  function showToast(msg: string, durationMs = 2500) {
    setDownloadToast(msg);
    setTimeout(() => setDownloadToast(null), durationMs);
  }

  async function handleDownload(item: VideoPost) {
    if (downloading) return;

    // Resolve the best public MP4 URL via the manifest (same as playback).
    // Falls back to item.video_url if the manifest isn't available yet.
    async function resolveDownloadUrl(): Promise<string> {
      try {
        const manifest = await getPostVideoManifest(item.id);
        if (manifest) {
          // Prefer H.264 for broadest device compatibility when saving.
          const h264 = manifest.sources.find(
            (s) => s.codec === "h264" && s.url,
          );
          if (h264?.url) return h264.url;
          // Fall back to any ready source.
          const best = pickBestSource(manifest, { targetHeight: 1080 });
          if (best.url) return best.url;
          // Last resort: manifest's fallback_url (the original upload).
          if (manifest.fallback_url) return manifest.fallback_url;
        }
      } catch {
        // ignore — use raw video_url below
      }
      return item.video_url;
    }

    if (Platform.OS === "web") {
      try {
        const url = await resolveDownloadUrl();
        const a = document.createElement("a");
        a.href = url; a.download = `afuchat_${item.id}.mp4`; a.target = "_blank"; a.rel = "noopener";
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        showToast("Download started");
      } catch { showToast("Could not start download"); }
      return;
    }

    setDownloading(true); showToast("Saving to device…", 30000);
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync(true);
      if (status !== "granted") {
        setDownloading(false); setDownloadToast(null);
        showAlert("Permission needed", "Please allow media library access in Settings to save videos.");
        return;
      }
      const url = await resolveDownloadUrl();
      const dest = `${FileSystem.cacheDirectory ?? FileSystem.documentDirectory ?? ""}afuchat_dl_${item.id}.mp4`;
      const { uri, status: dlStatus } = await FileSystem.downloadAsync(url, dest);
      if (!uri || (dlStatus !== undefined && (dlStatus < 200 || dlStatus >= 400))) throw new Error(`HTTP ${dlStatus}`);
      await MediaLibrary.createAssetAsync(uri);
      await FileSystem.deleteAsync(uri, { idempotent: true });
      setDownloading(false); showToast("Saved to your device");
    } catch (err) {
      setDownloading(false); setDownloadToast(null);
      console.error("[download]", err);
      showAlert("Download failed", "Could not save the video. If the issue persists, check the Status page under Settings → Help & About.");
    }
  }

  async function handleRepost(item: VideoPost) {
    const url = getVideoUrl(item);
    try { await Share.share({ message: `Reposting: ${item.profile.display_name} on AfuChat\n${url}`, url, title: "Repost from AfuChat" }); } catch {}
  }

  function handleCopyLink(item: VideoPost) { Clipboard.setStringAsync(getVideoUrl(item)); showToast("Link copied"); }
  function handleNotInterested(item: VideoPost) {
    setVideos((prev) => prev.filter((v) => v.id !== item.id));
    globalShowActionToast(
      "Removed from feed",
      "Undo",
      () => setVideos((prev) => prev.some((v) => v.id === item.id) ? prev : [item, ...prev]),
      { type: "info", icon: "eye-off-outline" },
    );
  }
  function handleReport(item: VideoPost) {
    showAlert("Report video", "Why are you reporting this?", [
      { text: "Spam", onPress: () => showToast("Report submitted — thanks") },
      { text: "Inappropriate", onPress: () => showToast("Report submitted — thanks") },
      { text: "Misinformation", onPress: () => showToast("Report submitted — thanks") },
      { text: "Cancel", style: "cancel" },
    ]);
  }

  function switchTab(tab: "for_you" | "following") {
    if (tab === videoTab) return;
    if (tab === "following" && !user) { router.push("/(auth)/login"); return; }
    setActiveIndex(0);
    setVideoTab(tab);
  }

  // Web scroll logic
  const scrollSettleRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleWebScroll(e: React.UIEvent<HTMLDivElement>) {
    const el = e.currentTarget;
    const scrollTop = el.scrollTop;
    // Immediately update active index so the current video pauses the instant
    // the next snap point is crossed — no perceptible delay for the user.
    const index = Math.round(scrollTop / SCREEN_H);
    if (index !== activeIndexRef.current) {
      setActiveIndex(index);
      activeIndexRef.current = index;
    }

    // Debounce only the "load more" check to avoid triggering fetch on every
    // scroll event during a fast swipe.
    if (scrollSettleRef.current) clearTimeout(scrollSettleRef.current);
    scrollSettleRef.current = setTimeout(() => {
      const idx = Math.round(el.scrollTop / SCREEN_H);
      if (idx >= videosLenRef.current - 3 && !loadingMoreRef.current && hasMoreRef.current && cursorRef.current) {
        fetchVideos(videoTabRef.current, cursorRef.current).catch(() => { loadingMoreRef.current = false; setLoadingMore(false); });
      }
    }, 150);
  }

  // ── Derived callbacks — must be declared before any early return ───────────

  const onShare = useCallback((item: VideoPost) => setShareSheetItem(item), []);
  const onOpenMenu = useCallback((item: VideoPost) => setMenuItem(item), []);

  const videoItemProps = React.useMemo(() => ({
    screenH: listHeight, screenW: SCREEN_W,
    navOffset: 0,
    onLike: handleLike, onBookmark: handleBookmark,
    onOpenComments: setCommentPostId,
    onShare,
    onFollow: handleFollow,
    onRecordView: handleRecordView,
    onOpenMenu,
    tabFocused,
  }), [listHeight, SCREEN_W, isEmbedded, insets, handleLike, handleBookmark, handleFollow, handleRecordView, onShare, onOpenMenu, tabFocused]);

  const renderItem = useCallback(({ item, index }: { item: VideoPost; index: number }) => (
    <VideoItem
      item={item}
      isActive={index === activeIndex}
      isNearActive={Math.abs(index - activeIndex) <= 2}
      isFollowing={followingSet.has(item.author_id)}
      isSelf={user?.id === item.author_id}
      {...videoItemProps}
    />
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ), [activeIndex, followingSet, user?.id, videoItemProps]);

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={[mStyles.root, isEmbedded && Platform.OS === "web" ? { position: "relative" as any, zIndex: undefined } : undefined, { paddingBottom: tabOffset }]}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <ShortsFeedSkeleton dark={isDark} />
        {/* Render the real header on top so navigation chrome is visible during load */}
        <View style={[mStyles.headerRow, { paddingTop: insets.top + 6 }]}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={12} style={[mStyles.headerSide, isEmbedded && { opacity: 0, pointerEvents: "none" } as any]}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={mStyles.tabRow}>
            <TouchableOpacity
              onPress={() => switchTab("for_you")}
              style={[mStyles.tabBtn, videoTab === "for_you" && mStyles.tabBtnActive]}
            >
              <Text style={[mStyles.tabText, videoTab === "for_you" && mStyles.tabTextActive]}>For You</Text>
            </TouchableOpacity>
            <View style={mStyles.tabDivider} />
            <TouchableOpacity
              onPress={() => switchTab("following")}
              style={[mStyles.tabBtn, videoTab === "following" && mStyles.tabBtnActive]}
            >
              <Text style={[mStyles.tabText, videoTab === "following" && mStyles.tabTextActive]}>Following</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity hitSlop={12} style={mStyles.headerSide} onPress={() => router.push("/search" as any)}>
            <Ionicons name="search-outline" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[mStyles.root, isEmbedded && Platform.OS === "web" ? { position: "relative" as any, zIndex: undefined } : undefined, { paddingBottom: tabOffset }]}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Fixed header */}
      <View style={[mStyles.headerRow, { paddingTop: insets.top + 6 }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12} style={[mStyles.headerSide, isEmbedded && { opacity: 0, pointerEvents: "none" } as any]}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={mStyles.tabRow}>
          <TouchableOpacity
            onPress={() => switchTab("for_you")}
            style={[mStyles.tabBtn, videoTab === "for_you" && mStyles.tabBtnActive]}
          >
            <Text style={[mStyles.tabText, videoTab === "for_you" && mStyles.tabTextActive]}>For You</Text>
          </TouchableOpacity>
          <View style={mStyles.tabDivider} />
          <TouchableOpacity
            onPress={() => switchTab("following")}
            style={[mStyles.tabBtn, videoTab === "following" && mStyles.tabBtnActive]}
          >
            <Text style={[mStyles.tabText, videoTab === "following" && mStyles.tabTextActive]}>Following</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity hitSlop={12} style={mStyles.headerSide} onPress={() => router.push("/search" as any)}>
          <Ionicons name="search-outline" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {videos.length === 0 ? (
        <View style={mStyles.emptyState}>
          <View style={mStyles.emptyIcon}>
            <Ionicons name="videocam-outline" size={44} color="rgba(255,255,255,0.25)" />
          </View>
          <Text style={mStyles.emptyTitle}>No videos yet</Text>
          <Text style={mStyles.emptySubtitle}>
            {videoTab === "following" ? "Follow creators to see their videos here" : "Videos will appear here soon"}
          </Text>
        </View>
      ) : Platform.OS === "web" ? (
        // Web: native scroll-snap div — no RN FlatList on web needed
        <div
          ref={webScrollRef}
          id="vf-web-scroll"
          onScroll={handleWebScroll}
          style={{
            height: SCREEN_H, width: SCREEN_W,
            overflowY: "scroll", scrollSnapType: "y mandatory",
            scrollbarWidth: "none", backgroundColor: "#000",
            touchAction: "pan-y",
          } as React.CSSProperties}
        >
          {videos.map((item, index) => (
            <div
              key={item.id}
              style={{
                height: SCREEN_H, width: SCREEN_W,
                scrollSnapAlign: "start",
                scrollSnapStop: "always",
                flexShrink: 0, overflow: "hidden", position: "relative",
              } as React.CSSProperties}
            >
              <VideoItem
                item={item}
                isActive={index === activeIndex}
                isNearActive={Math.abs(index - activeIndex) <= 2}
                isFollowing={followingSet.has(item.author_id)}
                isSelf={user?.id === item.author_id}
                {...videoItemProps}
              />
            </div>
          ))}
          {loadingMore && (
            <div style={{ height: SCREEN_H, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#000", scrollSnapAlign: "start" } as React.CSSProperties}>
              <ActivityIndicator color="rgba(255,255,255,0.6)" size="small" />
            </div>
          )}
        </div>
      ) : (
        // Native: FlatList with pagingEnabled — simplest, most reliable
        <FlatList
          ref={listRef}
          data={videos}
          keyExtractor={(v) => v.id}
          renderItem={renderItem}
          // Core scroll config
          pagingEnabled
          showsVerticalScrollIndicator={false}
          // Viewability
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          // Performance
          getItemLayout={getItemLayout}
          windowSize={3}
          initialNumToRender={2}
          maxToRenderPerBatch={3}
          removeClippedSubviews={false}
          // End-reached
          onEndReached={() => {
            if (!loadingMoreRef.current && hasMore && cursorRef.current) {
              fetchVideos(videoTab, cursorRef.current).catch(() => { loadingMoreRef.current = false; setLoadingMore(false); });
            }
          }}
          onEndReachedThreshold={2}
          onScrollToIndexFailed={(info) => {
            setTimeout(() => listRef.current?.scrollToIndex({ index: info.index, animated: false }), 300);
          }}
          // Layout measurement — fixes snap misalignment on Infinix/Android devices
          // where the FlatList height differs from useWindowDimensions()
          onLayout={onListLayout}
          // Misc
          decelerationRate="fast"
          style={{ flex: 1, backgroundColor: "#000" }}
          ListFooterComponent={loadingMore ? (
            <View style={{ width: SCREEN_W, height: listHeight, alignItems: "center", justifyContent: "center", backgroundColor: "#000" }}>
              <ActivityIndicator color="rgba(255,255,255,0.6)" size="small" />
            </View>
          ) : null}
        />
      )}

      <VideoCommentsSheet
        visible={!!commentPostId} onClose={() => setCommentPostId(null)}
        postId={commentPostId || ""}
        postAuthorId={videos.find((v) => v.id === commentPostId)?.author_id || ""}
        onReplyCountChange={handleReplyCountChange}
      />

      <VideoContextMenu
        visible={!!menuItem} item={menuItem} onClose={() => setMenuItem(null)}
        onShare={() => menuItem && setShareSheetItem(menuItem)}
        onRepost={() => menuItem && handleRepost(menuItem)}
        onDownload={() => menuItem && handleDownload(menuItem)}
        onCopyLink={() => menuItem && handleCopyLink(menuItem)}
        onNotInterested={() => { if (menuItem) { setMenuItem(null); handleNotInterested(menuItem); } }}
        onReport={() => menuItem && handleReport(menuItem)}
      />

      <SocialShareSheet
        visible={!!shareSheetItem} onClose={() => setShareSheetItem(null)}
        url={shareSheetItem ? getVideoUrl(shareSheetItem) : ""}
        title={shareSheetItem ? `${shareSheetItem.profile.display_name} on AfuChat` : ""}
      />

      {!!downloadToast && (
        <View style={[mStyles.toast, { pointerEvents: "none" } as any]}>
          <Text style={mStyles.toastText}>{downloadToast}</Text>
        </View>
      )}

      <SignInPromptModal visible={showSignInPrompt} onDismiss={() => setShowSignInPrompt(false)} />
    </View>
  );
}

// ─── Route default export ─────────────────────────────────────────────────────
export default function VideoPlayerScreen() {
  return <VideoFeed isEmbedded={false} />;
}

const mStyles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#000",
    ...(Platform.OS === "web" ? { position: "absolute" as any, top: 0, left: 0, right: 0, bottom: 0, zIndex: 100 } : {}),
  } as any,
  headerRow: { position: "absolute", top: 0, left: 0, right: 0, zIndex: 30, flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingBottom: 10 },
  headerSide: { width: 38, alignItems: "center" },
  tabRow: { flex: 1, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 2 },
  tabBtn: { paddingVertical: 8, paddingHorizontal: 18, borderBottomWidth: 2.5, borderBottomColor: "transparent" },
  tabBtnActive: { borderBottomColor: "#fff" },
  tabDivider: { width: 1, height: 16, backgroundColor: "rgba(255,255,255,0.18)" },
  tabText: { color: "rgba(255,255,255,0.45)", fontSize: 16, fontFamily: "Inter_600SemiBold" },
  tabTextActive: { color: "#fff", fontSize: 17, fontFamily: "Inter_700Bold" },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingHorizontal: 40 },
  emptyIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: "rgba(255,255,255,0.06)", alignItems: "center", justifyContent: "center", marginBottom: 8 },
  emptyTitle: { color: "rgba(255,255,255,0.65)", fontSize: 18, fontFamily: "Inter_700Bold" },
  emptySubtitle: { color: "rgba(255,255,255,0.35)", fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
  toast: { position: "absolute", bottom: 90, left: 0, right: 0, alignItems: "center" },
  toastText: { color: "#fff", fontSize: 13, fontFamily: "Inter_500Medium", backgroundColor: "rgba(0,0,0,0.7)", paddingHorizontal: 18, paddingVertical: 10, borderRadius: 24, overflow: "hidden" },
});
