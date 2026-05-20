/**
 * Shorts tab — renders the video feed inline, just like Discover or Chats.
 * No navigation. VideoFeed is embedded directly in the tab.
 */
import { VideoFeed } from "@/app/video/[id]";

export default function ShortsTab() {
  return <VideoFeed isEmbedded />;
}
