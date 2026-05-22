import { Router } from "express";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "../lib/constants";

const router = Router();

const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";
const supabase = createClient(SUPABASE_URL, supabaseAnonKey);

const BRAND   = "#00BCD4";
const SITE    = "AfuChat";
const URL_    = "https://afuchat.com";
const COMPANY = "AfuChat Technologies Limited";
const GP_URL  = "https://play.google.com/store/apps/details?id=com.afuchat.app";

const PLAY_ICON = `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 0 1-.61-.92V2.734a1 1 0 0 1 .609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-1.707l2.108 1.22a1 1 0 0 1 0 1.56l-2.108 1.22-2.537-2.5 2.537-2.5zM5.864 2.658L16.8 8.99l-2.302 2.302L5.864 2.658z"/></svg>`;

router.get("/", async (_req, res) => {
  let userCount = 0;
  let postCount = 0;
  try {
    const [u, p] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("posts").select("id",   { count: "exact", head: true }),
    ]);
    userCount = (u as any)?.count ?? 0;
    postCount = (p as any)?.count ?? 0;
  } catch {}

  const members = userCount > 0 ? userCount.toLocaleString() + "+" : "2K+";
  const posts   = postCount > 0 ? postCount.toLocaleString() + "+" : "10K+";

  res.set("Cache-Control", "public, max-age=300, stale-while-revalidate=3600");
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${SITE} — The Social Super App</title>
<meta name="description" content="AfuChat is the all-in-one social super app. Chat, share moments, earn with AI, make payments, and explore a vibrant community. Free on Android."/>
<meta name="robots" content="index, follow"/>
<link rel="canonical" href="${URL_}"/>
<meta property="og:type" content="website"/>
<meta property="og:site_name" content="${SITE}"/>
<meta property="og:locale" content="en_US"/>
<meta property="og:title" content="${SITE} — The Social Super App"/>
<meta property="og:description" content="Chat, share moments, earn with AI, make payments, and explore a vibrant community. Free on Android."/>
<meta property="og:url" content="${URL_}"/>
<meta property="og:image" content="${URL_}/og-default.png"/>
<meta property="og:image:width" content="1200"/>
<meta property="og:image:height" content="630"/>
<meta property="og:image:alt" content="AfuChat — The Social Super App"/>
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:site" content="@afuchat"/>
<meta name="twitter:title" content="${SITE} — The Social Super App"/>
<meta name="twitter:description" content="Chat, share moments, earn with AI, make payments, and connect with your community. Free on Android."/>
<meta name="twitter:image" content="${URL_}/og-default.png"/>
<meta name="twitter:image:alt" content="AfuChat — The Social Super App"/>
<meta name="theme-color" content="${BRAND}"/>
<link rel="icon" type="image/png" href="/logo.png"/>
<script type="text/javascript" src="//widget.trustpilot.com/bootstrap/v5/tp.widget.bootstrap.min.js" async></script>
<script type="application/ld+json">${JSON.stringify({
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": SITE,
  "url": URL_,
  "logo": URL_ + "/logo.png",
  "sameAs": [
    "https://play.google.com/store/apps/details?id=com.afuchat.app",
    "https://twitter.com/afuchat"
  ],
  "description": "AfuChat is the all-in-one social super app. Chat, share moments, earn with AI, make payments, and explore a vibrant community.",
  "applicationCategory": "SocialNetworkingApplication",
  "operatingSystem": "Android"
})}</script>
<script type="application/ld+json">${JSON.stringify({
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": SITE,
  "url": URL_,
  "potentialAction": {
    "@type": "SearchAction",
    "target": { "@type": "EntryPoint", "urlTemplate": URL_ + "/search?q={search_term_string}" },
    "query-input": "required name=search_term_string"
  }
})}</script>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link href="https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,300..900;1,14..32,300..900&display=swap" rel="stylesheet"/>

<style>
/* ─── Reset ─────────────────────────────────────────── */
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
html{scroll-behavior:smooth;-webkit-text-size-adjust:100%}
body{font-family:'Inter',system-ui,sans-serif;line-height:1.6;overflow-x:hidden;-webkit-font-smoothing:antialiased}
img{display:block;max-width:100%}
a{text-decoration:none;color:inherit}
button{cursor:pointer;font-family:inherit;border:none;background:none}

