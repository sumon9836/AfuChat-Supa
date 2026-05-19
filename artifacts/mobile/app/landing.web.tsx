import React, { useRef, useState } from "react";
import {
  MessageCircle, CreditCard, Bot, ShieldCheck, Globe, Zap,
  Users, Lock, Crown, Heart, Play, ChevronRight, ArrowRight,
  Layers, Gift, LogIn,
} from "lucide-react";
import {
  LANDING_CSS, TEAL, GOLD, LandingNav, LandingFooter, LandingBottomNav, useLandingSetup,
} from "@/components/landing/index.web";

const MARQUEE = [
  { Icon: MessageCircle, label: "Messaging" },
  { Icon: CreditCard,    label: "AfuPay" },
  { Icon: Bot,           label: "AfuAI" },
  { Icon: Globe,         label: "Works on 2G" },
  { Icon: Heart,         label: "AfuMatch" },
  { Icon: Users,         label: "Communities" },
  { Icon: Lock,          label: "Encrypted" },
  { Icon: Crown,         label: "Premium" },
  { Icon: Gift,          label: "Gifts" },
  { Icon: Zap,           label: "Fast" },
  { Icon: Layers,        label: "50+ Features" },
  { Icon: ShieldCheck,   label: "Private" },
];

const HIGHLIGHTS = [
  {
    Icon: MessageCircle, color: "#00BCD4",
    title: "Secure Messaging",
    desc: "End-to-end encrypted chats, voice notes, group conversations, and story sharing with everyone you care about.",
  },
  {
    Icon: CreditCard, color: "#34C759",
    title: "AfuPay Wallet",
    desc: "Send money, pay for services, and manage your digital wallet — all inside the app, instantly.",
  },
  {
    Icon: Bot, color: "#AF52DE",
    title: "AfuAI Assistant",
    desc: "Your built-in personal AI — ask questions, draft messages, generate images, and get smart suggestions.",
  },
  {
    Icon: Users, color: "#FF9500",
    title: "Communities & Channels",
    desc: "Join interest-based communities, follow channels, and broadcast to thousands of followers.",
  },
];

const TRUST = [
  {
    Icon: Lock, bg: "rgba(0,188,212,.12)", color: TEAL,
    title: "End-to-End Encrypted",
    desc: "Every private message, voice note, and file is protected with military-grade encryption. Only you and the recipient can read it.",
  },
  {
    Icon: Globe, bg: "rgba(52,199,89,.12)", color: "#34C759",
    title: "Works on Any Network",
    desc: "Optimised for low-bandwidth connections. AfuChat runs smoothly on 2G, 3G, and slow Wi-Fi across Africa and beyond.",
  },
  {
    Icon: ShieldCheck, bg: "rgba(255,149,0,.12)", color: "#FF9500",
    title: "Free. Always.",
    desc: "Core features are permanently free — messaging, calls, communities, AI, and more. Optional premium subscription available.",
  },
];

const STATS = [
  { n: "2K+",  l: "Active Users" },
  { n: "10K+", l: "Messages Daily" },
  { n: "50+",  l: "Features" },
  { n: "Free", l: "To Download" },
];

