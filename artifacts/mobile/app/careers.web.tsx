import React, { useRef } from "react";
import {
  Code2, Palette, TrendingUp, HeadphonesIcon,
  Globe, DollarSign, BookOpen, Clock, Heart, Rocket, Users, Shield,
  MapPin, Briefcase, ArrowRight, Play,
} from "lucide-react";
import {
  LANDING_CSS, TEAL, LandingNav, LandingFooter, useLandingSetup,
} from "@/components/landing/index.web";

const ROLES = [
  {
    dept: "Engineering", color: "#3B82F6", Icon: Code2,
    positions: [
      { title: "Senior React Native Engineer",              type: "Full-time", location: "Remote" },
      { title: "Backend Engineer (Node.js / Supabase)",     type: "Full-time", location: "Remote / Kampala" },
      { title: "DevOps / Infrastructure Engineer",          type: "Full-time", location: "Remote" },
    ],
  },
  {
    dept: "Product & Design", color: "#8B5CF6", Icon: Palette,
    positions: [
      { title: "Senior Product Designer (Mobile)",          type: "Full-time", location: "Remote" },
      { title: "Product Manager — Social & Payments",       type: "Full-time", location: "Remote / Kampala" },
    ],
  },
  {
    dept: "Growth & Marketing", color: "#10B981", Icon: TrendingUp,
    positions: [
      { title: "Head of Growth",                            type: "Full-time", location: "Kampala, Uganda" },
      { title: "Community Manager (Africa)",                type: "Full-time", location: "Remote" },
      { title: "Content Creator / Copywriter",              type: "Contract",  location: "Remote" },
    ],
  },
  {
    dept: "Operations & Support", color: "#F59E0B", Icon: HeadphonesIcon,
    positions: [
      { title: "Customer Success Lead",                     type: "Full-time", location: "Kampala, Uganda" },
      { title: "Trust & Safety Specialist",                 type: "Full-time", location: "Remote" },
    ],
  },
];

const BENEFITS = [
  { Icon: Globe,        color: "#3B82F6", title: "Remote-First",    desc: "Work from anywhere in the world. We are a globally distributed team." },
  { Icon: DollarSign,   color: "#10B981", title: "Competitive Pay", desc: "Market-rate salaries benchmarked globally, paid in your local currency." },
  { Icon: BookOpen,     color: "#F59E0B", title: "Learning Budget", desc: "$1,000/year for courses, books, conferences, and certifications." },
  { Icon: Clock,        color: TEAL,      title: "Flexible Hours",  desc: "Async-first culture. Own your schedule, ship your best work." },
  { Icon: Heart,        color: "#EC4899", title: "Health Coverage", desc: "Health insurance for full-time employees (terms vary by region)." },
  { Icon: Rocket,       color: "#8B5CF6", title: "Growth Stage",   desc: "Join early, move fast, and have real impact on a product millions will use." },
];

const VALUES = [
  { Icon: Users,  label: "Community First", desc: "We build for real people — their stories, livelihoods, and connections matter most." },
  { Icon: Shield, label: "Privacy & Safety",desc: "We encrypt by default and design systems that protect users, not exploit them." },
  { Icon: Rocket, label: "Move Fast",       desc: "We ship, learn, and improve quickly. Bureaucracy slows everyone down." },
  { Icon: Globe,  label: "Built for Africa",desc: "We optimise for low bandwidth, local payments, and African user journeys first." },
];

