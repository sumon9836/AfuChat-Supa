import React, { useRef } from "react";
import { Globe, Play, Zap, ShieldCheck, Clock, CheckCircle } from "lucide-react";
import {
  LANDING_CSS, TEAL, LandingNav, LandingFooter, LandingBottomNav, useLandingSetup,
} from "@/components/landing/index.web";

const REASONS = [
  { Icon: Zap,         color: "#FF9500", title: "Lightning Fast",     desc: "Small app size, quick load times — even on slow connections." },
  { Icon: ShieldCheck, color: TEAL,      title: "Privacy First",      desc: "End-to-end encrypted. We never sell your data." },
  { Icon: Globe,       color: "#34C759", title: "Works on 2G",        desc: "Designed for Africa's network realities. Runs great anywhere." },
  { Icon: Clock,       color: "#AF52DE", title: "Always Updated",     desc: "Regular updates with new features, security patches, and improvements." },
];

const INCLUDED = [
  "Unlimited messaging & group chats",
  "HD voice and video calls",
  "AfuAI personal assistant",
  "ACoin digital wallet",
  "Discover & social feed",
  "Stories & moments",
  "Mini-games & apps",
  "Digital ID card",
];

export default function DownloadPage() {
  const scrollRef = useRef<HTMLDivElement>(null);
  useLandingSetup(scrollRef);

  return (
    <>
      <style>{LANDING_CSS}</style>
      <div ref={scrollRef} style={{ position: "fixed", inset: 0, overflowY: "auto", overflowX: "hidden", background: "var(--bg)", zIndex: 9998 }}>
        <div className="lp">

          <LandingNav active="download" />

          {/* ── HERO ── */}
          <div style={{ borderBottom: "1px solid var(--bdr)" }}>
            <div className="lp-sec" style={{ textAlign: "center" }}>
              <div>
                <span className="lp-sec-label">Download</span>
                <h1 className="lp-page-h1" style={{ textAlign: "center" }}>
                  Start for <em>free today</em>
                </h1>
                <p className="lp-page-sub" style={{ margin: "0 auto", textAlign: "center" }}>
                  Join thousands of people already using AfuChat. Available on Android and the web — no credit card needed.
                </p>
              </div>

              {/* ── Store Badges ── */}
              <div style={{ marginTop: 40, display: "flex", flexWrap: "wrap" as const, gap: 14, alignItems: "center", justifyContent: "center" }}>

                {/* Google Play — official badge */}
                <a
                  href="https://play.google.com/store/apps/details?id=com.afuchat.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="lp-r"
                  style={{ display: "inline-block", lineHeight: 0 }}
                >
                  <img
                    src="https://play.google.com/intl/en_us/badges/static/images/badges/en_badge_web_generic.png"
                    alt="Get it on Google Play"
                    style={{ height: 64, display: "block", borderRadius: 8 }}
                  />
                </a>

                {/* Web App */}
                <a href="/login" className="lp-r" style={{
                  display: "flex", alignItems: "center", gap: 10,
                  border: "1.5px solid var(--bdr)", borderRadius: 8, padding: "12px 18px", height: 64, boxSizing: "border-box" as const,
                  background: "var(--surf)", textDecoration: "none", color: "var(--txt)", transition: "border-color .15s",
                }}>
                  <Globe size={26} color={TEAL} strokeWidth={1.5} />
                  <div style={{ textAlign: "left" as const }}>
                    <div style={{ color: "var(--txt3)", fontSize: 10, fontWeight: 500, lineHeight: 1 }}>Use on</div>
                    <div style={{ color: "var(--txt)", fontSize: 18, fontWeight: 700, lineHeight: 1.3 }}>Web Browser</div>
                  </div>
                </a>
              </div>

              <div className="lp-qr lp-r" style={{ marginTop: 40 }}>
                <div className="lp-qr-box">
                  <img src="/logo.svg" alt="AfuChat QR code" />
                </div>
                <div style={{ textAlign: "left" }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: "var(--txt)" }}>Scan to download</div>
                  <div style={{ fontSize: 12, color: "var(--txt3)", marginTop: 3 }}>Point your phone camera at this code</div>
                </div>
              </div>

              <p style={{ fontSize: 11, color: "var(--txt3)", marginTop: 24 }}>
                Free download. Optional in-app purchases available. Rated for ages 13+.{" "}
                <a href="/privacy" style={{ color: "var(--cl)" }}>Privacy Policy</a>
                {" "}·{" "}
                <a href="/terms" style={{ color: "var(--cl)" }}>Terms of Service</a>
              </p>
            </div>
          </div>

          {/* ── WHAT'S INCLUDED ── */}
          <div className="lp-sec-bg">
            <div className="lp-sec">
              <div className="lp-r" style={{ display: "flex", gap: 60, alignItems: "flex-start", flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 280 }}>
                  <span className="lp-sec-label">Always free</span>
                  <h2 className="lp-h2">What's included<br /><em>at no cost</em></h2>
                  <p className="lp-sec-sub" style={{ marginBottom: 24 }}>
                    All core features are completely free. No hidden charges, no surprise paywalls.
                  </p>
                  <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
                    {INCLUDED.map((item) => (
                      <li key={item} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: "var(--txt2)" }}>
                        <CheckCircle size={16} color={TEAL} strokeWidth={2} style={{ flexShrink: 0 }} />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div style={{ flex: 1, minWidth: 260, background: "var(--surf)", border: "1px solid var(--bdr)", borderRadius: 16, padding: 28 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: 2, color: "var(--txt3)", marginBottom: 16 }}>Optional premium</div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: "var(--txt)", marginBottom: 6 }}>AfuChat Gold</div>
                  <p style={{ fontSize: 13, color: "var(--txt2)", lineHeight: 1.65, marginBottom: 20 }}>
                    Unlock AI features, verified badge, ad-free experience, and more — available as an optional subscription inside the app.
                  </p>
                  <a href="/features" style={{ color: "var(--cl)", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
                    See premium features →
                  </a>
                  <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--bdr)", fontSize: 11, color: "var(--txt3)" }}>
                    Subscription prices vary by region and are shown inside the app before purchase.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── WHY DOWNLOAD ── */}
          <div style={{ borderBottom: "1px solid var(--bdr)" }}>
            <div className="lp-sec">
              <div className="lp-r">
                <span className="lp-sec-label">Why AfuChat</span>
                <h2 className="lp-h2">An app you can <em>count on</em></h2>
              </div>
              <div className="lp-grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))" }}>
                {REASONS.map((r, i) => (
                  <div key={i} className={`lp-card lp-r lp-d${i + 1}`}>
                    <div className="lp-card-icon" style={{ background: r.color + "12", borderColor: r.color + "30" }}>
                      <r.Icon size={20} color={r.color} strokeWidth={1.7} />
                    </div>
                    <div className="lp-card-title">{r.title}</div>
                    <div className="lp-card-desc">{r.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── CTA ── */}
          <div className="lp-cta-strip">
            <h2 className="lp-cta-strip-h">Download AfuChat now</h2>
            <p className="lp-cta-strip-sub">Free, secure, and built for your world.</p>
            <div className="lp-cta-strip-btns">
              <a href="https://play.google.com/store/apps/details?id=com.afuchat.app" target="_blank" rel="noopener noreferrer" className="lp-cta-strip-btn">
                <Play size={15} strokeWidth={2} /> Get on Google Play
              </a>
              <a href="/login" className="lp-cta-strip-btn">
                <Globe size={15} strokeWidth={2} /> Use in Browser
              </a>
            </div>
          </div>

          <LandingFooter />
        </div>
      </div>
      <LandingBottomNav active="download" />
    </>
  );
}
