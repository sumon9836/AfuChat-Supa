'use strict';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';
const SITE_DOMAIN  = process.env.EXPO_PUBLIC_DOMAIN || 'afuchat.com';
const SITE_ORIGIN  = `https://${SITE_DOMAIN}`;
const DEFAULT_OG   = `${SITE_ORIGIN}/assets/og-default.png`;

// supa — thin wrapper around the Supabase REST API.
// queryString is passed verbatim so Supabase join syntax (e.g. profiles!fkey)
// is never re-encoded.
async function supa(table, queryString) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;
  const url = `${SUPABASE_URL}/rest/v1/${table}?${queryString}`;
  const r = await fetch(url, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      Accept: 'application/json',
    },
  });
  if (!r.ok) return null;
  const data = await r.json();
  return Array.isArray(data) ? data[0] ?? null : data;
}

function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// strip — remove HTML tags, collapse whitespace, truncate
function strip(s, max) {
  const plain = String(s || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  return plain.length > max ? plain.slice(0, max - 1) + '\u2026' : plain;
}

// buildHtml — returns a full HTML document with OG/Twitter meta tags + JSON-LD.
// For browser users, a small inline script redirects them to the SPA (same
// path + ?_s=1) so Expo Router handles the route natively.
// Social media bots never run JavaScript, so they read the og: tags and stop.
function buildHtml({ title, description, image, url, card = 'summary_large_image', type = 'website', extra = '', jsonld = null }) {
  const t   = esc(title);
  const d   = esc(description);
  const img = esc(image || DEFAULT_OG);
  const u   = esc(url);

  const ldScript = jsonld
    ? `<script type="application/ld+json">${JSON.stringify(jsonld)}</script>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${t}</title>
<meta name="description" content="${d}">
<meta name="robots" content="index, follow, max-image-preview:large">
<link rel="canonical" href="${u}">
<meta property="og:site_name" content="AfuChat">
<meta property="og:type" content="${esc(type)}">
<meta property="og:title" content="${t}">
<meta property="og:description" content="${d}">
<meta property="og:image" content="${img}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${t}">
<meta property="og:url" content="${u}">
<meta name="twitter:card" content="${esc(card)}">
<meta name="twitter:site" content="@AfuChat">
<meta name="twitter:title" content="${t}">
<meta name="twitter:description" content="${d}">
<meta name="twitter:image" content="${img}">
${extra}
${ldScript}
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{background:#0a0a0a;color:#f1f1f1;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:16px}
.card{max-width:440px;width:100%;background:#181818;border:1px solid #2a2a2a;border-radius:20px;overflow:hidden;text-align:center}
.hero-img{width:100%;aspect-ratio:16/9;object-fit:cover;background:#111;display:block}
.body{padding:24px 20px 28px}
.eyebrow{font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:#666;margin-bottom:14px;font-weight:600}
h1{font-size:19px;font-weight:700;line-height:1.35;color:#f1f1f1;margin-bottom:10px}
p{font-size:13px;color:#aaa;line-height:1.6;margin-bottom:22px}
.btn{display:inline-block;background:linear-gradient(135deg,#1DB954,#17a046);color:#fff;font-weight:700;font-size:14px;padding:13px 36px;border-radius:100px;text-decoration:none;letter-spacing:.01em}
</style>
</head>
<body>
<div class="card">
${image ? `<img class="hero-img" src="${img}" alt="">` : ''}
<div class="body">
<p class="eyebrow">AfuChat</p>
<h1>${t}</h1>
<p>${d}</p>
<a class="btn" href="/">Open AfuChat</a>
</div>
</div>
<script>
(function(){
  var s = window.location.search;
  if (s.indexOf('_s=') === -1) {
    var sep = s ? '&' : '?';
    window.location.replace(window.location.pathname + s + sep + '_s=1');
  }
})();
</script>
</body>
</html>`;
}

module.exports = { supa, esc, strip, buildHtml, SITE_DOMAIN, SITE_ORIGIN, DEFAULT_OG };
