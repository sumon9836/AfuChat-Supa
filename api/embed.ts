export const config = { runtime: "edge" };

const SUPABASE_URL = "https://rhnsjqqtdzlkvqazfcbg.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJobnNqcXF0ZHpsa3ZxYXpmY2JnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2NzA4NjksImV4cCI6MjA3NzI0Njg2OX0.j8zuszO1K6Apjn-jRiVUyZeqe3Re424xyOho9qDl_oY";

const B62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function decodeShortId(short: string): string {
  if (UUID_RE.test(short)) return short;
  try {
    const base = BigInt(B62.length);
    let num = 0n;
    for (const ch of short) {
      const i = B62.indexOf(ch);
      if (i < 0) return short;
      num = num * base + BigInt(i);
    }
    const hex = num.toString(16).padStart(32, "0");
    return [
      hex.slice(0, 8),
      hex.slice(8, 12),
      hex.slice(12, 16),
      hex.slice(16, 20),
      hex.slice(20, 32),
    ].join("-");
  } catch {
    return short;
  }
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function fetchVideo(postId: string): Promise<{ videoUrl: string; posterUrl: string } | null> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/posts?id=eq.${postId}&post_type=eq.video&select=video_url,image_url,video_thumbnail_url&limit=1`,
    {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    }
  );
  if (!res.ok) return null;
  const json = await res.json();
  const post = Array.isArray(json) ? json[0] : null;
  if (!post?.video_url) return null;
  return {
    videoUrl: post.video_url as string,
    posterUrl: (post.video_thumbnail_url || post.image_url || "") as string,
  };
}

function renderPlayer(videoUrl: string, posterUrl: string): string {
  const v = esc(videoUrl);
  const p = posterUrl ? esc(posterUrl) : "";
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    html,body{width:100%;height:100%;background:#000;overflow:hidden}
    video{width:100%;height:100%;object-fit:contain;display:block}
  </style>
</head>
<body>
  <video
    src="${v}"
    ${p ? `poster="${p}"` : ""}
    controls
    autoplay
    playsinline
    preload="metadata"
  ></video>
</body>
</html>`;
}

export default async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const rawId = url.searchParams.get("id") || "";
  const postId = decodeShortId(rawId);

  try {
    const video = await fetchVideo(postId);
    if (!video) {
      return new Response("Video not found", { status: 404 });
    }

    return new Response(renderPlayer(video.videoUrl, video.posterUrl), {
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "public, s-maxage=300, stale-while-revalidate=600",
        "x-frame-options": "ALLOWALL",
        "content-security-policy": "frame-ancestors *",
      },
    });
  } catch {
    return new Response("Error", { status: 500 });
  }
}
