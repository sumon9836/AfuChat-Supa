import React, { useRef } from "react";
import {
  MessageCircle, HelpCircle, Briefcase, Globe, Users, ArrowRight, Play,
} from "lucide-react";
import {
  LANDING_CSS, TEAL, LandingNav, LandingFooter, useLandingSetup,
} from "@/components/landing/index.web";

const TG_SVG = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M12 0C5.37 0 0 5.37 0 12s5.37 12 12 12 12-5.37 12-12S18.63 0 12 0zm5.56 8.25-2.02 9.52c-.14.66-.54.82-1.08.51l-3-2.21-1.45 1.39c-.16.16-.3.3-.61.3l.21-3.05 5.56-5.02c.24-.21-.05-.33-.37-.12l-6.87 4.33-2.96-.92c-.64-.2-.66-.64.14-.95l11.57-4.46c.54-.2 1.01.13.88.7z" />
  </svg>
);

const WA_SVG = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.27-.47-2.42-1.49-.9-.8-1.5-1.78-1.68-2.08-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51-.17 0-.37-.02-.57-.02-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48 0 1.47 1.07 2.88 1.22 3.08.15.2 2.1 3.2 5.08 4.49.71.31 1.27.49 1.7.63.72.23 1.37.2 1.88.12.57-.09 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.41-.07-.12-.27-.2-.57-.35z"/>
    <path d="M12 0C5.37 0 0 5.37 0 12c0 2.12.56 4.1 1.53 5.82L0 24l6.35-1.66A11.94 11.94 0 0 0 12 24c6.63 0 12-5.37 12-12S18.63 0 12 0zm0 21.8a9.76 9.76 0 0 1-4.97-1.35l-.36-.21-3.71.97.99-3.62-.23-.37A9.78 9.78 0 0 1 2.2 12c0-5.4 4.4-9.8 9.8-9.8 5.4 0 9.8 4.4 9.8 9.8 0 5.4-4.4 9.8-9.8 9.8z"/>
  </svg>
);

const CHANNELS = [
  {
    Icon: HelpCircle,
    bg: TEAL + "12",
    color: TEAL,
    title: "Support Center",
    desc: "Get help with your account, features, payments, and technical issues. Our support team responds within 24 hours on business days.",
    cta: "Open Support Center",
    href: "/support",
    internal: true,
  },
  {
    Icon: null,
    TGIcon: TG_SVG,
    bg: "#229ED912",
    color: "#229ED9",
    title: "Telegram Community",
    desc: "Join thousands of AfuChat users in our official Telegram community. Ask questions, share feedback, and connect with other users.",
    cta: "Join on Telegram",
    href: "https://t.me/afuchat",
    internal: false,
  },
  {
    Icon: null,
    WAIcon: WA_SVG,
    bg: "#25D36612",
    color: "#25D366",
    title: "WhatsApp Channel",
    desc: "Follow our official WhatsApp channel for announcements, tips, and the latest AfuChat updates.",
    cta: "Follow on WhatsApp",
    href: "https://whatsapp.com/channel/0029Vb7Rbpz0Vyc9y3S8H422",
    internal: false,
  },
  {
    Icon: Briefcase,
    bg: "#8B5CF612",
    color: "#8B5CF6",
    title: "Business & Press",
    desc: "For partnership enquiries, business development, media requests, or investment conversations — use our support center and select 'Business Inquiry'.",
    cta: "Submit Business Inquiry",
    href: "/support",
    internal: true,
  },
  {
    Icon: Users,
    bg: "#FF950012",
    color: "#FF9500",
    title: "Careers",
    desc: "Interested in joining the AfuChat team? Visit our careers page to see open roles, or send us an open application.",
    cta: "View Open Roles",
    href: "/careers",
    internal: true,
  },
  {
    Icon: MessageCircle,
    bg: "#FF2D5512",
    color: "#FF2D55",
    title: "In-App Support",
    desc: "The fastest way to reach us is directly from inside the AfuChat app — tap the Me tab → Support Center to create a ticket.",
    cta: "Open AfuChat",
    href: "/login",
    internal: true,
  },
];

