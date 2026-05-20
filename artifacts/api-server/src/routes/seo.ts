import { Router } from "express";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "../lib/constants";

const router = Router();

const B62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
function encodeUuidToShort(uuid: string): string {
  const hex = uuid.replace(/-/g, "");
  let num = BigInt("0x" + hex);
  if (num === 0n) return B62[0];
  let r = "";
  const base = BigInt(B62.length);
  while (num > 0n) { r = B62[Number(num % base)] + r; num = num / base; }
  return r;
}

const supabaseUrl = SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const SITE_URL = "https://afuchat.com";

router.get("/.well-known/assetlinks.json", (_req, res) => {
  // ANDROID_SHA256_FINGERPRINTS: comma-separated list of SHA256 certificate
  // fingerprints for the AfuChat Android app signing keys.
  // Format: "AA:BB:CC:..." (colon-separated hex pairs, uppercase).
  // Include both the Google Play App Signing key AND any debug/upload key.
  // Find your fingerprint in: Google Play Console → Setup → App Signing
  // or by running: eas credentials (for EAS-managed keystore).
  const raw = (process.env.ANDROID_SHA256_FINGERPRINTS || process.env.ANDROID_SHA256_FINGERPRINT || "").trim();
  const fingerprints = raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.includes("TO_BE_CONFIGURED") && !s.includes("PLACEHOLDER"));

  if (fingerprints.length === 0) {
    // No valid fingerprints configured — return 404 so Android does not cache
    // a broken assetlinks.json that would block verification permanently.
    res.status(404).type("application/json").send(JSON.stringify({ error: "ANDROID_SHA256_FINGERPRINTS not configured" }));
    return;
  }

  res.set("Cache-Control", "public, max-age=3600");
  res.type("application/json").send(JSON.stringify([
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: {
        namespace: "android_app",
        package_name: "com.afuchat.app",
        sha256_cert_fingerprints: fingerprints
      }
    }
  ]));
});

router.get("/.well-known/apple-app-site-association", (_req, res) => {
  // APPLE_TEAM_ID: your 10-character Apple Developer Team ID.
  // Find it at: https://developer.apple.com/account → Membership Details.
  const teamId = (process.env.APPLE_TEAM_ID || "").trim();

  if (!teamId || teamId === "TEAMID") {
    res.status(404).type("application/json").send(JSON.stringify({ error: "APPLE_TEAM_ID not configured" }));
    return;
  }

  // Modern AASA format (iOS 13+) using appIDs array and components.
  res.set("Cache-Control", "public, max-age=3600");
  res.type("application/json").send(JSON.stringify({
    applinks: {
      details: [
        {
          appIDs: [`${teamId}.com.afuchat.app`],
          components: [
            { "/": "/*", comment: "Match all paths" }
          ]
        }
      ]
    },
    activitycontinuation: {
      apps: [`${teamId}.com.afuchat.app`]
    },
    webcredentials: {
      apps: [`${teamId}.com.afuchat.app`]
    }
  }));
});

router.get("/robots.txt", (_req, res) => {
  res.set("Cache-Control", "public, max-age=86400");
  res.type("text/plain").send(`User-agent: *
# Allow public content pages (served as server-rendered HTML with full metadata)
Allow: /$
Allow: /@*
Allow: /p/*
Allow: /post/*
Allow: /video/*
Allow: /og/*

# Block authenticated-only and dynamic routes that provide no indexable value
Disallow: /api/
Disallow: /admin/
Disallow: /__mockup/
Disallow: /search
Disallow: /login
Disallow: /register
Disallow: /sign-in
Disallow: /sign-up
Disallow: /messages
Disallow: /chat/
Disallow: /notifications
Disallow: /settings
Disallow: /wallet
Disallow: /games
Disallow: /ai-chat
Disallow: /shop/cart
Disallow: /edit-profile

# Block all query string pages (search results, filters, etc.)
Disallow: /*?*

# Re-allow canonical query-free public pages after the wildcard block above
Allow: /p/*
Allow: /@*

Sitemap: ${SITE_URL}/sitemap.xml
`);
});

