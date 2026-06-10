import { Router } from "express";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "../lib/constants";

const router = Router();

const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  "";
const supabase = createClient(SUPABASE_URL, supabaseAnonKey);

const BRAND_COLOR = "#00BCD4";
const BRAND_DARK = "#0097A7";
const SITE_NAME = "AfuChat";
const SITE_URL = "https://afuchat.com";

const B62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

function decodeShortId(short: string): string {
  try {
    const base = BigInt(B62.length);
    let num = 0n;
    for (const ch of short) {
      const i = B62.indexOf(ch);
      if (i < 0) return short;
      num = num * base + BigInt(i);
    }
    const hex = num.toString(16).padStart(32, "0");
    return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20, 32)].join("-");
  } catch {
    return short;
  }
}

function encodeUuidToShort(uuid: string): string {
  const hex = uuid.replace(/-/g, "");
  let num = BigInt("0x" + hex);
  if (num === 0n) return B62[0];
  let r = "";
  const base = BigInt(B62.length);
  while (num > 0n) { r = B62[Number(num % base)] + r; num = num / base; }
  return r;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function resolvePostId(param: string): string {
  if (UUID_RE.test(param)) return param;
  return decodeShortId(param);
}

function escapeHtml(s: string): string {
  return (s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function truncate(str: string, len: number): string {
  if (!str || str.length <= len) return str || "";
  return str.substring(0, len - 1).trimEnd() + "\u2026";
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

function readTime(body: string): number {
  const words = (body || "").trim().split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 200));
}

function renderBody(raw: string): string {
  if (!raw) return "";
  let text = raw;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      text = parsed
        .map((block: any) => {
          if (typeof block === "string") return block;
          if (block?.type === "image" && block?.url) {
            return `<img src="${escapeHtml(block.url)}" alt="${escapeHtml(block.caption || "Article image")}" style="max-width:100%;border-radius:10px;margin:16px 0;" loading="lazy" />`;
          }
          return escapeHtml(block?.text || block?.content || "");
        })
        .join("\n");
      return text;
    }
    if (typeof parsed === "object" && parsed !== null) {
      text = parsed.text || parsed.content || raw;
    }
  } catch {
    // not JSON — plain text
  }
  return text
    .split(/\n{2,}/)
    .map((para: string) => `<p>${escapeHtml(para.trim()).replace(/\n/g, "<br/>")}</p>`)
    .join("\n");
}

function renderComments(comments: any[]): string {
  if (!comments.length) return "";
  return comments.map((c) => {
    const author = c.profiles?.display_name || "User";
    const handle = c.profiles?.handle || "user";
    const avatar = c.profiles?.avatar_url || "";
    const body = escapeHtml(c.content || "");
    const ago = timeAgo(c.created_at);
    const profileUrl = `${SITE_URL}/@${handle}`;
    return `
    <div class="comment" itemprop="comment" itemscope itemtype="https://schema.org/Comment">
      <div class="comment-header">
        ${avatar ? `<img src="${escapeHtml(avatar)}" class="comment-avatar" alt="${escapeHtml(author)}" loading="lazy" />` : `<div class="comment-avatar comment-avatar-ph">${escapeHtml(author.charAt(0).toUpperCase())}</div>`}
        <div>
          <a href="${profileUrl}" class="comment-name" itemprop="author" itemscope itemtype="https://schema.org/Person"><span itemprop="name">${escapeHtml(author)}</span></a>
          <span class="comment-handle">@${escapeHtml(handle)} · ${ago}</span>
        </div>
      </div>
      <p class="comment-body" itemprop="text">${body}</p>
      <meta itemprop="datePublished" content="${c.created_at}" />
    </div>`;
  }).join("");
}

