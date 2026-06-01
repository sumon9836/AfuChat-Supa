import { Router } from "express";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "../lib/constants";

const router = Router();

const supabaseUrl = SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const BRAND_COLOR = "#00BCD4";
const SITE_NAME = "AfuChat";
const SITE_URL = "https://afuchat.com";

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

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderProfilePage(profile: any, posts: any[], isPrivate = false): string {
  const displayName = escapeHtml(profile.display_name || "User");
  const handle = escapeHtml(profile.handle || "");
  const bio = profile.show_bio_publicly === false ? "" : escapeHtml(profile.bio || "");
  const avatarUrl = profile.avatar_url || "";
  const bannerUrl = profile.banner_url || "";
  const websiteUrl = profile.website_url || "";
  const githubUrl = profile.github_url || "";
  const portfolioUrl = profile.portfolio_url || "";
  const developerTagline = escapeHtml(profile.developer_tagline || "");
  const country = escapeHtml(profile.country || "");
  const region = escapeHtml(profile.region || "");
  const location = [region, country].filter(Boolean).join(", ");
  const currentGrade = escapeHtml(profile.current_grade || "");
  const xp = profile.xp || 0;
  const interests: string[] = Array.isArray(profile.interests) ? profile.interests.map((i: string) => escapeHtml(i)) : [];
  const availableForHire = profile.available_for_hire === true;
  const businessCategory = escapeHtml(profile.business_category || "");
  const isBusiness = profile.is_organization_verified || profile.is_business_mode;
  const isVerified = profile.is_organization_verified || profile.is_verified;
  const joinedDate = profile.created_at ? new Date(profile.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long" }) : "";

  const followerCount = profile.followers ?? profile.follower_count ?? 0;
  const followingCount = profile.following ?? profile.following_count ?? 0;

  // Prefer banner for OG image (landscape), fall back to avatar, then default
  const ogImage = bannerUrl || avatarUrl || `${SITE_URL}/og-default.png`;
  const ogImageIsLandscape = !!(bannerUrl); // banner is wide format

  // Build description for SEO
  const descParts: string[] = [];
  if (followerCount > 0) descParts.push(`${followerCount.toLocaleString()} followers`);
  if (currentGrade) descParts.push(`Grade: ${currentGrade}`);
  if (location) descParts.push(location);
  if (bio) descParts.push(bio.slice(0, 160));
  else descParts.push(`${profile.display_name || "User"} on ${SITE_NAME}`);
  const metaDescription = descParts.join(" · ").slice(0, 300);

  // Verified badge HTML
  const verifiedBadgeHtml = profile.is_organization_verified
    ? '<span style="color:#D4A853;margin-left:4px;font-size:15px;" title="Verified Business">&#10004;</span>'
    : profile.is_verified
      ? `<span style="color:${BRAND_COLOR};margin-left:4px;font-size:15px;" title="Verified">&#10004;</span>`
      : "";

  const sameAs: string[] = [];
  if (websiteUrl) sameAs.push(websiteUrl);
  if (githubUrl) sameAs.push(githubUrl);
  if (portfolioUrl) sameAs.push(portfolioUrl);

  const jsonLd: any = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    name: `${profile.display_name || "User"} (@${profile.handle}) on AfuChat`,
    url: `${SITE_URL}/@${profile.handle}`,
    mainEntity: {
      "@type": isBusiness ? "Organization" : "Person",
      name: profile.display_name || "User",
      alternateName: `@${profile.handle}`,
      url: `${SITE_URL}/@${profile.handle}`,
      image: avatarUrl || undefined,
      description: profile.bio || `${profile.display_name || "User"} on AfuChat`,
      sameAs: sameAs.length > 0 ? sameAs : undefined,
      ...(location ? { homeLocation: { "@type": "Place", name: location } } : {}),
      ...(isBusiness && businessCategory ? { knowsAbout: businessCategory } : {}),
      interactionStatistic: [
        { "@type": "InteractionCounter", interactionType: "https://schema.org/FollowAction", userInteractionCount: followerCount },
        { "@type": "InteractionCounter", interactionType: "https://schema.org/WriteAction", userInteractionCount: posts.length },
      ],
    },
  };

  const postsHtml = posts.map((p) => {
    const content = escapeHtml(p.content || "");
    const contentTrunc = content.length > 280 ? content.substring(0, 277) + "…" : content;
    const date = new Date(p.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    const ago = (() => {
      const diff = Date.now() - new Date(p.created_at).getTime();
      const d = Math.floor(diff / 86400000);
      if (d < 1) return "today";
      if (d < 30) return `${d}d ago`;
      if (d < 365) return `${Math.floor(d / 30)}mo ago`;
      return `${Math.floor(d / 365)}y ago`;
    })();
    const images = (p.images || []).map((img: string, i: number) =>
      `<img src="${escapeHtml(img)}" alt="Post image ${i + 1}" style="width:100%;border-radius:10px;margin-top:10px;max-height:400px;object-fit:cover;" loading="${i === 0 ? "eager" : "lazy"}" />`
    ).join("");
    const postUrl = `${SITE_URL}/p/${encodeUuidToShort(p.id)}`;
    return `
      <a href="${postUrl}" style="text-decoration:none;color:inherit;display:block">
        <article class="post" itemscope itemtype="https://schema.org/SocialMediaPosting">
          <meta itemprop="author" content="${displayName}" />
          <meta itemprop="datePublished" content="${p.created_at}" />
          <meta itemprop="url" content="${postUrl}" />
          ${contentTrunc ? `<p class="post-body" itemprop="articleBody">${contentTrunc}</p>` : ""}
          ${images}
          <div class="post-meta">
            <time datetime="${p.created_at}" title="${date}">${ago}</time>
            ${(p.view_count || 0) > 0 ? `<span>&#128065;&#65039; ${p.view_count.toLocaleString()}</span>` : ""}
          </div>
        </article>
      </a>
    `;
  }).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${displayName} (@${handle}) — ${SITE_NAME}</title>
  <meta name="description" content="${escapeHtml(metaDescription)}" />
  <meta name="robots" content="${isPrivate ? "noindex, nofollow" : "index, follow, max-image-preview:large"}" />
  <link rel="canonical" href="${SITE_URL}/@${handle}" />

  <!-- Open Graph -->
  <meta property="og:type" content="profile" />
  <meta property="og:title" content="${displayName} (@${handle}) — ${SITE_NAME}" />
  <meta property="og:description" content="${escapeHtml(metaDescription)}" />
  <meta property="og:url" content="${SITE_URL}/@${handle}" />
  <meta property="og:site_name" content="${SITE_NAME}" />
  <meta property="og:image" content="${escapeHtml(ogImage)}" />
  ${ogImageIsLandscape ? `<meta property="og:image:width" content="1200" />\n  <meta property="og:image:height" content="400" />` : `<meta property="og:image:width" content="400" />\n  <meta property="og:image:height" content="400" />`}
  <meta property="og:image:alt" content="${displayName} on AfuChat" />
  <meta property="profile:username" content="${handle}" />
  ${followerCount > 0 ? `<meta property="og:see_also" content="${SITE_URL}/@${handle}" />` : ""}

  <!-- Twitter / X Card -->
  <meta name="twitter:card" content="${ogImageIsLandscape ? "summary_large_image" : avatarUrl ? "summary" : "summary_large_image"}" />
  <meta name="twitter:site" content="@afuchat" />
  <meta name="twitter:creator" content="@${handle}" />
  <meta name="twitter:title" content="${displayName} (@${handle}) — ${SITE_NAME}" />
  <meta name="twitter:description" content="${escapeHtml(metaDescription)}" />
  <meta name="twitter:image" content="${escapeHtml(ogImage)}" />
  <meta name="twitter:image:alt" content="${displayName} on AfuChat" />

  <!-- Fediverse / Mastodon -->
  <meta name="fediverse:creator" content="@${handle}@afuchat.com" />

  <meta name="theme-color" content="${BRAND_COLOR}" />
  <link rel="icon" type="image/svg+xml" href="${SITE_URL}/logo.svg" />
  <link rel="icon" type="image/png" href="${SITE_URL}/favicon.png" />

  <script type="application/ld+json">${JSON.stringify(jsonLd).replace(/<\//g, "<\\/")}</script>

  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:-apple-system,BlinkMacSystemFont,'Inter','Segoe UI',Roboto,sans-serif;background:#0a0a0a;color:#e8eaed;min-height:100vh}
    a{color:inherit;text-decoration:none}
    .top-bar{background:linear-gradient(135deg,${BRAND_COLOR},#0097A7);padding:12px 20px;text-align:center}
    .top-bar a{color:#fff;font-weight:700;font-size:17px;letter-spacing:.3px}
    .banner{width:100%;height:200px;object-fit:cover;display:block;background:linear-gradient(135deg,${BRAND_COLOR}44,#0097A744)}
    .banner-placeholder{width:100%;height:200px;background:linear-gradient(135deg,${BRAND_COLOR}33,#0097A722)}
    .profile-wrap{max-width:640px;margin:0 auto}
    .avatar-wrap{padding:0 20px;margin-top:-48px;display:flex;align-items:flex-end;gap:16px;justify-content:space-between}
    .avatar{width:96px;height:96px;border-radius:50%;object-fit:cover;border:3px solid #0a0a0a;background:#1a1a1a;flex-shrink:0}
    .avatar-placeholder{width:96px;height:96px;border-radius:50%;background:${BRAND_COLOR};display:flex;align-items:center;justify-content:center;font-size:36px;font-weight:700;color:#fff;border:3px solid #0a0a0a;flex-shrink:0}
    .follow-btn{display:inline-block;padding:10px 24px;background:${BRAND_COLOR};color:#fff;border-radius:20px;font-weight:600;font-size:14px;margin-bottom:4px}
    .info{padding:14px 20px 0}
    .name-row{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
    .name{font-size:22px;font-weight:700;color:#fff}
    .handle-row{color:#888;font-size:14px;margin-top:3px;display:flex;align-items:center;gap:8px;flex-wrap:wrap}
    .badge{display:inline-flex;align-items:center;gap:3px;background:#D4A85322;color:#D4A853;font-size:11px;font-weight:600;padding:2px 8px;border-radius:8px;border:1px solid #D4A85344}
    .badge-cyan{background:${BRAND_COLOR}22;color:${BRAND_COLOR};border-color:${BRAND_COLOR}44}
    .badge-green{background:#22c55e22;color:#22c55e;border-color:#22c55e44}
    .tagline{color:#aaa;font-size:14px;margin-top:10px;font-style:italic}
    .bio-text{color:#ccc;font-size:15px;margin-top:10px;line-height:1.6;white-space:pre-wrap;word-wrap:break-word}
    .meta-row{display:flex;flex-wrap:wrap;gap:10px;margin-top:12px}
    .meta-item{display:flex;align-items:center;gap:5px;color:#888;font-size:13px}
    .meta-item a{color:${BRAND_COLOR}}
    .interests{display:flex;flex-wrap:wrap;gap:6px;margin-top:12px}
    .interest-tag{background:#1e1e1e;color:#aaa;font-size:12px;padding:4px 10px;border-radius:20px;border:1px solid #2a2a2a}
    .stats{display:flex;gap:0;margin-top:16px;padding:14px 20px;border-top:1px solid #1a1a1a;border-bottom:1px solid #1a1a1a}
    .stat{flex:1;text-align:center;padding:0 8px}
    .stat-val{font-size:18px;font-weight:700;color:#fff}
    .stat-lbl{font-size:11px;color:#666;margin-top:2px}
    .section{padding:20px}
    .section-title{font-size:15px;font-weight:600;color:#888;text-transform:uppercase;letter-spacing:.5px;margin-bottom:14px}
    .post{background:#111;border-radius:14px;padding:14px;margin-bottom:10px;border:1px solid #1a1a1a;transition:background .15s}
    .post:hover{background:#141414}
    .post-body{font-size:15px;line-height:1.6;color:#e0e0e0;white-space:pre-wrap;word-wrap:break-word}
    .post-meta{display:flex;gap:14px;margin-top:10px;font-size:12px;color:#555}
    .empty{text-align:center;color:#555;padding:32px;font-size:14px}
    .cta-section{text-align:center;padding:32px 20px;background:#111;margin-top:4px}
    .cta-title{font-size:19px;font-weight:700;color:#fff;margin-bottom:6px}
    .cta-sub{color:#777;font-size:14px;margin-bottom:18px}
    .cta-btn{display:inline-block;padding:13px 36px;background:${BRAND_COLOR};color:#fff;border-radius:14px;font-weight:700;font-size:15px}
    .cta-btn:hover{opacity:.88}
    .footer{text-align:center;padding:24px 20px 40px;color:#333;font-size:12px}
    .footer a{color:#555}
    @media(max-width:480px){.info{padding:12px 14px 0}.stats{padding:12px 14px}.section{padding:14px}.avatar{width:80px;height:80px}.avatar-placeholder{width:80px;height:80px;font-size:30px}.name{font-size:19px}}
  </style>
</head>
<body itemscope itemtype="https://schema.org/ProfilePage">
  <div class="top-bar"><a href="${SITE_URL}">${SITE_NAME}</a></div>

  ${bannerUrl
    ? `<img class="banner" src="${escapeHtml(bannerUrl)}" alt="${displayName} banner" />`
    : `<div class="banner-placeholder"></div>`}

  <div class="profile-wrap">
    <!-- Avatar + CTA -->
    <div class="avatar-wrap">
      ${avatarUrl
        ? `<img class="avatar" src="${escapeHtml(avatarUrl)}" alt="${displayName}" itemprop="image" />`
        : `<div class="avatar-placeholder" itemprop="image">${displayName.charAt(0).toUpperCase()}</div>`}
      <a href="https://play.google.com/store/apps/details?id=com.afuchat.app" class="follow-btn">Follow on AfuChat</a>
    </div>

    <!-- Name & identity -->
    <div class="info">
      <div class="name-row">
        <h1 class="name" itemprop="name">${displayName}</h1>
        ${verifiedBadgeHtml}
        ${isBusiness ? `<span class="badge">&#128188; ${businessCategory || "Business"}</span>` : ""}
        ${availableForHire ? `<span class="badge badge-green">&#128188; For Hire</span>` : ""}
      </div>
      <div class="handle-row">
        <span itemprop="alternateName">@${handle}</span>
        ${joinedDate ? `<span>&#128197; Joined ${joinedDate}</span>` : ""}
        ${currentGrade ? `<span class="badge badge-cyan">&#127942; ${currentGrade}</span>` : ""}
      </div>
      ${developerTagline ? `<p class="tagline">${developerTagline}</p>` : ""}
      ${bio ? `<p class="bio-text" itemprop="description">${bio}</p>` : ""}

      <!-- Meta links & location -->
      ${(location || websiteUrl || githubUrl || portfolioUrl || xp > 0) ? `
      <div class="meta-row">
        ${location ? `<span class="meta-item">&#127758; ${location}</span>` : ""}
        ${xp > 0 ? `<span class="meta-item">&#9889; ${xp.toLocaleString()} XP</span>` : ""}
        ${websiteUrl ? `<span class="meta-item">&#128279; <a href="${escapeHtml(websiteUrl)}" rel="nofollow noopener" target="_blank">${escapeHtml(websiteUrl.replace(/^https?:\/\/(www\.)?/, "").split("/")[0])}</a></span>` : ""}
        ${githubUrl ? `<span class="meta-item">&#9899; <a href="${escapeHtml(githubUrl)}" rel="nofollow noopener" target="_blank">GitHub</a></span>` : ""}
        ${portfolioUrl ? `<span class="meta-item">&#127912; <a href="${escapeHtml(portfolioUrl)}" rel="nofollow noopener" target="_blank">Portfolio</a></span>` : ""}
      </div>` : ""}

      <!-- Interests -->
      ${interests.length > 0 ? `
      <div class="interests">
        ${interests.map(i => `<span class="interest-tag">${i}</span>`).join("")}
      </div>` : ""}
    </div>

    <!-- Stats row -->
    <div class="stats">
      <div class="stat">
        <div class="stat-val">${followerCount.toLocaleString()}</div>
        <div class="stat-lbl">Followers</div>
      </div>
      <div class="stat">
        <div class="stat-val">${followingCount.toLocaleString()}</div>
        <div class="stat-lbl">Following</div>
      </div>
      <div class="stat">
        <div class="stat-val">${posts.length}${posts.length >= 20 ? "+" : ""}</div>
        <div class="stat-lbl">Posts</div>
      </div>
      ${xp > 0 ? `<div class="stat"><div class="stat-val">${xp.toLocaleString()}</div><div class="stat-lbl">XP</div></div>` : ""}
    </div>

    <!-- Recent posts -->
    <div class="section">
      <div class="section-title">Recent Posts</div>
      ${posts.length > 0 ? postsHtml : `<div class="empty">No public posts yet.</div>`}
    </div>

    <!-- CTA -->
    <div class="cta-section">
      <div class="cta-title">Follow ${displayName} on AfuChat</div>
      <div class="cta-sub">Like, reply, and connect with ${displayName} on the AfuChat app</div>
      <a href="https://play.google.com/store/apps/details?id=com.afuchat.app" class="cta-btn">&#127381; Get AfuChat Free</a>
    </div>

    <footer class="footer">
      <p>&copy; ${new Date().getFullYear()} <a href="${SITE_URL}">${SITE_NAME}</a>. All rights reserved.</p>
      <p style="margin-top:5px"><a href="${SITE_URL}/terms">Terms</a> &middot; <a href="${SITE_URL}/privacy">Privacy</a></p>
    </footer>
  </div>
</body>
</html>`;
}

function render404Page(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>User Not Found - ${SITE_NAME}</title>
  <meta name="robots" content="noindex" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Inter', sans-serif; background: #000; color: #fff; display: flex; align-items: center; justify-content: center; height: 100vh; }
    .wrap { text-align: center; }
    h1 { font-size: 48px; color: ${BRAND_COLOR}; margin-bottom: 12px; }
    p { color: #888; font-size: 16px; margin-bottom: 24px; }
    a { color: ${BRAND_COLOR}; text-decoration: none; font-weight: 600; }
  </style>
</head>
<body>
  <div class="wrap">
    <h1>404</h1>
    <p>This user doesn't exist on AfuChat.</p>
    <a href="${SITE_URL}">Go to AfuChat</a>
  </div>
</body>
</html>`;
}

router.get("/@:handle", async (req, res) => {
  const handle = req.params.handle?.toLowerCase();
  if (!handle) return res.status(404).send(render404Page());

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, display_name, handle, bio, show_bio_publicly, avatar_url, banner_url, website_url, github_url, portfolio_url, developer_tagline, country, region, current_grade, xp, interests, available_for_hire, business_category, is_organization_verified, is_business_mode, is_verified, created_at, is_private, follower_count, following_count")
    .eq("handle", handle)
    .single();

  if (!profile) {
    return res.status(404).send(render404Page());
  }

  if (profile.is_private) {
    // HTTP 410 Gone: tells Google this URL is intentionally unavailable so it
    // removes it from the index immediately, rather than keeping it as
    // "Excluded by noindex" indefinitely (which happens with a 200 + noindex).
    res.status(410);
    res.set("Cache-Control", "public, max-age=300, stale-while-revalidate=600");
    res.set("X-Robots-Tag", "noindex, nofollow");
    return res.send(renderProfilePage({
      ...profile,
      bio: "This account is private.",
      xp: 0,
      website_url: null,
    }, [], true));
  }

  const [{ data: posts }, { data: postImages }, { data: followersData }, { data: followingData }] = await Promise.all([
    supabase.from("posts").select("id, content, image_url, created_at, view_count").eq("author_id", profile.id).eq("is_blocked", false).order("created_at", { ascending: false }).limit(20),
    supabase.from("post_images").select("post_id, image_url, display_order").in("post_id", (await supabase.from("posts").select("id").eq("author_id", profile.id).eq("is_blocked", false).order("created_at", { ascending: false }).limit(20)).data?.map((p: any) => p.id) || []).order("display_order", { ascending: true }),
    supabase.from("follows").select("id", { count: "exact", head: true }).eq("following_id", profile.id),
    supabase.from("follows").select("id", { count: "exact", head: true }).eq("follower_id", profile.id),
  ]);

  const imageMap: Record<string, string[]> = {};
  for (const pi of (postImages || [])) {
    if (!imageMap[pi.post_id]) imageMap[pi.post_id] = [];
    imageMap[pi.post_id].push(pi.image_url);
  }

  const enrichedPosts = (posts || []).map((p: any) => ({
    ...p,
    images: imageMap[p.id] || (p.image_url ? [p.image_url] : []),
    likes: 0,
    comments: 0,
  }));

  const followers = (followersData as any)?.count || 0;
  const following = (followingData as any)?.count || 0;

  res.set("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
  return res.send(renderProfilePage({ ...profile, followers, following }, enrichedPosts));
});

router.get("/:handle", (req, res, next) => {
  const handle = req.params.handle?.toLowerCase();
  if (!handle || handle.includes(".") || handle === "api" || handle === "admin") {
    return next();
  }

  if (req.query.join === "1" || req.headers.referer?.includes("share")) {
    return res.redirect(302, `/@${handle}?ref=${handle}`);
  }
  return res.redirect(301, `/@${handle}`);
});

export default router;