export default function ContactPage() {
  const scrollRef = useRef<HTMLDivElement>(null);
  useLandingSetup(scrollRef);

  return (
    <>
      <style>{LANDING_CSS}</style>
      <div ref={scrollRef} style={{ position: "fixed", inset: 0, overflowY: "auto", overflowX: "hidden", background: "var(--bg)", zIndex: 9998 }}>
        <div className="lp">

          <LandingNav />

          {/* ── HERO ── */}
          <div style={{ borderBottom: "1px solid var(--bdr)" }}>
            <div className="lp-page-hero">
              <div>
                <span className="lp-sec-label">Contact</span>
                <h1 className="lp-page-h1">
                  We're here to <em>help</em>
                </h1>
                <p className="lp-page-sub">
                  Choose the best channel for your enquiry below. For urgent support, use the in-app support center for the fastest response.
                </p>
              </div>
            </div>
          </div>

          {/* ── CONTACT CHANNELS ── */}
          <div style={{ borderBottom: "1px solid var(--bdr)" }}>
            <div className="lp-sec">
              <div className="lp-contact-grid">
                {CHANNELS.map((c, i) => {
                  const IconEl = c.Icon ? <c.Icon size={24} color={c.color} strokeWidth={1.7} /> : (c.TGIcon || c.WAIcon);
                  return (
                    <div key={i} className={`lp-contact-card lp-r lp-d${(i % 3) + 1}`}>
                      <div className="lp-contact-icon" style={{ background: c.bg }}>
                        {IconEl}
                      </div>
                      <div className="lp-contact-title">{c.title}</div>
                      <div className="lp-contact-desc">{c.desc}</div>
                      <a
                        href={c.href}
                        target={c.internal ? undefined : "_blank"}
                        rel={c.internal ? undefined : "noopener noreferrer"}
                        className="lp-btn-s"
                        style={{ fontSize: 13, padding: "9px 16px", borderRadius: 8 }}
                      >
                        {c.cta} <ArrowRight size={13} strokeWidth={2} />
                      </a>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── HOURS ── */}
          <div className="lp-sec-bg">
            <div className="lp-sec" style={{ textAlign: "center" }}>
              <div className="lp-r">
                <span className="lp-sec-label">Support hours</span>
                <h2 className="lp-h2">When we're <em>available</em></h2>
                <div style={{ display: "flex", justifyContent: "center", gap: 32, flexWrap: "wrap", marginTop: 36 }}>
                  {[
                    { day: "Monday – Friday", hours: "8:00 am – 6:00 pm EAT" },
                    { day: "Saturday",        hours: "9:00 am – 1:00 pm EAT" },
                    { day: "Sunday",          hours: "Closed" },
                  ].map(({ day, hours }) => (
                    <div key={day} style={{ background: "var(--surf)", border: "1px solid var(--bdr)", borderRadius: 12, padding: "20px 28px", minWidth: 180, textAlign: "center" }}>
                      <div style={{ fontSize: 13, color: "var(--txt3)", marginBottom: 4 }}>{day}</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: "var(--txt)" }}>{hours}</div>
                    </div>
                  ))}
                </div>
                <p style={{ fontSize: 13, color: "var(--txt3)", marginTop: 20 }}>
                  All times in East Africa Time (UTC+3). We aim to respond to all inquiries within 24 hours on business days.
                </p>
              </div>
            </div>
          </div>

          {/* ── OFFICE ── */}
          <div style={{ borderBottom: "1px solid var(--bdr)" }}>
            <div className="lp-sec">
              <div className="lp-r" style={{ display: "flex", gap: 40, flexWrap: "wrap" as const, alignItems: "center" }}>
                <div style={{ flex: 1, minWidth: 260 }}>
                  <span className="lp-sec-label">Our office</span>
                  <h2 className="lp-h2">Headquarters</h2>
                  <p style={{ fontSize: 15, color: "var(--txt2)", lineHeight: 1.7, marginTop: 12 }}>
                    AfuChat Technologies Limited<br />
                    Entebbe, Central Region<br />
                    Uganda 🇺🇬
                  </p>
                  <p style={{ fontSize: 13, color: "var(--txt3)", marginTop: 12, lineHeight: 1.6 }}>
                    We are a remote-first company. Walk-in visits are by appointment only via the support center.
                  </p>
                </div>
                <div style={{ flex: 1, minWidth: 260, background: "var(--surf)", border: "1px solid var(--bdr)", borderRadius: 16, padding: 24 }}>
                  <div style={{ fontSize: 13, color: "var(--txt3)", marginBottom: 8 }}>Phone</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "var(--txt)", marginBottom: 18 }}>
                    <a href="tel:+256703464913" style={{ color: TEAL, textDecoration: "none" }}>+256 703 464 913</a>
                  </div>
                  <div style={{ fontSize: 13, color: "var(--txt3)", marginBottom: 8 }}>Business hours</div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: "var(--txt)", marginBottom: 18 }}>Mon – Fri, 8 am – 6 pm EAT</div>
                  <div style={{ fontSize: 11, color: "var(--txt3)", lineHeight: 1.6 }}>
                    For written inquiries, please use the Support Center or our community channels above. We do not publish email addresses on our public pages.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── CTA ── */}
          <div className="lp-cta-strip">
            <h2 className="lp-cta-strip-h">Try AfuChat today</h2>
            <p className="lp-cta-strip-sub">Download free and experience the super app yourself.</p>
            <div className="lp-cta-strip-btns">
              <a href="https://play.google.com/store/apps/details?id=com.afuchat.app" target="_blank" rel="noopener noreferrer" className="lp-cta-strip-btn">
                <Play size={15} strokeWidth={2} /> Google Play
              </a>
              <a href="/login" className="lp-cta-strip-btn">
                <Globe size={15} strokeWidth={2} /> Web App
              </a>
            </div>
          </div>

          <LandingFooter />
        </div>
      </div>
    </>
  );
}
