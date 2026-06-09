/**
 * VideoFeed — TikTok-style vertical paging feed with smart scoring.
 *
 * Architecture:
 *  1. snapToInterval + disableIntervalMomentum — reliable snap on both platforms.
 *  2. Reanimated 4 shared values for heart burst, like scale, progress — UI thread.
 *  3. GestureDetector exclusive double-tap / single-tap — UI-thread gesture.
 *  4. React.memo + deep custom equality — only ±1 items re-render on swipe.
 *  5. viewabilityConfig 50 % — activeIndex updates the instant item crosses mid.
 *  6. windowSize=3, removeClippedSubviews=false — keeps ±1 items mounted.
 *  7. expo-image thumbnails — disk-cached, no black-frame flash.
 *
 * Algorithm (For You):
 *  - Fetches 200-post pool from the last 30 days.
 *  - Scores each post via computeFeedScore (freshness + velocity + interest +
 *    affinity + seen-video demotion).
 *  - Runs diversifyFeed to prevent back-to-back same-author runs.
 *  - Marks shown IDs seen (7-day expiry) so re-runs surface fresh content.
 *
 * Following tab:
 *  - Cursor-paginates newest content from followed accounts.
 */

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewToken,
  useWindowDimensions,
} from "react-native";
import { Image as ExpoImage } from "expo-image";
import { VideoView, useVideoPlayer } from "expo-video";
import { LinearGradient } from "@/components/ui/SafeGradient";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { Avatar } from "@/components/ui/Avatar";
import { useAppAccent } from "@/context/AppAccentContext";
import { notifyPostLike, notifyNewFollow } from "@/lib/notifyUser";
import { VideoFeedSkeleton } from "@/components/ui/Skeleton";
import { useResolvedVideoSource } from "@/hooks/useResolvedVideoSource";
import { getPreferredVideoHeight, isWifi } from "@/lib/networkQuality";
import { getCachedVideoUri, cacheVideo, markVideoWatched } from "@/lib/videoCache";
import { shareVideo } from "@/lib/share";
import {
  computeFeedScore,
  diversifyFeed,
  getLearnedInterestBoosts,
  getSeenVideoIds,
  markVideosSeen,
  matchInterestsWeighted,
  extractHashtags,
  type FeedSignals,
} from "@/lib/feedAlgorithm";
import { useAnimationGuard } from "@/hooks/useAnimationGuard";

// ── Lazy-load Reanimated ──────────────────────────────────────────────────────
const _raVF = (() => {
  try {
    const m = require("react-native-reanimated");
    if (m && typeof m.useSharedValue === "function") return m;
  } catch {}
  return null;
})();

function _vfStubSV<T>(init: T): { value: T } {
  const ref = React.useRef({ value: init });
  return ref.current;
}

const useSharedValue   = (_raVF?.useSharedValue   ?? _vfStubSV)                   as typeof import("react-native-reanimated").useSharedValue;
const useAnimatedStyle = (_raVF?.useAnimatedStyle ?? ((_fn: any) => ({})))         as typeof import("react-native-reanimated").useAnimatedStyle;
const withSpring       = (_raVF?.withSpring       ?? ((v: any) => v))               as typeof import("react-native-reanimated").withSpring;
const withTiming       = (_raVF?.withTiming       ?? ((v: any) => v))               as typeof import("react-native-reanimated").withTiming;
const withSequence     = (_raVF?.withSequence     ?? ((v: any) => v))               as typeof import("react-native-reanimated").withSequence;
const withDelay        = (_raVF?.withDelay        ?? ((_d: number, v: any) => v))   as typeof import("react-native-reanimated").withDelay;
const runOnJS          = (_raVF?.runOnJS          ?? ((fn: any) => fn))             as typeof import("react-native-reanimated").runOnJS;
const Animated         = (_raVF?.default ?? require("react-native").Animated)      as typeof import("react-native-reanimated").default;

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE     = 20;
const FOR_YOU_POOL  = 200;
const USE_NATIVE    = Platform.OS !== "web";

// ─── Types ────────────────────────────────────────────────────────────────────

export type VideoPost = {
  id: string;
  author_id: string;
  content: string;
  video_url: string;
  image_url: string | null;
  audio_name: string | null;
  created_at: string;
  view_count: number;
  profile: { display_name: string; handle: string; avatar_url: string | null };
  liked: boolean;
  bookmarked: boolean;
  likeCount: number;
  replyCount: number;
  following: boolean;
  score?: number;
};