export default function CareersPage() {
  const scrollRef = useRef<HTMLDivElement>(null);
  useLandingSetup(scrollRef);

  return (
    <>
      <style>{LANDING_CSS}</style>
      <div ref={scrollRef} style={{ position: "fixed", inset: 0, overflowY: "auto", overflowX: "hidden", background: "var(--bg)", zIndex: 9998 }}>
        <div className="lp">

          <LandingNav active="careers" />

          {/* ── HERO ── */}
          <div style={{ borderBottom: "1px solid var(--bdr)" }}>
            <div className="lp-page-hero">
              <div className="lp-badge">
                <span className="lp-badge-dot" />
                We're hiring
              </div>
              <h1 className="lp-page-h1">
                Build something<br /><em>that matters.</em>
              </h1>
              <p className="lp-page-sub">
                AfuChat is on a mission to build Africa's most impactful super app — messaging, AI, payments, and communities in one place. Join a small, ambitious team moving fast and shipping daily.
              </p>
              <div style={{ marginTop: 24 }}>
                <a href="/contact" className="lp-btn-p">
                  Send Open Application <ArrowRight size={14} color="#000" strokeWidth={2} />
                </a>
              </div>
            </div>
          </div>

          {/* ── VALUES ── */}
          <div className="lp-sec-bg">
            <div className="lp-sec">
              <div className="lp-r">
                <span className="lp-sec-label">Our values</span>
                <h2 className="lp-h2">How we <em>work</em></h2>
              </div>
              <div className="lp-values">
                {VALUES.map((v, i) => (
                  <div key={i} className={`lp-value lp-r lp-d${i + 1}`}>
                    <div style={{ width: 40, height: 40, borderRadius: 11, background: TEAL + "12", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
                      <v.Icon size={20} color={TEAL} strokeWidth={1.7} />
                    </div>
                    <div className="lp-value-title">{v.label}</div>
                    <div className="lp-value-desc">{v.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── BENEFITS ── */}
          <div style={{ borderBottom: "1px solid var(--bdr)" }}>
            <div className="lp-sec">
              <div className="lp-r">
                <span className="lp-sec-label">Perks & benefits</span>
                <h2 className="lp-h2">Why you'll <em>love it here</em></h2>
              </div>
              <div className="lp-benefits">
                {BENEFITS.map((b, i) => (
                  <div key={i} className={`lp-benefit lp-r lp-d${(i % 4) + 1}`}>
                    <div className="lp-benefit-icon" style={{ background: b.color + "12" }}>
                      <b.Icon size={20} color={b.color} strokeWidth={1.7} />
                    </div>
                    <div className="lp-benefit-title">{b.title}</div>
                    <div className="lp-benefit-desc">{b.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── OPEN ROLES ── */}
          <div className="lp-sec-bg">
            <div className="lp-sec">
              <div className="lp-r">
                <span className="lp-sec-label">Open positions</span>
                <h2 className="lp-h2">Find your <em>role</em></h2>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 40, marginTop: 36 }}>
                {ROLES.map((dept) => (
                  <div key={dept.dept} className="lp-r">
                    <div className="lp-dept-header">
                      <div className="lp-dept-icon" style={{ background: dept.color + "15" }}>
                        <dept.Icon size={18} color={dept.color} strokeWidth={1.7} />
                      </div>
                      <span className="lp-dept-title">{dept.dept}</span>
                      <span className="lp-dept-badge" style={{ background: dept.color + "15", color: dept.color }}>
                        {dept.positions.length} open
                      </span>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {dept.positions.map((pos) => (
                        <a key={pos.title} href="/contact" className="lp-pos-card">
                          <div style={{ flex: 1 }}>
                            <div className="lp-pos-title">{pos.title}</div>
                            <div className="lp-pos-meta">
                              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                <Briefcase size={11} strokeWidth={1.8} /> {pos.type}
                              </span>
                              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                <MapPin size={11} strokeWidth={1.8} /> {pos.location}
                              </span>
                            </div>
                          </div>
                          <div className="lp-apply-btn" style={{ borderColor: dept.color, color: dept.color }}>
                            Apply <ArrowRight size={12} strokeWidth={2} />
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── OPEN APPLICATION ── */}
          <div style={{ borderBottom: "1px solid var(--bdr)" }}>
            <div className="lp-sec" style={{ textAlign: "center" }}>
              <div className="lp-r">
                <h2 className="lp-h2">Don't see your role?</h2>
                <p className="lp-sec-sub" style={{ margin: "10px auto 24px" }}>
                  We're always looking for exceptional people. Visit our contact page to send a general application and tell us how you'd contribute.
                </p>
                <a href="/contact" className="lp-btn-p">
                  Send Open Application <ArrowRight size={14} color="#000" strokeWidth={2} />
                </a>
              </div>
            </div>
          </div>

          {/* ── CTA ── */}
          <div className="lp-cta-strip">
            <h2 className="lp-cta-strip-h">Use AfuChat while you apply</h2>
            <p className="lp-cta-strip-sub">Experience the product you'd be building. Download it free.</p>
            <div className="lp-cta-strip-btns">
              <a href="https://play.google.com/store/apps/details?id=com.afuchat.app" target="_blank" rel="noopener noreferrer" className="lp-cta-strip-btn">
                <Play size={15} strokeWidth={2} /> Download
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
