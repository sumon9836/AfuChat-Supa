import React, { useEffect, useRef, useState } from "react";

// ── Brand tokens ──────────────────────────────────────────
const TEAL  = "#00C2CB";
const GOLD  = "#D4A853";
const BLACK = "#000000";
const S1    = "#0C0C0C"; // surface 1
const S2    = "#141414"; // surface 2
const BORDER = "#1E1E1E";

// ── Helpers ───────────────────────────────────────────────
const nav = (path: string) => { window.location.href = path; };
const ext = (url: string) => { window.open(url, "_blank", "noopener"); };

// ── Data ──────────────────────────────────────────────────
const FEATURES = [
  { icon: "💬", label: "Chats",      title: "Real-Time Messaging",     desc: "End-to-end encrypted chats, voice notes, file sharing, and group conversations with unlimited members.", shot: "/screenshots/chats.png" },
  { icon: "🔍", label: "Discover",   title: "Discover People",         desc: "Find and connect with people nearby, discover new friends, and explore vibrant communities.",            shot: "/screenshots/discover.png" },
  { icon: "💳", label: "AfuPay",     title: "AfuPay Payments",         desc: "Send money, pay bills, top up airtime, and manage your digital wallet in seconds.",                     shot: "/screenshots/pay.png" },
  { icon: "📞", label: "Calls",      title: "HD Voice & Video Calls",  desc: "Crystal-clear calls with friends and family anywhere in the world, completely free.",                   shot: "/screenshots/calls.png" },
  { icon: "🧩", label: "Mini Apps",  title: "Mini Programs",           desc: "A full ecosystem of mini-apps inside AfuChat — games, tools, and services without leaving the app.",    shot: "/screenshots/apps.png" },
  { icon: "🪪", label: "Digital ID", title: "Digital Identity",        desc: "Your verified AfuChat Digital ID — a unique, shareable QR-powered identity card.",                      shot: "/screenshots/digital-id.png" },
  { icon: "❤️", label: "AfuMatch",   title: "AfuMatch",                desc: "Meet new people who share your interests and values through our smart matching system.",                 shot: "/screenshots/afumatch.png" },
  { icon: "👤", label: "Profiles",   title: "Rich Profiles",           desc: "Showcase your personality with a beautiful profile, verified badges, and your story.",                  shot: "/screenshots/profile-me.png" },
];

const CARDS = [
  { icon: "🔒", title: "End-to-End Encrypted",    desc: "Military-grade encryption on every message, call, and file. Your conversations stay private." },
  { icon: "🤖", title: "AfuAI Assistant",           desc: "A personal AI that helps you write, answer questions, generate images, and more." },
  { icon: "🌍", title: "Works Everywhere",           desc: "Optimised for low-bandwidth connections. Works great even on 2G networks across Africa." },
  { icon: "🎮", title: "Games & Mini Apps",          desc: "A growing ecosystem of games, tools, and mini-programs without ever leaving the app." },
  { icon: "🏆", title: "Nexa & Achievements",        desc: "Earn Nexa, climb leaderboards, unlock badges, and build your reputation in the community." },
  { icon: "💸", title: "ACoin Rewards",              desc: "Earn digital coins through activity and redeem them for premium features and real value." },
  { icon: "📰", title: "Moments & Posts",            desc: "Share your world with a rich social feed, stories, short videos, and interactive polls." },
  { icon: "👥", title: "Channels & Groups",          desc: "Create communities, broadcast to thousands, or build tight-knit groups with full admin controls." },
];

const PREMIUM = [
  "AfuAI — Personal AI assistant & smart replies",
  "AI Image Generator — Create stunning visuals",
  "Verified Gold badge on your profile",
  "Ad-free experience across the entire app",
  "Priority customer support",
  "Exclusive premium sticker packs",
  "Advanced analytics on your content",
  "Larger file sharing up to 2 GB",
];

// ── CSS (flat pure-black design) ──────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