/* ─── Tokens ─────────────────────────────────────────── */
:root{
  --c:#00BCD4;--cd:#0097A7;--cp:rgba(0,188,212,.12);--cb:rgba(0,188,212,.22);
  --bg:#fff;--bg2:#f6f8fb;--bg3:#eef1f6;
  --surf:#fff;--border:#e4e7ed;
  --t:#0b0c0e;--t2:#4a5568;--t3:#8a96a8;
  --sh:0 4px 24px rgba(0,0,0,.08);--shb:0 8px 40px rgba(0,0,0,.12);
  --grad-hero:linear-gradient(160deg,#060b12 0%,#0d1a26 60%,#071820 100%);
  --ph-border:#1a1f2e;--ph-shadow:drop-shadow(0 24px 48px rgba(0,0,0,.35));
}
@media(prefers-color-scheme:dark){
  :root{
    --bg:#0b0c0e;--bg2:#111318;--bg3:#181b21;
    --surf:#161921;--border:#252930;
    --t:#f0f2f5;--t2:#9aa3b2;--t3:#5a6272;
    --sh:0 4px 24px rgba(0,0,0,.4);--shb:0 8px 40px rgba(0,0,0,.6);
    --ph-shadow:drop-shadow(0 24px 48px rgba(0,0,0,.6));
  }
}

/* ─── Util ───────────────────────────────────────────── */
.container{width:100%;max-width:1120px;margin:0 auto;padding:0 20px}
.sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)}

