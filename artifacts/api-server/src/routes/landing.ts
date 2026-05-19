import { Router } from "express";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "../lib/constants";

const router = Router();

const supabaseUrl = SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const BRAND     = "#00BCD4";
const BRAND_D   = "#0097A7";
const SITE_NAME = "AfuChat";
const SITE_URL  = "https://afuchat.com";

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

  const jsonLdOrg = { "@context":"https://schema.org","@type":"Organization",name:SITE_NAME,url:SITE_URL,logo:`${SITE_URL}/logo.png`,sameAs:["https://play.google.com/store/apps/details?id=com.afuchat.app"],description:"AfuChat — Connect, chat, and share moments with people around you." };
  const jsonLdWebsite = { "@context":"https://schema.org","@type":"WebSite",name:SITE_NAME,url:SITE_URL,description:"AfuChat is a modern social messaging super app.",potentialAction:{"@type":"SearchAction",target:{"@type":"EntryPoint",urlTemplate:`${SITE_URL}/search?q={search_term_string}`},"query-input":"required name=search_term_string"} };
  const jsonLdApp = { "@context":"https://schema.org","@type":"SoftwareApplication",name:SITE_NAME,applicationCategory:"SocialNetworkingApplication",operatingSystem:"Android, iOS",url:SITE_URL,offers:{"@type":"Offer",price:"0",priceCurrency:"USD"} };

  res.set("Cache-Control", "public, max-age=300, stale-while-revalidate=3600");
  res.send(`<!DOCTYPE html>
<html lang="en" prefix="og: https://ogp.me/ns#">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${SITE_NAME} — Connect, Chat &amp; Share | Social Messaging Super App</title>
  <meta name="description" content="AfuChat is a modern social messaging super app. Connect with friends, share moments, chat in groups, earn rewards, and explore a vibrant community. Download free on Android." />
  <meta name="keywords" content="AfuChat, social media, chat app, messaging, social network, group chat, share moments, community, rewards, ACoin" />
  <meta name="robots" content="index, follow, max-image-preview:large" />
  <link rel="canonical" href="${SITE_URL}" />
  <meta property="og:type" content="website" />
  <meta property="og:title" content="${SITE_NAME} — Connect, Chat &amp; Share" />
  <meta property="og:description" content="A modern social messaging super app." />
  <meta property="og:url" content="${SITE_URL}" />
  <meta property="og:site_name" content="${SITE_NAME}" />
  <meta property="og:image" content="${SITE_URL}/og-default.png" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:site" content="@afuchat" />
  <meta name="twitter:title" content="${SITE_NAME} — Connect, Chat &amp; Share" />
  <meta name="twitter:image" content="${SITE_URL}/og-default.png" />
  <meta name="theme-color" content="${BRAND}" />
  <link rel="icon" type="image/png" href="${SITE_URL}/favicon.png" />
  <script type="application/ld+json">${JSON.stringify(jsonLdOrg).replace(/<\//g,"<\\/")}</script>
  <script type="application/ld+json">${JSON.stringify(jsonLdWebsite).replace(/<\//g,"<\\/")}</script>
  <script type="application/ld+json">${JSON.stringify(jsonLdApp).replace(/<\//g,"<\\/")}</script>

  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    :root{
      --brand:${BRAND};--brand-d:${BRAND_D};
      --bg:#080808;--surface:#111;--border:#1e1e1e;
      --text:#f0f0f0;--muted:#666;--soft:#999;
    }
    html{scroll-behavior:smooth}
    body{font-family:-apple-system,BlinkMacSystemFont,'Inter','Segoe UI',Roboto,sans-serif;background:var(--bg);color:var(--text);min-height:100vh;overflow-x:hidden;-webkit-font-smoothing:antialiased}

    /* ── Nav ── */
    nav{position:fixed;top:0;left:0;right:0;z-index:100;display:flex;align-items:center;justify-content:space-between;padding:16px 40px;backdrop-filter:blur(20px);background:rgba(8,8,8,.85);border-bottom:1px solid rgba(255,255,255,.05)}
    .nav-logo{font-size:22px;font-weight:800;background:linear-gradient(135deg,var(--brand),#4DD0E1);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;text-decoration:none}
    .nav-cta{display:inline-flex;align-items:center;gap:8px;padding:10px 22px;background:var(--brand);color:#fff;text-decoration:none;border-radius:10px;font-weight:700;font-size:14px;transition:opacity .2s}
    .nav-cta:hover{opacity:.85}

    /* ── Hero ── */
    .hero{min-height:100vh;display:flex;align-items:center;padding:100px 40px 60px;max-width:1200px;margin:0 auto;gap:60px}
    .hero-text{flex:1;min-width:300px}
    .hero-badge{display:inline-flex;align-items:center;gap:6px;background:rgba(0,188,212,.08);border:1px solid rgba(0,188,212,.2);color:var(--brand);padding:6px 14px;border-radius:20px;font-size:13px;font-weight:600;margin-bottom:24px}
    .hero h1{font-size:clamp(38px,5vw,68px);font-weight:900;line-height:1.05;letter-spacing:-2px;color:var(--text);margin-bottom:20px}
    .hero h1 span{background:linear-gradient(135deg,var(--brand),#4DD0E1,#80DEEA);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
    .hero-sub{font-size:18px;line-height:1.7;color:var(--soft);margin-bottom:36px;max-width:480px}
    .cta-row{display:flex;gap:12px;flex-wrap:wrap}
    .btn-primary{display:inline-flex;align-items:center;gap:8px;padding:15px 32px;background:linear-gradient(135deg,var(--brand),var(--brand-d));color:#fff;text-decoration:none;border-radius:14px;font-weight:700;font-size:16px;transition:transform .2s,box-shadow .2s;box-shadow:0 4px 24px rgba(0,188,212,.3)}
    .btn-primary:hover{transform:translateY(-2px);box-shadow:0 8px 32px rgba(0,188,212,.4)}
    .btn-secondary{display:inline-flex;align-items:center;gap:8px;padding:15px 32px;background:transparent;color:var(--text);text-decoration:none;border-radius:14px;font-weight:600;font-size:16px;border:1px solid var(--border);transition:border-color .2s,background .2s}
    .btn-secondary:hover{background:var(--surface);border-color:#333}

    /* ── Hero phones ── */
    .hero-phones{flex:1;min-width:280px;position:relative;height:560px;display:flex;align-items:center;justify-content:center}
    .hero-phones img{position:absolute;height:420px;filter:drop-shadow(0 20px 60px rgba(0,0,0,.6))}
    .hero-phones .p-center{height:480px;z-index:3;transform:translateY(-10px)}
    .hero-phones .p-left{height:360px;z-index:2;transform:translateX(-130px) rotate(-8deg) translateY(30px)}
    .hero-phones .p-right{height:360px;z-index:2;transform:translateX(130px) rotate(8deg) translateY(30px)}

    /* ── Stats ── */
    .stats{display:flex;gap:0;justify-content:center;padding:0 40px 80px;max-width:900px;margin:0 auto;border-top:1px solid var(--border);border-bottom:1px solid var(--border)}
    .stat{flex:1;text-align:center;padding:36px 20px}
    .stat+.stat{border-left:1px solid var(--border)}
    .stat-val{font-size:36px;font-weight:900;background:linear-gradient(135deg,var(--brand),#4DD0E1);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
    .stat-lbl{font-size:13px;color:var(--muted);margin-top:6px;font-weight:500;letter-spacing:.5px;text-transform:uppercase}

    /* ── Section wrapper ── */
    .section{max-width:1200px;margin:0 auto;padding:100px 40px}
    .section-eyebrow{font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--brand);margin-bottom:12px}
    .section-title{font-size:clamp(28px,4vw,44px);font-weight:800;line-height:1.15;letter-spacing:-1px;color:var(--text);margin-bottom:16px}
    .section-sub{font-size:17px;color:var(--soft);line-height:1.7;max-width:480px}

    /* ── Feature row: text left, phone right ── */
    .feat-row{display:flex;align-items:center;gap:80px;margin-bottom:120px}
    .feat-row.rev{flex-direction:row-reverse}
    .feat-text{flex:1}
    .feat-phone{flex:1;display:flex;justify-content:center;align-items:center;position:relative;min-height:500px}
    .feat-phone img{height:460px;filter:drop-shadow(0 24px 60px rgba(0,0,0,.7));transition:transform .4s}
    .feat-phone img:hover{transform:translateY(-8px) scale(1.02)}
    .feat-chips{display:flex;flex-wrap:wrap;gap:8px;margin-top:28px}
    .chip{display:inline-flex;align-items:center;gap:6px;padding:7px 14px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:20px;font-size:13px;color:var(--soft)}
    .chip svg{opacity:.7}

    /* ── Three-up phones ── */
    .three-up{display:flex;align-items:flex-end;justify-content:center;gap:16px;padding:20px 0 0}
    .three-up img{filter:drop-shadow(0 20px 50px rgba(0,0,0,.7));transition:transform .4s}
    .three-up img:hover{transform:translateY(-10px)}
    .three-up .tu-center{height:420px;z-index:2}
    .three-up .tu-side{height:360px;opacity:.9}

    /* ── Two-up ── */
    .two-up{display:flex;align-items:flex-end;justify-content:center;gap:24px;padding:20px 0 0}
    .two-up img{height:400px;filter:drop-shadow(0 20px 50px rgba(0,0,0,.7));transition:transform .4s}
    .two-up img:hover{transform:translateY(-8px)}

    /* ── Section divider ── */
    .divider{width:60px;height:3px;background:linear-gradient(90deg,var(--brand),var(--brand-d));border-radius:2px;margin-bottom:24px}

    /* ── Glow orbs ── */
    .glow{position:absolute;border-radius:50%;filter:blur(80px);pointer-events:none;z-index:0}
    .glow-teal{width:400px;height:400px;background:rgba(0,188,212,.07)}
    .glow-blue{width:300px;height:300px;background:rgba(33,150,243,.06)}
    .section-inner{position:relative;z-index:1}

    /* ── Bottom CTA ── */
    .bottom-cta{text-align:center;padding:100px 40px 120px;position:relative;overflow:hidden}
    .bottom-cta::before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse at 50% 100%,rgba(0,188,212,.12),transparent 70%)}
    .bottom-cta h2{font-size:clamp(32px,4vw,52px);font-weight:900;letter-spacing:-1.5px;margin-bottom:14px}
    .bottom-cta p{font-size:18px;color:var(--soft);margin-bottom:36px}

    /* ── Footer ── */
    footer{text-align:center;padding:32px 24px;color:var(--muted);font-size:13px;border-top:1px solid var(--border)}
    footer a{color:var(--brand);text-decoration:none}
    footer a:hover{text-decoration:underline}

    /* ── Responsive ── */
    @media(max-width:900px){
      nav{padding:14px 20px}
      .hero{flex-direction:column;padding:90px 24px 40px;gap:40px;min-height:auto}
      .hero-phones{height:320px}
      .hero-phones .p-center{height:300px}
      .hero-phones .p-left,.hero-phones .p-right{height:220px}
      .hero-phones .p-left{transform:translateX(-80px) rotate(-6deg) translateY(20px)}
      .hero-phones .p-right{transform:translateX(80px) rotate(6deg) translateY(20px)}
      .stats{flex-direction:column;gap:0}
      .stat+.stat{border-left:none;border-top:1px solid var(--border)}
      .feat-row,.feat-row.rev{flex-direction:column;gap:40px;margin-bottom:80px}
      .section{padding:60px 24px}
      .three-up .tu-center{height:300px}
      .three-up .tu-side{height:240px}
      .two-up img{height:280px}
    }
  </style>
</head>
<body>

  <!-- Nav -->
  <nav>
    <a class="nav-logo" href="/">${SITE_NAME}</a>
    <a class="nav-cta" href="https://play.google.com/store/apps/details?id=com.afuchat.app">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 0 1-.61-.92V2.734a1 1 0 0 1 .609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-1.707l2.108 1.22a1 1 0 0 1 0 1.56l-2.108 1.22-2.537-2.5 2.537-2.5zM5.864 2.658L16.8 8.99l-2.302 2.302L5.864 2.658z"/></svg>
      Download Free
    </a>
  </nav>

  <!-- Hero -->
  <section style="position:relative;overflow:hidden">
    <div class="glow glow-teal" style="top:-100px;left:-100px"></div>
    <div class="glow glow-blue" style="top:100px;right:-50px"></div>
    <div class="hero">
      <div class="hero-text section-inner">
        <div class="hero-badge">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
          The Social Super App
        </div>
        <h1>Chat. Share.<br><span>Connect.</span></h1>
        <p class="hero-sub">Real-time messaging, social feeds, AI assistance, digital payments, and more — all in one app built for the modern world.</p>
        <div class="cta-row">
          <a class="btn-primary" href="https://play.google.com/store/apps/details?id=com.afuchat.app">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 0 1-.61-.92V2.734a1 1 0 0 1 .609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-1.707l2.108 1.22a1 1 0 0 1 0 1.56l-2.108 1.22-2.537-2.5 2.537-2.5zM5.864 2.658L16.8 8.99l-2.302 2.302L5.864 2.658z"/></svg>
            Get on Google Play
          </a>
          <a class="btn-secondary" href="#features">See Features</a>
        </div>
      </div>
      <div class="hero-phones section-inner">
        <img class="p-left"   src="/screenshots/discover.png"  alt="AfuChat Discover feed" />
        <img class="p-center" src="/screenshots/chats.png"     alt="AfuChat Chats" />
        <img class="p-right"  src="/screenshots/search.png"    alt="AfuChat Search" />
      </div>
    </div>
  </section>

  <!-- Stats -->
  <div style="max-width:900px;margin:0 auto;padding:0 40px">
    <div class="stats">
      <div class="stat">
        <div class="stat-val">${userCount > 0 ? userCount.toLocaleString() : "Growing"}</div>
        <div class="stat-lbl">Members</div>
      </div>
      <div class="stat">
        <div class="stat-val">${postCount > 0 ? postCount.toLocaleString() : "Thousands"}</div>
        <div class="stat-lbl">Posts Shared</div>
      </div>
      <div class="stat">
        <div class="stat-val">Free</div>
        <div class="stat-lbl">Forever</div>
      </div>
      <div class="stat">
        <div class="stat-val">5★</div>
        <div class="stat-lbl">Rated</div>
      </div>
    </div>
  </div>

  <!-- Features -->
  <div id="features">

    <!-- 1: Messaging -->
    <div class="section" style="position:relative;overflow:hidden">
      <div class="glow glow-teal" style="bottom:-80px;right:-80px"></div>
      <div class="feat-row section-inner">
        <div class="feat-text">
          <div class="section-eyebrow">Messaging</div>
          <div class="divider"></div>
          <h2 class="section-title">Your conversations,<br>beautifully organized</h2>
          <p class="section-sub">Private messages, group chats, voice notes, and file sharing — with read receipts, AI-powered search, and instant notifications.</p>
          <div class="feat-chips">
            <span class="chip">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              Real-time delivery
            </span>
            <span class="chip">🤖 AI Search</span>
            <span class="chip">🔒 Private &amp; Secure</span>
            <span class="chip">📎 File Sharing</span>
            <span class="chip">🎙 Voice Messages</span>
          </div>
        </div>
        <div class="feat-phone">
          <img src="/screenshots/chats.png" alt="AfuChat messaging screen" />
        </div>
      </div>
    </div>

    <!-- 2: Discover Feed -->
    <div class="section" style="position:relative;overflow:hidden">
      <div class="glow glow-blue" style="top:-80px;left:-80px"></div>
      <div class="feat-row rev section-inner">
        <div class="feat-text">
          <div class="section-eyebrow">Social Feed</div>
          <div class="divider"></div>
          <h2 class="section-title">Discover what's<br>happening now</h2>
          <p class="section-sub">A curated social feed with posts, videos, and articles from people you follow. Find new people to follow and stay in the loop with trending content.</p>
          <div class="feat-chips">
            <span class="chip">📰 Posts &amp; Articles</span>
            <span class="chip">🎬 Short Videos</span>
            <span class="chip">👥 People You May Know</span>
            <span class="chip">🔥 Trending</span>
          </div>
        </div>
        <div class="feat-phone">
          <img src="/screenshots/discover.png" alt="AfuChat Discover feed" />
        </div>
      </div>
    </div>

    <!-- 3: Search / Explore -->
    <div class="section" style="position:relative;overflow:hidden">
      <div class="glow glow-teal" style="top:-60px;right:-60px"></div>
      <div class="feat-row section-inner">
        <div class="feat-text">
          <div class="section-eyebrow">Explore</div>
          <div class="divider"></div>
          <h2 class="section-title">Search everything<br>in one place</h2>
          <p class="section-sub">Find people, posts, videos, jobs, events, channels, and gifts. AI-powered search surfaces exactly what you're looking for, with trending insights to keep you ahead.</p>
          <div class="feat-chips">
            <span class="chip">🌍 People &amp; Channels</span>
            <span class="chip">🎁 Gifts &amp; Market</span>
            <span class="chip">💼 Jobs &amp; Events</span>
            <span class="chip">⚡ AI-powered</span>
          </div>
        </div>
        <div class="feat-phone">
          <img src="/screenshots/search.png" alt="AfuChat search screen" />
        </div>
      </div>
    </div>

    <!-- 4: Profile (two phones) -->
    <div class="section" style="position:relative;overflow:hidden">
      <div class="glow glow-blue" style="bottom:-80px;left:-80px"></div>
      <div class="feat-row rev section-inner">
        <div class="feat-text">
          <div class="section-eyebrow">Your Profile</div>
          <div class="divider"></div>
          <h2 class="section-title">A profile that<br>tells your story</h2>
          <p class="section-sub">Showcase your posts, earn Prestige badges, track XP, manage your ACoins wallet, and control your subscriptions — all from one beautiful dashboard.</p>
          <div class="feat-chips">
            <span class="chip">🏆 Prestige Status</span>
            <span class="chip">⚡ XP &amp; Levels</span>
            <span class="chip">💰 ACoin Wallet</span>
            <span class="chip">✅ Verified Badge</span>
            <span class="chip">📊 Creator Analytics</span>
          </div>
        </div>
        <div class="feat-phone" style="gap:16px">
          <div class="two-up">
            <img src="/screenshots/profile-public.png" alt="AfuChat public profile" />
            <img src="/screenshots/profile-me.png"     alt="AfuChat my profile dashboard" />
          </div>
        </div>
      </div>
    </div>

    <!-- 5: Apps -->
    <div class="section" style="position:relative;overflow:hidden">
      <div class="glow glow-teal" style="top:-60px;left:-60px"></div>
      <div class="feat-row section-inner">
        <div class="feat-text">
          <div class="section-eyebrow">Apps</div>
          <div class="divider"></div>
          <h2 class="section-title">A full ecosystem<br>of mini-apps</h2>
          <p class="section-sub">AfuChat isn't just a chat app. Browse and launch AI tools, intelligence services, finance apps, and more from an App Store built right inside the platform.</p>
          <div class="feat-chips">
            <span class="chip">🤖 AI Lens</span>
            <span class="chip">🔍 Smart Search</span>
            <span class="chip">✨ AfuAI Assistant</span>
            <span class="chip">💳 Finance Tools</span>
            <span class="chip">🆕 New Every Week</span>
          </div>
        </div>
        <div class="feat-phone">
          <img src="/screenshots/apps.png" alt="AfuChat mini apps screen" />
        </div>
      </div>
    </div>

    <!-- 6: Payments -->
    <div class="section" style="position:relative;overflow:hidden">
      <div class="glow glow-blue" style="top:-80px;right:-80px"></div>
      <div class="feat-row rev section-inner">
        <div class="feat-text">
          <div class="section-eyebrow">Payments</div>
          <div class="divider"></div>
          <h2 class="section-title">Pay, transfer &amp; top up<br>without leaving the app</h2>
          <p class="section-sub">Send money, buy mobile data, pay utilities, book hotels, purchase event tickets — all through AfuChat's integrated Pay &amp; Services hub powered by ACoin.</p>
          <div class="feat-chips">
            <span class="chip">💸 Money Transfers</span>
            <span class="chip">📱 Mobile Top-Up</span>
            <span class="chip">⚡ Data Bundles</span>
            <span class="chip">🏨 Hotels &amp; Travel</span>
            <span class="chip">🎟 Event Tickets</span>
          </div>
        </div>
        <div class="feat-phone">
          <img src="/screenshots/pay.png" alt="AfuChat payments screen" />
        </div>
      </div>
    </div>

    <!-- 7: Digital ID + Calls side by side -->
    <div class="section" style="position:relative;overflow:hidden">
      <div class="glow glow-teal" style="bottom:-60px;right:-60px"></div>
      <div class="feat-row section-inner">
        <div class="feat-text">
          <div class="section-eyebrow">Identity &amp; Calls</div>
          <div class="divider"></div>
          <h2 class="section-title">Your verified<br>digital identity</h2>
          <p class="section-sub">Every AfuChat member gets a unique Digital ID card with a QR code for instant payments. Plus crystal-clear voice &amp; video calls with a full call history.</p>
          <div class="feat-chips">
            <span class="chip">🪪 Digital ID Card</span>
            <span class="chip">📷 QR Pay</span>
            <span class="chip">📞 Voice Calls</span>
            <span class="chip">🎥 Video Calls</span>
            <span class="chip">📋 Full Call History</span>
          </div>
        </div>
        <div class="feat-phone">
          <div class="two-up">
            <img src="/screenshots/digital-id.png" alt="AfuChat Digital ID" />
            <img src="/screenshots/calls.png"      alt="AfuChat call history" />
          </div>
        </div>
      </div>
    </div>

    <!-- 8: AfuMatch -->
    <div class="section" style="position:relative;overflow:hidden">
      <div class="glow glow-blue" style="top:-80px;left:-80px"></div>
      <div class="feat-row rev section-inner">
        <div class="feat-text">
          <div class="section-eyebrow">AfuMatch</div>
          <div class="divider"></div>
          <h2 class="section-title">Meet people<br>near you</h2>
          <p class="section-sub">AfuMatch is AfuChat's built-in dating and social discovery feature. Browse profiles, find matches, and start conversations — right inside the app you already use.</p>
          <div class="feat-chips">
            <span class="chip">❤️ Smart Matching</span>
            <span class="chip">📍 Nearby People</span>
            <span class="chip">💬 In-app Messaging</span>
            <span class="chip">🔒 Private &amp; Safe</span>
          </div>
        </div>
        <div class="feat-phone">
          <img src="/screenshots/afumatch.png" alt="AfuMatch dating screen" />
        </div>
      </div>
    </div>

  </div>

  <!-- Bottom CTA -->
  <section class="bottom-cta">
    <div class="section-eyebrow" style="margin-bottom:16px">Free Download</div>
    <h2>Everything you need.<br>One app.</h2>
    <p>Join thousands of people already chatting, sharing, and earning on AfuChat.</p>
    <div class="cta-row" style="justify-content:center">
      <a class="btn-primary" href="https://play.google.com/store/apps/details?id=com.afuchat.app">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 0 1-.61-.92V2.734a1 1 0 0 1 .609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-1.707l2.108 1.22a1 1 0 0 1 0 1.56l-2.108 1.22-2.537-2.5 2.537-2.5zM5.864 2.658L16.8 8.99l-2.302 2.302L5.864 2.658z"/></svg>
        Download for Android
      </a>
      <a class="btn-secondary" href="https://afuchat.com">afuchat.com</a>
    </div>
  </section>

  <footer>
    <p>&copy; ${new Date().getFullYear()} <a href="${SITE_URL}">${SITE_NAME}</a>. All rights reserved. &nbsp;&middot;&nbsp; <a href="${SITE_URL}/terms">Terms</a> &nbsp;&middot;&nbsp; <a href="${SITE_URL}/privacy">Privacy</a></p>
  </footer>

</body>
</html>`);
});

export default router;
