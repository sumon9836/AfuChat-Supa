import React, { useEffect, useRef, useState } from "react";
import { router } from "expo-router";

const TEAL = "#00C2CB";
const GOLD = "#D4A853";
const DARK = "#0A1A2E";
const DARK2 = "#0F2644";

const FEATURES = [
  { icon: "💬", title: "Real-Time Messaging", desc: "End-to-end encrypted chats, voice notes, file sharing, and group conversations with unlimited members.", screenshot: "/screenshots/chats.png", label: "Chats" },
  { icon: "🔍", title: "Discover People", desc: "Find and connect with people nearby, discover new friends, and explore vibrant communities.", screenshot: "/screenshots/discover.png", label: "Discover" },
  { icon: "💳", title: "AfuPay Payments", desc: "Send money, pay bills, top up airtime, and manage your digital wallet in seconds.", screenshot: "/screenshots/pay.png", label: "AfuPay" },
  { icon: "📞", title: "HD Voice & Video Calls", desc: "Crystal-clear calls with friends and family anywhere in the world, completely free.", screenshot: "/screenshots/calls.png", label: "Calls" },
  { icon: "🧩", title: "Mini Programs", desc: "A full ecosystem of mini-apps inside AfuChat — games, tools, and services without leaving the app.", screenshot: "/screenshots/apps.png", label: "Mini Apps" },
  { icon: "🪪", title: "Digital Identity", desc: "Your verified AfuChat Digital ID — a unique, shareable QR-powered identity card.", screenshot: "/screenshots/digital-id.png", label: "Digital ID" },
  { icon: "❤️", title: "AfuMatch", desc: "Meet new people who share your interests and values through our smart matching system.", screenshot: "/screenshots/afumatch.png", label: "AfuMatch" },
  { icon: "👤", title: "Rich Profiles", desc: "Showcase your personality with a beautiful profile, verified badges, and your story.", screenshot: "/screenshots/profile-me.png", label: "Profiles" },
];

const CARDS = [
  { icon: "🔒", title: "End-to-End Encrypted", desc: "Military-grade encryption on every message, call, and file. Your conversations stay private." },
  { icon: "🤖", title: "AfuAI Assistant", desc: "A powerful personal AI that helps you write, answer questions, generate images, and more." },
  { icon: "🌍", title: "Works Everywhere", desc: "Optimised for low-bandwidth connections. Works great even on 2G networks across Africa." },
  { icon: "🎮", title: "Games & Mini Apps", desc: "A growing ecosystem of games, tools, and mini-programs without ever leaving the app." },
  { icon: "🏆", title: "XP & Achievements", desc: "Earn XP, climb leaderboards, unlock badges, and build your reputation in the community." },
  { icon: "💸", title: "ACoin Rewards", desc: "Earn digital coins through activity, redeem for premium features and real value." },
  { icon: "📰", title: "Moments & Posts", desc: "Share your world with a rich social feed, stories, short videos, and interactive polls." },
  { icon: "👥", title: "Channels & Groups", desc: "Create communities, broadcast to thousands, or build tight-knit groups with full admin controls." },
];

const PREMIUM_FEATURES = [
  "✦ AfuAI — Personal AI assistant & smart replies",
  "✦ AI Image Generator — Create stunning visuals",
  "✦ Verified Gold badge on your profile",
  "✦ Ad-free experience across the entire app",
  "✦ Priority customer support",
  "✦ Exclusive premium sticker packs",
  "✦ Advanced analytics on your content",
  "✦ Larger file sharing up to 2 GB",
];

