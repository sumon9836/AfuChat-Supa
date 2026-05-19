import React, { useRef, useState } from "react";
import {
  MessageCircle, Compass, CreditCard, PhoneCall, LayoutGrid, QrCode,
  Heart, UserCircle2, ShieldCheck, Sparkles, Globe, Gamepad2, Trophy,
  Zap, ImageIcon, Users, Bot, Gift, Clock, Lock, Crown, ArrowRight, Play,
} from "lucide-react";
import {
  LANDING_CSS, TEAL, GOLD, LandingNav, LandingFooter, LandingBottomNav, useLandingSetup,
} from "@/components/landing/index.web";

const FEATURES = [
  { Icon: MessageCircle, label: "Chats",      title: "Real-Time Messaging",    desc: "End-to-end encrypted chats, voice notes, file sharing, and group conversations with unlimited members.", shot: "/screenshots/chats.png" },
  { Icon: Compass,       label: "Discover",   title: "Discover People",        desc: "Find and connect with people nearby, discover new friends, and explore vibrant communities.",            shot: "/screenshots/discover.png" },
  { Icon: CreditCard,    label: "AfuPay",     title: "AfuPay Payments",        desc: "Send money, pay bills, top up airtime, and manage your digital wallet in seconds.",                     shot: "/screenshots/pay.png" },
  { Icon: PhoneCall,     label: "Calls",      title: "HD Voice & Video Calls", desc: "Crystal-clear calls with friends and family anywhere in the world, completely free.",                   shot: "/screenshots/calls.png" },
  { Icon: LayoutGrid,    label: "Mini Apps",  title: "Mini Programs",          desc: "A full ecosystem of mini-apps inside AfuChat — games, tools, and services without leaving the app.",    shot: "/screenshots/apps.png" },
  { Icon: QrCode,        label: "Digital ID", title: "Digital Identity",       desc: "Your verified AfuChat Digital ID — a unique, shareable QR-powered identity card.",                      shot: "/screenshots/digital-id.png" },
  { Icon: Heart,         label: "AfuMatch",   title: "AfuMatch",               desc: "Meet new people who share your interests and values through our smart matching system.",                 shot: "/screenshots/afumatch.png" },
  { Icon: UserCircle2,   label: "Profiles",   title: "Rich Profiles",          desc: "Showcase your personality with a beautiful profile, verified badges, and your story.",                  shot: "/screenshots/profile-me.png" },
];

const CARDS = [
  { Icon: ShieldCheck, color: TEAL,      title: "End-to-End Encrypted",   desc: "Military-grade encryption on every message, call, and file. Your conversations stay private." },
  { Icon: Bot,         color: "#AF52DE", title: "AfuAI Assistant",         desc: "A personal AI that helps you write, answer questions, generate images, and more." },
  { Icon: Globe,       color: "#34C759", title: "Works Everywhere",        desc: "Optimised for low-bandwidth. Works great even on 2G networks across Africa." },
  { Icon: Gamepad2,    color: "#007AFF", title: "Games & Mini Apps",       desc: "A growing ecosystem of games, tools, and mini-programs without ever leaving the app." },
  { Icon: Trophy,      color: GOLD,      title: "Nexa & Achievements",     desc: "Earn Nexa, climb leaderboards, unlock badges, and build your reputation." },
  { Icon: Zap,         color: "#FF9500", title: "ACoin Rewards",           desc: "Earn digital coins through activity and redeem them for premium features and real value." },
  { Icon: ImageIcon,   color: "#FF2D55", title: "Moments & Posts",         desc: "Share your world with a rich social feed, stories, short videos, and interactive polls." },
  { Icon: Users,       color: "#5856D6", title: "Channels & Groups",       desc: "Create communities, broadcast to thousands, or build tight-knit groups with full admin controls." },
];

const PREMIUM = [
  { Icon: Bot,        text: "AfuAI — Personal AI assistant & smart replies" },
  { Icon: Sparkles,   text: "AI Image Generator — Create stunning visuals" },
  { Icon: ShieldCheck,text: "Verified Gold badge on your profile" },
  { Icon: Clock,      text: "Priority customer support" },
  { Icon: Gift,       text: "Larger file sharing up to 2 GB" },
  { Icon: Lock,       text: "Ad-free experience across the entire app" },
];