function renderArticlePage(post: any, author: any, comments: any[], stats: { likes: number; replies: number }, shortId: string): string {
  const title = escapeHtml(post.article_title || post.content?.slice(0, 100) || "Article");
  const rawBody = post.article_body || post.content || "";
  const bodyHtml = renderBody(rawBody);
  const plainBody = rawBody.replace(/<[^>]+>/g, "").replace(/\{.*?\}/g, "").trim();

  const displayName = escapeHtml(author.display_name || "User");
  const handle = escapeHtml(author.handle || "user");
  const avatarUrl = author.avatar_url || "";
  const coverUrl = post.article_cover_url || "";
  const ogImage = coverUrl || avatarUrl || `${SITE_URL}/og-default.png`;
  const pageUrl = `${SITE_URL}/article/${shortId}`;
  const profileUrl = `${SITE_URL}/@${handle}`;
  const metaDesc = truncate(plainBody.replace(/\n+/g, " "), 200) || `Article by ${author.display_name} on ${SITE_NAME}`;
  const minutes = readTime(plainBody);
  const dateStr = new Date(post.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  const isVerified = author.is_organization_verified || author.is_verified;
  const verifiedBadge = author.is_organization_verified
    ? `<span style="color:#D4A853;font-size:15px;" title="Verified Business">&#10004;</span>`
    : author.is_verified
    ? `<span style="color:${BRAND_COLOR};font-size:15px;" title="Verified">&#10004;</span>`
    : "";

  const commentsHtml = renderComments(comments);

  const images: string[] = [];
  if (coverUrl) images.push(coverUrl);

  const jsonLd: any = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.article_title || truncate(plainBody, 110),
    description: metaDesc,
    articleBody: plainBody.slice(0, 5000),
    url: pageUrl,
    datePublished: post.created_at,
    dateModified: post.created_at,
    image: images.length > 0 ? images : undefined,
    author: {
      "@type": "Person",
      name: author.display_name || "User",
      alternateName: `@${author.handle}`,
      url: profileUrl,
      image: avatarUrl || undefined,
    },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
      logo: { "@type": "ImageObject", url: `${SITE_URL}/logo.png` },
    },
    interactionStatistic: [
      { "@type": "InteractionCounter", interactionType: "https://schema.org/LikeAction", userInteractionCount: stats.likes },
      { "@type": "InteractionCounter", interactionType: "https://schema.org/CommentAction", userInteractionCount: stats.replies },
      { "@type": "InteractionCounter", interactionType: "https://schema.org/WatchAction", userInteractionCount: post.view_count || 0 },
    ],
    ...(comments.length > 0 ? {
      comment: comments.slice(0, 10).map((c) => ({
        "@type": "Comment",
        text: (c.content || "").slice(0, 500),
        datePublished: c.created_at,
        author: {
          "@type": "Person",
          name: c.profiles?.display_name || "User",
          url: `${SITE_URL}/@${c.profiles?.handle || "user"}`,
        },
      })),
    } : {}),
  };

  return `<!DOCTYPE html>
<html lang="en" prefix="og: https://ogp.me/ns#">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title} — ${escapeHtml(author.display_name || "User")} on ${SITE_NAME}</title>
  <meta name="description" content="${escapeHtml(metaDesc)}" />
  <meta name="robots" content="index, follow, max-image-preview:large" />
  <link rel="canonical" href="${pageUrl}" />

  <meta property="og:type" content="article" />
  <meta property="og:title" content="${title} — ${SITE_NAME}" />
  <meta property="og:description" content="${escapeHtml(metaDesc)}" />
  <meta property="og:url" content="${pageUrl}" />
  <meta property="og:site_name" content="${SITE_NAME}" />
  <meta property="og:image" content="${escapeHtml(ogImage)}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="article:published_time" content="${post.created_at}" />
  <meta property="article:author" content="${profileUrl}" />

  <meta name="twitter:card" content="${coverUrl ? "summary_large_image" : "summary"}" />
  <meta name="twitter:title" content="${title} — ${SITE_NAME}" />
  <meta name="twitter:description" content="${escapeHtml(metaDesc)}" />
  <meta name="twitter:image" content="${escapeHtml(ogImage)}" />
  <meta name="twitter:site" content="@afuchat" />
  <meta name="twitter:creator" content="@${handle}" />

  <meta name="theme-color" content="${BRAND_COLOR}" />
  <link rel="icon" type="image/png" href="${SITE_URL}/logo.png" />

  <script type="application/ld+json">${JSON.stringify(jsonLd).replace(/<\//g, "<\\/")}</script>

  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:-apple-system,BlinkMacSystemFont,'Inter','Georgia',serif;background:#0a0a0a;color:#e8eaed;min-height:100vh}
    .top-bar{background:linear-gradient(135deg,${BRAND_COLOR},${BRAND_DARK});padding:14px 20px;text-align:center}
    .top-bar a{color:#fff;text-decoration:none;font-weight:700;font-size:18px}
    .container{max-width:720px;margin:0 auto;padding:20px 16px 48px}
    .cover-img{width:100%;max-height:420px;object-fit:cover;border-radius:12px;display:block;margin-bottom:24px}
    .article-meta{display:flex;align-items:center;gap:12px;margin-bottom:20px}
    .avatar{width:44px;height:44px;border-radius:50%;object-fit:cover;border:2px solid ${BRAND_COLOR}40;flex-shrink:0}
    .avatar-ph{width:44px;height:44px;border-radius:50%;background:${BRAND_COLOR};display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:700;color:#fff;flex-shrink:0}
    .meta-info{flex:1}
    .meta-author{font-weight:700;font-size:15px;color:#fff;display:flex;align-items:center;gap:4px;text-decoration:none}
    .meta-sub{color:#888;font-size:13px;margin-top:2px}
    h1.article-title{font-size:28px;font-weight:800;line-height:1.3;color:#fff;margin-bottom:10px;letter-spacing:-0.3px}
    .article-tagline{color:#aaa;font-size:16px;line-height:1.6;margin-bottom:20px;font-style:italic}
    .article-body{font-size:17px;line-height:1.8;color:#d0d0d0}
    .article-body p{margin-bottom:18px}
    .article-body img{max-width:100%;border-radius:10px;margin:16px 0}
    .stats-row{display:flex;gap:20px;padding:14px 0;border-top:1px solid #1e1e1e;border-bottom:1px solid #1e1e1e;margin:24px 0;color:#888;font-size:14px}
    .stats-row span{display:flex;align-items:center;gap:5px}
    .comments-section{margin-top:28px}
    .comments-title{font-size:17px;font-weight:700;color:#ccc;margin-bottom:16px;font-family:-apple-system,BlinkMacSystemFont,'Inter',sans-serif}
    .comment{background:#141414;border-radius:12px;padding:14px;margin-bottom:10px;border:1px solid #1e1e1e}
    .comment-header{display:flex;align-items:center;gap:10px;margin-bottom:8px}
    .comment-avatar{width:34px;height:34px;border-radius:50%;object-fit:cover;flex-shrink:0}
    .comment-avatar-ph{width:34px;height:34px;border-radius:50%;background:${BRAND_COLOR};display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;color:#fff;flex-shrink:0}
    .comment-name{font-weight:600;font-size:14px;color:#fff;text-decoration:none;font-family:-apple-system,BlinkMacSystemFont,'Inter',sans-serif}
    .comment-handle{color:#666;font-size:12px;display:block;margin-top:1px}
    .comment-body{font-size:14px;line-height:1.6;color:#ccc;font-family:-apple-system,BlinkMacSystemFont,'Inter',sans-serif}
    .cta-section{text-align:center;padding:32px 16px;background:#111;border-radius:16px;margin-top:24px}
    .cta-title{font-size:20px;font-weight:700;color:#fff;margin-bottom:8px;font-family:-apple-system,BlinkMacSystemFont,'Inter',sans-serif}
    .cta-sub{color:#888;font-size:14px;margin-bottom:20px;font-family:-apple-system,BlinkMacSystemFont,'Inter',sans-serif}
    .cta-btn{display:inline-block;padding:13px 36px;background:${BRAND_COLOR};color:#fff;text-decoration:none;border-radius:14px;font-weight:700;font-size:15px;font-family:-apple-system,BlinkMacSystemFont,'Inter',sans-serif}
    .cta-btn:hover{opacity:.85}
    .footer{text-align:center;padding:28px 16px 48px;color:#444;font-size:13px;font-family:-apple-system,BlinkMacSystemFont,'Inter',sans-serif}
    .footer a{color:${BRAND_COLOR};text-decoration:none}
    @media(max-width:480px){h1.article-title{font-size:22px}.article-body{font-size:16px}.container{padding:12px 12px 48px}}
  </style>
</head>
<body>
  <div class="top-bar"><a href="${SITE_URL}">${SITE_NAME}</a></div>
  <div class="container">
    ${coverUrl ? `<img class="cover-img" src="${escapeHtml(coverUrl)}" alt="${title}" />` : ""}

    <article itemscope itemtype="https://schema.org/Article">
      <h1 class="article-title" itemprop="headline">${title}</h1>
      ${plainBody.slice(0, 200) !== plainBody.slice(0, 200) || (post.content && post.article_title && post.content !== post.article_title)
        ? `<p class="article-tagline" itemprop="description">${escapeHtml(truncate(post.content || "", 160))}</p>`
        : ""}

      <div class="article-meta">
        <a href="${profileUrl}" style="text-decoration:none">
          ${avatarUrl
            ? `<img class="avatar" src="${escapeHtml(avatarUrl)}" alt="${displayName}" />`
            : `<div class="avatar-ph">${displayName.charAt(0).toUpperCase()}</div>`}
        </a>
        <div class="meta-info">
          <a href="${profileUrl}" class="meta-author" itemprop="author" itemscope itemtype="https://schema.org/Person">
            <span itemprop="name">${displayName}</span> ${verifiedBadge}
          </a>
          <span class="meta-sub">@${handle} · <time datetime="${post.created_at}" itemprop="datePublished">${dateStr}</time> · ${minutes} min read</span>
        </div>
      </div>

      <div class="article-body" itemprop="articleBody">
        ${bodyHtml}
      </div>

      <div class="stats-row">
        <span>&#10084;&#65039; ${stats.likes.toLocaleString()} likes</span>
        <span>&#128172; ${stats.replies.toLocaleString()} comments</span>
        <span>&#128065;&#65039; ${(post.view_count || 0).toLocaleString()} views</span>
        <span>&#9201; ${minutes} min read</span>
      </div>
      <meta itemprop="url" content="${pageUrl}" />
      ${coverUrl ? `<meta itemprop="image" content="${escapeHtml(coverUrl)}" />` : ""}
    </article>

    ${commentsHtml ? `
    <section class="comments-section" itemscope itemtype="https://schema.org/CommentCollection">
      <h2 class="comments-title">&#128172; Comments (${stats.replies.toLocaleString()})</h2>
      ${commentsHtml}
    </section>` : ""}

    <div class="cta-section">
      <div class="cta-title">Read more articles on AfuChat</div>
      <div class="cta-sub">Join ${displayName} and thousands of writers sharing their stories</div>
      <a href="https://play.google.com/store/apps/details?id=com.afuchat.app" class="cta-btn">Get AfuChat Free</a>
    </div>

    <footer class="footer">
      <p>&copy; ${new Date().getFullYear()} <a href="${SITE_URL}">${SITE_NAME}</a>. All rights reserved.</p>
      <p style="margin-top:6px"><a href="${SITE_URL}/terms">Terms</a> &middot; <a href="${SITE_URL}/privacy">Privacy</a></p>
    </footer>
  </div>
</body>
</html>`;
}