export default function LandingPage() {
  const scrollRef = useRef<HTMLDivElement>(null);
  useLandingSetup(scrollRef);

  return (
    <>
      <style>{LANDING_CSS}</style>
      <div ref={scrollRef} style={{ position: "fixed", inset: 0, overflowY: "auto", overflowX: "hidden", background: "var(--bg)", zIndex: 9998 }}>
        <div className="lp">

          <LandingNav />

          {/* ── HERO ── */}
          <section className="lp-hero">
            <div className="lp-hero-inner">
              <div style={{ flex: 1 }}>
                <div className="lp-badge">
                  <span className="lp-badge-dot" />
                  Now Available Worldwide
                </div>
                <h1 className="lp-h1">
                  The Super App<br />
                  <em>Africa Deserves</em>
                </h1>
                <p className="lp-sub">
                  AfuChat is the all-in-one platform for messaging, payments, AI assistance, social discovery, and community — built for everyone, everywhere.
                </p>
                <div className="lp-ctas">
                  <a
                    href="https://play.google.com/store/apps/details?id=com.afuchat.app"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="lp-btn-p"
                  >
                    <Play size={15} color="#000" strokeWidth={2} />
                    Download Free
                  </a>
                  <a href="/login" className="lp-btn-login">
                    <LogIn size={15} strokeWidth={2} />
                    Log In
                  </a>
                  <a href="/features" className="lp-btn-s">
                    Explore
                    <ChevronRight size={15} strokeWidth={2} />
                  </a>
                </div>
                <div className="lp-stats">
                  {STATS.map(({ n, l }) => (
                    <div key={l}>
                      <div className="lp-stat-n">{n}</div>
                      <div className="lp-stat-l">{l}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="lp-phone">
                <div className="lp-frame">
                  <img src="/screenshots/chats.png" alt="AfuChat messaging screen" />
                </div>
              </div>
            </div>
          </section>

          {/* ── SCREENSHOT STRIP ── */}
          <div className="lp-ss-section">
            <div className="lp-ss-header">
              <div>
                <span className="lp-sec-label">See it in action</span>
                <div className="lp-ss-title">Every screen,<br /><em>beautifully crafted</em></div>
              </div>
              <a href="/features" className="lp-btn-s" style={{ flexShrink: 0 }}>
                All features <ArrowRight size={14} strokeWidth={2} />
              </a>
            </div>
            <div className="lp-ss-wrap">
              <div className="lp-ss-track">
                {[
                  { src: "/screenshots/chats.png",       label: "Chats"        },
                  { src: "/screenshots/discover.png",    label: "Discover"     },
                  { src: "/screenshots/pay.png",         label: "AfuPay"       },
                  { src: "/screenshots/calls.png",       label: "Calls"        },
                  { src: "/screenshots/stories.png",     label: "Stories"      },
                  { src: "/screenshots/ai.png",          label: "AfuAI"        },
                  { src: "/screenshots/communities.png", label: "Communities"  },
                  { src: "/screenshots/profile.png",     label: "Profile"      },
                  { src: "/screenshots/apps.png",        label: "Mini-Apps"    },
                  { src: "/screenshots/posts.png",       label: "Posts"        },
                  { src: "/screenshots/match.png",       label: "AfuMatch"     },
                  { src: "/screenshots/search.png",      label: "Search"       },
                ].map(({ src, label }) => (
                  <div key={label} className="lp-ss-item">
                    <div className="lp-ss-frame">
                      <img src={src} alt={`AfuChat ${label}`} loading="lazy" />
                    </div>
                    <span className="lp-ss-lbl">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── MARQUEE ── */}
          <div className="lp-mq-wrap" aria-hidden>
            <div className="lp-mq-track">
              {[...Array(2)].map((_, i) => (
                <React.Fragment key={i}>
                  {MARQUEE.map(({ Icon, label }, j) => (
                    <span key={j} className="lp-mq-item">
                      <Icon size={13} color={TEAL} strokeWidth={1.7} />
                      {label}
                      <span className="lp-mq-sep" />
                    </span>
                  ))}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* ── FEATURE HIGHLIGHTS ── */}
          <div style={{ borderBottom: "1px solid var(--bdr)" }}>
            <div className="lp-sec">
              <div className="lp-r">
                <span className="lp-sec-label">What's inside</span>
                <h2 className="lp-h2">Everything you need,<br /><em>all in one app</em></h2>
                <p className="lp-sec-sub">
                  AfuChat replaces a dozen apps with one beautiful, fast experience.
                </p>
              </div>
              <div className="lp-grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))" }}>
                {HIGHLIGHTS.map((h, i) => (
                  <div key={i} className={`lp-card lp-r lp-d${i + 1}`}>
                    <div className="lp-card-icon" style={{ borderColor: h.color + "30", background: h.color + "12" }}>
                      <h.Icon size={20} color={h.color} strokeWidth={1.7} />
                    </div>
                    <div className="lp-card-title">{h.title}</div>
                    <div className="lp-card-desc">{h.desc}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 28, display: "flex", justifyContent: "center" }}>
                <a href="/features" className="lp-btn-s">
                  See all 50+ features
                  <ArrowRight size={14} strokeWidth={2} />
                </a>
              </div>
            </div>
          </div>

          {/* ── TRUST ── */}
          <div className="lp-sec-bg">
            <div className="lp-sec">
              <div className="lp-r" style={{ textAlign: "center" }}>
                <span className="lp-sec-label">Why AfuChat</span>
                <h2 className="lp-h2">Built on trust,<br /><em>designed for you</em></h2>
              </div>
              <div className="lp-trust">
                {TRUST.map((t, i) => (
                  <div key={i} className={`lp-trust-item lp-r lp-d${i + 1}`}>
                    <div className="lp-trust-icon" style={{ background: t.bg }}>
                      <t.Icon size={24} color={t.color} strokeWidth={1.7} />
                    </div>
                    <div className="lp-trust-title">{t.title}</div>
                    <div className="lp-trust-desc">{t.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── CTA STRIP ── */}
          <div className="lp-cta-strip">
            <h2 className="lp-cta-strip-h">Start for free today</h2>
            <p className="lp-cta-strip-sub">
              Join thousands of people already using AfuChat. No credit card required.
            </p>
            <div className="lp-cta-strip-btns">
              <a
                href="https://play.google.com/store/apps/details?id=com.afuchat.app"
                target="_blank"
                rel="noopener noreferrer"
                className="lp-cta-strip-btn"
              >
                <Play size={16} strokeWidth={2} /> Google Play
              </a>
              <a href="/login" className="lp-cta-strip-btn">
                <Globe size={16} strokeWidth={2} /> Open Web App
              </a>
              <a href="/download" className="lp-cta-strip-btn" style={{ background: "rgba(255,255,255,.15)", color: "#000", border: "1px solid rgba(0,0,0,.15)" }}>
                All Downloads →
              </a>
            </div>
          </div>

          <LandingFooter />
        </div>
      </div>
      <LandingBottomNav active="home" />
    </>
  );
}