router.get("/sitemap.xml", async (_req, res) => {
  const profiles: any[] = [];
  const posts: any[] = [];
  const videos: any[] = [];

  if (supabase) {
    const [profileResult, postResult, videoResult] = await Promise.all([
      supabase
        .from("profiles")
        .select("handle, updated_at")
        .eq("is_private", false)
        .not("handle", "like", "deleted_%")
        .not("handle", "is", null)
        .order("updated_at", { ascending: false })
        .limit(5000),
      supabase
        .from("posts")
        .select("id, created_at, author_id")
        .eq("is_blocked", false)
        .neq("post_type", "video")
        .or("visibility.eq.public,visibility.is.null")
        .order("created_at", { ascending: false })
        .limit(5000),
      supabase
        .from("posts")
        .select("id, content, created_at, author_id, video_thumbnail_url, view_count, profiles!posts_author_id_fkey(handle, display_name, is_private)")
        .eq("is_blocked", false)
        .eq("post_type", "video")
        .or("visibility.eq.public,visibility.is.null")
        .order("created_at", { ascending: false })
        .limit(2000),
    ]);

    profiles.push(...(profileResult.data || []));

    // Only include content from public (non-private) accounts
    const allAuthorIds = [
      ...new Set([
        ...(postResult.data || []).map((p: any) => p.author_id),
        ...(videoResult.data || []).map((p: any) => p.author_id),
      ]),
    ];
    let privateSet = new Set<string>();
    if (allAuthorIds.length > 0) {
      const { data: privateAuthors } = await supabase
        .from("profiles")
        .select("id")
        .eq("is_private", true)
        .in("id", allAuthorIds);
      privateSet = new Set((privateAuthors || []).map((a: any) => a.id));
    }

    posts.push(...(postResult.data || []).filter((p: any) => !privateSet.has(p.author_id)));
    videos.push(
      ...(videoResult.data || []).filter((p: any) => {
        const prof = p.profiles as any;
        return !privateSet.has(p.author_id) && prof && !prof.is_private;
      }),
    );
  }

  const today = new Date().toISOString().split("T")[0];

  const profileUrls = profiles.map((p) => `
  <url>
    <loc>${SITE_URL}/@${encodeURIComponent(p.handle)}</loc>
    <lastmod>${new Date(p.updated_at || Date.now()).toISOString().split("T")[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`).join("");

  const postUrls = posts.map((p) => `
  <url>
    <loc>${SITE_URL}/p/${encodeUuidToShort(p.id)}</loc>
    <lastmod>${new Date(p.created_at || Date.now()).toISOString().split("T")[0]}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>`).join("");

  const videoUrls = videos.map((p) => {
    const prof = p.profiles as any;
    const shortId = encodeUuidToShort(p.id);
    const pageUrl = `${SITE_URL}/video/${shortId}`;
    const thumbUrl = p.video_thumbnail_url || `${SITE_URL}/og-default.png`;
    const title = (p.content || "").slice(0, 100) || `Video by ${prof?.display_name || "AfuChat user"}`;
    const description = (p.content || "").slice(0, 200) || `Watch this video on AfuChat`;
    return `
  <url>
    <loc>${pageUrl}</loc>
    <lastmod>${new Date(p.created_at || Date.now()).toISOString().split("T")[0]}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
    <video:video>
      <video:thumbnail_loc>${thumbUrl}</video:thumbnail_loc>
      <video:title>${title.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</video:title>
      <video:description>${description.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</video:description>
      <video:content_loc>${pageUrl}</video:content_loc>
      <video:player_loc>${pageUrl}/embed</video:player_loc>
      <video:publication_date>${new Date(p.created_at).toISOString()}</video:publication_date>
      ${p.view_count ? `<video:view_count>${p.view_count}</video:view_count>` : ""}
      <video:family_friendly>yes</video:family_friendly>
    </video:video>
  </url>`;
  }).join("");

  res.set("Cache-Control", "public, max-age=3600, stale-while-revalidate=86400");
  res.type("application/xml").send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
        xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">
  <url>
    <loc>${SITE_URL}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${SITE_URL}/terms</loc>
    <changefreq>monthly</changefreq>
    <priority>0.3</priority>
  </url>
  <url>
    <loc>${SITE_URL}/privacy</loc>
    <changefreq>monthly</changefreq>
    <priority>0.3</priority>
  </url>${profileUrls}${postUrls}${videoUrls}
</urlset>`);
});

function ogHtml(params: {
  title: string;
  description: string;
  image?: string;
  url: string;
  type?: string;
  author?: string;
  publishedAt?: string;
  videoUrl?: string;
}): string {
  const { title, description, image = `${SITE_URL}/og-default.png`, url, type = "article", author, publishedAt, videoUrl } = params;
  const hasCustomImage = image !== `${SITE_URL}/og-default.png` && image !== `${SITE_URL}/logo.png`;
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta http-equiv="X-UA-Compatible" content="IE=edge"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}"/>
  <meta name="robots" content="index,follow"/>
  <link rel="canonical" href="${esc(url)}"/>
  <meta property="og:site_name" content="AfuChat"/>
  <meta property="og:type" content="${videoUrl ? "video.other" : type}"/>
  <meta property="og:title" content="${esc(title)}"/>
  <meta property="og:description" content="${esc(description)}"/>
  <meta property="og:image" content="${esc(image)}"/>
  <meta property="og:image:width" content="1200"/>
  <meta property="og:image:height" content="630"/>
  <meta property="og:url" content="${esc(url)}"/>
  ${author ? `<meta property="article:author" content="${esc(author)}"/>` : ""}
  ${publishedAt ? `<meta property="article:published_time" content="${publishedAt}"/>` : ""}
  ${videoUrl ? `<meta property="og:video" content="${esc(videoUrl)}"/>
  <meta property="og:video:secure_url" content="${esc(videoUrl)}"/>
  <meta property="og:video:type" content="video/mp4"/>` : ""}
  <meta name="twitter:card" content="${videoUrl ? "player" : hasCustomImage ? "summary_large_image" : "summary"}"/>
  <meta name="twitter:site" content="@afuchat"/>
  <meta name="twitter:title" content="${esc(title)}"/>
  <meta name="twitter:description" content="${esc(description)}"/>
  <meta name="twitter:image" content="${esc(image)}"/>
  ${videoUrl ? `<meta name="twitter:player" content="${esc(url)}/embed"/>
  <meta name="twitter:player:width" content="360"/>
  <meta name="twitter:player:height" content="640"/>` : ""}
  <script>
    // Redirect to app for non-bot visitors
    var ua = navigator.userAgent;
    var isBot = /bot|crawler|spider|facebookexternalhit|Twitterbot|Slackbot|WhatsApp|Discordbot|LinkedInBot|Pinterest|Telegram/i.test(ua);
    if (!isBot) { window.location.replace(${JSON.stringify(url)}); }
  </script>
</head>
<body>
  <h1>${esc(title)}</h1>
  <p>${esc(description)}</p>
  <p><a href="${esc(url)}">View on AfuChat</a></p>
</body>
</html>`;
}

router.get("/og/post/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { data } = await supabase
      .from("posts")
      .select("id, content, image_url, created_at, article_title, post_images(image_url, display_order), profiles!posts_author_id_fkey(display_name, handle)")
      .eq("id", id)
      .eq("is_blocked", false)
      .single();

    if (!data) { res.status(404).send("Not found"); return; }

    const p = data as any;
    const images: string[] = (p.post_images || []).sort((a: any, b: any) => a.display_order - b.display_order).map((i: any) => i.image_url);
    const coverImage = images[0] || p.image_url || undefined;
    const content = (p.article_title || p.content || "").slice(0, 200);
    const author = p.profiles?.display_name || "AfuChat User";
    const handle = p.profiles?.handle || "user";
    const title = p.article_title
      ? `${p.article_title} — by ${author} on AfuChat`
      : `${author} on AfuChat: "${content.slice(0, 80)}${content.length > 80 ? "…" : ""}"`;
    const url = `${SITE_URL}/p/${encodeUuidToShort(p.id)}`;

    res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600");
    res.type("text/html").send(ogHtml({ title, description: content, image: coverImage, url, author: `${SITE_URL}/@${handle}`, publishedAt: p.created_at }));
  } catch (err) {
    res.status(500).send("Error");
  }
});