/* ─── Nav ────────────────────────────────────────────── */
.nav{
  position:fixed;inset:0 0 auto 0;z-index:999;
  display:flex;align-items:center;gap:8px;
  padding:0 20px;height:60px;
  background:rgba(6,11,18,.88);
  backdrop-filter:blur(18px) saturate(180%);
  -webkit-backdrop-filter:blur(18px) saturate(180%);
  border-bottom:1px solid rgba(255,255,255,.06);
}
.nav-logo{display:flex;align-items:center;gap:10px;flex-shrink:0}
.nav-logo img{width:32px;height:32px;border-radius:9px}
.nav-logo-name{font-size:17px;font-weight:800;color:#fff;letter-spacing:-.3px}
.nav-links{display:none;align-items:center;gap:2px;margin:0 auto}
.nav-links a{
  font-size:14px;font-weight:500;color:rgba(255,255,255,.65);
  padding:6px 14px;border-radius:8px;transition:color .15s,background .15s;
}
.nav-links a:hover{color:#fff;background:rgba(255,255,255,.07)}
.nav-cta{
  margin-left:auto;display:inline-flex;align-items:center;gap:7px;
  padding:8px 18px;border-radius:10px;
  background:var(--c);color:#fff;
  font-size:13px;font-weight:700;letter-spacing:-.1px;
  transition:opacity .15s,transform .15s;white-space:nowrap;
}
.nav-cta:hover{opacity:.88;transform:translateY(-1px)}
@media(min-width:768px){
  .nav{padding:0 40px}
  .nav-links{display:flex}
}

/* ─── Hero ───────────────────────────────────────────── */
.hero{
  background:var(--grad-hero);
  padding:100px 20px 0;
  text-align:center;
  overflow:hidden;
  position:relative;
}
.hero::before{
  content:'';position:absolute;inset:0;
  background:radial-gradient(ellipse 70% 50% at 50% 0%,rgba(0,188,212,.15) 0%,transparent 70%);
  pointer-events:none;
}
.hero-badge{
  display:inline-flex;align-items:center;gap:7px;
  border:1px solid rgba(0,188,212,.3);
  background:rgba(0,188,212,.1);
  padding:6px 16px;border-radius:100px;
  font-size:12px;font-weight:700;letter-spacing:.6px;text-transform:uppercase;
  color:var(--c);margin-bottom:24px;
}
.hero-badge span{font-size:14px}
.hero h1{
  font-size:clamp(36px,9vw,72px);
  font-weight:900;letter-spacing:-2.5px;line-height:1.02;
  color:#fff;margin-bottom:20px;
}
.hero h1 em{font-style:normal;color:var(--c)}
.hero-sub{
  font-size:clamp(15px,2.5vw,18px);
  color:rgba(255,255,255,.58);line-height:1.75;
  max-width:520px;margin:0 auto 36px;font-weight:400;
}
.hero-btns{
  display:flex;flex-direction:column;align-items:center;gap:12px;
  margin-bottom:56px;
}
.btn-dl{
  display:inline-flex;align-items:center;gap:9px;
  padding:15px 28px;border-radius:14px;
  background:var(--c);color:#fff;
  font-size:15px;font-weight:700;
  box-shadow:0 0 0 4px rgba(0,188,212,.2);
  transition:opacity .15s,transform .15s,box-shadow .15s;
}
.btn-dl:hover{opacity:.9;transform:translateY(-2px);box-shadow:0 0 0 6px rgba(0,188,212,.25)}
.btn-sec{
  display:inline-flex;align-items:center;gap:8px;
  padding:14px 26px;border-radius:14px;
  border:1.5px solid rgba(255,255,255,.15);
  background:rgba(255,255,255,.06);
  color:rgba(255,255,255,.8);
  font-size:15px;font-weight:600;
  transition:background .15s,border-color .15s;
}
.btn-sec:hover{background:rgba(255,255,255,.1);border-color:rgba(255,255,255,.25)}
.badge-row{
  display:flex;flex-wrap:wrap;justify-content:center;gap:10px;
  margin-bottom:48px;
}
.badge{
  display:inline-flex;align-items:center;gap:6px;
  padding:5px 13px;border-radius:100px;
  background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.1);
  font-size:12px;font-weight:500;color:rgba(255,255,255,.55);
}

/* Hero phones */
.hero-phones{
  position:relative;display:flex;justify-content:center;align-items:flex-end;
  height:400px;margin:0 -20px;
}
.phone-wrap{position:absolute;bottom:0}
.phone-frame{
  position:relative;border-radius:36px;
  border:8px solid #1c2333;
  background:#0a0d14;
  overflow:hidden;
  box-shadow:0 0 0 1px rgba(255,255,255,.06),0 32px 64px rgba(0,0,0,.6);
}
.phone-frame::after{
  content:'';position:absolute;top:0;left:50%;transform:translateX(-50%);
  width:36%;height:22px;background:#1c2333;border-radius:0 0 14px 14px;z-index:2;
}
.phone-frame img{display:block;width:100%;height:100%;object-fit:cover}

.phone-main .phone-frame{width:168px;height:356px}
.phone-left  .phone-frame{width:128px;height:272px}
.phone-right .phone-frame{width:128px;height:272px}

.phone-main{left:50%;transform:translateX(-50%);z-index:3;animation:float 5s ease-in-out infinite}
.phone-left {left:calc(50% - 156px);z-index:2;animation:float 5s ease-in-out infinite .8s;transform:rotate(-6deg) translateY(20px)}
.phone-right{left:calc(50% + 28px) ;z-index:2;animation:float 5s ease-in-out infinite 1.6s;transform:rotate(6deg)  translateY(20px)}

@keyframes float{0%,100%{translate:0 0}50%{translate:0 -12px}}

/* ─── Stats bar ──────────────────────────────────────── */
.stats-bar{
  background:var(--bg2);border-top:1px solid var(--border);border-bottom:1px solid var(--border);
}
.stats-inner{
  display:grid;grid-template-columns:repeat(2,1fr);
}
.stat{
  padding:22px 16px;text-align:center;
  border-right:1px solid var(--border);border-bottom:1px solid var(--border);
}
.stat:nth-child(2n){border-right:none}
.stat:nth-last-child(-n+2){border-bottom:none}
.stat-val{font-size:26px;font-weight:900;letter-spacing:-1px;color:var(--c);line-height:1}
.stat-lbl{font-size:11px;font-weight:600;letter-spacing:.6px;text-transform:uppercase;color:var(--t3);margin-top:4px}

/* ─── Feature pills grid ─────────────────────────────── */
.pills-section{padding:64px 20px;background:var(--bg)}
.section-label{
  font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;
  color:var(--c);margin-bottom:12px;
}
.section-title{
  font-size:clamp(24px,4vw,36px);font-weight:900;letter-spacing:-.8px;
  color:var(--t);margin-bottom:10px;line-height:1.15;
}
.section-sub{font-size:15px;color:var(--t2);line-height:1.7;max-width:480px;margin-bottom:36px}
.pills-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.pill-card{
  display:flex;align-items:flex-start;gap:12px;
  padding:16px;border-radius:14px;
  background:var(--bg2);border:1px solid var(--border);
  transition:box-shadow .2s,transform .2s;
}
.pill-card:hover{box-shadow:var(--sh);transform:translateY(-2px)}
.pill-icon{
  width:36px;height:36px;border-radius:10px;flex-shrink:0;
  display:flex;align-items:center;justify-content:center;font-size:18px;
}
.pill-text strong{display:block;font-size:13px;font-weight:700;color:var(--t);line-height:1.3}
.pill-text span{font-size:12px;color:var(--t2)}

/* ─── Feature rows ───────────────────────────────────── */
.feat{padding:72px 20px;background:var(--bg)}
.feat.alt{background:var(--bg2)}
.feat-grid{display:flex;flex-direction:column;gap:48px;align-items:center;max-width:1100px;margin:0 auto}
.feat-copy{width:100%}
.feat-eyebrow{
  font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;
  color:var(--c);margin-bottom:10px;
}
.feat-title{
  font-size:clamp(22px,4vw,34px);font-weight:900;letter-spacing:-.7px;line-height:1.15;
  color:var(--t);margin-bottom:12px;
}
.feat-desc{font-size:15px;color:var(--t2);line-height:1.75;margin-bottom:20px;max-width:460px}
.feat-tags{display:flex;flex-wrap:wrap;gap:8px}
.feat-tag{
  display:inline-flex;align-items:center;gap:5px;
  padding:5px 13px;border-radius:100px;
  background:var(--bg3);border:1px solid var(--border);
  font-size:12px;font-weight:600;color:var(--t2);
}
.feat-phone-area{
  display:flex;justify-content:center;align-items:flex-end;
  gap:16px;width:100%;
}
.feat-phone-area .phone-frame{
  width:180px;height:382px;flex-shrink:0;
}
.feat-phone-area .phone-frame.sm{width:145px;height:308px}

/* ─── AI section ─────────────────────────────────────── */
.ai-section{
  padding:80px 20px;
  background:linear-gradient(150deg,#080614 0%,#10082a 50%,#08120f 100%);
  text-align:center;position:relative;overflow:hidden;
}
.ai-section::before{
  content:'';position:absolute;inset:0;
  background:radial-gradient(ellipse 60% 60% at 50% 50%,rgba(139,92,246,.15) 0%,transparent 70%);
  pointer-events:none;
}
.ai-orb{
  width:72px;height:72px;border-radius:22px;
  background:rgba(139,92,246,.15);border:1px solid rgba(139,92,246,.3);
  display:inline-flex;align-items:center;justify-content:center;
  font-size:32px;margin-bottom:20px;
}
.ai-title{
  font-size:clamp(26px,5vw,44px);font-weight:900;letter-spacing:-1.5px;
  color:#fff;line-height:1.08;margin-bottom:14px;
}
.ai-sub{
  font-size:15px;color:rgba(255,255,255,.5);line-height:1.75;
  max-width:500px;margin:0 auto 32px;
}
.ai-chips{display:flex;flex-wrap:wrap;justify-content:center;gap:10px;margin-bottom:0}
.ai-chip{
  display:inline-flex;align-items:center;gap:7px;
  padding:9px 18px;border-radius:100px;
  background:rgba(139,92,246,.1);border:1px solid rgba(139,92,246,.22);
  font-size:13px;font-weight:600;color:#c084fc;
}
.ai-chip span{font-size:16px}

/* ─── Download CTA ───────────────────────────────────── */
.dl-section{
  padding:80px 20px;
  background:linear-gradient(140deg,#006B7A 0%,#00BCD4 50%,#00ACC1 100%);
  text-align:center;
}
.dl-title{
  font-size:clamp(26px,5vw,44px);font-weight:900;letter-spacing:-1.5px;
  color:#fff;margin-bottom:12px;
}
.dl-sub{font-size:15px;color:rgba(255,255,255,.75);margin-bottom:36px}
.dl-buttons{display:flex;flex-direction:column;align-items:center;gap:12px}
.dl-btn{
  display:inline-flex;align-items:center;gap:12px;
  padding:16px 28px;border-radius:16px;
  background:#fff;
  font-size:14px;font-weight:700;color:#006B7A;
  min-width:220px;
  box-shadow:0 4px 20px rgba(0,0,0,.15);
  transition:opacity .15s,transform .15s;
}
.dl-btn:hover{opacity:.94;transform:translateY(-2px)}
.dl-btn-sub{text-align:left;margin-left:2px}
.dl-btn-sub small{display:block;font-size:11px;font-weight:500;color:rgba(0,107,122,.65)}
.dl-btn-sub strong{display:block;font-size:15px;font-weight:800;color:#004d5c}
.dl-btn-outline{
  display:inline-flex;align-items:center;gap:12px;
  padding:15px 28px;border-radius:16px;
  background:rgba(255,255,255,.12);border:1.5px solid rgba(255,255,255,.3);
  font-size:14px;font-weight:600;color:#fff;
  min-width:220px;
  transition:background .15s;
}
.dl-btn-outline:hover{background:rgba(255,255,255,.2)}
.dl-note{margin-top:20px;font-size:12px;color:rgba(255,255,255,.45)}

/* ─── Footer ─────────────────────────────────────────── */
footer{
  background:var(--bg2);border-top:1px solid var(--border);
  padding:40px 20px 28px;
}
/* Trustpilot badge */
.tp-badge-wrap{margin-bottom:20px}
.tp-static-badge{
  display:inline-flex;align-items:center;gap:10px;
  padding:10px 18px;border-radius:12px;
  border:1.5px solid #00B67A;
  text-decoration:none;
  background:rgba(0,182,122,.06);
  transition:background .15s;
}
.tp-static-badge:hover{background:rgba(0,182,122,.12)}
.tp-star-row{color:#00B67A;font-size:18px;letter-spacing:2px;line-height:1}
.tp-badge-text{font-size:13px;color:var(--t2)}
.tp-badge-text strong{color:var(--t);font-weight:700}
.footer-top{display:flex;align-items:center;gap:10px;margin-bottom:20px}
.footer-top img{width:30px;height:30px;border-radius:9px}
.footer-top strong{font-size:15px;font-weight:800;color:var(--t)}
.footer-links{display:flex;flex-wrap:wrap;gap:8px 20px;margin-bottom:24px}
.footer-links a{font-size:13px;font-weight:500;color:var(--t3);transition:color .15s}
.footer-links a:hover{color:var(--c)}
.footer-divider{height:1px;background:var(--border);margin-bottom:20px}
.footer-copy{font-size:12px;color:var(--t3);line-height:1.7}

/* ─── Fade-in animations ─────────────────────────────── */
.fade{opacity:0;transform:translateY(24px);transition:opacity .55s ease,transform .55s ease}
.fade.in{opacity:1;transform:none}

/* ─── Responsive ─────────────────────────────────────── */
@media(min-width:540px){
  .hero-phones{height:460px}
  .phone-main .phone-frame{width:194px;height:412px}
  .phone-left .phone-frame,.phone-right .phone-frame{width:152px;height:322px}
  .phone-left{left:calc(50% - 184px)}
  .phone-right{left:calc(50% + 34px)}

  .hero-btns{flex-direction:row;justify-content:center}
  .stats-inner{grid-template-columns:repeat(4,1fr)}
  .stat{border-bottom:none}
  .stat:nth-child(2n){border-right:1px solid var(--border)}
  .stat:last-child{border-right:none}
  .pills-grid{grid-template-columns:repeat(3,1fr)}
  .dl-buttons{flex-direction:row;justify-content:center}
}
@media(min-width:768px){
  .nav{padding:0 48px}
  .hero{padding:120px 40px 0}
  .hero-phones{height:520px}
  .phone-main .phone-frame{width:218px;height:464px}
  .phone-left .phone-frame,.phone-right .phone-frame{width:168px;height:356px}
  .phone-left{left:calc(50% - 210px)}
  .phone-right{left:calc(50% + 46px)}

  .pills-section{padding:80px 40px}
  .pills-grid{grid-template-columns:repeat(3,1fr)}
  .feat{padding:88px 40px}
  .feat-grid{flex-direction:row;gap:72px;align-items:center}
  .feat-grid.flip{flex-direction:row-reverse}
  .feat-copy{flex:1;max-width:440px}
  .feat-phone-area{flex:1;justify-content:center}
  .feat-phone-area .phone-frame{width:200px;height:424px}
  .feat-phone-area .phone-frame.sm{width:160px;height:340px}

  footer{padding:48px 48px 32px}
}
@media(min-width:1024px){
  .pills-grid{grid-template-columns:repeat(6,1fr)}
  .feat-grid{gap:96px}
}
</style>
</head>
<body>

<!-- NAV -->
<nav class="nav" aria-label="Main navigation">
  <a class="nav-logo" href="/">
    <img src="/logo.png" alt="${SITE} logo" width="32" height="32"/>
    <span class="nav-logo-name">${SITE}</span>
  </a>
  <div class="nav-links" role="list">
    <a href="#features" role="listitem">Features</a>
    <a href="#ai" role="listitem">AI</a>
    <a href="#download" role="listitem">Download</a>
  </div>
  <a class="nav-cta" href="${GP_URL}" target="_blank" rel="noopener">
    ${PLAY_ICON} Get the App
  </a>
</nav>

<!-- HERO -->
<section class="hero" aria-label="Hero">
  <div class="container">
    <div class="hero-badge"><span>✦</span> The Social Super App</div>
    <h1>Chat. Share.<br><em>Connect.</em></h1>
    <p class="hero-sub">Real-time messaging, social feeds, AI assistance, digital payments, and a full mini-app ecosystem — built for the modern world.</p>
    <div class="hero-btns">
      <a class="btn-dl" href="${GP_URL}" target="_blank" rel="noopener">
        ${PLAY_ICON} Get on Google Play — Free
      </a>
      <a class="btn-sec" href="#features">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 16 16 12 12 8"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
        Explore Features
      </a>
    </div>
    <div class="badge-row">
      <span class="badge">🔒 End-to-end Encrypted</span>
      <span class="badge">🤖 Built-in AI Assistant</span>
      <span class="badge">💳 In-app Payments</span>
      <span class="badge">🌍 180+ Countries</span>
    </div>
  </div>

  <div class="hero-phones" aria-hidden="true">
    <div class="phone-wrap phone-left">
      <div class="phone-frame">
        <img src="/screenshots/discover.png" alt="Discover feed" loading="lazy"/>
      </div>
    </div>
    <div class="phone-wrap phone-main">
      <div class="phone-frame">
        <img src="/screenshots/chats.png" alt="AfuChat chats" loading="eager"/>
      </div>
    </div>
    <div class="phone-wrap phone-right">
      <div class="phone-frame">
        <img src="/screenshots/search.png" alt="Search screen" loading="lazy"/>
      </div>
    </div>
  </div>
</section>

<!-- STATS -->
<div class="stats-bar">
  <div class="stats-inner">
    <div class="stat">
      <div class="stat-val">${members}</div>
      <div class="stat-lbl">Members</div>
    </div>
    <div class="stat">
      <div class="stat-val">${posts}</div>
      <div class="stat-lbl">Posts Shared</div>
    </div>
    <div class="stat">
      <div class="stat-val">40+</div>
      <div class="stat-lbl">Features</div>
    </div>
    <div class="stat">
      <div class="stat-val">Free</div>
      <div class="stat-lbl">Always</div>
    </div>
  </div>
</div>

<!-- FEATURE PILLS -->
<section class="pills-section fade" id="features" aria-label="All features">
  <div class="container">
    <p class="section-label">Everything included</p>
    <h2 class="section-title">One app. Infinite possibilities.</h2>
    <p class="section-sub">AfuChat packs the best of messaging, social, finance, and AI into one seamless experience.</p>
    <div class="pills-grid">
      <div class="pill-card">
        <div class="pill-icon" style="background:rgba(0,188,212,.12)">💬</div>
        <div class="pill-text"><strong>Messaging</strong><span>Encrypted chats & groups</span></div>
      </div>
      <div class="pill-card">
        <div class="pill-icon" style="background:rgba(139,92,246,.12)">✨</div>
        <div class="pill-text"><strong>AfuAI</strong><span>Personal AI assistant</span></div>
      </div>
      <div class="pill-card">
        <div class="pill-icon" style="background:rgba(245,158,11,.12)">💰</div>
        <div class="pill-text"><strong>Payments</strong><span>ACoin wallet & transfers</span></div>
      </div>
      <div class="pill-card">
        <div class="pill-icon" style="background:rgba(16,185,129,.12)">🛍️</div>
        <div class="pill-text"><strong>Marketplace</strong><span>Shop verified stores</span></div>
      </div>
      <div class="pill-card">
        <div class="pill-icon" style="background:rgba(59,130,246,.12)">💼</div>
        <div class="pill-text"><strong>Freelance</strong><span>Post & find work</span></div>
      </div>
      <div class="pill-card">
        <div class="pill-icon" style="background:rgba(236,72,153,.12)">🎁</div>
        <div class="pill-text"><strong>Gifts</strong><span>Digital gifts & stickers</span></div>
      </div>
    </div>
  </div>
</section>

<!-- FEATURE 1: Messaging -->
<section class="feat fade" aria-label="Messaging feature">
  <div class="feat-grid container">
    <div class="feat-copy">
      <p class="feat-eyebrow">Messaging</p>
      <h2 class="feat-title">Your conversations,<br>beautifully fast</h2>
      <p class="feat-desc">Private chats, group rooms with up to 1,000 members, voice notes, file sharing, read receipts, and AI-powered smart replies — all in one clean inbox.</p>
      <div class="feat-tags">
        <span class="feat-tag">💬 Real-time</span>
        <span class="feat-tag">🔒 End-to-end</span>
        <span class="feat-tag">🎙️ Voice Notes</span>
        <span class="feat-tag">📎 File Sharing</span>
      </div>
    </div>
    <div class="feat-phone-area">
      <div class="phone-frame"><img src="/screenshots/chats.png" alt="Chats screen" loading="lazy"/></div>
    </div>
  </div>
</section>

<!-- FEATURE 2: Discover -->
<section class="feat alt fade" aria-label="Social feed feature">
  <div class="feat-grid flip container">
    <div class="feat-copy">
      <p class="feat-eyebrow">Social Feed</p>
      <h2 class="feat-title">Stay in the loop<br>with your people</h2>
      <p class="feat-desc">A curated feed of posts, short videos, and articles from people you follow. Discover trending content and connect with new voices worldwide.</p>
      <div class="feat-tags">
        <span class="feat-tag">📰 Posts & Articles</span>
        <span class="feat-tag">🎬 Short Videos</span>
        <span class="feat-tag">📡 Channels</span>
        <span class="feat-tag">📖 Stories</span>
      </div>
    </div>
    <div class="feat-phone-area">
      <div class="phone-frame"><img src="/screenshots/discover.png" alt="Discover feed" loading="lazy"/></div>
    </div>
  </div>
</section>

<!-- FEATURE 3: Search -->
<section class="feat fade" aria-label="Search feature">
  <div class="feat-grid container">
    <div class="feat-copy">
      <p class="feat-eyebrow">Explore</p>
      <h2 class="feat-title">Find anything<br>in seconds</h2>
      <p class="feat-desc">Search people, posts, videos, jobs, events, gifts, and market listings. Trending insights and AI-powered results keep you ahead of the curve.</p>
      <div class="feat-tags">
        <span class="feat-tag">🌐 People & Channels</span>
        <span class="feat-tag">💼 Jobs & Events</span>
        <span class="feat-tag">⚡ AI-Powered</span>
        <span class="feat-tag">🎁 Gifts & Market</span>
      </div>
    </div>
    <div class="feat-phone-area">
      <div class="phone-frame"><img src="/screenshots/search.png" alt="Search screen" loading="lazy"/></div>
    </div>
  </div>
</section>

<!-- FEATURE 4: Profile (two phones) -->
<section class="feat alt fade" aria-label="Profile feature">
  <div class="feat-grid flip container">
    <div class="feat-copy">
      <p class="feat-eyebrow">Your Profile</p>
      <h2 class="feat-title">A profile that<br>tells your story</h2>
      <p class="feat-desc">Showcase your posts, earn Prestige badges, track XP, manage your ACoin wallet, view analytics, and control every privacy setting from one dashboard.</p>
      <div class="feat-tags">
        <span class="feat-tag">🏆 Prestige Status</span>
        <span class="feat-tag">⚡ XP & Levels</span>
        <span class="feat-tag">💎 ACoin Wallet</span>
        <span class="feat-tag">✅ Verified Badge</span>
      </div>
    </div>
    <div class="feat-phone-area">
      <div class="phone-frame sm" style="transform:rotate(-3deg) translateY(12px)">
        <img src="/screenshots/profile-public.png" alt="Public profile" loading="lazy"/>
      </div>
      <div class="phone-frame sm" style="transform:rotate(3deg) translateY(12px)">
        <img src="/screenshots/profile-me.png" alt="My profile" loading="lazy"/>
      </div>
    </div>
  </div>
</section>

<!-- FEATURE 5: Mini Apps -->
<section class="feat fade" aria-label="Mini apps feature">
  <div class="feat-grid container">
    <div class="feat-copy">
      <p class="feat-eyebrow">Mini-Programs</p>
      <h2 class="feat-title">A full ecosystem<br>inside one app</h2>
      <p class="feat-desc">Launch AI tools, finance apps, intelligence services, and more from an in-app store — all free to use, with new programs added regularly.</p>
      <div class="feat-tags">
        <span class="feat-tag">🤖 AI Lens</span>
        <span class="feat-tag">✨ AfuAI</span>
        <span class="feat-tag">💳 Finance Tools</span>
        <span class="feat-tag">🔍 Smart Search</span>
      </div>
    </div>
    <div class="feat-phone-area">
      <div class="phone-frame"><img src="/screenshots/apps.png" alt="Mini apps screen" loading="lazy"/></div>
    </div>
  </div>
</section>

<!-- FEATURE 6: Payments -->
<section class="feat alt fade" aria-label="Payments feature">
  <div class="feat-grid flip container">
    <div class="feat-copy">
      <p class="feat-eyebrow">Payments</p>
      <h2 class="feat-title">Pay and top up<br>without leaving</h2>
      <p class="feat-desc">Transfer money, buy mobile data, pay utility bills, book hotels, and purchase event tickets — all powered by the AfuChat ACoin system.</p>
      <div class="feat-tags">
        <span class="feat-tag">💸 Money Transfers</span>
        <span class="feat-tag">📱 Mobile Top-Up</span>
        <span class="feat-tag">⚡ Data Bundles</span>
        <span class="feat-tag">🏨 Hotels & Travel</span>
      </div>
    </div>
    <div class="feat-phone-area">
      <div class="phone-frame"><img src="/screenshots/pay.png" alt="Payments screen" loading="lazy"/></div>
    </div>
  </div>
</section>

<!-- FEATURE 7: Digital ID + Calls -->
<section class="feat fade" aria-label="Digital ID and calls feature">
  <div class="feat-grid container">
    <div class="feat-copy">
      <p class="feat-eyebrow">Identity & Calls</p>
      <h2 class="feat-title">Your digital ID<br>and crystal-clear calls</h2>
      <p class="feat-desc">AfuChat gives you a verified digital identity card and HD voice & video calling with everyone in your network — no extra app needed.</p>
      <div class="feat-tags">
        <span class="feat-tag">🪪 Digital ID Card</span>
        <span class="feat-tag">📞 HD Voice Calls</span>
        <span class="feat-tag">📹 Video Calls</span>
        <span class="feat-tag">✅ Verified Identity</span>
      </div>
    </div>
    <div class="feat-phone-area">
      <div class="phone-frame sm" style="transform:rotate(-3deg) translateY(12px)">
        <img src="/screenshots/digital-id.png" alt="Digital ID screen" loading="lazy"/>
      </div>
      <div class="phone-frame sm" style="transform:rotate(3deg) translateY(12px)">
        <img src="/screenshots/calls.png" alt="Calls screen" loading="lazy"/>
      </div>
    </div>
  </div>
</section>

<!-- FEATURE 8: AfuMatch -->
<section class="feat alt fade" aria-label="AfuMatch feature">
  <div class="feat-grid flip container">
    <div class="feat-copy">
      <p class="feat-eyebrow">AfuMatch</p>
      <h2 class="feat-title">Meet people<br>who matter</h2>
      <p class="feat-desc">AfuMatch connects you with like-minded people based on your interests, location, and vibe. Swipe, connect, and start a real conversation instantly.</p>
      <div class="feat-tags">
        <span class="feat-tag">❤️ Smart Matching</span>
        <span class="feat-tag">📍 Nearby People</span>
        <span class="feat-tag">🎯 Interest-based</span>
        <span class="feat-tag">💬 Instant Chat</span>
      </div>
    </div>
    <div class="feat-phone-area">
      <div class="phone-frame"><img src="/screenshots/afumatch.png" alt="AfuMatch screen" loading="lazy"/></div>
    </div>
  </div>
</section>

<!-- AI SECTION -->
<section class="ai-section fade" id="ai" aria-label="AI features">
  <div class="container" style="position:relative;z-index:1">
    <div class="ai-orb">✨</div>
    <p style="font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#c084fc;margin-bottom:12px">AfuAI Assistant</p>
    <h2 class="ai-title">Your AI co-pilot,<br>always on</h2>
    <p class="ai-sub">AfuAI helps you write messages, generate images, discover content, answer questions, and navigate the app — all through natural conversation.</p>
    <div class="ai-chips">
      <span class="ai-chip"><span>💬</span> Smart Replies</span>
      <span class="ai-chip"><span>🎨</span> AI Image Gen</span>
      <span class="ai-chip"><span>🎙️</span> Voice Transcription</span>
      <span class="ai-chip"><span>🔍</span> Content Discovery</span>
      <span class="ai-chip"><span>✍️</span> Caption Writer</span>
    </div>
  </div>
</section>

<!-- DOWNLOAD CTA -->
<section class="dl-section fade" id="download" aria-label="Download">
  <div class="container">
    <h2 class="dl-title">Start connecting today.</h2>
    <p class="dl-sub">Download AfuChat free on Android, or open the web app right now — no installation needed.</p>
    <div class="dl-buttons">
      <a class="dl-btn" href="${GP_URL}" target="_blank" rel="noopener">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="#006B7A" aria-hidden="true"><path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 0 1-.61-.92V2.734a1 1 0 0 1 .609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-1.707l2.108 1.22a1 1 0 0 1 0 1.56l-2.108 1.22-2.537-2.5 2.537-2.5zM5.864 2.658L16.8 8.99l-2.302 2.302L5.864 2.658z"/></svg>
        <div class="dl-btn-sub">
          <small>Download on</small>
          <strong>Google Play</strong>
        </div>
      </a>
      <a class="dl-btn-outline" href="#" onclick="return false">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
        <div>
          <small style="display:block;font-size:11px;font-weight:500;color:rgba(255,255,255,.6)">Open in</small>
          <strong style="font-size:15px;font-weight:800">Web Browser</strong>
        </div>
      </a>
    </div>
    <p class="dl-note">Free forever · No credit card required</p>
  </div>
</section>

<!-- FOOTER -->
<footer>
  <div class="container">
    <div class="footer-top">
      <img src="/logo.png" alt="${SITE} logo" width="30" height="30"/>
      <strong>${SITE}</strong>
    </div>
    <nav class="footer-links" aria-label="Footer navigation">
      <a href="${GP_URL}" target="_blank" rel="noopener">Download</a>
      <a href="/privacy">Privacy Policy</a>
      <a href="/terms">Terms of Service</a>
      <a href="mailto:support@afuchat.com">Support</a>
      <a href="mailto:press@afuchat.com">Press</a>
    </nav>
    <div class="footer-divider"></div>
    <div class="tp-badge-wrap">
      ${process.env.TRUSTPILOT_BUSINESS_UNIT_ID
        ? `<div class="trustpilot-widget"
              data-locale="en-US"
              data-template-id="53aa8807dec7e10d38f59f32"
              data-businessunit-id="${process.env.TRUSTPILOT_BUSINESS_UNIT_ID}"
              data-style-height="120px"
              data-style-width="100%"
              data-theme="light"
              data-stars="4,5">
             <a href="https://www.trustpilot.com/review/afuchat.com" target="_blank" rel="noopener">Trustpilot</a>
           </div>`
        : `<a href="https://www.trustpilot.com/review/afuchat.com" target="_blank" rel="noopener" class="tp-static-badge">
             <span class="tp-star-row">★★★★★</span>
             <span class="tp-badge-text">Rated on <strong>Trustpilot</strong></span>
           </a>`
      }
    </div>
    <p class="footer-copy">
      © ${new Date().getFullYear()} ${COMPANY}. All rights reserved.<br>
      AfuChat® is a registered trademark of ${COMPANY}. Kampala, Uganda.
    </p>
  </div>
</footer>

<script>
// Fade-in on scroll
const obs = new IntersectionObserver((entries) => {
  entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); obs.unobserve(e.target); } });
}, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
document.querySelectorAll('.fade').forEach(el => obs.observe(el));
</script>

</body>
</html>`);
});

export default router;
