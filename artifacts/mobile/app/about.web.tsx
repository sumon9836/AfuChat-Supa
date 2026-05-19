import React, { useRef } from "react";
import {
  Building2, Globe, MapPin, Users, Shield, Rocket, Heart,
  Sparkles, ArrowRight, Play,
} from "lucide-react";
import {
  LANDING_CSS, TEAL, LandingNav, LandingFooter, useLandingSetup,
} from "@/components/landing/index.web";

const BLOCKS = [
  {
    Icon: Building2, title: "Our Company",
    text: "AfuChat Technologies Limited is a registered technology company founded in Uganda. We are building the next generation of social and financial infrastructure for Africa's 1.4 billion people — starting with communication.",
  },
  {
    Icon: Globe, title: "Our Mission",
    text: "To connect every African with a platform that respects their privacy, works on any device, and empowers them with tools for communication, commerce, and creativity — at zero cost.",
  },
  {
    Icon: MapPin, title: "Where We Are",
    text: "Headquartered in Entebbe, Central Uganda 🇺🇬. Serving users across Uganda, Kenya, Tanzania, Rwanda, Nigeria, Ghana, and growing worldwide every day.",
  },
  {
    Icon: Users, title: "Who We Serve",
    text: "AfuChat is built for students, entrepreneurs, families, businesses, and communities across Africa and the world. Anyone who wants to connect, earn, and grow on a single trusted platform.",
  },
];

const VALUES = [
  { Icon: Heart,    color: "#FF2D55", label: "Community First",   desc: "We build for real people — their stories, livelihoods, and connections matter most." },
  { Icon: Shield,   color: TEAL,      label: "Privacy & Safety",  desc: "We encrypt by default and design systems that protect users, not exploit them." },
  { Icon: Rocket,   color: "#FF9500", label: "Move Fast",         desc: "We ship, learn, and improve quickly. Bureaucracy slows everyone down." },
  { Icon: Globe,    color: "#34C759", label: "Built for Africa",  desc: "We optimise for low bandwidth, local payments, and African user journeys first." },
  { Icon: Sparkles, color: "#AF52DE", label: "AI-Powered",        desc: "We integrate intelligent AI tools that save time and unlock new possibilities for every user." },
  { Icon: Users,    color: "#5856D6", label: "Open Platform",     desc: "We believe in mini-apps, third-party integrations, and an open ecosystem that anyone can build on." },
];

const STATS = [
  { n: "2K+",  l: "Active Users" },
  { n: "10K+", l: "Messages Daily" },
  { n: "50+",  l: "Features" },
  { n: "2024", l: "Founded" },
];

export default function AboutPage() {
  const scrollRef = useRef<HTMLDivElement>(null);
  useLandingSetup(scrollRef);

  return (
    <>
      <style>{LANDING_CSS}</style>
      <div ref={scrollRef} style={{ position: "fixed", inset: 0, overflowY: "auto", overflowX: "hidden", background: "var(--bg)", zIndex: 9998 }}>
        <div className="lp">

          <LandingNav active="about" />

          {/* ── HERO ── */}
          <div style={{ borderBottom: "1px solid var(--bdr)" }}>
            <div className="lp-page-hero">
              <div>
                <span className="lp-sec-label">About Us</span>
                <h1 className="lp-page-h1">
                  AfuChat Technologies<br /><em>Limited</em>
                </h1>
                <p className="lp-page-sub">
                  A technology company headquartered in Entebbe, Uganda, building world-class digital products for Africa and the world.
                </p>
              </div>
              <div className="lp-stats" style={{ marginTop: 32, paddingTop: 28, borderTop: "1px solid var(--bdr)" }}>
                {STATS.map(({ n, l }) => (
                  <div key={l}>
                    <div className="lp-stat-n">{n}</div>
                    <div className="lp-stat-l">{l}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── COMPANY BLOCKS ── */}
          <div className="lp-sec-bg">
            <div className="lp-sec">
              <div className="lp-r">
                <span className="lp-sec-label">Who we are</span>
                <h2 className="lp-h2">A company on a <em>mission</em></h2>
              </div>
              <div className="lp-ablock-grid">
                {BLOCKS.map((b, i) => (
                  <div key={i} className={`lp-ablock lp-r lp-d${(i % 2) + 1}`}>
                    <div className="lp-ablock-icon">
                      <b.Icon size={20} color={TEAL} strokeWidth={1.7} />
                    </div>
                    <div className="lp-ablock-title">{b.title}</div>
                    <div className="lp-ablock-text">{b.text}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── VALUES ── */}
          <div style={{ borderBottom: "1px solid var(--bdr)" }}>
            <div className="lp-sec">
              <div className="lp-r">
                <span className="lp-sec-label">Our values</span>
                <h2 className="lp-h2">How we <em>work</em></h2>
                <p className="lp-sec-sub">The principles that guide every decision we make.</p>
              </div>
              <div className="lp-values">
                {VALUES.map((v, i) => (
                  <div key={i} className={`lp-value lp-r lp-d${(i % 4) + 1}`}>
                    <div style={{ width: 40, height: 40, borderRadius: 11, background: v.color + "12", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
                      <v.Icon size={20} color={v.color} strokeWidth={1.7} />
                    </div>
                    <div className="lp-value-title">{v.label}</div>
                    <div className="lp-value-desc">{v.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── STORY ── */}
          <div className="lp-sec-bg">
            <div className="lp-sec">
              <div className="lp-r" style={{ maxWidth: 720 }}>
                <span className="lp-sec-label">Our story</span>
                <h2 className="lp-h2">Built in <em>Uganda</em>,<br />for the world</h2>
                <p style={{ fontSize: 15, color: "var(--txt2)", lineHeight: 1.78, marginTop: 16, marginBottom: 16 }}>
                  AfuChat was founded in Entebbe, Uganda with a simple observation: Africans deserved a super app of their own — one that understood local realities like low bandwidth, mobile money, and community-driven social dynamics.
                </p>
                <p style={{ fontSize: 15, color: "var(--txt2)", lineHeight: 1.78, marginBottom: 16 }}>
                  We started with messaging and kept adding: payments, an AI assistant, a digital wallet, a marketplace, mini-games, and more. Each feature was designed from the ground up for the African user experience — and for anyone in the world who wants something better.
                </p>
                <p style={{ fontSize: 15, color: "var(--txt2)", lineHeight: 1.78, marginBottom: 28 }}>
                  Today, AfuChat is used across multiple African countries and growing every day. We are just getting started.
                </p>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" as const }}>
                  <a href="/careers" className="lp-btn-p">
                    Join our team <ArrowRight size={14} color="#000" strokeWidth={2} />
                  </a>
                  <a href="/contact" className="lp-btn-s">Get in touch</a>
                </div>
              </div>
            </div>
          </div>

          {/* ── CTA ── */}
          <div className="lp-cta-strip">
            <h2 className="lp-cta-strip-h">Ready to join AfuChat?</h2>
            <p className="lp-cta-strip-sub">Download the app free and experience it yourself.</p>
            <div className="lp-cta-strip-btns">
              <a href="https://play.google.com/store/apps/details?id=com.afuchat.app" target="_blank" rel="noopener noreferrer" className="lp-cta-strip-btn">
                <Play size={15} strokeWidth={2} /> Google Play
              </a>
              <a href="/login" className="lp-cta-strip-btn">
                <Globe size={15} strokeWidth={2} /> Open Web App
              </a>
            </div>
          </div>

          <LandingFooter />
        </div>
      </div>
    </>
  );
}