router.get("/og/profile/:handle", async (req, res) => {
  try {
    const { handle } = req.params;
    const { data } = await supabase
      .from("profiles")
      .select("id, display_name, handle, bio, avatar_url")
      .eq("handle", handle)
      .eq("is_private", false)
      .single();

    if (!data) { res.status(404).send("Not found"); return; }

    const p = data as any;
    const title = `${p.display_name} (@${p.handle}) — AfuChat`;
    const description = p.bio ? p.bio.slice(0, 200) : `Follow ${p.display_name} on AfuChat.`;
    const url = `${SITE_URL}/@${p.handle}`;

    res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600");
    res.type("text/html").send(ogHtml({ title, description, image: p.avatar_url || undefined, url, type: "profile", author: p.display_name }));
  } catch (err) {
    res.status(500).send("Error");
  }
});

router.get("/og/video/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const uuid = (() => {
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return id;
      try {
        const base = BigInt(B62.length);
        let num = 0n;
        for (const ch of id) { const i = B62.indexOf(ch); if (i < 0) return id; num = num * base + BigInt(i); }
        const hex = num.toString(16).padStart(32, "0");
        return [hex.slice(0,8), hex.slice(8,12), hex.slice(12,16), hex.slice(16,20), hex.slice(20,32)].join("-");
      } catch { return id; }
    })();

    const { data } = await supabase
      .from("posts")
      .select("id, content, video_url, video_thumbnail_url, created_at, profiles!posts_author_id_fkey(display_name, handle)")
      .eq("id", uuid)
      .eq("is_blocked", false)
      .single();

    if (!data) { res.status(404).send("Not found"); return; }

    const p = data as any;
    const author = p.profiles?.display_name || "AfuChat User";
    const handle = p.profiles?.handle || "user";
    const content = (p.content || "").slice(0, 200);
    const title = `${author} on AfuChat: "${(content || "Video").slice(0, 80)}${content.length > 80 ? "…" : ""}"`;
    const description = content || `Watch this video by ${author} on AfuChat.`;
    const shortId = encodeUuidToShort(p.id);
    const url = `${SITE_URL}/video/${shortId}`;

    res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600");
    res.type("text/html").send(ogHtml({
      title,
      description,
      image: p.video_thumbnail_url || undefined,
      url,
      author: `${SITE_URL}/@${handle}`,
      publishedAt: p.created_at,
      videoUrl: p.video_url || undefined,
    }));
  } catch (err) {
    res.status(500).send("Error");
  }
});

export default router;
