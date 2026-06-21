// Vercel Serverless Function — Open Graph metadata
// Handles:  /p/:id      → ?type=post&id=:id
//           /video/:id  → ?type=video&id=:id

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL  || process.env.SUPABASE_URL  || "";
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";
const SITE_ORIGIN  = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : (process.env.EXPO_PUBLIC_DOMAIN ? `https://${process.env.EXPO_PUBLIC_DOMAIN}` : "https://afuchat.com");
const APP_NAME     = "AfuChat";
const LOGO_URL     = `${SITE_ORIGIN}/assets/logo.png`;
const DEFAULT_DESC = "AfuChat \u2014 Connect, Share & Discover";

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
  return String(s ?? "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function buildHtml(meta) {
  const { title, description, image, url, type = "website" } = meta;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}" />
  <meta property="og:type"        content="${esc(type)}" />
  <meta property="og:title"       content="${esc(title)}" />
  <meta property="og:description" content="${esc(description)}" />
  <meta property="og:url"         content="${esc(url)}" />
  <meta property="og:image"       content="${esc(image)}" />
  <meta property="og:site_name"   content="${esc(APP_NAME)}" />
  <meta name="twitter:card"        content="summary_large_image" />
  <meta name="twitter:title"       content="${esc(title)}" />
  <meta name="twitter:description" content="${esc(description)}" />
  <meta name="twitter:image"       content="${esc(image)}" />
  <meta http-equiv="refresh" content="0;url=${esc(url)}" />
  <script>window.location.replace(${JSON.stringify(url)});</script>
</head>
<body><p>Redirecting to <a href="${esc(url)}">${esc(title)}</a>\u2026</p></body>
</html>`;
}

module.exports = async function handler(req, res) {
  const { type, id } = req.query;

  if (!id) { res.status(400).send("Missing id"); return; }

  try {
    if (type === "post") {
      const post = await supa(
        "posts",
        `id=eq.${encodeURIComponent(id)}&select=id,content,article_title,image_url,post_type,profiles(display_name,handle)`,
      );
      const author  = post?.profiles?.display_name || post?.profiles?.handle || APP_NAME;
      const title   = post?.article_title || `${author} on ${APP_NAME}`;
      const desc    = (post?.content || DEFAULT_DESC).slice(0, 200);
      const image   = post?.image_url || LOGO_URL;
      const pageUrl = `${SITE_ORIGIN}/p/${id}`;
      res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=3600");
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.send(buildHtml({ title, description: desc, image, url: pageUrl, type: "article" }));
      return;
    }

    if (type === "video") {
      const video = await supa(
        "posts",
        `id=eq.${encodeURIComponent(id)}&select=id,content,article_title,image_url,thumbnail_url,profiles(display_name,handle)`,
      );
      const author  = video?.profiles?.display_name || video?.profiles?.handle || APP_NAME;
      const title   = video?.article_title || `${author}'s video on ${APP_NAME}`;
      const desc    = (video?.content || DEFAULT_DESC).slice(0, 200);
      const image   = video?.thumbnail_url || video?.image_url || LOGO_URL;
      const pageUrl = `${SITE_ORIGIN}/video/${id}`;
      res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=3600");
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.send(buildHtml({ title, description: desc, image, url: pageUrl, type: "video.other" }));
      return;
    }

    res.setHeader("Cache-Control", "s-maxage=60");
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(buildHtml({ title: APP_NAME, description: DEFAULT_DESC, image: LOGO_URL, url: SITE_ORIGIN }));
  } catch (err) {
    console.error("[og] error:", err);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(buildHtml({ title: APP_NAME, description: DEFAULT_DESC, image: LOGO_URL, url: SITE_ORIGIN }));
  }
};