.lp *, .lp *::before, .lp *::after { box-sizing: border-box; margin: 0; padding: 0; }
.lp { font-family: 'Inter', system-ui, sans-serif; background: ${BLACK}; color: #fff; -webkit-font-smoothing: antialiased; }
.lp a { cursor: pointer; }

/* Keyframes */
@keyframes lp-float  { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }
@keyframes lp-pulse  { 0%{box-shadow:0 0 0 0 rgba(0,194,203,.45)} 70%{box-shadow:0 0 0 14px rgba(0,194,203,0)} 100%{box-shadow:0 0 0 0 rgba(0,194,203,0)} }
@keyframes lp-mq     { from{transform:translateX(0)} to{transform:translateX(-50%)} }
@keyframes lp-scan   { 0%{top:0} 100%{top:100%} }
@keyframes lp-fadeIn { from{opacity:0} to{opacity:1} }
@keyframes lp-shimmer{ 0%{background-position:-200% center}100%{background-position:200% center} }

/* Scroll reveal */
.lp-r { opacity:0; transform:translateY(20px); transition:opacity .55s ease,transform .55s ease; }
.lp-r.lp-in { opacity:1; transform:translateY(0); }
.lp-d1{transition-delay:.06s} .lp-d2{transition-delay:.13s} .lp-d3{transition-delay:.20s} .lp-d4{transition-delay:.27s}

/* Gradient accent text */
.lp-teal { color: ${TEAL}; }
.lp-gold-text { color: ${GOLD}; }

/* Nav */
.lp-nav { position:sticky; top:0; z-index:50; display:flex; align-items:center; justify-content:space-between; padding:0 6%; height:64px; background:${BLACK}; border-bottom:1px solid ${BORDER}; }
.lp-nav-brand { display:flex; align-items:center; gap:9px; cursor:pointer; text-decoration:none; }
.lp-nav-logo { width:34px; height:34px; border-radius:9px; object-fit:cover; }
.lp-nav-name { font-size:20px; font-weight:800; color:#fff; letter-spacing:-.5px; }
.lp-nav-name span { color:${TEAL}; }
.lp-nav-links { display:flex; align-items:center; gap:28px; list-style:none; }
.lp-nav-links a { color:#888; text-decoration:none; font-size:14px; font-weight:500; transition:color .15s; }
.lp-nav-links a:hover { color:#fff; }
.lp-nav-cta { background:${TEAL}; color:#000!important; padding:9px 20px; border-radius:6px; font-weight:700; font-size:13px; transition:opacity .15s; }
.lp-nav-cta:hover { opacity:.88; }
.lp-hamburger { display:none; flex-direction:column; gap:5px; cursor:pointer; background:none; border:none; padding:4px; }
.lp-hamburger span { display:block; width:22px; height:2px; background:#fff; border-radius:2px; }
.lp-mob { display:none; position:fixed; top:64px; left:0; right:0; background:${BLACK}; border-bottom:1px solid ${BORDER}; padding:16px 6% 24px; z-index:49; flex-direction:column; gap:14px; }
.lp-mob.open { display:flex; }
.lp-mob a { color:#888; text-decoration:none; font-size:16px; font-weight:500; padding:9px 0; border-bottom:1px solid ${BORDER}; }

/* Buttons */
.lp-btn-p { display:inline-flex; align-items:center; gap:7px; background:${TEAL}; color:#000; text-decoration:none; padding:13px 26px; border-radius:6px; font-weight:700; font-size:14px; transition:opacity .15s; cursor:pointer; border:none; }
.lp-btn-p:hover { opacity:.88; }
.lp-btn-s { display:inline-flex; align-items:center; gap:7px; background:transparent; border:1px solid ${BORDER}; color:#888; text-decoration:none; padding:13px 26px; border-radius:6px; font-weight:600; font-size:14px; transition:border-color .15s,color .15s; cursor:pointer; }
.lp-btn-s:hover { border-color:#444; color:#fff; }
.lp-btn-g { display:inline-flex; align-items:center; gap:7px; background:${GOLD}; color:#000; text-decoration:none; padding:13px 26px; border-radius:6px; font-weight:700; font-size:14px; transition:opacity .15s; cursor:pointer; border:none; }
.lp-btn-g:hover { opacity:.88; }

/* Hero */
.lp-hero { min-height:100vh; display:flex; align-items:center; padding:100px 6% 70px; background:${BLACK}; border-bottom:1px solid ${BORDER}; }
.lp-hero-inner { max-width:1100px; margin:0 auto; display:flex; align-items:center; gap:60px; width:100%; }
.lp-badge { display:inline-flex; align-items:center; gap:7px; border:1px solid ${BORDER}; color:#666; font-size:11px; font-weight:600; padding:5px 12px; border-radius:4px; margin-bottom:22px; letter-spacing:.8px; text-transform:uppercase; }
.lp-badge-dot { width:6px; height:6px; border-radius:50%; background:${TEAL}; animation:lp-pulse 2s infinite; flex-shrink:0; }
.lp-h1 { font-size:clamp(34px,5vw,66px); font-weight:900; line-height:1.08; margin-bottom:20px; letter-spacing:-2px; color:#fff; }
.lp-h1 span { color:${TEAL}; }
.lp-sub { font-size:clamp(15px,1.5vw,17px); color:#666; line-height:1.78; margin-bottom:34px; max-width:460px; }
.lp-ctas { display:flex; gap:10px; flex-wrap:wrap; margin-bottom:40px; }
.lp-stats { display:flex; gap:32px; flex-wrap:wrap; padding-top:32px; border-top:1px solid ${BORDER}; }
.lp-stat-n { font-size:22px; font-weight:800; color:#fff; line-height:1; }
.lp-stat-l { font-size:12px; color:#555; margin-top:3px; font-weight:500; }
.lp-phone { flex:0 0 auto; width:min(290px,36vw); position:relative; animation:lp-float 6s ease-in-out infinite; }
.lp-frame { position:relative; width:100%; padding-top:216%; border-radius:16px; overflow:hidden; border:1px solid ${BORDER}; }
.lp-frame img { position:absolute; top:0; left:0; width:100%; height:100%; object-fit:cover; object-position:top; }

/* Marquee */
.lp-mq-wrap { overflow:hidden; border-top:1px solid ${BORDER}; border-bottom:1px solid ${BORDER}; padding:11px 0; background:${S1}; }
.lp-mq-track { display:flex; white-space:nowrap; animation:lp-mq 28s linear infinite; }
.lp-mq-item { display:inline-flex; align-items:center; gap:8px; padding:0 24px; color:#555; font-size:13px; font-weight:500; }
.lp-mq-dot { width:4px; height:4px; border-radius:50%; background:${TEAL}; flex-shrink:0; }

/* Section */
.lp-sec { max-width:1100px; margin:0 auto; padding:80px 6%; }
.lp-sec-label { display:inline-block; color:${TEAL}; font-size:11px; font-weight:700; letter-spacing:2.5px; text-transform:uppercase; margin-bottom:12px; }
.lp-h2 { font-size:clamp(24px,3.4vw,42px); font-weight:800; line-height:1.12; letter-spacing:-1.5px; margin-bottom:12px; color:#fff; }
.lp-h2 span { color:${TEAL}; }
.lp-sec-sub { color:#666; font-size:clamp(14px,1.2vw,16px); line-height:1.75; max-width:500px; }

/* Tabs */
.lp-showcase-bg { background:${S1}; border-top:1px solid ${BORDER}; border-bottom:1px solid ${BORDER}; padding:80px 0; }
.lp-tabs { display:flex; gap:6px; flex-wrap:wrap; margin:28px 0 38px; }
.lp-tab { padding:8px 16px; border-radius:5px; font-size:13px; font-weight:600; cursor:pointer; border:1px solid ${BORDER}; background:transparent; color:#555; transition:all .15s; }
.lp-tab:hover { border-color:#444; color:#ccc; }
.lp-tab.active { background:${TEAL}; border-color:${TEAL}; color:#000; }
.lp-showcase-row { display:flex; align-items:center; gap:56px; }
.lp-showcase-icon { font-size:40px; margin-bottom:14px; display:block; }
.lp-showcase-h3 { font-size:clamp(20px,2.5vw,30px); font-weight:800; margin-bottom:11px; letter-spacing:-1px; color:#fff; }
.lp-showcase-desc { color:#666; font-size:15px; line-height:1.75; margin-bottom:22px; }
.lp-showcase-phone { flex:0 0 auto; width:min(240px,34vw); animation:lp-float 5s ease-in-out infinite; }
.lp-showcase-phone .lp-frame { border-radius:14px; }

/* Cards */
.lp-cards-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(240px,1fr)); gap:1px; margin-top:0; border:1px solid ${BORDER}; border-radius:8px; overflow:hidden; }
.lp-card { background:${S1}; padding:24px; transition:background .15s; cursor:default; }
.lp-card:hover { background:${S2}; }
.lp-card-icon { font-size:28px; margin-bottom:12px; display:block; }
.lp-card-title { font-size:15px; font-weight:700; margin-bottom:7px; color:#fff; }
.lp-card-desc { color:#555; font-size:13px; line-height:1.68; }

/* Gallery */
.lp-gallery-bg { background:${S1}; border-top:1px solid ${BORDER}; border-bottom:1px solid ${BORDER}; padding:80px 0; }
.lp-gallery-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(155px,1fr)); gap:1px; margin-top:40px; border:1px solid ${BORDER}; border-radius:8px; overflow:hidden; }
.lp-gallery-item { aspect-ratio:9/19; position:relative; overflow:hidden; transition:opacity .2s; }
.lp-gallery-item:hover { opacity:.85; }
.lp-gallery-item img { width:100%; height:100%; object-fit:cover; object-position:top; display:block; }
.lp-gallery-cap { position:absolute; bottom:0; left:0; right:0; padding:22px 10px 10px; background:linear-gradient(to top,rgba(0,0,0,.85),transparent); font-size:11px; font-weight:600; color:#ccc; }

/* Premium */
.lp-premium-bg { background:${BLACK}; border-top:1px solid ${BORDER}; padding:80px 6%; }
.lp-premium-inner { max-width:1100px; margin:0 auto; display:flex; gap:60px; align-items:flex-start; }
.lp-premium-label { display:inline-flex; align-items:center; gap:7px; border:1px solid rgba(212,168,83,.3); color:${GOLD}; font-size:11px; font-weight:700; padding:5px 12px; border-radius:4px; text-transform:uppercase; letter-spacing:1px; margin-bottom:16px; }
.lp-premium-list { list-style:none; display:grid; grid-template-columns:1fr 1fr; gap:1px; margin:24px 0 28px; border:1px solid ${BORDER}; border-radius:6px; overflow:hidden; }
.lp-premium-list li { font-size:13px; color:#888; font-weight:500; padding:11px 14px; background:${S1}; }
.lp-pcard { flex:0 0 280px; background:${S1}; border:1px solid ${BORDER}; border-radius:8px; padding:28px; text-align:center; }
.lp-pcard-badge { font-size:48px; margin-bottom:12px; display:block; }
.lp-pcard-name { font-size:22px; font-weight:800; color:${GOLD}; margin-bottom:6px; }
.lp-pcard-price { margin-top:18px; padding-top:16px; border-top:1px solid ${BORDER}; }
.lp-pcard-amt { font-size:32px; font-weight:900; color:#fff; letter-spacing:-1.5px; }

/* About */
.lp-about-bg { background:${S1}; border-top:1px solid ${BORDER}; border-bottom:1px solid ${BORDER}; padding:80px 0; }
.lp-about-grid { display:grid; grid-template-columns:1fr 1fr; gap:1px; margin-top:40px; border:1px solid ${BORDER}; border-radius:8px; overflow:hidden; }
.lp-ablock { background:${BLACK}; padding:26px; }
.lp-ablock-icon { font-size:26px; margin-bottom:11px; display:block; }
.lp-ablock-title { font-size:15px; font-weight:700; margin-bottom:9px; color:${TEAL}; }
.lp-ablock-text { font-size:13px; color:#555; line-height:1.75; }
.lp-alink { color:${TEAL}; text-decoration:none; }

/* Download */
.lp-dl-bg { background:${S1}; border-top:1px solid ${BORDER}; border-bottom:1px solid ${BORDER}; padding:80px 6%; }
.lp-dl-inner { max-width:620px; margin:0 auto; text-align:center; }
.lp-app-btns { display:flex; gap:10px; justify-content:center; flex-wrap:wrap; margin-top:32px; }
.lp-app-btn { display:inline-flex; align-items:center; gap:12px; background:${S2}; border:1px solid ${BORDER}; color:#fff; text-decoration:none; padding:14px 22px; border-radius:8px; transition:border-color .15s; cursor:pointer; }
.lp-app-btn:hover { border-color:#444; }
.lp-app-icon { font-size:26px; }
.lp-app-store { font-size:10px; color:#555; text-transform:uppercase; letter-spacing:.8px; }
.lp-app-name { font-size:15px; font-weight:700; display:block; color:#fff; }
.lp-qr { margin-top:36px; display:flex; align-items:center; justify-content:center; gap:16px; color:#444; font-size:13px; line-height:1.5; }
.lp-qr-box { width:76px; height:76px; background:#fff; border-radius:8px; padding:6px; position:relative; overflow:hidden; flex-shrink:0; }
.lp-qr-box::after { content:''; position:absolute; left:0; right:0; height:2px; background:${TEAL}; animation:lp-scan 2s linear infinite; }
.lp-qr-box img { width:100%; height:100%; object-fit:contain; }

/* Footer */
.lp-footer { background:${BLACK}; padding:60px 6% 0; border-top:1px solid ${BORDER}; }
.lp-footer-main { max-width:1100px; margin:0 auto; display:grid; grid-template-columns:2fr 1fr 1fr 1fr; gap:40px; padding-bottom:48px; border-bottom:1px solid ${BORDER}; }
.lp-footer-logo-row { display:flex; align-items:center; gap:9px; margin-bottom:12px; }
.lp-footer-logo { width:30px; height:30px; border-radius:8px; object-fit:cover; }
.lp-footer-logo-name { font-size:17px; font-weight:800; color:#fff; }
.lp-footer-logo-name span { color:${TEAL}; }
.lp-footer-tagline { color:#444; font-size:13px; line-height:1.7; margin-bottom:16px; max-width:260px; }
.lp-footer-contact { font-size:13px; color:#444; line-height:1.9; }
.lp-footer-contact a { color:${TEAL}; text-decoration:none; }
.lp-socials { display:flex; gap:7px; margin-top:16px; }
.lp-social { width:30px; height:30px; border-radius:4px; background:${S1}; border:1px solid ${BORDER}; display:flex; align-items:center; justify-content:center; text-decoration:none; font-size:12px; transition:border-color .15s; cursor:pointer; color:#666; }
.lp-social:hover { border-color:#444; color:#fff; }
.lp-fcol-title { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:2px; color:#333; margin-bottom:14px; }
.lp-flinks { list-style:none; display:flex; flex-direction:column; gap:9px; }
.lp-flinks a { color:#444; text-decoration:none; font-size:13px; transition:color .15s; cursor:pointer; }
.lp-flinks a:hover { color:#fff; }
.lp-footer-bottom { max-width:1100px; margin:0 auto; padding:18px 0; display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:10px; border-top:0; }
.lp-footer-copy { font-size:12px; color:#333; }
.lp-footer-reg  { font-size:11px; color:#2a2a2a; margin-top:2px; }
.lp-footer-legal { display:flex; gap:14px; }
.lp-footer-legal a { font-size:12px; color:#333; text-decoration:none; transition:color .15s; cursor:pointer; }
.lp-footer-legal a:hover { color:#fff; }

/* Dividers */
.lp-divider { border:none; border-top:1px solid ${BORDER}; margin:0; }

/* Responsive */
@media(max-width:900px){
  .lp-nav-links{display:none} .lp-hamburger{display:flex}
  .lp-hero-inner{flex-direction:column;gap:40px}
  .lp-ctas{flex-wrap:wrap} .lp-stats{justify-content:flex-start}
  .lp-sub{max-width:100%} .lp-phone{width:min(220px,60vw)}
  .lp-showcase-row{flex-direction:column-reverse} .lp-showcase-phone{width:min(200px,56vw)}
  .lp-premium-inner{flex-direction:column;gap:28px}
  .lp-pcard{flex:0 0 auto;width:100%;max-width:300px}
  .lp-premium-list{grid-template-columns:1fr}
  .lp-about-grid{grid-template-columns:1fr}
  .lp-footer-main{grid-template-columns:1fr 1fr}
  .lp-gallery-grid{grid-template-columns:repeat(auto-fill,minmax(120px,1fr))}
}
@media(max-width:600px){
  .lp-footer-main{grid-template-columns:1fr;gap:22px}
  .lp-footer-bottom{flex-direction:column;align-items:flex-start}
  .lp-hero-inner{text-align:left}
  .lp-cards-grid{grid-template-columns:1fr}
}
`;

export default function LandingPage() {
  const [tab, setTab]       = useState(0);
  const [menu, setMenu]     = useState(false);
  const scrollRef           = useRef<HTMLDivElement>(null);
  const featRef             = useRef<HTMLDivElement>(null);
  const aboutRef            = useRef<HTMLDivElement>(null);
  const dlRef               = useRef<HTMLDivElement>(null);

  // Fix Expo overflow so our fixed overlay works
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.body.style.background = BLACK;
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Scroll reveal
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add("lp-in"); }),
      { threshold: 0.08, root: el }
    );
    el.querySelectorAll(".lp-r").forEach((n) => obs.observe(n));
    return () => obs.disconnect();
  }, []);

  const scrollTo = (ref: React.RefObject<HTMLDivElement | null>) => {
    ref.current?.scrollIntoView({ behavior: "smooth" });
    setMenu(false);
  };

  return (
    <>
      <style>{CSS}</style>

      <div
        ref={scrollRef}
        style={{ position: "fixed", inset: 0, overflowY: "auto", overflowX: "hidden", background: BLACK, zIndex: 9998 }}
      >
        <div className="lp">

          {/* ── NAVBAR ── */}
          <nav className="lp-nav">
            <div className="lp-nav-brand" onClick={() => scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" })}>
              <img src="/logo.png" alt="AfuChat" className="lp-nav-logo" />
              <span className="lp-nav-name">Afu<span>Chat</span></span>
            </div>
            <ul className="lp-nav-links">
              <li><a onClick={() => scrollTo(featRef)}>Features</a></li>
              <li><a onClick={() => scrollTo(dlRef)}>Download</a></li>
              <li><a onClick={() => scrollTo(aboutRef)}>About</a></li>
              <li><a onClick={() => nav("/careers")}>Careers</a></li>
              <li><a href="https://play.google.com/store/apps/details?id=com.afuchat.app" target="_blank" rel="noopener" className="lp-nav-cta">Get the App</a></li>
            </ul>
            <button className="lp-hamburger" onClick={() => setMenu(!menu)} aria-label="Menu">
              <span /><span /><span />
            </button>
          </nav>

          <div className={`lp-mob ${menu ? "open" : ""}`}>
            <a onClick={() => scrollTo(featRef)}>Features</a>
            <a onClick={() => scrollTo(dlRef)}>Download</a>
            <a onClick={() => scrollTo(aboutRef)}>About</a>
            <a onClick={() => { nav("/careers"); }}>Careers</a>
            <a href="https://play.google.com/store/apps/details?id=com.afuchat.app" target="_blank" rel="noopener" style={{ color: TEAL }}>Get the App →</a>
          </div>

          {/* ── HERO ── */}
          <section className="lp-hero">
            <div className="lp-hero-inner">
              <div style={{ flex: 1 }}>
                <div className="lp-badge"><span className="lp-badge-dot" /> Now Available Worldwide</div>
                <h1 className="lp-h1">The Super App<br /><span>Africa Deserves</span></h1>
                <p className="lp-sub">AfuChat is the all-in-one platform for messaging, payments, AI assistance, social discovery, and community — built for everyone, everywhere.</p>
                <div className="lp-ctas">
                  <a href="https://play.google.com/store/apps/details?id=com.afuchat.app" target="_blank" rel="noopener" className="lp-btn-p">▶ Download Free</a>
                  <button className="lp-btn-s" onClick={() => scrollTo(featRef)}>Explore Features →</button>
                </div>
                <div className="lp-stats">
                  {[["2K+","Active Users"],["10K+","Messages Daily"],["50+","Features"],["Free","Always"]].map(([n,l])=>(
                    <div key={l}><div className="lp-stat-n">{n}</div><div className="lp-stat-l">{l}</div></div>
                  ))}
                </div>
              </div>
              <div className="lp-phone">
                <div className="lp-frame"><img src="/screenshots/chats.png" alt="AfuChat chats" /></div>
              </div>
            </div>
          </section>

          {/* ── MARQUEE ── */}
          <div className="lp-mq-wrap">
            <div className="lp-mq-track">
              {[...Array(2)].map((_,i)=>(
                <React.Fragment key={i}>
                  {["💬 Messaging","💳 AfuPay","🤖 AfuAI","🔍 Discover","📞 Calls","🎮 Games","🪪 Digital ID","❤️ AfuMatch","🧩 Mini Apps","🌍 Community","🔒 Encrypted","✨ Premium"].map((t,j)=>(
                    <span key={j} className="lp-mq-item"><span className="lp-mq-dot" />{t}</span>
                  ))}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* ── FEATURE SHOWCASE ── */}
          <div className="lp-showcase-bg" ref={featRef}>
            <div className="lp-sec" style={{ paddingTop:0, paddingBottom:0 }}>
              <div className="lp-r">
                <span className="lp-sec-label">Features</span>
                <h2 className="lp-h2">Everything you need,<br /><span>all in one place</span></h2>
                <p className="lp-sec-sub">From secure messaging to mobile payments — AfuChat replaces a dozen apps with one beautiful experience.</p>
              </div>
              <div className="lp-tabs">
                {FEATURES.map((f,i)=>(
                  <button key={i} className={`lp-tab${tab===i?" active":""}`} onClick={()=>setTab(i)}>
                    {f.icon} {f.label}
                  </button>
                ))}
              </div>
              <div className="lp-showcase-row">
                <div style={{ flex:1, minWidth:240 }}>
                  <span className="lp-showcase-icon">{FEATURES[tab].icon}</span>
                  <h3 className="lp-showcase-h3">{FEATURES[tab].title}</h3>
                  <p className="lp-showcase-desc">{FEATURES[tab].desc}</p>
                  <a href="https://play.google.com/store/apps/details?id=com.afuchat.app" target="_blank" rel="noopener" className="lp-btn-p" style={{ display:"inline-flex" }}>Try it Free →</a>
                </div>
                <div className="lp-showcase-phone">
                  <div className="lp-frame">
                    <img src={FEATURES[tab].shot} alt={FEATURES[tab].title} key={tab} style={{ animation:"lp-fadeIn .3s ease" }} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── FEATURE CARDS ── */}
          <div style={{ background: BLACK, borderBottom: `1px solid ${BORDER}` }}>
            <div className="lp-sec">
              <div className="lp-r">
                <span className="lp-sec-label">Capabilities</span>
                <h2 className="lp-h2">Built for real life</h2>
                <p className="lp-sec-sub">Designed with African users in mind — fast, offline-friendly, and bandwidth-efficient.</p>
              </div>
              <div className="lp-cards-grid" style={{ marginTop:32 }}>
                {CARDS.map((c,i)=>(
                  <div key={i} className={`lp-card lp-r lp-d${(i%4)+1}`}>
                    <span className="lp-card-icon">{c.icon}</span>
                    <div className="lp-card-title">{c.title}</div>
                    <div className="lp-card-desc">{c.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── GALLERY ── */}
          <div className="lp-gallery-bg">
            <div className="lp-sec" style={{ paddingTop:0, paddingBottom:0 }}>
              <div className="lp-r">
                <span className="lp-sec-label">App Screenshots</span>
                <h2 className="lp-h2">See it in action</h2>
                <p className="lp-sec-sub">Real screenshots from inside AfuChat — no mockups, no filters.</p>
              </div>
              <div className="lp-gallery-grid">
                {FEATURES.map((f,i)=>(
                  <div key={i} className={`lp-gallery-item lp-r lp-d${(i%4)+1}`}>
                    <img src={f.shot} alt={f.title} loading="lazy" />
                    <div className="lp-gallery-cap">{f.icon} {f.label}</div>
                  </div>
                ))}
                <div className="lp-gallery-item lp-r lp-d3">
                  <img src="/screenshots/search.png" alt="Search" loading="lazy" />
                  <div className="lp-gallery-cap">🔍 Search</div>
                </div>
                <div className="lp-gallery-item lp-r lp-d4">
                  <img src="/screenshots/profile-public.png" alt="Public Profile" loading="lazy" />
                  <div className="lp-gallery-cap">🌐 Public Profile</div>
                </div>
              </div>
            </div>
          </div>

          {/* ── PREMIUM ── */}
          <div className="lp-premium-bg">
            <div className="lp-premium-inner">
              <div style={{ flex:1 }} className="lp-r">
                <div className="lp-premium-label">✦ AfuChat Premium</div>
                <h2 className="lp-h2">Unlock the full<br /><span className="lp-gold-text">Premium experience</span></h2>
                <p style={{ color:"#555", fontSize:15, lineHeight:1.75, marginBottom:20 }}>
                  Go beyond with AfuChat Premium — AI tools, verified gold badge, ad-free experience, and more exclusive features.
                </p>
                <ul className="lp-premium-list">
                  {PREMIUM.map((f,i)=><li key={i}>✦ {f}</li>)}
                </ul>
                <button className="lp-btn-g" onClick={() => nav("/login")}>✦ Go Premium</button>
              </div>
              <div className="lp-pcard lp-r lp-d3">
                <span className="lp-pcard-badge">👑</span>
                <div className="lp-pcard-name">AfuChat Gold</div>
                <p style={{ fontSize:13, color:"#555", lineHeight:1.6 }}>The ultimate social super app experience with every premium feature unlocked.</p>
                <div className="lp-pcard-price">
                  <div className="lp-pcard-amt">Free<span style={{ fontSize:14, fontWeight:600 }}>*</span></div>
                  <div style={{ fontSize:12, color:"#444", marginTop:4 }}>trial available on sign-up</div>
                  <p style={{ marginTop:10, fontSize:11, color:"#333" }}>*Basic features always free. Premium subscription available in-app.</p>
                </div>
              </div>
            </div>
          </div>

          {/* ── ABOUT ── */}
          <div className="lp-about-bg" ref={aboutRef}>
            <div className="lp-sec" style={{ paddingTop:0, paddingBottom:0 }}>
              <div className="lp-r">
                <span className="lp-sec-label">About Us</span>
                <h2 className="lp-h2">AfuChat Technologies<br /><span>Limited</span></h2>
                <p className="lp-sec-sub">A technology company headquartered in Entebbe, Uganda, building world-class digital products for Africa and the world.</p>
              </div>
              <div className="lp-about-grid">
                {[
                  { icon:"🏢", title:"Our Company", text:"AfuChat Technologies Limited is a registered technology company founded in Uganda. We are building the next generation of social and financial infrastructure for Africa's 1.4 billion people — starting with communication." },
                  { icon:"🌍", title:"Our Mission",  text:"To connect every African with a platform that respects their privacy, works on any device, and empowers them with tools for communication, commerce, and creativity — at zero cost." },
                  { icon:"📍", title:"Where We Are", text:"Headquartered in Entebbe, Central Uganda 🇺🇬. Serving users across Uganda, Kenya, Tanzania, Rwanda, Nigeria, Ghana, and growing worldwide every day." },
                  { icon:"✉️", title:"Get in Touch",  text:null },
                ].map((b,i)=>(
                  <div key={i} className={`lp-ablock lp-r lp-d${(i%2)+1}`}>
                    <span className="lp-ablock-icon">{b.icon}</span>
                    <div className="lp-ablock-title">{b.title}</div>
                    {b.text
                      ? <div className="lp-ablock-text">{b.text}</div>
                      : <div className="lp-ablock-text" style={{ display:"flex", flexDirection:"column", gap:8 }}>
                          <span>📧 <a href="mailto:support@afuchat.com" className="lp-alink">support@afuchat.com</a></span>
                          <span>📧 <a href="mailto:info@afuchat.com" className="lp-alink">info@afuchat.com</a></span>
                          <span>📞 <a href="tel:+256703464913" className="lp-alink">+256 703 464 913</a></span>
                          <span style={{ color:"#333", marginTop:3 }}>Mon – Fri, 8am – 6pm EAT</span>
                        </div>
                    }
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── DOWNLOAD ── */}
          <div className="lp-dl-bg" ref={dlRef}>
            <div className="lp-dl-inner lp-r">
              <span className="lp-sec-label">Download</span>
              <h2 className="lp-h2" style={{ textAlign:"center" }}>Start for <span>free today</span></h2>
              <p className="lp-sec-sub" style={{ textAlign:"center", margin:"10px auto 0" }}>
                Join thousands already using AfuChat. Free on Android and the web — no credit card needed.
              </p>
              <div className="lp-app-btns">
                <a href="https://play.google.com/store/apps/details?id=com.afuchat.app" target="_blank" rel="noopener" className="lp-app-btn">
                  <span className="lp-app-icon">▶</span>
                  <div><div className="lp-app-store">Get it on</div><span className="lp-app-name">Google Play</span></div>
                </a>
                <button className="lp-app-btn" onClick={() => nav("/login")}>
                  <span className="lp-app-icon">🌐</span>
                  <div><div className="lp-app-store">Use on</div><span className="lp-app-name">Web Browser</span></div>
                </button>
              </div>
              <div className="lp-qr">
                <div className="lp-qr-box"><img src="/afu-symbol.png" alt="QR" /></div>
                <span>Scan to download<br />on your phone</span>
              </div>
            </div>
          </div>

          {/* ── FOOTER ── */}
          <footer className="lp-footer">
            <div className="lp-footer-main">
              <div>
                <div className="lp-footer-logo-row">
                  <img src="/logo.png" alt="AfuChat" className="lp-footer-logo" />
                  <span className="lp-footer-logo-name">Afu<span>Chat</span></span>
                </div>
                <p className="lp-footer-tagline">The all-in-one super app for messaging, payments, AI, and community. Built in Africa, for the world.</p>
                <div className="lp-footer-contact">
                  <div>📍 Entebbe, Central Uganda 🇺🇬</div>
                  <div>📞 <a href="tel:+256703464913">+256 703 464 913</a></div>
                  <div>📧 <a href="mailto:support@afuchat.com">support@afuchat.com</a></div>
                  <div>📧 <a href="mailto:info@afuchat.com">info@afuchat.com</a></div>
                </div>
                <div className="lp-socials">
                  {[["𝕏","https://twitter.com/afuchat"],["f","https://facebook.com/afuchat"],["📷","https://instagram.com/afuchat"],["▶","https://youtube.com/@afuchat"],["♪","https://tiktok.com/@afuchat"]].map(([icon,url])=>(
                    <a key={icon} href={url} target="_blank" rel="noopener" className="lp-social">{icon}</a>
                  ))}
                </div>
              </div>

              {/* Product */}
              <div>
                <div className="lp-fcol-title">Product</div>
                <ul className="lp-flinks">
                  <li><a onClick={() => scrollTo(featRef)}>Features</a></li>
                  <li><a onClick={() => scrollTo(dlRef)}>Download</a></li>
                  <li><a onClick={() => nav("/login")}>Premium</a></li>
                  <li><a onClick={() => nav("/store")}>Store</a></li>
                  <li><a onClick={() => nav("/lab")}>Labs</a></li>
                </ul>
              </div>

              {/* Company */}
              <div>
                <div className="lp-fcol-title">Company</div>
                <ul className="lp-flinks">
                  <li><a onClick={() => nav("/about")}>About Us</a></li>
                  <li><a onClick={() => nav("/careers")}>Careers</a></li>
                  <li><a href="mailto:press@afuchat.com">Press</a></li>
                  <li><a href="mailto:partners@afuchat.com">Partners</a></li>
                  <li><a onClick={() => nav("/support")}>Support</a></li>
                </ul>
              </div>

              {/* Legal */}
              <div>
                <div className="lp-fcol-title">Legal</div>
                <ul className="lp-flinks">
                  <li><a onClick={() => nav("/terms")}>Terms of Service</a></li>
                  <li><a onClick={() => nav("/privacy")}>Privacy Policy</a></li>
                  <li><a href="mailto:legal@afuchat.com">Cookie Policy</a></li>
                  <li><a href="mailto:legal@afuchat.com">Guidelines</a></li>
                  <li><a href="mailto:legal@afuchat.com">GDPR</a></li>
                </ul>
              </div>
            </div>

            <div className="lp-footer-bottom">
              <div>
                <div className="lp-footer-copy">© {new Date().getFullYear()} AfuChat Technologies Limited. All rights reserved.</div>
                <div className="lp-footer-reg">Registered Company · Entebbe, Uganda, East Africa</div>
                <div className="lp-footer-reg" style={{ marginTop:1 }}>AfuChat Technologies Limited · Central Region · Uganda 🇺🇬</div>
              </div>
              <div className="lp-footer-legal">
                <a onClick={() => nav("/terms")}>Terms</a>
                <a onClick={() => nav("/privacy")}>Privacy</a>
                <a href="mailto:support@afuchat.com">Support</a>
              </div>
            </div>
          </footer>

        </div>
      </div>
    </>
  );
}