export type FeedTab = "for_you" | "following";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function fmtDur(secs: number): string {
  if (!secs || !isFinite(secs)) return "";
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// ─── GradientOverlay ──────────────────────────────────────────────────────────

function GradientOverlay() {
  if (Platform.OS === "web") {
    return (
      <View
        style={[
          styles.gradient,
          {
            background: "linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.4) 40%, transparent 75%)",
            pointerEvents: "none",
          } as any,
        ]}
      />
    );
  }
  return (
    <LinearGradient
      colors={["transparent", "rgba(0,0,0,0.45)", "rgba(0,0,0,0.95)"]}
      locations={[0.2, 0.55, 1]}
      style={[styles.gradient, { pointerEvents: "none" }]}
    />
  );
}

function TopGradient() {
  if (Platform.OS === "web") {
    return (
      <View
        style={[
          styles.topGradient,
          {
            background: "linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, transparent 100%)",
            pointerEvents: "none",
          } as any,
        ]}
      />
    );
  }
  return (
    <LinearGradient
      colors={["rgba(0,0,0,0.5)", "transparent"]}
      style={[styles.topGradient, { pointerEvents: "none" }]}
    />
  );
}

// ─── VideoItem ────────────────────────────────────────────────────────────────

type VideoItemProps = {
  item: VideoPost;
  isActive: boolean;
  isNearActive: boolean;
  screenW: number;
  screenH: number;
  globalMuted: boolean;
  onLike: (postId: string, liked: boolean) => void;
  onFollow: (authorId: string) => void;
  onView: (postId: string) => void;
  onBookmark: (postId: string, bookmarked: boolean) => void;
  onShare: (item: VideoPost) => void;
  onToggleMute: () => void;
  currentUserId?: string;
};

const VideoItem = React.memo(
  function VideoItem({
    item,
    isActive,
    isNearActive,
    screenW,
    screenH,
    globalMuted,
    onLike,
    onFollow,
    onView,
    onBookmark,
    onShare,
    onToggleMute,
    currentUserId,
  }: VideoItemProps) {
    const { accent } = useAppAccent();
    const player = useVideoPlayer(null, (p) => {
      p.loop = true;
      p.muted = globalMuted || Platform.OS === "web";
    });

    const [paused, setPaused] = useState(false);
    const [showBuffering, setShowBuffering] = useState(false);
    const [videoStarted, setVideoStarted] = useState(false);
    const [cachedUri, setCachedUri] = useState<string | null>(null);
    const [videoError, setVideoError] = useState(false);
    const [captionExpanded, setCaptionExpanded] = useState(false);
    const [duration, setDuration] = useState(0);

    const heartScale  = useSharedValue(1);
    const dtOpacity   = useSharedValue(0);
    const dtScale     = useSharedValue(0.3);
    const progressFill = useSharedValue(0);

    // OOM guard: cancel these Reanimated shared values when the app backgrounds.
    useAnimationGuard(heartScale, dtOpacity, dtScale, progressFill);

    const bufferingRef      = useRef(false);
    const bufferingTimer    = useRef<ReturnType<typeof setTimeout> | null>(null);
    const videoStartedRef   = useRef(false);
    const lastProgressTs    = useRef(0);
    const viewRecorded      = useRef(false);
    const cacheAttempted    = useRef(false);
    const cacheDelayTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);
    const watchSaved        = useRef(false);

    const resolved = useResolvedVideoSource(item.id, item.video_url, {
      targetHeight: getPreferredVideoHeight(),
    });
    const playUri = videoError
      ? item.video_url
      : (cachedUri ?? resolved.uri ?? item.video_url);

    // Sync muted state to player when globalMuted changes
    useEffect(() => {
      try { player.muted = globalMuted; } catch {}
    }, [globalMuted]);

    // Preload into cache when ±1 window on WiFi
    useEffect(() => {
      if (!isNearActive || cacheAttempted.current || !item.video_url) return;
      cacheAttempted.current = true;
      cacheDelayTimer.current = setTimeout(() => {
        getCachedVideoUri(item.video_url).then((existing) => {
          if (existing) {
            setCachedUri(existing);
          } else if (isWifi()) {
            cacheVideo(item.video_url).then((local) => {
              if (local) setCachedUri(local);
            });
          }
        });
      }, 500);
      return () => {
        if (cacheDelayTimer.current) {
          clearTimeout(cacheDelayTimer.current);
          cacheDelayTimer.current = null;
        }
      };
    }, [isNearActive, item.video_url]);

    // Reset when scrolled away; record view on arrival
    useEffect(() => {
      if (!isActive) {
        setPaused(false);
        setVideoStarted(false);
        setShowBuffering(false);
        progressFill.value = 0;
        if (videoError) setVideoError(false);
        bufferingRef.current = false;
        videoStartedRef.current = false;
        lastProgressTs.current = 0;
        watchSaved.current = false;
        if (bufferingTimer.current) {
          clearTimeout(bufferingTimer.current);
          bufferingTimer.current = null;
        }
      } else {
        if (!viewRecorded.current) {
          viewRecorded.current = true;
          onView(item.id);
        }
        if (!watchSaved.current) {
          watchSaved.current = true;
          markVideoWatched(item.id, item.video_url, {
            title: `${item.profile.display_name}${item.content ? `: ${item.content.slice(0, 60)}` : ""}`,
            thumbnail: item.image_url,
          }).catch(() => { watchSaved.current = false; });
        }
      }
    }, [isActive]);

    const mountedRef = useRef(true);
    useEffect(() => {
      mountedRef.current = true;
      return () => { mountedRef.current = false; };
    }, []);

    // Player source update
    useEffect(() => {
      if (!playUri || !isNearActive) return;
      player.replaceAsync({ uri: playUri }).catch(() => {
        if (!videoError) setVideoError(true);
      });
    }, [playUri, isNearActive]);

    // Play / pause
    useEffect(() => {
      try {
        if (!isNearActive) { player.pause(); return; }
        if (!isActive || paused) { player.pause(); } else { player.play(); }
      } catch (_) {}
    }, [isActive, isNearActive, paused]);

    // Progress + buffering + duration polling (100ms)
    useEffect(() => {
      if (!isActive) return;
      const timer = setInterval(() => {
        if (!mountedRef.current) { clearInterval(timer); return; }
        try {
          if (player.playing && !videoStartedRef.current) {
            videoStartedRef.current = true;
            setVideoStarted(true);
            if (bufferingTimer.current) { clearTimeout(bufferingTimer.current); bufferingTimer.current = null; }
            setShowBuffering(false);
          }
          const isLoading = (player.status as string) === "loading";
          if (isLoading !== bufferingRef.current) {
            bufferingRef.current = isLoading;
            if (isLoading) {
              if (!bufferingTimer.current) {
                bufferingTimer.current = setTimeout(() => {
                  if (mountedRef.current) setShowBuffering(true);
                  bufferingTimer.current = null;
                }, 400);
              }
            } else {
              if (bufferingTimer.current) { clearTimeout(bufferingTimer.current); bufferingTimer.current = null; }
              setShowBuffering(false);
            }
          }
          const dur = player.duration;
          if (dur > 0) {
            const now = Date.now();
            if (now - lastProgressTs.current >= 250) {
              lastProgressTs.current = now;
              progressFill.value = player.currentTime / dur;
              if (duration !== dur) setDuration(dur);
            }
          }
        } catch (_) {}
      }, 100);
      return () => clearInterval(timer);
    }, [isActive, duration]);

    // ── Animated styles ───────────────────────────────────────────────────────
    const heartAnimStyle = useAnimatedStyle(() => ({
      transform: [{ scale: heartScale.value }],
    }));
    const dtAnimStyle = useAnimatedStyle(() => ({
      opacity: dtOpacity.value,
      transform: [{ scale: dtScale.value }],
    }));
    const progressBarStyle = useAnimatedStyle(() => ({
      width: `${progressFill.value * 100}%` as any,
    }));

    // ── Gesture handlers ───────────────────────────────────────────────────────
    function triggerLike() { onLike(item.id, item.liked); }
    function triggerPause() { setPaused((p) => !p); }

    const doubleTap = Gesture.Tap()
      .numberOfTaps(2)
      .maxDuration(250)
      .maxDistance(12)
      .onEnd(() => {
        "worklet";
        if (!item.liked) runOnJS(triggerLike)();
        dtOpacity.value = withSequence(
          withTiming(1, { duration: 80 }),
          withDelay(450, withTiming(0, { duration: 220 })),
        );
        dtScale.value = withSequence(
          withSpring(1, { damping: 10, stiffness: 280 }),
          withDelay(450, withTiming(0.3, { duration: 220 })),
        );
      });

    const singleTap = Gesture.Tap()
      .maxDuration(300)
      .maxDistance(12)
      .onEnd(() => {
        "worklet";
        runOnJS(triggerPause)();
      });

    const composed = Gesture.Exclusive(doubleTap, singleTap);

    function handleLikeTap() {
      heartScale.value = withSequence(
        withTiming(0.62, { duration: 75 }),
        withSpring(1, { damping: 8, stiffness: 320 }),
      );
      onLike(item.id, item.liked);
    }

    const isOwn = currentUserId === item.author_id;
    const captionLong = item.content.length > 80;

    return (
      <View style={[styles.item, { width: screenW, height: screenH }]}>

        {/* Thumbnail poster — no black flash before video starts */}
        {item.image_url && !videoStarted ? (
          <ExpoImage
            source={{ uri: item.image_url }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            priority="high"
          />
        ) : null}

        {/* Video — native */}
        {isNearActive && Platform.OS !== "web" && (
          <VideoView
            player={player}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            nativeControls={false}
          />
        )}

        {/* Video — web */}
        {isNearActive && Platform.OS === "web" && (
          // @ts-ignore web-only
          <video
            src={playUri}
            autoPlay={isActive && !paused}
            loop
            muted={globalMuted}
            playsInline
            style={{
              position: "absolute", top: 0, left: 0,
              width: "100%", height: "100%",
              objectFit: "cover", backgroundColor: "#000",
            }}
            onPlaying={() => { videoStartedRef.current = true; setVideoStarted(true); setShowBuffering(false); }}
            onWaiting={() => setShowBuffering(true)}
            onCanPlay={() => setShowBuffering(false)}
          />
        )}

        {/* Gesture area sits above video, below overlays */}
        <GestureDetector gesture={composed}>
          <View style={StyleSheet.absoluteFill} />
        </GestureDetector>

        {/* Double-tap heart burst */}
        <Animated.View style={[styles.centerOverlay, dtAnimStyle, { pointerEvents: "none" }]}>
          <Ionicons name="heart" size={96} color="#FF2D55" />
        </Animated.View>

        {/* Pause indicator */}
        {paused && isActive && (
          <View style={[styles.centerOverlay, { pointerEvents: "none" }]}>
            <View style={styles.pauseCircle}>
              <Ionicons name="play" size={30} color="#fff" style={{ marginLeft: 3 }} />
            </View>
          </View>
        )}

        {/* Buffering — delayed 400 ms to avoid flash on fast networks */}
        {showBuffering && isActive && !paused && (
          <View style={[styles.centerOverlay, { pointerEvents: "none" } as any]}>
            <ActivityIndicator size="large" color="rgba(255,255,255,0.8)" />
          </View>
        )}

        {/* Gradients */}
        <TopGradient />
        <GradientOverlay />

        {/* ── Bottom-left: author + caption + audio ─────────────────────────── */}
        <View style={[styles.bottomArea, { pointerEvents: "box-none" }]}>

          {/* Author row */}
          <TouchableOpacity
            onPress={() => router.push(`/@${item.profile.handle}` as any)}
            style={styles.authorRow}
            activeOpacity={0.8}
          >
            <View style={[styles.avatarRing, { borderColor: accent }]}>
              <Avatar
                uri={item.profile.avatar_url}
                name={item.profile.display_name}
                size={38}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.handle}>@{item.profile.handle}</Text>
              <Text style={styles.displayName} numberOfLines={1}>{item.profile.display_name}</Text>
            </View>
            {!isOwn && !item.following && (
              <TouchableOpacity
                onPress={() => onFollow(item.author_id)}
                style={styles.followBtn}
                activeOpacity={0.8}
              >
                <Text style={styles.followBtnText}>Follow</Text>
              </TouchableOpacity>
            )}
          </TouchableOpacity>

          {/* Caption — expandable */}
          {item.content ? (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => captionLong && setCaptionExpanded((e) => !e)}
              style={{ marginTop: 4 }}
            >
              <Text style={styles.caption} numberOfLines={captionExpanded ? undefined : 2}>
                {item.content}
              </Text>
              {captionLong && !captionExpanded && (
                <Text style={styles.captionMore}>more</Text>
              )}
            </TouchableOpacity>
          ) : null}

          {/* Audio / music name */}
          {item.audio_name ? (
            <View style={styles.audioRow}>
              <Ionicons name="musical-notes" size={12} color="rgba(255,255,255,0.75)" />
              <Text style={styles.audioName} numberOfLines={1}>{item.audio_name}</Text>
            </View>
          ) : null}

          {/* View count */}
          {item.view_count > 0 ? (
            <View style={styles.viewRow}>
              <Ionicons name="eye-outline" size={11} color="rgba(255,255,255,0.38)" />
              <Text style={styles.viewText}>{fmt(item.view_count)} views</Text>
            </View>
          ) : null}
        </View>

        {/* ── Right action rail ─────────────────────────────────────────────── */}
        <View style={[styles.rightCol, { pointerEvents: "box-none" }]}>

          {/* Like */}
          <View style={styles.actionItem}>
            <Animated.View style={heartAnimStyle}>
              <TouchableOpacity onPress={handleLikeTap} hitSlop={12} activeOpacity={0.8}>
                <Ionicons
                  name={item.liked ? "heart" : "heart-outline"}
                  size={32}
                  color={item.liked ? "#FF2D55" : "#fff"}
                />
              </TouchableOpacity>
            </Animated.View>
            <Text style={styles.actionLabel}>{fmt(item.likeCount)}</Text>
          </View>

          {/* Comment */}
          <View style={styles.actionItem}>
            <TouchableOpacity
              onPress={() => router.push({ pathname: "/video/[id]", params: { id: item.id } })}
              hitSlop={12}
              activeOpacity={0.8}
            >
              <Ionicons name="chatbubble-ellipses" size={28} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.actionLabel}>{fmt(item.replyCount)}</Text>
          </View>

          {/* Bookmark */}
          <View style={styles.actionItem}>
            <TouchableOpacity
              onPress={() => onBookmark(item.id, item.bookmarked)}
              hitSlop={12}
              activeOpacity={0.8}
            >
              <Ionicons
                name={item.bookmarked ? "bookmark" : "bookmark-outline"}
                size={28}
                color={item.bookmarked ? accent : "#fff"}
              />
            </TouchableOpacity>
          </View>

          {/* Share */}
          <View style={styles.actionItem}>
            <TouchableOpacity
              onPress={() => onShare(item)}
              hitSlop={12}
              activeOpacity={0.8}
            >
              <Ionicons name="arrow-redo-outline" size={28} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Mute toggle */}
          <View style={styles.actionItem}>
            <TouchableOpacity
              onPress={onToggleMute}
              hitSlop={12}
              activeOpacity={0.8}
            >
              <Ionicons
                name={globalMuted ? "volume-mute" : "volume-high"}
                size={24}
                color="rgba(255,255,255,0.8)"
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Progress bar ──────────────────────────────────────────────────── */}
        <View style={[styles.progressTrack, { pointerEvents: "none" }]}>
          <Animated.View style={[styles.progressFill, progressBarStyle]} />
        </View>
        {duration > 0 && (
          <Text style={[styles.durationLabel, { pointerEvents: "none" }]}>
            {fmtDur(duration)}
          </Text>
        )}
      </View>
    );
  },
  (prev, next) =>
    prev.isActive === next.isActive &&
    prev.isNearActive === next.isNearActive &&
    prev.screenW === next.screenW &&
    prev.screenH === next.screenH &&
    prev.globalMuted === next.globalMuted &&
    prev.item.id === next.item.id &&
    prev.item.liked === next.item.liked &&
    prev.item.bookmarked === next.item.bookmarked &&
    prev.item.likeCount === next.item.likeCount &&
    prev.item.replyCount === next.item.replyCount &&
    prev.item.following === next.item.following &&
    prev.item.view_count === next.item.view_count,
);