export default function FeaturesPage() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState(0);
  useLandingSetup(scrollRef);

  return (
    <>
      <style>{LANDING_CSS}</style>
      <div ref={scrollRef} style={{ position: "fixed", inset: 0, overflowY: "auto", overflowX: "hidden", background: "var(--bg)", zIndex: 9998 }}>
        <div className="lp">

          <LandingNav active="features" />

          {/* ── PAGE HERO ── */}
          <div style={{ borderBottom: "1px solid var(--bdr)" }}>
            <div className="lp-page-hero">
              <span className="lp-sec-label">Features</span>
              <h1 className="lp-page-h1">Everything you need,<br /><em>all in one place</em></h1>
              <p className="lp-page-sub">
                From secure messaging to mobile payments — AfuChat brings 50+ features into a single, beautiful app designed for real life.
              </p>
            </div>
          </div>

          {/* ── FEATURE SHOWCASE (TABS) ── */}
          <div className="lp-sec-bg">
            <div className="lp-sec">
              <div className="lp-r">
                <span className="lp-sec-label">Core features</span>
                <h2 className="lp-h2">See it in action</h2>
              </div>
              <div className="lp-tabs">
                {FEATURES.map((f, i) => (
                  <button
                    key={i}
                    className={`lp-tab${tab === i ? " act" : ""}`}
                    onClick={() => setTab(i)}
                  >
                    <f.Icon size={14} strokeWidth={1.8} />
                    {f.label}
                  </button>
                ))}
              </div>
              <div className="lp-showcase-row">
                <div className="lp-showcase-text">
                  <div className="lp-showcase-icon">
                    {React.createElement(FEATURES[tab].Icon, { size: 26, color: TEAL, strokeWidth: 1.7 })}
                  </div>
                  <h3 className="lp-showcase-h3">{FEATURES[tab].title}</h3>
                  <p className="lp-showcase-desc">{FEATURES[tab].desc}</p>
                  <a
                    href="https://play.google.com/store/apps/details?id=com.afuchat.app"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="lp-btn-p"
                  >
                    Try it Free <ArrowRight size={14} color="#000" strokeWidth={2} />
                  </a>
                </div>
                <div className="lp-showcase-phone">
                  <div className="lp-frame">
                    <img
                      src={FEATURES[tab].shot}
                      alt={FEATURES[tab].title}
                      key={tab}
                      style={{ animation: "lp-fade .3s ease" }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── CAPABILITY CARDS ── */}
          <div style={{ borderBottom: "1px solid var(--bdr)" }}>
            <div className="lp-sec">
              <div className="lp-r">
                <span className="lp-sec-label">Capabilities</span>
                <h2 className="lp-h2">Built for real life</h2>
                <p className="lp-sec-sub">
                  Designed with African users in mind — fast, offline-friendly, and bandwidth-efficient.
                </p>
              </div>
              <div className="lp-grid">
                {CARDS.map((c, i) => (
                  <div key={i} className={`lp-card lp-r lp-d${(i % 4) + 1}`}>
                    <div className="lp-card-icon" style={{ background: c.color + "12", borderColor: c.color + "30" }}>
                      <c.Icon size={20} color={c.color} strokeWidth={1.6} />
                    </div>
                    <div className="lp-card-title">{c.title}</div>
                    <div className="lp-card-desc">{c.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── SCREENSHOT GALLERY ── */}
          <div className="lp-sec-bg">
            <div className="lp-sec">
              <div className="lp-r">
                <span className="lp-sec-label">App Screenshots</span>
                <h2 className="lp-h2">See it in action</h2>
                <p className="lp-sec-sub">Real screenshots — no mockups, no filters.</p>
              </div>
              <div className="lp-gallery">
                {FEATURES.map((f, i) => (
                  <div key={i} className={`lp-gitem lp-r lp-d${(i % 4) + 1}`}>
                    <img src={f.shot} alt={f.title} loading="lazy" />
                    <div className="lp-gcap">
                      <f.Icon size={11} color={TEAL} strokeWidth={1.8} />
                      {" "}{f.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── PREMIUM ── */}
          <div style={{ borderBottom: "1px solid var(--bdr)" }}>
            <div className="lp-sec">
              <div className="lp-premium-row">
                <div style={{ flex: 1 }} className="lp-r">
                  <span className="lp-sec-label" style={{ color: GOLD }}>Premium</span>
                  <h2 className="lp-h2">Unlock the full<br /><b>Premium experience</b></h2>
                  <p className="lp-sec-sub" style={{ marginBottom: 20 }}>
                    Go beyond with AfuChat Premium — AI tools, verified gold badge, ad-free experience, and exclusive features.
                  </p>
                  <ul className="lp-premium-list">
                    {PREMIUM.map(({ Icon, text }, i) => (
                      <li key={i}>
                        <Icon size={14} color={GOLD} strokeWidth={1.7} />
                        {text}
                      </li>
                    ))}
                  </ul>
                  <a href="/login" className="lp-btn-g">
                    <Crown size={15} color="#000" strokeWidth={2} /> Go Premium
                  </a>
                  <p style={{ fontSize: 11, color: "var(--txt3)", marginTop: 10 }}>
                    Basic features are always free. Premium subscription is optional and available via in-app purchase.
                  </p>
                </div>
                <div className="lp-pcard lp-r lp-d3">
                  <div className="lp-pcard-badge">
                    <Crown size={28} color={GOLD} strokeWidth={1.5} />
                  </div>
                  <div className="lp-pcard-name">AfuChat Gold</div>
                  <p style={{ fontSize: 13, color: "var(--txt2)", lineHeight: 1.6 }}>
                    The ultimate experience with every premium feature unlocked.
                  </p>
                  <div className="lp-pcard-price">
                    <div className="lp-pcard-amt">Free*</div>
                    <div style={{ fontSize: 12, color: "var(--txt3)", marginTop: 4 }}>trial available on sign-up</div>
                    <p style={{ marginTop: 10, fontSize: 11, color: "var(--txt3)" }}>
                      *Premium subscription prices shown in-app. Prices vary by region.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── CTA ── */}
          <div className="lp-cta-strip">
            <h2 className="lp-cta-strip-h">Ready to experience it?</h2>
            <p className="lp-cta-strip-sub">Download AfuChat free on Android or use it in your browser right now.</p>
            <div className="lp-cta-strip-btns">
              <a href="https://play.google.com/store/apps/details?id=com.afuchat.app" target="_blank" rel="noopener noreferrer" className="lp-cta-strip-btn">
                <Play size={16} strokeWidth={2} /> Google Play
              </a>
              <a href="/login" className="lp-cta-strip-btn">
                <Globe size={16} strokeWidth={2} /> Open Web App
              </a>
            </div>
          </div>

          <LandingFooter />
        </div>
      </div>
      <LandingBottomNav active="features" />
    </>
  );
}
