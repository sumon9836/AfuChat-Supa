import { Router } from "express";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "../lib/constants";

const router = Router();

const supabaseUrl = SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const BRAND     = "#00BCD4";
const SITE_NAME = "AfuChat";
const SITE_URL  = "https://afuchat.com";
const COMPANY   = "AfuChat Technologies Limited";

router.get("/", async (_req, res) => {
  let userCount = 0;
  let postCount = 0;
  if (supabase) {
    const [u, p] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("posts").select("id",   { count: "exact", head: true }),
    ]);
    userCount = (u as any)?.count || 0;
    postCount = (p as any)?.count || 0;
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: COMPANY,
    url: SITE_URL,
    logo: `${SITE_URL}/logo.png`,
    sameAs: ["https://play.google.com/store/apps/details?id=com.afuchat.app"],
    description: "AfuChat — Connect, chat, and share moments with people around you.",
  };

  res.set("Cache-Control", "public, max-age=300, stale-while-revalidate=3600");
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${SITE_NAME} — Connect, Chat &amp; Share</title>
  <meta name="description" content="AfuChat is a modern social messaging super app. Chat with friends, share moments, earn rewards, and explore a vibrant community. Download free on Android." />
  <meta name="robots" content="index, follow" />
  <link rel="canonical" href="${SITE_URL}" />
  <meta property="og:type" content="website" />
  <meta property="og:title" content="${SITE_NAME} — Connect, Chat &amp; Share" />
  <meta property="og:description" content="A modern social messaging super app by ${COMPANY}." />
  <meta property="og:url" content="${SITE_URL}" />
  <meta property="og:image" content="${SITE_URL}/logo.png" />
  <meta name="twitter:card" content="summary" />
  <meta name="twitter:title" content="${SITE_NAME} — Connect, Chat &amp; Share" />
  <meta name="twitter:image" content="${SITE_URL}/logo.png" />
  <meta name="theme-color" content="${BRAND}" />
  <link rel="icon" type="image/png" href="/logo.png" />
  <script type="application/ld+json">${JSON.stringify(jsonLd).replace(/<\//g,"<\\/")}</script>

  <!-- Inter font — standard, non-device-dependent -->
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />

  <style>
    /* ── Reset ──────────────────────────────────────────────── */
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
    img { display: block; max-width: 100%; }
    a { text-decoration: none; }

    /* ── Tokens — light mode default ─────────────────────────  */
    :root {
      --brand: #00BCD4;
      --brand-dk: #0097A7;
      --bg: #ffffff;
      --bg2: #f7f8fa;
      --surface: #ffffff;
      --border: #e8eaed;
      --text: #0d0d0d;
      --text2: #444;
      --muted: #888;
      --card-shadow: 0 2px 16px rgba(0,0,0,.07);
      --phone-shadow: drop-shadow(0 16px 40px rgba(0,0,0,.18));
    }
    @media (prefers-color-scheme: dark) {
      :root {
        --bg: #0a0a0a;
        --bg2: #111111;
        --surface: #161616;
        --border: #242424;
        --text: #f2f2f2;
        --text2: #aaaaaa;
        --muted: #666;
        --card-shadow: 0 2px 16px rgba(0,0,0,.4);
        --phone-shadow: drop-shadow(0 20px 50px rgba(0,0,0,.6));
      }
    }

    /* ── Base ────────────────────────────────────────────────── */
    html { scroll-behavior: smooth; }
    body {
      font-family: 'Inter', sans-serif;
      font-size: 16px;
      line-height: 1.6;
      background: var(--bg);
      color: var(--text);
      overflow-x: hidden;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }

    /* ── Nav ─────────────────────────────────────────────────── */
    .nav {
      position: fixed; top: 0; left: 0; right: 0; z-index: 200;
      display: flex; align-items: center; gap: 12px;
      padding: 12px 20px;
      background: var(--bg);
      border-bottom: 1px solid var(--border);
    }
    .nav-logo-img {
      width: 36px; height: 36px; border-radius: 10px; flex-shrink: 0;
    }
    .nav-name {
      font-size: 17px; font-weight: 800; color: var(--text); letter-spacing: -.3px;
    }
    .nav-spacer { flex: 1; }
    .nav-btn {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 9px 18px;
      background: var(--brand); color: #fff;
      border-radius: 10px; font-family: 'Inter', sans-serif;
      font-size: 13px; font-weight: 700;
      white-space: nowrap;
      transition: opacity .15s;
    }
    .nav-btn:hover { opacity: .85; }

    /* ── Sections ────────────────────────────────────────────── */
    .page { padding-top: 60px; }

    /* ── Hero ────────────────────────────────────────────────── */
    .hero {
      padding: 48px 20px 0;
      text-align: center;
      background: var(--bg);
    }
    .hero-eyebrow {
      display: inline-flex; align-items: center; gap: 6px;
      background: color-mix(in srgb, var(--brand) 10%, transparent);
      border: 1px solid color-mix(in srgb, var(--brand) 25%, transparent);
      color: var(--brand);
      padding: 5px 14px; border-radius: 20px;
      font-size: 12px; font-weight: 700; letter-spacing: .5px; text-transform: uppercase;
      margin-bottom: 20px;
    }
    .hero h1 {
      font-size: clamp(32px, 8vw, 56px);
      font-weight: 900; letter-spacing: -1.5px; line-height: 1.05;
      color: var(--text);
      margin-bottom: 16px;
    }
    .hero h1 .accent {
      color: var(--brand);
    }
    .hero-sub {
      font-size: 16px; color: var(--text2); line-height: 1.7;
      max-width: 480px; margin: 0 auto 28px;
    }
    .hero-actions {
      display: flex; flex-direction: column; gap: 12px;
      align-items: center; margin-bottom: 40px;
    }
    .btn-primary {
      display: inline-flex; align-items: center; justify-content: center; gap: 8px;
      width: 100%; max-width: 320px;
      padding: 15px 24px;
      background: var(--brand); color: #fff;
      border-radius: 14px; font-family: 'Inter', sans-serif;
      font-size: 15px; font-weight: 700;
      transition: opacity .15s, transform .15s;
    }
    .btn-primary:hover { opacity: .88; transform: translateY(-1px); }
    .btn-ghost {
      display: inline-flex; align-items: center; justify-content: center; gap: 8px;
      width: 100%; max-width: 320px;
      padding: 14px 24px;
      background: transparent; color: var(--text);
      border: 1.5px solid var(--border);
      border-radius: 14px; font-family: 'Inter', sans-serif;
      font-size: 15px; font-weight: 600;
      transition: background .15s;
    }
    .btn-ghost:hover { background: var(--bg2); }

    /* Hero phone showcase */
    .hero-phones {
      position: relative;
      display: flex; justify-content: center; align-items: flex-end;
      height: 340px; overflow: visible;
      margin: 0 -20px;
    }
    .hero-phones img {
      position: absolute;
      filter: var(--phone-shadow);
    }
    .hero-phones .ph-main {
      height: 320px; z-index: 3;
      left: 50%; transform: translateX(-50%);
    }
    .hero-phones .ph-left {
      height: 240px; z-index: 2;
      left: calc(50% - 170px);
      transform: rotate(-8deg) translateY(24px);
      opacity: .85;
    }
    .hero-phones .ph-right {
      height: 240px; z-index: 2;
      left: calc(50% + 60px);
      transform: rotate(8deg) translateY(24px);
      opacity: .85;
    }

    /* ── Stats ───────────────────────────────────────────────── */
    .stats {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      border-top: 1px solid var(--border);
      border-bottom: 1px solid var(--border);
      margin-top: 56px;
    }
    .stat {
      padding: 24px 16px;
      text-align: center;
      border-right: 1px solid var(--border);
    }
    .stat:last-child { border-right: none; }
    .stat-val {
      font-size: 26px; font-weight: 900; color: var(--brand);
      letter-spacing: -1px; line-height: 1;
    }
    .stat-lbl {
      font-size: 11px; font-weight: 600; color: var(--muted);
      text-transform: uppercase; letter-spacing: .5px;
      margin-top: 5px;
    }

    /* ── Feature sections ────────────────────────────────────── */
    .feat {
      padding: 56px 20px;
      background: var(--bg);
    }
    .feat.alt { background: var(--bg2); }

    .feat-inner {
      max-width: 480px;
      margin: 0 auto;
    }

    .feat-eyebrow {
      font-size: 11px; font-weight: 700; letter-spacing: 1.5px;
      text-transform: uppercase; color: var(--brand);
      margin-bottom: 8px;
    }
    .feat h2 {
      font-size: clamp(22px, 5vw, 30px);
      font-weight: 800; letter-spacing: -.5px; line-height: 1.2;
      color: var(--text); margin-bottom: 12px;
    }
    .feat-desc {
      font-size: 15px; color: var(--text2); line-height: 1.7;
      margin-bottom: 20px;
    }
    .feat-tags {
      display: flex; flex-wrap: wrap; gap: 8px;
      margin-bottom: 32px;
    }
    .tag {
      display: inline-flex; align-items: center; gap: 5px;
      padding: 5px 12px;
      background: var(--bg2);
      border: 1px solid var(--border);
      border-radius: 20px;
      font-size: 12px; font-weight: 600; color: var(--text2);
    }
    .feat.alt .tag { background: var(--bg); }

    /* Phone in feature section */
    .feat-phone {
      display: flex; justify-content: center;
      margin: 0 -4px;
    }
    .feat-phone img {
      height: 380px;
      filter: var(--phone-shadow);
    }
    .feat-phone-pair {
      display: flex; justify-content: center; align-items: flex-end;
      gap: -20px;
    }
    .feat-phone-pair img {
      height: 300px;
      filter: var(--phone-shadow);
    }
    .feat-phone-pair img:first-child {
      transform: rotate(-4deg) translateX(12px) translateY(16px);
      z-index: 1;
    }
    .feat-phone-pair img:last-child {
      transform: rotate(4deg) translateX(-12px) translateY(16px);
      z-index: 1;
    }

    /* ── Final CTA ───────────────────────────────────────────── */
    .cta-section {
      padding: 64px 20px;
      text-align: center;
      background: var(--brand);
    }
    .cta-section h2 {
      font-size: clamp(24px, 6vw, 36px);
      font-weight: 900; letter-spacing: -1px; color: #fff;
      margin-bottom: 10px;
    }
    .cta-section p {
      font-size: 15px; color: rgba(255,255,255,.8);
      margin-bottom: 28px;
    }
    .btn-white {
      display: inline-flex; align-items: center; justify-content: center; gap: 8px;
      padding: 15px 32px;
      background: #fff; color: var(--brand);
      border-radius: 14px; font-family: 'Inter', sans-serif;
      font-size: 15px; font-weight: 800;
      transition: opacity .15s;
    }
    .btn-white:hover { opacity: .9; }

    /* ── Footer ──────────────────────────────────────────────── */
    footer {
      padding: 28px 20px;
      background: var(--bg2);
      border-top: 1px solid var(--border);
    }
    .footer-top {
      display: flex; align-items: center; gap: 10px;
      margin-bottom: 16px;
    }
    .footer-logo { width: 28px; height: 28px; border-radius: 8px; }
    .footer-brand { font-size: 15px; font-weight: 800; color: var(--text); }
    .footer-links {
      display: flex; flex-wrap: wrap; gap: 8px 20px;
      margin-bottom: 20px;
    }
    .footer-links a {
      font-size: 13px; color: var(--muted); font-weight: 500;
      transition: color .15s;
    }
    .footer-links a:hover { color: var(--brand); }
    .footer-copy {
      font-size: 12px; color: var(--muted); line-height: 1.6;
    }

    /* ── Divider bar ─────────────────────────────────────────── */
    .divider {
      width: 40px; height: 3px; border-radius: 2px;
      background: var(--brand); margin-bottom: 16px;
    }

    /* ── Desktop (≥ 768px) ───────────────────────────────────── */
    @media (min-width: 768px) {
      .nav { padding: 14px 40px; }
      .nav-name { font-size: 18px; }

      .hero { padding: 72px 40px 0; }
      .hero h1 { font-size: clamp(42px, 5vw, 64px); }
      .hero-sub { font-size: 18px; }
      .hero-actions { flex-direction: row; justify-content: center; }
      .btn-primary, .btn-ghost { width: auto; max-width: none; }

      .hero-phones { height: 480px; }
      .hero-phones .ph-main { height: 440px; }
      .hero-phones .ph-left  { height: 340px; left: calc(50% - 240px); }
      .hero-phones .ph-right { height: 340px; left: calc(50% + 80px); }

      .stats { max-width: 900px; margin: 64px auto 0; border: 1px solid var(--border); border-radius: 16px; overflow: hidden; }
      .stat { padding: 32px 24px; }
      .stat-val { font-size: 34px; }

      /* Two-column feature rows on desktop */
      .feat { padding: 80px 40px; }
      .feat-inner {
        max-width: 1100px;
        margin: 0 auto;
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 80px;
        align-items: center;
      }
      .feat-inner.flip { direction: rtl; }
      .feat-inner.flip > * { direction: ltr; }

      .feat-phone img { height: 480px; }
      .feat-phone-pair img { height: 380px; }

      .feat h2 { font-size: clamp(28px, 3vw, 38px); }
      .feat-desc { font-size: 16px; }

      .cta-section { padding: 80px 40px; }
      footer { padding: 40px; }
      .footer-top { margin-bottom: 20px; }
    }

    @media (min-width: 1200px) {
      .feat-inner { gap: 100px; }
    }
  </style>
</head>
<body>

  <!-- Nav -->
  <nav>
    <img class="nav-logo-img" src="/logo.png" alt="${SITE_NAME} logo" />
    <span class="nav-name">${SITE_NAME}</span>
    <div class="nav-spacer"></div>
    <a class="nav-btn" href="https://play.google.com/store/apps/details?id=com.afuchat.app">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
        <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 0 1-.61-.92V2.734a1 1 0 0 1 .609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-1.707l2.108 1.22a1 1 0 0 1 0 1.56l-2.108 1.22-2.537-2.5 2.537-2.5zM5.864 2.658L16.8 8.99l-2.302 2.302L5.864 2.658z"/>
      </svg>
      Download
    </a>
  </nav>

  <div class="page">

    <!-- Hero -->
    <section class="hero">
      <div class="hero-eyebrow">&#10024; The Social Super App</div>
      <h1>Chat. Share.<br><span class="accent">Connect.</span></h1>
      <p class="hero-sub">Real-time messaging, social feeds, AI assistance, digital payments, and a full mini-app ecosystem — built for the modern world.</p>
      <div class="hero-actions">
        <a class="btn-primary" href="https://play.google.com/store/apps/details?id=com.afuchat.app">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 0 1-.61-.92V2.734a1 1 0 0 1 .609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-1.707l2.108 1.22a1 1 0 0 1 0 1.56l-2.108 1.22-2.537-2.5 2.537-2.5zM5.864 2.658L16.8 8.99l-2.302 2.302L5.864 2.658z"/>
          </svg>
          Get on Google Play — Free
        </a>
        <a class="btn-ghost" href="#features">Explore Features</a>
      </div>

      <!-- Three floating phones -->
      <div class="hero-phones">
        <img class="ph-left"  src="/screenshots/discover.png" alt="Discover feed" />
        <img class="ph-main"  src="/screenshots/chats.png"    alt="AfuChat chats" />
        <img class="ph-right" src="/screenshots/search.png"   alt="Search screen" />
      </div>
    </section>

    <!-- Stats -->
    <div class="stats">
      <div class="stat">
        <div class="stat-val">${userCount > 0 ? userCount.toLocaleString() : "1K+"}</div>
        <div class="stat-lbl">Members</div>
      </div>
      <div class="stat">
        <div class="stat-val">${postCount > 0 ? postCount.toLocaleString() : "5K+"}</div>
        <div class="stat-lbl">Posts</div>
      </div>
      <div class="stat">
        <div class="stat-val">Free</div>
        <div class="stat-lbl">Always</div>
      </div>
      <div class="stat">
        <div class="stat-val">10+</div>
        <div class="stat-lbl">Features</div>
      </div>
    </div>

    <!-- Features -->
    <div id="features">

      <!-- 1: Messaging -->
      <section class="feat">
        <div class="feat-inner">
          <div>
            <div class="feat-eyebrow">Messaging</div>
            <div class="divider"></div>
            <h2>Your conversations,<br>beautifully fast</h2>
            <p class="feat-desc">Private chats, group conversations, voice notes, file sharing, read receipts, and AI-powered search — all in one clean inbox.</p>
            <div class="feat-tags">
              <span class="tag">&#128172; Real-time</span>
              <span class="tag">&#127775; AI Search</span>
              <span class="tag">&#128274; End-to-end</span>
              <span class="tag">&#127908; Voice Notes</span>
            </div>
          </div>
          <div class="feat-phone">
            <img src="/screenshots/chats.png" alt="AfuChat chats screen" />
          </div>
        </div>
      </section>

      <!-- 2: Discover -->
      <section class="feat alt">
        <div class="feat-inner flip">
          <div>
            <div class="feat-eyebrow">Social Feed</div>
            <div class="divider"></div>
            <h2>Stay in the loop<br>with your people</h2>
            <p class="feat-desc">A curated feed of posts, videos, and articles from people you follow. Discover trending content and connect with new voices.</p>
            <div class="feat-tags">
              <span class="tag">&#128240; Posts &amp; Articles</span>
              <span class="tag">&#127909; Short Videos</span>
              <span class="tag">&#128101; People to Follow</span>
            </div>
          </div>
          <div class="feat-phone">
            <img src="/screenshots/discover.png" alt="AfuChat Discover feed" />
          </div>
        </div>
      </section>

      <!-- 3: Search -->
      <section class="feat">
        <div class="feat-inner">
          <div>
            <div class="feat-eyebrow">Explore</div>
            <div class="divider"></div>
            <h2>Find anything<br>in seconds</h2>
            <p class="feat-desc">Search for people, posts, videos, jobs, events, channels, gifts, and market listings. Trending insights keep you ahead of the curve.</p>
            <div class="feat-tags">
              <span class="tag">&#127758; People &amp; Channels</span>
              <span class="tag">&#128188; Jobs &amp; Events</span>
              <span class="tag">&#127873; Gifts &amp; Market</span>
              <span class="tag">&#9889; AI-Powered</span>
            </div>
          </div>
          <div class="feat-phone">
            <img src="/screenshots/search.png" alt="AfuChat search screen" />
          </div>
        </div>
      </section>

      <!-- 4: Profile (two phones) -->
      <section class="feat alt">
        <div class="feat-inner flip">
          <div>
            <div class="feat-eyebrow">Your Profile</div>
            <div class="divider"></div>
            <h2>A profile that<br>tells your story</h2>
            <p class="feat-desc">Showcase posts, earn Prestige badges, track XP, manage your ACoin wallet, view analytics, and control every privacy setting.</p>
            <div class="feat-tags">
              <span class="tag">&#127942; Prestige Status</span>
              <span class="tag">&#9889; XP &amp; Levels</span>
              <span class="tag">&#128176; ACoin Wallet</span>
              <span class="tag">&#9989; Verified Badge</span>
            </div>
          </div>
          <div class="feat-phone feat-phone-pair">
            <img src="/screenshots/profile-public.png" alt="Public profile" />
            <img src="/screenshots/profile-me.png"     alt="My profile dashboard" />
          </div>
        </div>
      </section>

      <!-- 5: Apps -->
      <section class="feat">
        <div class="feat-inner">
          <div>
            <div class="feat-eyebrow">Mini-Apps</div>
            <div class="divider"></div>
            <h2>A full ecosystem<br>inside one app</h2>
            <p class="feat-desc">Launch AI tools, intelligence services, finance apps, and more from an in-app store. New apps added regularly — all available to every user.</p>
            <div class="feat-tags">
              <span class="tag">&#129302; AI Lens</span>
              <span class="tag">&#10024; AfuAI Assistant</span>
              <span class="tag">&#128179; Finance Tools</span>
              <span class="tag">&#128269; Smart Search</span>
            </div>
          </div>
          <div class="feat-phone">
            <img src="/screenshots/apps.png" alt="AfuChat mini apps screen" />
          </div>
        </div>
      </section>

      <!-- 6: Payments -->
      <section class="feat alt">
        <div class="feat-inner flip">
          <div>
            <div class="feat-eyebrow">Payments</div>
            <div class="divider"></div>
            <h2>Pay and top up<br>without leaving</h2>
            <p class="feat-desc">Transfer money, buy mobile data, pay utilities, book hotels, and purchase event tickets — all powered by AfuChat's ACoin system.</p>
            <div class="feat-tags">
              <span class="tag">&#128178; Money Transfers</span>
              <span class="tag">&#128241; Mobile Top-Up</span>
              <span class="tag">&#9889; Data Bundles</span>
              <span class="tag">&#127968; Hotels &amp; Travel</span>
            </div>
          </div>
          <div class="feat-phone">
            <img src="/screenshots/pay.png" alt="AfuChat payments screen" />
          </div>
        </div>
      </section>

      <!-- 7: Identity + Calls -->
      <section class="feat">
        <div class="feat-inner">
          <div>
            <div class="feat-eyebrow">Identity &amp; Calls</div>
            <div class="divider"></div>
            <h2>Your verified<br>digital identity</h2>
            <p class="feat-desc">Every member gets a unique Digital ID card with a QR code for instant payments. Plus HD voice and video calls with a complete call history.</p>
            <div class="feat-tags">
              <span class="tag">&#128267; Digital ID</span>
              <span class="tag">&#128247; QR Pay</span>
              <span class="tag">&#128222; Voice Calls</span>
              <span class="tag">&#127909; Video Calls</span>
            </div>
          </div>
          <div class="feat-phone feat-phone-pair">
            <img src="/screenshots/digital-id.png" alt="Digital ID card" />
            <img src="/screenshots/calls.png"      alt="Call history screen" />
          </div>
        </div>
      </section>

      <!-- 8: AfuMatch -->
      <section class="feat alt">
        <div class="feat-inner flip">
          <div>
            <div class="feat-eyebrow">AfuMatch</div>
            <div class="divider"></div>
            <h2>Meet people<br>near you</h2>
            <p class="feat-desc">AfuMatch is AfuChat's built-in social discovery feature. Find people nearby, discover matches, and start real conversations — right inside the app.</p>
            <div class="feat-tags">
              <span class="tag">&#10084; Smart Matching</span>
              <span class="tag">&#128205; Nearby People</span>
              <span class="tag">&#128274; Private &amp; Safe</span>
            </div>
          </div>
          <div class="feat-phone">
            <img src="/screenshots/afumatch.png" alt="AfuMatch social discovery screen" />
          </div>
        </div>
      </section>

    </div>

    <!-- Final CTA -->
    <section class="cta-section">
      <h2>Everything you need.<br>One free app.</h2>
      <p>Join the growing AfuChat community today.</p>
      <a class="btn-white" href="https://play.google.com/store/apps/details?id=com.afuchat.app">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 0 1-.61-.92V2.734a1 1 0 0 1 .609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-1.707l2.108 1.22a1 1 0 0 1 0 1.56l-2.108 1.22-2.537-2.5 2.537-2.5zM5.864 2.658L16.8 8.99l-2.302 2.302L5.864 2.658z"/>
        </svg>
        Download on Google Play
      </a>
    </section>

    <!-- Footer -->
    <footer>
      <div class="footer-top">
        <img class="footer-logo" src="/logo.png" alt="${SITE_NAME}" />
        <span class="footer-brand">${SITE_NAME}</span>
      </div>
      <div class="footer-links">
        <a href="${SITE_URL}/about">About</a>
        <a href="${SITE_URL}/terms">Terms of Service</a>
        <a href="${SITE_URL}/privacy">Privacy Policy</a>
        <a href="${SITE_URL}/help">Help Centre</a>
        <a href="${SITE_URL}/careers">Careers</a>
        <a href="https://play.google.com/store/apps/details?id=com.afuchat.app">Download</a>
      </div>
      <p class="footer-copy">
        &copy; ${new Date().getFullYear()} ${COMPANY}. All rights reserved.<br>
        AfuChat&reg; is a registered trademark of ${COMPANY}.
      </p>
    </footer>

  </div><!-- /.page -->

</body>
</html>`);
});

export default router;