// ─── VideoFeed ────────────────────────────────────────────────────────────────

type Props = { tabBarHeight?: number };

export default function VideoFeed({ tabBarHeight = 52 }: Props) {
  const { user, profile } = useAuth();
  const { accent } = useAppAccent();
  const insets = useSafeAreaInsets();
  const { width: SCREEN_W, height: SCREEN_H } = useWindowDimensions();

  const ITEM_H = SCREEN_H - tabBarHeight;

  const [tab, setTab] = useState<FeedTab>("for_you");
  const [posts, setPosts] = useState<VideoPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [globalMuted, setGlobalMuted] = useState(Platform.OS === "web");

  const cursorRef       = useRef<string | null>(null);
  const loadingMoreRef  = useRef(false);
  const hasMoreRef      = useRef(true);
  const postsLenRef     = useRef(0);
  const activeIndexRef  = useRef(0);
  const tabRef          = useRef<FeedTab>("for_you");

  useEffect(() => { hasMoreRef.current = hasMore; }, [hasMore]);
  useEffect(() => { postsLenRef.current = posts.length; }, [posts.length]);
  useEffect(() => { tabRef.current = tab; }, [tab]);

  // ── Data fetch + algorithm ────────────────────────────────────────────────

  const fetchVideos = useCallback(
    async (cursor?: string | null) => {
      const currentTab = tabRef.current;

      if (cursor) {
        if (loadingMoreRef.current) return;
        loadingMoreRef.current = true;
        setLoadingMore(true);
      } else {
        setLoading(true);
        cursorRef.current = null;
      }

      try {
        // ── For You: wide pool → score → diversify ──────────────────────────
        if (currentTab === "for_you" && !cursor) {
          const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

          const { data: raw } = await supabase
            .from("posts")
            .select(`id, author_id, content, video_url, image_url, audio_name, created_at, view_count,
                     profiles!posts_author_id_fkey(display_name, handle, avatar_url)`)
            .eq("post_type", "video")
            .eq("visibility", "public")
            .not("video_url", "is", null)
            .gte("created_at", thirtyDaysAgo)
            .order("created_at", { ascending: false })
            .limit(FOR_YOU_POOL);

          if (!raw || raw.length === 0) {
            setPosts([]);
            setLoading(false);
            return;
          }

          const postIds = raw.map((p: any) => p.id as string);
          const authorIds = [...new Set(raw.map((p: any) => p.author_id as string))];

          const [
            { data: likesData },
            { data: repliesData },
            { data: viewsData },
            { data: myLikes },
            { data: myBookmarks },
            { data: myFollows },
          ] = await Promise.all([
            supabase.from("post_acknowledgments").select("post_id").in("post_id", postIds),
            supabase.from("post_replies").select("post_id").in("post_id", postIds),
            supabase.from("post_views").select("post_id").in("post_id", postIds),
            user
              ? supabase.from("post_acknowledgments").select("post_id").in("post_id", postIds).eq("user_id", user.id)
              : Promise.resolve({ data: [] as any[] }),
            user
              ? supabase.from("post_bookmarks").select("post_id").in("post_id", postIds).eq("user_id", user.id)
              : Promise.resolve({ data: [] as any[] }),
            user
              ? supabase.from("follows").select("following_id").eq("follower_id", user.id).in("following_id", authorIds)
              : Promise.resolve({ data: [] as any[] }),
          ]);

          const likeMap: Record<string, number> = {};
          for (const l of (likesData || [])) likeMap[(l as any).post_id] = (likeMap[(l as any).post_id] || 0) + 1;
          const replyMap: Record<string, number> = {};
          for (const r of (repliesData || [])) replyMap[(r as any).post_id] = (replyMap[(r as any).post_id] || 0) + 1;
          const viewMap: Record<string, number> = {};
          for (const v of (viewsData || [])) viewMap[(v as any).post_id] = (viewMap[(v as any).post_id] || 0) + 1;
          const myLikeSet = new Set((myLikes || []).map((l: any) => l.post_id as string));
          const myBookmarkSet = new Set((myBookmarks || []).map((b: any) => b.post_id as string));
          const followedSet = new Set((myFollows || []).map((f: any) => f.following_id as string));

          const [learnedWeights, seenVideoIds] = await Promise.all([
            getLearnedInterestBoosts(),
            getSeenVideoIds(),
          ]);

          const authorPageCount: Record<string, number> = {};
          for (const p of raw) authorPageCount[(p as any).author_id] = (authorPageCount[(p as any).author_id] || 0) + 1;

          type ScoredVideo = VideoPost & { score: number };

          const scored: ScoredVideo[] = raw.map((p: any) => {
            const lc = likeMap[p.id] || 0;
            const rc = replyMap[p.id] || 0;
            const vc = viewMap[p.id] || (p.view_count ?? 0);
            const interestMatches = matchInterestsWeighted(p.content || "", [], learnedWeights);
            const isSeen = seenVideoIds.has(p.id);
            const hashtags = extractHashtags(p.content || "");
            const engagementRate = lc / Math.max(vc, 1);
            const completionProxy = Math.min(lc / Math.max(vc, 0.5), 1);
            const signals: FeedSignals = {
              likeCount: lc,
              replyCount: rc,
              viewCount: vc,
              createdAt: p.created_at,
              interestMatches,
              isFollowing: followedSet.has(p.author_id),
              authorInteractionCount: myLikeSet.has(p.id) ? 3 : 0,
              isVerified: false,
              isOrgVerified: false,
              hasImages: !!p.image_url,
              sameCountry: false,
              authorPostCountInFeed: authorPageCount[p.author_id] || 1,
              contentLength: (p.content || "").length,
              postType: "video",
              isSeen,
              engagementRate,
              hashtagCount: hashtags.length,
              completionProxy,
            };
            return {
              id: p.id,
              author_id: p.author_id,
              content: p.content || "",
              video_url: p.video_url,
              image_url: p.image_url || null,
              audio_name: p.audio_name || null,
              created_at: p.created_at,
              view_count: vc,
              profile: {
                display_name: p.profiles?.display_name || "User",
                handle: p.profiles?.handle || "user",
                avatar_url: p.profiles?.avatar_url || null,
              },
              liked: myLikeSet.has(p.id),
              bookmarked: myBookmarkSet.has(p.id),
              likeCount: lc,
              replyCount: rc,
              following: followedSet.has(p.author_id),
              score: computeFeedScore(signals),
            };
          });

          const diversified = diversifyFeed(scored);
          const page = diversified.slice(0, PAGE_SIZE * 3);

          // Mark shown videos as seen so next refresh surfaces fresh content
          markVideosSeen(page.map((v) => v.id)).catch(() => {});

          setHasMore(diversified.length > PAGE_SIZE * 3);
          hasMoreRef.current = diversified.length > PAGE_SIZE * 3;
          // Store remainder for load-more without re-fetching
          remainderRef.current = diversified.slice(PAGE_SIZE * 3);
          cursorRef.current = page[page.length - 1]?.created_at ?? null;
          setPosts(page);
          setLoading(false);
          return;
        }

        // ── Load-more from remainder (For You) ─────────────────────────────
        if (currentTab === "for_you" && cursor) {
          const remainder = remainderRef.current;
          if (remainder.length > 0) {
            const next = remainder.slice(0, PAGE_SIZE);
            remainderRef.current = remainder.slice(PAGE_SIZE);
            setHasMore(remainderRef.current.length > 0);
            hasMoreRef.current = remainderRef.current.length > 0;
            setPosts((prev) => {
              const seen = new Set(prev.map((p) => p.id));
              return [...prev, ...next.filter((p) => !seen.has(p.id))];
            });
          } else {
            setHasMore(false);
            hasMoreRef.current = false;
          }
          loadingMoreRef.current = false;
          setLoadingMore(false);
          return;
        }

        // ── Following tab: cursor-paginated chronological ───────────────────
        if (currentTab === "following") {
          if (!user) {
            setPosts([]);
            setLoading(false);
            return;
          }

          // Fetch followed user IDs
          const { data: followData } = await supabase
            .from("follows")
            .select("following_id")
            .eq("follower_id", user.id);
          const followingIds = (followData || []).map((f: any) => f.following_id as string);

          if (followingIds.length === 0) {
            setPosts([]);
            setLoading(false);
            return;
          }

          let query = supabase
            .from("posts")
            .select(`id, author_id, content, video_url, image_url, audio_name, created_at, view_count,
                     profiles!posts_author_id_fkey(display_name, handle, avatar_url)`)
            .eq("post_type", "video")
            .in("author_id", followingIds)
            .or("visibility.eq.public,visibility.eq.followers,visibility.is.null")
            .not("video_url", "is", null)
            .order("created_at", { ascending: false })
            .limit(PAGE_SIZE);

          if (cursor) query = (query as any).lt("created_at", cursor);

          const { data } = await query;

          if (!data || data.length === 0) {
            setHasMore(false);
            hasMoreRef.current = false;
            if (!cursor) setPosts([]);
            loadingMoreRef.current = false;
            setLoadingMore(false);
            setLoading(false);
            return;
          }

          const postIds = data.map((p: any) => p.id as string);
          const authorIds = [...new Set(data.map((p: any) => p.author_id as string))];

          const [
            { data: likesData },
            { data: repliesData },
            { data: myLikes },
            { data: myBookmarks },
            { data: myFollows },
          ] = await Promise.all([
            supabase.from("post_acknowledgments").select("post_id").in("post_id", postIds),
            supabase.from("post_replies").select("post_id").in("post_id", postIds),
            supabase.from("post_acknowledgments").select("post_id").in("post_id", postIds).eq("user_id", user.id),
            supabase.from("post_bookmarks").select("post_id").in("post_id", postIds).eq("user_id", user.id),
            supabase.from("follows").select("following_id").eq("follower_id", user.id).in("following_id", authorIds),
          ]);

          const likeMap: Record<string, number> = {};
          for (const l of (likesData || [])) likeMap[(l as any).post_id] = (likeMap[(l as any).post_id] || 0) + 1;
          const replyMap: Record<string, number> = {};
          for (const r of (repliesData || [])) replyMap[(r as any).post_id] = (replyMap[(r as any).post_id] || 0) + 1;
          const myLikeSet = new Set((myLikes || []).map((l: any) => l.post_id as string));
          const myBookmarkSet = new Set((myBookmarks || []).map((b: any) => b.post_id as string));
          const followedSet = new Set((myFollows || []).map((f: any) => f.following_id as string));

          const enriched: VideoPost[] = data.map((p: any) => ({
            id: p.id,
            author_id: p.author_id,
            content: p.content || "",
            video_url: p.video_url,
            image_url: p.image_url || null,
            audio_name: p.audio_name || null,
            created_at: p.created_at,
            view_count: p.view_count || 0,
            profile: {
              display_name: p.profiles?.display_name || "User",
              handle: p.profiles?.handle || "user",
              avatar_url: p.profiles?.avatar_url || null,
            },
            liked: myLikeSet.has(p.id),
            bookmarked: myBookmarkSet.has(p.id),
            likeCount: likeMap[p.id] || 0,
            replyCount: replyMap[p.id] || 0,
            following: followedSet.has(p.author_id),
          }));

          const more = data.length === PAGE_SIZE;
          cursorRef.current = data[data.length - 1]?.created_at ?? null;
          setHasMore(more);
          hasMoreRef.current = more;

          if (cursor) {
            setPosts((prev) => {
              const seen = new Set(prev.map((p) => p.id));
              return [...prev, ...enriched.filter((p) => !seen.has(p.id))];
            });
          } else {
            setPosts(enriched);
          }

          setLoading(false);
          loadingMoreRef.current = false;
          setLoadingMore(false);
        }
      } catch (_) {
        setLoading(false);
        loadingMoreRef.current = false;
        setLoadingMore(false);
      }
    },
    [user],
  );

  // Store For You remainder between pages (avoids re-fetching the pool)
  const remainderRef = useRef<VideoPost[]>([]);

  useEffect(() => {
    remainderRef.current = [];
    cursorRef.current = null;
    setPosts([]);
    setActiveIndex(0);
    fetchVideos();
  }, [tab, fetchVideos]);

  // ── Interactions ──────────────────────────────────────────────────────────

  const handleLike = useCallback(
    async (postId: string, currentlyLiked: boolean) => {
      if (!user) { router.push("/(auth)/login" as any); return; }
      const post = posts.find((p) => p.id === postId);
      if (!post) return;

      if (currentlyLiked) {
        await supabase.from("post_acknowledgments").delete()
          .eq("post_id", postId).eq("user_id", user.id);
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId ? { ...p, liked: false, likeCount: Math.max(0, p.likeCount - 1) } : p
          )
        );
      } else {
        await supabase.from("post_acknowledgments").upsert(
          { post_id: postId, user_id: user.id },
          { onConflict: "post_id,user_id", ignoreDuplicates: true }
        );
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId ? { ...p, liked: true, likeCount: p.likeCount + 1 } : p
          )
        );
        if (post.author_id !== user.id) {
          notifyPostLike({
            postAuthorId: post.author_id,
            likerName: profile?.display_name || "Someone",
            likerUserId: user.id,
            postId,
          });
        }
      }
    },
    [user, profile, posts],
  );

  const handleFollow = useCallback(
    async (authorId: string) => {
      if (!user) { router.push("/(auth)/login" as any); return; }
      setPosts((prev) =>
        prev.map((p) => (p.author_id === authorId ? { ...p, following: true } : p))
      );
      await supabase.from("follows").insert({ follower_id: user.id, following_id: authorId });
      try {
        notifyNewFollow({ targetUserId: authorId, followerName: profile?.display_name || "Someone", followerUserId: user.id });
      } catch (_) {}
      try {
        const { rewardXp } = await import("../lib/rewardXp");
        rewardXp("follow_user");
      } catch (_) {}
    },
    [user, profile],
  );

  const recordedViews = useRef(new Set<string>());
  const handleView = useCallback(
    async (postId: string) => {
      if (!user || recordedViews.current.has(postId)) return;
      recordedViews.current.add(postId);
      supabase.from("post_views")
        .upsert({ post_id: postId, viewer_id: user.id }, { onConflict: "post_id,viewer_id" })
        .then(null, () => {});
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, view_count: p.view_count + 1 } : p))
      );
    },
    [user],
  );

  const handleBookmark = useCallback(
    async (postId: string, currentlyBookmarked: boolean) => {
      if (!user) { router.push("/(auth)/login" as any); return; }
      if (currentlyBookmarked) {
        await supabase.from("post_bookmarks").delete().eq("post_id", postId).eq("user_id", user.id);
        setPosts((prev) =>
          prev.map((p) => (p.id === postId ? { ...p, bookmarked: false } : p))
        );
      } else {
        await supabase.from("post_bookmarks").upsert(
          { post_id: postId, user_id: user.id },
          { onConflict: "post_id,user_id", ignoreDuplicates: true }
        );
        setPosts((prev) =>
          prev.map((p) => (p.id === postId ? { ...p, bookmarked: true } : p))
        );
      }
    },
    [user],
  );

  const handleShare = useCallback(
    (item: VideoPost) => {
      shareVideo({
        postId: item.id,
        authorName: item.profile.display_name,
        caption: item.content,
      }).catch(() => {});
    },
    [],
  );

  const handleToggleMute = useCallback(() => setGlobalMuted((m) => !m), []);

  // ── FlatList config ───────────────────────────────────────────────────────

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index !== null) {
        const idx = viewableItems[0].index!;
        activeIndexRef.current = idx;
        setActiveIndex(idx);
      }
    }
  ).current;

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;

  const getItemLayout = useCallback(
    (_: any, index: number) => ({ length: ITEM_H, offset: ITEM_H * index, index }),
    [ITEM_H],
  );

  const stableOnLike     = useCallback(handleLike, [handleLike]);
  const stableOnFollow   = useCallback(handleFollow, [handleFollow]);
  const stableOnView     = useCallback(handleView, [handleView]);
  const stableOnBookmark = useCallback(handleBookmark, [handleBookmark]);
  const stableOnShare    = useCallback(handleShare, [handleShare]);

  const renderItem = useCallback(
    ({ item, index }: { item: VideoPost; index: number }) => (
      <VideoItem
        item={item}
        isActive={index === activeIndexRef.current}
        isNearActive={Math.abs(index - activeIndexRef.current) <= 1}
        screenW={SCREEN_W}
        screenH={ITEM_H}
        globalMuted={globalMuted}
        onLike={stableOnLike}
        onFollow={stableOnFollow}
        onView={stableOnView}
        onBookmark={stableOnBookmark}
        onShare={stableOnShare}
        onToggleMute={handleToggleMute}
        currentUserId={user?.id}
      />
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [SCREEN_W, ITEM_H, globalMuted, stableOnLike, stableOnFollow, stableOnView, stableOnBookmark, stableOnShare, handleToggleMute, user?.id],
  );

  const onEndReached = useCallback(() => {
    if (!loadingMoreRef.current && hasMore && cursorRef.current) {
      fetchVideos(cursorRef.current);
    }
  }, [hasMore, fetchVideos]);

  // ── Tab switcher ──────────────────────────────────────────────────────────

  const TAB_TOP = insets.top + 8;

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) return <VideoFeedSkeleton />;

  if (posts.length === 0) {
    return (
      <View style={[styles.center, { flex: 1, backgroundColor: "#000" }]}>
        {/* Tab bar shown even on empty state */}
        <View style={[styles.tabBar, { top: TAB_TOP, pointerEvents: "box-none" } as any]}>
          <TabBtn label="For You" active={tab === "for_you"} onPress={() => setTab("for_you")} />
          <TabBtn label="Following" active={tab === "following"} onPress={() => setTab("following")} />
        </View>
        <View style={styles.emptyIcon}>
          <Ionicons name="videocam-outline" size={44} color="rgba(255,255,255,0.25)" />
        </View>
        <Text style={styles.emptyTitle}>
          {tab === "following" && !user
            ? "Sign in to see videos from\npeople you follow"
            : tab === "following"
            ? "No videos from people you follow yet"
            : "No videos yet"}
        </Text>
        <Text style={styles.emptySubtitle}>
          {tab === "following" && !user
            ? ""
            : "Be the first to post!"}
        </Text>
        {tab === "following" && !user && (
          <TouchableOpacity
            style={[styles.postBtn, { backgroundColor: accent }]}
            onPress={() => router.push("/(auth)/login" as any)}
          >
            <Text style={styles.postBtnText}>Sign In</Text>
          </TouchableOpacity>
        )}
        {tab === "for_you" && user && (
          <TouchableOpacity
            style={[styles.postBtn, { backgroundColor: accent }]}
            onPress={() => router.push("/moments/create-video" as any)}
          >
            <Text style={styles.postBtnText}>Post a Video</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <FlatList
        data={posts}
        keyExtractor={(p) => p.id}
        renderItem={renderItem}
        extraData={[activeIndex, globalMuted]}
        snapToInterval={ITEM_H}
        snapToAlignment="start"
        disableIntervalMomentum
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        getItemLayout={getItemLayout}
        windowSize={3}
        initialNumToRender={1}
        maxToRenderPerBatch={2}
        updateCellsBatchingPeriod={50}
        removeClippedSubviews={false}
        onEndReached={onEndReached}
        onEndReachedThreshold={2}
        style={{ flex: 1, backgroundColor: "#000" }}
        contentContainerStyle={{ backgroundColor: "#000" }}
        ListFooterComponent={
          loadingMore ? (
            <View style={[styles.center, { height: ITEM_H, backgroundColor: "#000" }]}>
              <ActivityIndicator size="large" color="rgba(255,255,255,0.4)" />
            </View>
          ) : null
        }
      />

      {/* "For You / Following" tab bar — overlaid on top of feed */}
      <View
        style={[styles.tabBar, { top: TAB_TOP, pointerEvents: "box-none" } as any]}
      >
        <TabBtn label="For You"   active={tab === "for_you"}   onPress={() => setTab("for_you")}   />
        <TabBtn label="Following" active={tab === "following"} onPress={() => setTab("following")} />
      </View>
    </View>
  );
}

// ─── Tab button ───────────────────────────────────────────────────────────────

function TabBtn({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.tabBtn} activeOpacity={0.8}>
      <Text style={[styles.tabBtnText, active && styles.tabBtnTextActive]}>
        {label}
      </Text>
      {active && <View style={styles.tabUnderline} />}
    </TouchableOpacity>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  item: {
    backgroundColor: "#000",
    overflow: "hidden",
  },
  center: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#000",
  },
  centerOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  topGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 120,
    pointerEvents: "none",
  } as any,
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.05)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
    marginTop: 80,
  },
  emptyTitle: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    marginTop: 4,
    textAlign: "center",
    paddingHorizontal: 32,
  },
  emptySubtitle: {
    color: "rgba(255,255,255,0.35)",
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    marginTop: 4,
  },
  postBtn: {
    marginTop: 24,
    paddingHorizontal: 28,
    paddingVertical: 13,
    borderRadius: 99,
  },
  postBtnText: {
    color: "#fff",
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
  },
  pauseCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "rgba(0,0,0,0.38)",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  gradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 420,
  },
  bottomArea: {
    position: "absolute",
    bottom: 68,
    left: 14,
    right: 86,
    gap: 4,
  },
  authorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  avatarRing: {
    borderWidth: 2,
    borderRadius: 24,
    padding: 1,
  },
  handle: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    ...Platform.select({
      web: { textShadow: "0 1px 4px rgba(0,0,0,0.7)" } as any,
      default: { textShadowColor: "rgba(0,0,0,0.7)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
    }),
  },
  displayName: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 1,
  },
  followBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 99,
    borderWidth: 1.2,
    borderColor: "rgba(255,255,255,0.55)",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  followBtnText: {
    color: "#fff",
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  caption: {
    color: "rgba(255,255,255,0.92)",
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 19,
    ...Platform.select({
      web: { textShadow: "0 1px 4px rgba(0,0,0,0.7)" } as any,
      default: { textShadowColor: "rgba(0,0,0,0.7)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
    }),
  },
  captionMore: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    marginTop: 1,
  },
  audioRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 2,
  },
  audioName: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    flexShrink: 1,
    ...Platform.select({
      web: { textShadow: "0 1px 3px rgba(0,0,0,0.6)" } as any,
      default: { textShadowColor: "rgba(0,0,0,0.6)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
    }),
  },
  viewRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  viewText: {
    color: "rgba(255,255,255,0.38)",
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  rightCol: {
    position: "absolute",
    bottom: 80,
    right: 12,
    gap: 20,
    alignItems: "center",
  },
  actionItem: {
    alignItems: "center",
    gap: 3,
  },
  actionLabel: {
    color: "#fff",
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    ...Platform.select({
      web: { textShadow: "0 1px 3px rgba(0,0,0,0.6)" } as any,
      default: { textShadowColor: "rgba(0,0,0,0.6)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
    }),
  },
  progressTrack: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "rgba(255,255,255,0.85)",
    borderRadius: 1.5,
  },
  durationLabel: {
    position: "absolute",
    bottom: 6,
    right: 10,
    color: "rgba(255,255,255,0.45)",
    fontSize: 10,
    fontFamily: "Inter_400Regular",
  },
  // Tab bar
  tabBar: {
    position: "absolute",
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 0,
    zIndex: 20,
  },
  tabBtn: {
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 6,
  },
  tabBtnText: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    ...Platform.select({
      web: { textShadow: "0 1px 4px rgba(0,0,0,0.8)" } as any,
      default: { textShadowColor: "rgba(0,0,0,0.8)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
    }),
  },
  tabBtnTextActive: {
    color: "#fff",
    fontSize: 16,
  },
  tabUnderline: {
    marginTop: 3,
    width: 24,
    height: 2.5,
    borderRadius: 2,
    backgroundColor: "#fff",
  },
});