export default function LandingPage() {
  const [activeFeature, setActiveFeature] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const featuresRef = useRef<HTMLDivElement>(null);
  const aboutRef = useRef<HTMLDivElement>(null);
  const downloadRef = useRef<HTMLDivElement>(null);

  // Fix Expo Router overflow so our fixed overlay can scroll
  useEffect(() => {
    const root = document.getElementById("root");
    const origBodyOverflow = document.body.style.overflow;
    const origBodyBg = document.body.style.background;

    document.body.style.overflow = "hidden";
    document.body.style.background = DARK;

    return () => {
      document.body.style.overflow = origBodyOverflow;
      document.body.style.background = origBodyBg;
    };
  }, []);

  // Sticky nav shadow on scroll
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const fn = () => setScrolled(el.scrollTop > 60);
    el.addEventListener("scroll", fn, { passive: true });
    return () => el.removeEventListener("scroll", fn);
  }, []);

  // Scroll-reveal for elements with .lp-reveal
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add("lp-in"); }),
      { threshold: 0.1, root: el }
    );
    el.querySelectorAll(".lp-reveal").forEach((n) => obs.observe(n));
    return () => obs.disconnect();
  }, []);

  const scrollTo = (ref: React.RefObject<HTMLDivElement | null>) => {
    ref.current?.scrollIntoView({ behavior: "smooth" });
    setMenuOpen(false);
  };

  // colour shortcuts for inline styles
  const s = {
    teal: TEAL, gold: GOLD, dark: DARK, dark2: DARK2,
    tealBtn: { background: `linear-gradient(135deg,${TEAL},#00a8b5)`, color: "#fff", border: "none", cursor: "pointer" } as React.CSSProperties,
    goldBtn: { background: `linear-gradient(135deg,${GOLD},#c8922a)`, color: "#0A1A2E", border: "none", cursor: "pointer" } as React.CSSProperties,
  };

  return (
    <>
      {/* ── STYLES (inline in JSX so they're synchronous with first paint) ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

        .lp *,.lp *::before,.lp *::after{box-sizing:border-box;margin:0;padding:0}
        .lp{font-family:'Inter',system-ui,sans-serif;color:#fff;-webkit-font-smoothing:antialiased}
        .lp a{cursor:pointer}

        /* Animations */
        @keyframes lp-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-14px)}}
        @keyframes lp-shimmer{0%{background-position:-200% center}100%{background-position:200% center}}
        @keyframes lp-pulse{0%{box-shadow:0 0 0 0 rgba(0,194,203,.5)}70%{box-shadow:0 0 0 18px rgba(0,194,203,0)}100%{box-shadow:0 0 0 0 rgba(0,194,203,0)}}
        @keyframes lp-marquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}
        @keyframes lp-scan{0%{top:0%}100%{top:100%}}
        @keyframes lp-fadeIn{from{opacity:0}to{opacity:1}}

        /* Scroll reveal — starts hidden, JS adds lp-in */
        .lp-reveal{opacity:0;transform:translateY(24px);transition:opacity .65s ease,transform .65s ease}
        .lp-reveal.lp-in{opacity:1;transform:translateY(0)}
        .lp-d1{transition-delay:.08s}.lp-d2{transition-delay:.18s}.lp-d3{transition-delay:.28s}.lp-d4{transition-delay:.38s}

        /* Gradient text */
        .lp-grad{background:linear-gradient(135deg,${TEAL} 0%,#00e5ff 42%,${GOLD} 80%);background-size:200% auto;-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;animation:lp-shimmer 4s linear infinite}
        .lp-gold{background:linear-gradient(135deg,${GOLD},#f0c960,#c8922a);background-size:200% auto;-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;animation:lp-shimmer 4s linear infinite}

        /* Navbar */
        .lp-nav{position:sticky;top:0;z-index:50;display:flex;align-items:center;justify-content:space-between;padding:0 6%;height:68px;transition:background .3s,box-shadow .3s}
        .lp-nav.scrolled{background:rgba(10,26,46,.94);backdrop-filter:blur(20px);box-shadow:0 1px 0 rgba(0,194,203,.14)}
        .lp-nav-brand{display:flex;align-items:center;gap:10px;cursor:pointer;text-decoration:none}
        .lp-nav-logo{width:36px;height:36px;border-radius:10px;object-fit:cover}
        .lp-nav-name{font-size:21px;font-weight:800;background:linear-gradient(90deg,${TEAL},#00e5ff);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;letter-spacing:-.5px}
        .lp-nav-links{display:flex;align-items:center;gap:30px;list-style:none}
        .lp-nav-links a{color:rgba(255,255,255,.72);text-decoration:none;font-size:15px;font-weight:500;transition:color .2s}
        .lp-nav-links a:hover{color:${TEAL}}
        .lp-nav-cta{background:linear-gradient(135deg,${TEAL},#00a8b5)!important;color:#fff!important;padding:10px 22px;border-radius:50px;font-weight:700;font-size:14px;box-shadow:0 4px 18px rgba(0,194,203,.28);transition:transform .2s,box-shadow .2s}
        .lp-nav-cta:hover{transform:translateY(-2px);box-shadow:0 8px 26px rgba(0,194,203,.42)!important}
        .lp-hamburger{display:none;flex-direction:column;gap:5px;cursor:pointer;background:none;border:none;padding:4px}
        .lp-hamburger span{display:block;width:24px;height:2px;background:#fff;border-radius:2px}
        .lp-mob{display:none;position:fixed;top:68px;left:0;right:0;background:rgba(8,18,36,.97);backdrop-filter:blur(20px);padding:18px 6% 26px;border-top:1px solid rgba(0,194,203,.12);z-index:49;flex-direction:column;gap:14px}
        .lp-mob.open{display:flex}
        .lp-mob a{color:rgba(255,255,255,.82);text-decoration:none;font-size:17px;font-weight:500;padding:9px 0;border-bottom:1px solid rgba(255,255,255,.07)}

        /* Buttons */
        .lp-btn-p{display:inline-flex;align-items:center;gap:8px;background:linear-gradient(135deg,${TEAL},#00a8b5);color:#fff;text-decoration:none;padding:14px 28px;border-radius:50px;font-weight:700;font-size:15px;box-shadow:0 8px 28px rgba(0,194,203,.32);transition:transform .22s,box-shadow .22s;cursor:pointer;border:none}
        .lp-btn-p:hover{transform:translateY(-3px);box-shadow:0 14px 38px rgba(0,194,203,.48)}
        .lp-btn-s{display:inline-flex;align-items:center;gap:8px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.13);color:#fff;text-decoration:none;padding:14px 28px;border-radius:50px;font-weight:600;font-size:15px;transition:all .22s;cursor:pointer}
        .lp-btn-s:hover{background:rgba(255,255,255,.1);border-color:rgba(0,194,203,.38);transform:translateY(-3px)}
        .lp-btn-g{display:inline-flex;align-items:center;gap:10px;background:linear-gradient(135deg,${GOLD},#c8922a);color:#0A1A2E;text-decoration:none;padding:14px 30px;border-radius:50px;font-weight:800;font-size:15px;box-shadow:0 8px 28px rgba(212,168,83,.32);transition:transform .22s,box-shadow .22s;cursor:pointer;border:none}
        .lp-btn-g:hover{transform:translateY(-3px);box-shadow:0 14px 36px rgba(212,168,83,.48)}

        /* Hero */
        .lp-hero{min-height:100vh;display:flex;align-items:center;padding:100px 6% 72px;position:relative;overflow:hidden;background:radial-gradient(ellipse 80% 60% at 50% 0%,rgba(0,194,203,.11) 0%,transparent 70%),${DARK}}
        .lp-hero-inner{max-width:1140px;margin:0 auto;display:flex;align-items:center;gap:56px;width:100%}
        .lp-badge{display:inline-flex;align-items:center;gap:8px;background:rgba(0,194,203,.1);border:1px solid rgba(0,194,203,.26);color:${TEAL};font-size:12px;font-weight:700;padding:6px 14px;border-radius:50px;margin-bottom:22px;letter-spacing:.8px;text-transform:uppercase}
        .lp-badge-dot{width:7px;height:7px;border-radius:50%;background:${TEAL};animation:lp-pulse 2s infinite;flex-shrink:0}
        .lp-h1{font-size:clamp(34px,5.2vw,68px);font-weight:900;line-height:1.1;margin-bottom:20px;letter-spacing:-2px}
        .lp-sub{font-size:clamp(15px,1.6vw,18px);color:rgba(255,255,255,.6);line-height:1.78;margin-bottom:36px;max-width:490px}
        .lp-ctas{display:flex;gap:12px;flex-wrap:wrap;margin-bottom:42px}
        .lp-stats{display:flex;gap:32px;flex-wrap:wrap}
        .lp-stat-n{font-size:24px;font-weight:800;color:${TEAL};line-height:1}
        .lp-stat-l{font-size:12px;color:rgba(255,255,255,.48);margin-top:3px;font-weight:500}
        .lp-phone{flex:0 0 auto;width:min(300px,36vw);position:relative;animation:lp-float 6s ease-in-out infinite}
        .lp-frame{position:relative;width:100%;padding-top:216%;border-radius:36px;overflow:hidden;box-shadow:0 0 0 7px rgba(255,255,255,.05),0 0 0 11px rgba(0,194,203,.08),0 36px 76px rgba(0,0,0,.58),0 0 55px rgba(0,194,203,.11)}
        .lp-frame img{position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;object-position:top}
        .lp-glow{position:absolute;bottom:-36px;left:50%;transform:translateX(-50%);width:64%;height:32px;background:${TEAL};border-radius:50%;filter:blur(26px);opacity:.26}

        /* Marquee */
        .lp-marquee{overflow:hidden;background:rgba(0,194,203,.05);border-top:1px solid rgba(0,194,203,.09);border-bottom:1px solid rgba(0,194,203,.09);padding:12px 0}
        .lp-marquee-track{display:flex;white-space:nowrap;animation:lp-marquee 30s linear infinite}
        .lp-marquee-item{display:inline-flex;align-items:center;gap:9px;padding:0 26px;color:rgba(255,255,255,.48);font-size:14px;font-weight:500}
        .lp-marquee-dot{width:5px;height:5px;border-radius:50%;background:${TEAL};opacity:.55;flex-shrink:0}

        /* Section commons */
        .lp-sec{max-width:1140px;margin:0 auto;padding:84px 6%}
        .lp-sec-label{display:inline-block;color:${TEAL};font-size:11px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;margin-bottom:12px}
        .lp-h2{font-size:clamp(24px,3.6vw,44px);font-weight:800;line-height:1.15;letter-spacing:-1.5px;margin-bottom:12px}
        .lp-sec-sub{color:rgba(255,255,255,.52);font-size:clamp(14px,1.3vw,17px);line-height:1.75;max-width:520px}

        /* Tabs showcase */
        .lp-showcase{background:linear-gradient(180deg,${DARK} 0%,${DARK2} 50%,${DARK} 100%);padding:84px 0}
        .lp-tabs{display:flex;gap:7px;flex-wrap:wrap;margin:32px 0 40px}
        .lp-tab{padding:9px 18px;border-radius:50px;font-size:13px;font-weight:600;cursor:pointer;border:1px solid rgba(255,255,255,.1);background:transparent;color:rgba(255,255,255,.52);transition:all .2s}
        .lp-tab:hover{border-color:rgba(0,194,203,.38);color:#fff}
        .lp-tab.active{background:linear-gradient(135deg,${TEAL},#00a8b5);border-color:transparent;color:#fff;box-shadow:0 4px 16px rgba(0,194,203,.28)}
        .lp-showcase-row{display:flex;align-items:center;gap:56px}
        .lp-showcase-icon{font-size:44px;margin-bottom:16px;display:block}
        .lp-showcase-h3{font-size:clamp(20px,2.6vw,32px);font-weight:800;margin-bottom:12px;letter-spacing:-1px}
        .lp-showcase-desc{color:rgba(255,255,255,.58);font-size:16px;line-height:1.75;margin-bottom:24px}
        .lp-showcase-phone{flex:0 0 auto;width:min(248px,34vw);animation:lp-float 5s ease-in-out infinite}
        .lp-showcase-phone .lp-frame{border-radius:30px;box-shadow:0 0 0 5px rgba(255,255,255,.04),0 0 0 9px rgba(0,194,203,.06),0 28px 65px rgba(0,0,0,.48)}

        /* Cards */
        .lp-cards-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:16px;margin-top:42px}
        .lp-card{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:16px;padding:24px;transition:transform .28s,border-color .28s,box-shadow .28s;cursor:default}
        .lp-card:hover{transform:translateY(-6px);border-color:rgba(0,194,203,.28);box-shadow:0 18px 48px rgba(0,0,0,.26),0 0 0 1px rgba(0,194,203,.1)}
        .lp-card-icon{font-size:32px;margin-bottom:12px;display:block}
        .lp-card-title{font-size:16px;font-weight:700;margin-bottom:7px}
        .lp-card-desc{color:rgba(255,255,255,.5);font-size:14px;line-height:1.68}

        /* Gallery */
        .lp-gallery{background:${DARK2};padding:84px 0}
        .lp-gallery-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:16px;margin-top:42px}
        .lp-gallery-item{border-radius:20px;overflow:hidden;aspect-ratio:9/19;position:relative;transition:transform .28s,box-shadow .28s;box-shadow:0 8px 24px rgba(0,0,0,.38);border:1px solid rgba(255,255,255,.05)}
        .lp-gallery-item:hover{transform:scale(1.04) translateY(-5px);box-shadow:0 18px 48px rgba(0,0,0,.55),0 0 0 2px ${TEAL}}
        .lp-gallery-item img{width:100%;height:100%;object-fit:cover;object-position:top;display:block}
        .lp-gallery-cap{position:absolute;bottom:0;left:0;right:0;padding:26px 10px 11px;background:linear-gradient(to top,rgba(0,0,0,.76),transparent);font-size:11px;font-weight:600;color:rgba(255,255,255,.88)}

        /* Premium */
        .lp-premium{padding:84px 6%;position:relative;overflow:hidden;background:${DARK}}
        .lp-premium-bg{position:absolute;inset:0;background:linear-gradient(135deg,rgba(212,168,83,.07) 0%,rgba(0,194,203,.04) 100%);pointer-events:none}
        .lp-premium-inner{max-width:1140px;margin:0 auto;display:flex;gap:64px;align-items:center;position:relative;z-index:1}
        .lp-premium-label{display:inline-flex;align-items:center;gap:8px;background:rgba(212,168,83,.1);border:1px solid rgba(212,168,83,.28);color:${GOLD};font-size:11px;font-weight:700;padding:6px 14px;border-radius:50px;text-transform:uppercase;letter-spacing:1.2px;margin-bottom:16px}
        .lp-premium-list{list-style:none;display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-bottom:32px}
        .lp-premium-list li{font-size:13px;color:rgba(255,255,255,.76);font-weight:500;padding:9px 13px;background:rgba(212,168,83,.07);border:1px solid rgba(212,168,83,.12);border-radius:9px}
        .lp-pcard{flex:0 0 290px;background:linear-gradient(135deg,rgba(212,168,83,.1),rgba(212,168,83,.03));border:1px solid rgba(212,168,83,.2);border-radius:24px;padding:32px;text-align:center;position:relative;overflow:hidden}
        .lp-pcard::before{content:'';position:absolute;top:-55px;left:50%;transform:translateX(-50%);width:180px;height:180px;background:radial-gradient(circle,rgba(212,168,83,.16),transparent 70%)}
        .lp-pcard-badge{font-size:56px;margin-bottom:12px;display:block;position:relative;z-index:1}
        .lp-pcard-name{font-size:24px;font-weight:800;background:linear-gradient(135deg,${GOLD},#f0c960);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;margin-bottom:7px}
        .lp-pcard-price{margin-top:18px;padding-top:16px;border-top:1px solid rgba(212,168,83,.16)}
        .lp-pcard-amt{font-size:36px;font-weight:900;color:#fff;letter-spacing:-2px}

        /* About */
        .lp-about-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:42px}
        .lp-ablock{background:rgba(255,255,255,.025);border:1px solid rgba(255,255,255,.06);border-radius:16px;padding:26px}
        .lp-ablock-icon{font-size:28px;margin-bottom:11px;display:block}
        .lp-ablock-title{font-size:16px;font-weight:700;margin-bottom:9px;color:${TEAL}}
        .lp-ablock-text{font-size:14px;color:rgba(255,255,255,.56);line-height:1.75}
        .lp-alink{color:${TEAL};text-decoration:none}

        /* Download */
        .lp-dl{padding:84px 6%;text-align:center;background:radial-gradient(ellipse 68% 50% at 50% 50%,rgba(0,194,203,.08) 0%,transparent 70%),${DARK2}}
        .lp-dl-inner{max-width:660px;margin:0 auto}
        .lp-app-btns{display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-top:34px}
        .lp-app-btn{display:inline-flex;align-items:center;gap:13px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);color:#fff;text-decoration:none;padding:15px 24px;border-radius:14px;transition:all .22s;cursor:pointer}
        .lp-app-btn:hover{background:rgba(255,255,255,.11);transform:translateY(-3px);border-color:rgba(0,194,203,.32)}
        .lp-app-icon{font-size:28px}
        .lp-app-store{font-size:11px;color:rgba(255,255,255,.52)}
        .lp-app-name{font-size:16px;font-weight:700;display:block}
        .lp-qr{margin-top:40px;display:flex;align-items:center;justify-content:center;gap:18px;color:rgba(255,255,255,.42);font-size:14px;line-height:1.5}
        .lp-qr-box{width:84px;height:84px;background:#fff;border-radius:11px;padding:7px;position:relative;overflow:hidden;flex-shrink:0}
        .lp-qr-box::after{content:'';position:absolute;left:0;right:0;height:3px;background:linear-gradient(90deg,transparent,${TEAL},transparent);animation:lp-scan 2s linear infinite}
        .lp-qr-box img{width:100%;height:100%;object-fit:contain}

        /* Footer */
        .lp-footer{background:#060f1c;padding:68px 6% 0;border-top:1px solid rgba(255,255,255,.06)}
        .lp-footer-main{max-width:1140px;margin:0 auto;display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:40px;padding-bottom:50px;border-bottom:1px solid rgba(255,255,255,.06)}
        .lp-footer-logo-row{display:flex;align-items:center;gap:9px;margin-bottom:13px}
        .lp-footer-logo{width:32px;height:32px;border-radius:9px;object-fit:cover}
        .lp-footer-logo-name{font-size:18px;font-weight:800;background:linear-gradient(90deg,${TEAL},#00e5ff);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
        .lp-footer-tagline{color:rgba(255,255,255,.44);font-size:14px;line-height:1.7;margin-bottom:16px;max-width:270px}
        .lp-footer-contact{font-size:13px;color:rgba(255,255,255,.38);line-height:1.9}
        .lp-footer-contact a{color:${TEAL};text-decoration:none}
        .lp-socials{display:flex;gap:8px;margin-top:16px}
        .lp-social{width:32px;height:32px;border-radius:50%;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.09);display:flex;align-items:center;justify-content:center;text-decoration:none;font-size:13px;transition:all .2s;cursor:pointer;color:#fff}
        .lp-social:hover{background:rgba(0,194,203,.18);transform:translateY(-2px)}
        .lp-fcol-title{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:rgba(255,255,255,.32);margin-bottom:16px}
        .lp-flinks{list-style:none;display:flex;flex-direction:column;gap:10px}
        .lp-flinks a{color:rgba(255,255,255,.52);text-decoration:none;font-size:14px;transition:color .2s;cursor:pointer}
        .lp-flinks a:hover{color:${TEAL}}
        .lp-footer-bottom{max-width:1140px;margin:0 auto;padding:20px 0;display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px}
        .lp-footer-copy{font-size:13px;color:rgba(255,255,255,.28)}
        .lp-footer-reg{font-size:12px;color:rgba(255,255,255,.2);margin-top:2px}
        .lp-footer-legal{display:flex;gap:16px}
        .lp-footer-legal a{font-size:13px;color:rgba(255,255,255,.28);text-decoration:none;transition:color .2s;cursor:pointer}
        .lp-footer-legal a:hover{color:${TEAL}}

        /* Responsive */
        @media(max-width:900px){
          .lp-nav-links{display:none}.lp-hamburger{display:flex}
          .lp-hero-inner{flex-direction:column;text-align:center;gap:40px}
          .lp-ctas{justify-content:center}.lp-stats{justify-content:center}
          .lp-sub{margin:0 auto 36px}.lp-phone{width:min(230px,62vw)}
          .lp-showcase-row{flex-direction:column-reverse}.lp-showcase-phone{width:min(210px,58vw)}
          .lp-premium-inner{flex-direction:column;gap:32px}
          .lp-pcard{flex:0 0 auto;width:100%;max-width:320px;margin:0 auto}
          .lp-premium-list{grid-template-columns:1fr}
          .lp-about-grid{grid-template-columns:1fr}
          .lp-footer-main{grid-template-columns:1fr 1fr}
          .lp-gallery-grid{grid-template-columns:repeat(auto-fill,minmax(126px,1fr))}
        }
        @media(max-width:600px){
          .lp-footer-main{grid-template-columns:1fr;gap:24px}
          .lp-footer-bottom{flex-direction:column;align-items:flex-start}
          .lp-stats{gap:20px}
        }
      `}</style>

      {/* ── OUTER SCROLL CONTAINER ── */}
      <div
        ref={scrollRef}
        style={{ position: "fixed", inset: 0, overflowY: "auto", overflowX: "hidden", background: DARK, zIndex: 9998 }}
      >
        <div className="lp">

          {/* ── NAVBAR ── */}
          <nav className={`lp-nav ${scrolled ? "scrolled" : ""}`}>
            <div className="lp-nav-brand" onClick={() => scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" })}>
              <img src="/logo.png" alt="AfuChat" className="lp-nav-logo" />
              <span className="lp-nav-name">AfuChat</span>
            </div>
            <ul className="lp-nav-links">
              <li><a onClick={() => scrollTo(featuresRef)}>Features</a></li>
              <li><a onClick={() => scrollTo(downloadRef)}>Download</a></li>
              <li><a onClick={() => scrollTo(aboutRef)}>About</a></li>
              <li><a href="https://play.google.com/store/apps/details?id=com.afuchat.app" target="_blank" rel="noopener" className="lp-nav-cta">Get the App</a></li>
            </ul>
            <button className="lp-hamburger" onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu">
              <span /><span /><span />
            </button>
          </nav>

          <div className={`lp-mob ${menuOpen ? "open" : ""}`}>
            <a onClick={() => scrollTo(featuresRef)}>Features</a>
            <a onClick={() => scrollTo(downloadRef)}>Download</a>
            <a onClick={() => scrollTo(aboutRef)}>About</a>
            <a href="https://play.google.com/store/apps/details?id=com.afuchat.app" target="_blank" rel="noopener" style={{ color: TEAL }}>Get the App →</a>
          </div>

          {/* ── HERO ── */}
          <section className="lp-hero">
            <div style={{ position:"absolute", inset:0, background:"radial-gradient(ellipse 80% 60% at 50% 0%,rgba(0,194,203,.11) 0%,transparent 70%)", pointerEvents:"none" }} />
            <div className="lp-hero-inner">
              <div style={{ flex: 1 }}>
                <div className="lp-badge"><span className="lp-badge-dot" /> Now Available Worldwide</div>
                <h1 className="lp-h1">
                  The Super App<br />
                  <span className="lp-grad">Africa Deserves</span>
                </h1>
                <p className="lp-sub">
                  AfuChat is the all-in-one platform for messaging, payments, AI assistance, social discovery, and community — built for everyone, everywhere.
                </p>
                <div className="lp-ctas">
                  <a href="https://play.google.com/store/apps/details?id=com.afuchat.app" target="_blank" rel="noopener" className="lp-btn-p">▶ Download Free</a>
                  <button className="lp-btn-s" onClick={() => scrollTo(featuresRef)}>Explore Features →</button>
                </div>
                <div className="lp-stats">
                  {[["2K+","Active Users"],["10K+","Messages Daily"],["50+","Features"],["Free","Always & Forever"]].map(([n,l])=>(
                    <div key={l}><div className="lp-stat-n">{n}</div><div className="lp-stat-l">{l}</div></div>
                  ))}
                </div>
              </div>
              <div className="lp-phone">
                <div className="lp-frame"><img src="/screenshots/chats.png" alt="AfuChat chats" /></div>
                <div className="lp-glow" />
              </div>
            </div>
          </section>

          {/* ── MARQUEE ── */}
          <div className="lp-marquee">
            <div className="lp-marquee-track">
              {[...Array(2)].map((_,i)=>(
                <React.Fragment key={i}>
                  {["💬 Messaging","💳 AfuPay","🤖 AfuAI","🔍 Discover","📞 Calls","🎮 Games","🪪 Digital ID","❤️ AfuMatch","🧩 Mini Apps","🌍 Community","🔒 Encrypted","✨ Premium"].map((t,j)=>(
                    <span key={j} className="lp-marquee-item"><span className="lp-marquee-dot" />{t}</span>
                  ))}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* ── FEATURE SHOWCASE ── */}
          <section className="lp-showcase" ref={featuresRef}>
            <div className="lp-sec" style={{ paddingTop:0, paddingBottom:0 }}>
              <div className="lp-reveal">
                <span className="lp-sec-label">Features</span>
                <h2 className="lp-h2">Everything you need,<br /><span className="lp-grad">all in one place</span></h2>
                <p className="lp-sec-sub">From secure messaging to mobile payments — AfuChat replaces a dozen apps with one beautiful experience.</p>
              </div>
              <div className="lp-tabs">
                {FEATURES.map((f,i)=>(
                  <button key={i} className={`lp-tab${activeFeature===i?" active":""}`} onClick={()=>setActiveFeature(i)}>
                    {f.icon} {f.label}
                  </button>
                ))}
              </div>
              <div className="lp-showcase-row">
                <div style={{ flex:1, minWidth:250 }}>
                  <span className="lp-showcase-icon">{FEATURES[activeFeature].icon}</span>
                  <h3 className="lp-showcase-h3">{FEATURES[activeFeature].title}</h3>
                  <p className="lp-showcase-desc">{FEATURES[activeFeature].desc}</p>
                  <a href="https://play.google.com/store/apps/details?id=com.afuchat.app" target="_blank" rel="noopener" className="lp-btn-p" style={{ display:"inline-flex" }}>Try it Free →</a>
                </div>
                <div className="lp-showcase-phone">
                  <div className="lp-frame">
                    <img src={FEATURES[activeFeature].screenshot} alt={FEATURES[activeFeature].title} key={activeFeature} style={{ animation:"lp-fadeIn .35s ease" }} />
                  </div>
                  <div className="lp-glow" />
                </div>
              </div>
            </div>
          </section>

          {/* ── FEATURE CARDS ── */}
          <div style={{ background: DARK }}>
            <div className="lp-sec">
              <div className="lp-reveal">
                <span className="lp-sec-label">Capabilities</span>
                <h2 className="lp-h2">Built for real life</h2>
                <p className="lp-sec-sub">Designed with African users in mind — fast, offline-friendly, and bandwidth-efficient.</p>
              </div>
              <div className="lp-cards-grid">
                {CARDS.map((c,i)=>(
                  <div key={i} className={`lp-card lp-reveal lp-d${(i%4)+1}`}>
                    <span className="lp-card-icon">{c.icon}</span>
                    <div className="lp-card-title">{c.title}</div>
                    <div className="lp-card-desc">{c.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── SCREENSHOTS GALLERY ── */}
          <div className="lp-gallery">
            <div className="lp-sec" style={{ paddingTop:0, paddingBottom:0 }}>
              <div className="lp-reveal">
                <span className="lp-sec-label">App Screenshots</span>
                <h2 className="lp-h2">See it in action</h2>
                <p className="lp-sec-sub">A glimpse of what's waiting for you inside AfuChat.</p>
              </div>
              <div className="lp-gallery-grid">
                {FEATURES.map((f,i)=>(
                  <div key={i} className={`lp-gallery-item lp-reveal lp-d${(i%4)+1}`}>
                    <img src={f.screenshot} alt={f.title} loading="lazy" />
                    <div className="lp-gallery-cap">{f.icon} {f.label}</div>
                  </div>
                ))}
                <div className="lp-gallery-item lp-reveal lp-d3">
                  <img src="/screenshots/search.png" alt="Search" loading="lazy" />
                  <div className="lp-gallery-cap">🔍 Search</div>
                </div>
                <div className="lp-gallery-item lp-reveal lp-d4">
                  <img src="/screenshots/profile-public.png" alt="Public Profile" loading="lazy" />
                  <div className="lp-gallery-cap">🌐 Public Profile</div>
                </div>
              </div>
            </div>
          </div>

          {/* ── PREMIUM ── */}
          <div className="lp-premium">
            <div className="lp-premium-bg" />
            <div className="lp-premium-inner">
              <div style={{ flex:1 }} className="lp-reveal">
                <div className="lp-premium-label"><span>✦</span> AfuChat Premium</div>
                <h2 className="lp-h2">Unlock the full<br /><span className="lp-gold">Premium experience</span></h2>
                <p style={{ color:"rgba(255,255,255,.56)", fontSize:16, lineHeight:1.75, marginBottom:28 }}>
                  Go beyond with AfuChat Premium — AI tools, verified gold badge, ad-free experience, and more.
                </p>
                <ul className="lp-premium-list">
                  {PREMIUM_FEATURES.map((f,i)=><li key={i}>{f}</li>)}
                </ul>
                <button className="lp-btn-g" onClick={() => router.push("/login")}>✦ Go Premium</button>
              </div>
              <div className="lp-pcard lp-reveal lp-d3">
                <span className="lp-pcard-badge">👑</span>
                <div className="lp-pcard-name">AfuChat Gold</div>
                <p style={{ fontSize:13, color:"rgba(255,255,255,.48)", lineHeight:1.6 }}>The ultimate social super app experience with every premium feature unlocked.</p>
                <div className="lp-pcard-price">
                  <div className="lp-pcard-amt">Free<span style={{ fontSize:15, fontWeight:600 }}>*</span></div>
                  <div style={{ fontSize:13, color:"rgba(255,255,255,.42)", marginTop:4 }}>trial available on sign-up</div>
                  <p style={{ marginTop:12, fontSize:11, color:"rgba(255,255,255,.28)" }}>*Basic features always free. Premium subscription available in-app.</p>
                </div>
              </div>
            </div>
          </div>

          {/* ── ABOUT ── */}
          <div ref={aboutRef}>
            <div className="lp-sec">
              <div className="lp-reveal">
                <span className="lp-sec-label">About Us</span>
                <h2 className="lp-h2">AfuChat Technologies<br /><span className="lp-grad">Limited</span></h2>
                <p className="lp-sec-sub">A technology company headquartered in Entebbe, Uganda, building world-class digital products for Africa and the world.</p>
              </div>
              <div className="lp-about-grid">
                {[
                  { icon:"🏢", title:"Our Company", text:"AfuChat Technologies Limited is a registered technology company founded in Uganda. We are building the next generation of social and financial infrastructure for Africa's 1.4 billion people — starting with communication." },
                  { icon:"🌍", title:"Our Mission", text:"To connect every African with a platform that respects their privacy, works on any device, and empowers them with tools for communication, commerce, and creativity — at zero cost." },
                  { icon:"📍", title:"Where We Are", text:"Headquartered in Entebbe, Central Uganda 🇺🇬. Serving users across Uganda, Kenya, Tanzania, Rwanda, Nigeria, Ghana, and growing worldwide every day." },
                  { icon:"✉️", title:"Get in Touch", text:null },
                ].map((b,i)=>(
                  <div key={i} className={`lp-ablock lp-reveal lp-d${(i%2)+1}`}>
                    <span className="lp-ablock-icon">{b.icon}</span>
                    <div className="lp-ablock-title">{b.title}</div>
                    {b.text
                      ? <div className="lp-ablock-text">{b.text}</div>
                      : <div className="lp-ablock-text" style={{ display:"flex", flexDirection:"column", gap:8 }}>
                          <span>📧 <a href="mailto:support@afuchat.com" className="lp-alink">support@afuchat.com</a></span>
                          <span>📧 <a href="mailto:info@afuchat.com" className="lp-alink">info@afuchat.com</a></span>
                          <span>📞 <a href="tel:+256703464913" className="lp-alink">+256 703 464 913</a></span>
                          <span style={{ color:"rgba(255,255,255,.36)", marginTop:3 }}>Mon – Fri, 8am – 6pm EAT</span>
                        </div>
                    }
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── DOWNLOAD ── */}
          <div className="lp-dl" ref={downloadRef}>
            <div className="lp-dl-inner lp-reveal">
              <span className="lp-sec-label">Download</span>
              <h2 className="lp-h2">Start for <span className="lp-grad">free today</span></h2>
              <p className="lp-sec-sub" style={{ textAlign:"center", margin:"12px auto 0" }}>
                Join thousands already using AfuChat. Free on Android and the web — no credit card needed.
              </p>
              <div className="lp-app-btns">
                <a href="https://play.google.com/store/apps/details?id=com.afuchat.app" target="_blank" rel="noopener" className="lp-app-btn">
                  <span className="lp-app-icon">▶</span>
                  <div><div className="lp-app-store">GET IT ON</div><span className="lp-app-name">Google Play</span></div>
                </a>
                <button className="lp-app-btn" onClick={() => router.push("/login")}>
                  <span className="lp-app-icon">🌐</span>
                  <div><div className="lp-app-store">USE ON</div><span className="lp-app-name">Web Browser</span></div>
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
                  <span className="lp-footer-logo-name">AfuChat</span>
                </div>
                <p className="lp-footer-tagline">The all-in-one super app for messaging, payments, AI, and community. Built in Africa, for the world.</p>
                <div className="lp-footer-contact">
                  <div>📍 Entebbe, Central Uganda, East Africa 🇺🇬</div>
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
              <div>
                <div className="lp-fcol-title">Product</div>
                <ul className="lp-flinks">
                  <li><a onClick={() => scrollTo(featuresRef)}>Features</a></li>
                  <li><a onClick={() => scrollTo(downloadRef)}>Download</a></li>
                  <li><a onClick={() => router.push("/login")}>Premium</a></li>
                  <li><a href="mailto:info@afuchat.com">Changelog</a></li>
                  <li><a href="mailto:info@afuchat.com">Roadmap</a></li>
                </ul>
              </div>
              <div>
                <div className="lp-fcol-title">Company</div>
                <ul className="lp-flinks">
                  <li><a onClick={() => scrollTo(aboutRef)}>About Us</a></li>
                  <li><a href="mailto:careers@afuchat.com">Careers</a></li>
                  <li><a href="mailto:press@afuchat.com">Press</a></li>
                  <li><a href="mailto:partners@afuchat.com">Partners</a></li>
                  <li><a href="mailto:support@afuchat.com">Support</a></li>
                </ul>
              </div>
              <div>
                <div className="lp-fcol-title">Legal</div>
                <ul className="lp-flinks">
                  <li><a onClick={() => router.push("/terms")}>Terms of Service</a></li>
                  <li><a onClick={() => router.push("/privacy")}>Privacy Policy</a></li>
                  <li><a href="mailto:legal@afuchat.com">Cookie Policy</a></li>
                  <li><a href="mailto:legal@afuchat.com">Community Guidelines</a></li>
                  <li><a href="mailto:legal@afuchat.com">GDPR</a></li>
                </ul>
              </div>
            </div>
            <div className="lp-footer-bottom">
              <div>
                <div className="lp-footer-copy">© {new Date().getFullYear()} AfuChat Technologies Limited. All rights reserved.</div>
                <div className="lp-footer-reg">Registered Company · Entebbe, Uganda, East Africa</div>
                <div className="lp-footer-reg" style={{ marginTop:1 }}>AfuChat Technologies Limited · Entebbe · Central Region · Uganda 🇺🇬</div>
              </div>
              <div className="lp-footer-legal">
                <a onClick={() => router.push("/terms")}>Terms</a>
                <a onClick={() => router.push("/privacy")}>Privacy</a>
                <a href="mailto:support@afuchat.com">Support</a>
              </div>
            </div>
          </footer>

        </div>
      </div>
    </>
  );
}
