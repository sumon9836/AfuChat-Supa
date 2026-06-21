// Vercel Serverless Function — Video embed player
// Handles: /video/:id/embed → ?id=:id

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL  || process.env.SUPABASE_URL  || "";
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";
const SITE_ORIGIN  = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : (process.env.EXPO_PUBLIC_DOMAIN ? `https://${process.env.EXPO_PUBLIC_DOMAIN}` : "https://afuchat.com");
const APP_NAME     = "AfuChat";

async function supa(table, query) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;
  const url = `${SUPABASE_URL}/rest/v1/${table}?${query}&limit=1`;
  const res = await fetch(url, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      Accept: "application/json",
    },
  });
  if (!res.ok) return null;
  const rows = await res.json();
  return rows?.[0] ?? null;
}

function esc(s) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

module.exports = async function handler(req, res) {
  const { id } = req.query;

  if (!id) { res.status(400).send("Missing id"); return; }

  let videoUrl   = "";
  let thumbUrl   = "";
  let title      = "Video";
  let authorName = APP_NAME;

  try {
    const video = await supa(
      "posts",
      `id=eq.${encodeURIComponent(id)}&select=id,content,article_title,image_url,thumbnail_url,video_url,profiles(display_name,handle)`,
    );
    if (video) {
      videoUrl   = video.video_url   || video.image_url || "";
      thumbUrl   = video.thumbnail_url || video.image_url || "";
      title      = video.article_title || (video.content || "").slice(0, 80) || "Video";
      authorName = video.profiles?.display_name || video.profiles?.handle || APP_NAME;
    }
  } catch (err) {
    console.error("[embed] fetch error:", err);
  }

  const pageUrl = `${SITE_ORIGIN}/video/${id}`;

  res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=3600");
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${esc(title)} \u2014 ${esc(APP_NAME)}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { width: 100%; height: 100%; background: #000; overflow: hidden; }
    .wrap  { position: relative; width: 100%; height: 100%; display: flex; flex-direction: column; }
    video  { width: 100%; flex: 1; object-fit: contain; background: #000; display: block; }
    .bar   { background: rgba(0,0,0,0.72); padding: 8px 12px; display: flex; align-items: center; gap: 10px; }
    .bar a { color: #fff; text-decoration: none; font-family: -apple-system, sans-serif; font-size: 13px; }
    .title { flex: 1; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .brand { opacity: 0.7; font-size: 12px; white-space: nowrap; }
    .empty { display: flex; align-items: center; justify-content: center; width: 100%; height: 100%;
             font-family: -apple-system, sans-serif; color: #888; font-size: 14px; padding: 24px; text-align: center; }
  </style>
</head>
<body>
  <div class="wrap">
    ${videoUrl
      ? `<video src="${esc(videoUrl)}"${thumbUrl ? ` poster="${esc(thumbUrl)}"` : ""} controls playsinline preload="metadata"></video>`
      : `<div class="empty">Video not available</div>`
    }
    <div class="bar">
      <a href="${esc(pageUrl)}" target="_blank" class="title">${esc(title)}</a>
      <span class="brand">by ${esc(authorName)}</span>
      <a href="${esc(pageUrl)}" target="_blank" class="brand">Watch on ${esc(APP_NAME)}</a>
    </div>
  </div>
</body>
</html>`);
};