function render404(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Article Not Found - ${SITE_NAME}</title>
  <meta name="robots" content="noindex" />
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:-apple-system,BlinkMacSystemFont,'Inter',sans-serif;background:#0a0a0a;color:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh}
    .wrap{text-align:center;padding:24px}
    h1{font-size:56px;color:${BRAND_COLOR};margin-bottom:12px}
    p{color:#888;font-size:16px;margin-bottom:24px}
    a{color:${BRAND_COLOR};text-decoration:none;font-weight:600}
  </style>
</head>
<body>
  <div class="wrap">
    <h1>404</h1>
    <p>This article doesn't exist or has been removed.</p>
    <a href="${SITE_URL}">Go to AfuChat</a>
  </div>
</body>
</html>`;
}

async function handleArticlePage(param: string, res: any) {
  const postId = resolvePostId(param);
  if (!postId) return res.status(404).send(render404());

  const { data: post } = await supabase
    .from("posts")
    .select("id, content, article_title, article_body, article_cover_url, created_at, author_id, view_count, post_type")
    .eq("id", postId)
    .eq("is_blocked", false)
    .single();

  if (!post) return res.status(404).send(render404());

  const [{ data: author }, { data: likes }, { data: replies }, { data: comments }] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name, handle, avatar_url, is_verified, is_organization_verified, is_private")
      .eq("id", (post as any).author_id)
      .single(),
    supabase.from("post_acknowledgments").select("id", { count: "exact", head: true }).eq("post_id", postId),
    supabase.from("post_replies").select("id", { count: "exact", head: true }).eq("post_id", postId),
    supabase
      .from("post_replies")
      .select("id, content, created_at, profiles!post_replies_author_id_fkey(display_name, handle, avatar_url)")
      .eq("post_id", postId)
      .is("parent_reply_id", null)
      .order("created_at", { ascending: true })
      .limit(20),
  ]);

  if (!author || (author as any).is_private) return res.status(404).send(render404());

  const likeCount = (likes as any)?.count || 0;
  const replyCount = (replies as any)?.count || 0;
  const shortId = encodeUuidToShort((post as any).id);

  res.set("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
  return res.send(renderArticlePage(post, author, comments || [], { likes: likeCount, replies: replyCount }, shortId));
}

router.get("/article/:shortId", async (req, res) => {
  await handleArticlePage(req.params.shortId, res);
});

export default router;
