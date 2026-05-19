import React, { useRef } from "react";
import { FileText, ArrowRight } from "lucide-react";
import {
  LANDING_CSS, TEAL, LandingNav, LandingFooter, LandingBottomNav, useLandingSetup,
} from "@/components/landing/index.web";

const LAST_UPDATED = "1 June 2025";

export default function TermsPage() {
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
                <span className="lp-sec-label">Legal</span>
                <h1 className="lp-page-h1">
                  Terms of <em>Service</em>
                </h1>
                <p className="lp-page-sub">
                  Please read these terms carefully before using AfuChat. By using our service, you agree to these terms.
                </p>
                <div style={{ display: "flex", gap: 10, marginTop: 18, flexWrap: "wrap" as const }}>
                  <span className="lp-legal-chip"><FileText size={11} color={TEAL} /> AfuChat Technologies Limited</span>
                  <span className="lp-legal-chip">Effective: {LAST_UPDATED}</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── CONTENT ── */}
          <div style={{ borderBottom: "1px solid var(--bdr)" }}>
            <div className="lp-sec">
              <div className="lp-legal-body lp-r">

                <h2>1. Acceptance of Terms</h2>
                <p>
                  These Terms of Service ("Terms") constitute a legally binding agreement between you and AfuChat Technologies Limited ("AfuChat", "we", "us", or "our"). By creating an account, downloading the app, or using the Service in any way, you agree to be bound by these Terms and our <a href="/privacy">Privacy Policy</a>.
                </p>
                <p>
                  If you do not agree to these Terms, you must not use the Service.
                </p>

                <h2>2. Age Requirements</h2>
                <p>
                  <strong>You must be at least 13 years old to use AfuChat.</strong> If you are between 13 and 17 years old, you may only use the Service with the consent and supervision of a parent or legal guardian.
                </p>
                <p>
                  By creating an account, you represent that you are at least 13 years old. If AfuChat determines that you are under 13, we will immediately terminate your account and delete your data.
                </p>
                <p>
                  Certain features (including AfuPay financial services and AfuMatch) may require users to be 18 years or older. Age verification may be required to access these features.
                </p>

                <h2>3. Account Registration & Security</h2>
                <p>To use AfuChat, you must register an account. You agree to:</p>
                <ul>
                  <li>Provide accurate, current, and complete information during registration</li>
                  <li>Maintain the security of your account credentials and not share your password</li>
                  <li>Promptly notify us of any unauthorised use of your account</li>
                  <li>Be responsible for all activity that occurs under your account</li>
                  <li>Not create multiple accounts to evade bans or restrictions</li>
                  <li>Not impersonate any person or entity</li>
                </ul>

                <h2>4. In-App Purchases & Subscriptions</h2>
                <p>
                  AfuChat offers optional in-app purchases, including:
                </p>
                <ul>
                  <li><strong>AfuChat Premium (AfuChat Gold):</strong> A recurring subscription that unlocks premium features including AfuAI, AI image generation, verified badge, ad-free experience, and more</li>
                  <li><strong>ACoin top-ups:</strong> Purchase of digital coins redeemable for in-app items and features</li>
                  <li><strong>AfuPay wallet top-ups:</strong> Loading funds into your AfuPay digital wallet for payments and transfers</li>
                </ul>
                <p>
                  All in-app purchase prices are displayed in the app before you complete a transaction. Prices may vary by region. Subscriptions auto-renew unless cancelled at least 24 hours before the renewal date. You can manage and cancel subscriptions in your device's app store account settings.
                </p>
                <p>
                  <strong>Refunds:</strong> In-app purchase refunds are subject to the refund policy of the app store through which you made the purchase (Google Play or Apple App Store). AfuChat does not issue direct refunds for digital content that has been consumed or used.
                </p>
                <p>
                  <strong>Core features are always free.</strong> Messaging, calls, communities, and core social features will remain free for all users. Premium subscription is optional.
                </p>

                <h2>5. Acceptable Use</h2>
                <p>You agree not to use AfuChat to:</p>
                <ul>
                  <li>Violate any applicable laws or regulations</li>
                  <li>Harass, threaten, bully, or intimidate other users</li>
                  <li>Share or distribute child sexual abuse material (CSAM) or any content that sexualises minors</li>
                  <li>Share pornographic, obscene, or sexually explicit content without proper age-gating (where permitted)</li>
                  <li>Spam, phish, or conduct fraudulent activities</li>
                  <li>Spread misinformation, fake news, or deliberately false content that could cause harm</li>
                  <li>Distribute malware, viruses, or other harmful code</li>
                  <li>Violate intellectual property rights of AfuChat or third parties</li>
                  <li>Scrape, crawl, or extract data from the Service using automated tools</li>
                  <li>Attempt to reverse-engineer, decompile, or hack the Service</li>
                  <li>Promote hate speech based on race, ethnicity, religion, gender, sexual orientation, disability, or national origin</li>
                  <li>Engage in or facilitate illegal gambling, trafficking, or other illegal activities</li>
                  <li>Impersonate AfuChat staff, moderators, or other users</li>
                </ul>

                <h2>6. User Content</h2>
                <p>
                  You retain ownership of content you create and share on AfuChat. By posting content, you grant AfuChat a non-exclusive, royalty-free, worldwide licence to use, display, reproduce, and distribute your content solely for the purpose of providing and improving the Service.
                </p>
                <p>
                  You are solely responsible for content you post. AfuChat does not pre-screen user content but reserves the right to remove content that violates these Terms or our Community Guidelines.
                </p>

                <h2>7. AfuPay Financial Services</h2>
                <p>
                  AfuPay is a digital wallet and payment feature within AfuChat. By using AfuPay, you additionally agree to our AfuPay Terms (available in-app). Key points:
                </p>
                <ul>
                  <li>AfuPay is available in select countries only</li>
                  <li>You must complete identity verification (KYC) to access full payment features</li>
                  <li>Transaction limits apply and are displayed in-app</li>
                  <li>AfuChat is not a licensed bank. AfuPay services are provided in partnership with licensed financial service providers</li>
                  <li>Funds in your AfuPay wallet are not insured by any government deposit protection scheme</li>
                </ul>

                <h2>8. Intellectual Property</h2>
                <p>
                  The AfuChat Service, including its design, code, trademarks, logos, and content created by AfuChat, is the exclusive property of AfuChat Technologies Limited and is protected by intellectual property laws. You may not use our trademarks or branding without our prior written consent.
                </p>

                <h2>9. Privacy</h2>
                <p>
                  Your use of AfuChat is governed by our <a href="/privacy">Privacy Policy</a>, which is incorporated into these Terms by reference.
                </p>

                <h2>10. Disclaimers</h2>
                <p>
                  THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED. AfuChat DOES NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR FREE OF HARMFUL COMPONENTS.
                </p>
                <p>
                  AfuChat is not responsible for the content, accuracy, or opinions expressed in user-generated content or third-party mini-apps available on the platform.
                </p>

                <h2>11. Limitation of Liability</h2>
                <p>
                  TO THE MAXIMUM EXTENT PERMITTED BY LAW, AfuChat SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING OUT OF YOUR USE OF OR INABILITY TO USE THE SERVICE.
                </p>
                <p>
                  Our total liability to you for any claim arising under these Terms shall not exceed the amount you paid to AfuChat in the 12 months preceding the claim, or USD $50, whichever is greater.
                </p>

                <h2>12. Termination</h2>
                <p>
                  AfuChat may suspend or terminate your account at any time for violation of these Terms, without prior notice. You may delete your account at any time from the app settings.
                </p>
                <p>
                  Upon termination, your right to use the Service ceases immediately. Sections of these Terms that by their nature should survive termination will continue to apply.
                </p>

                <h2>13. Changes to These Terms</h2>
                <p>
                  We may modify these Terms at any time. We will notify you of significant changes via the app or email (if provided). Continued use of the Service after changes are posted constitutes your acceptance of the revised Terms.
                </p>

                <h2>14. Governing Law</h2>
                <p>
                  These Terms are governed by the laws of the Republic of Uganda. Any disputes arising under these Terms shall be subject to the exclusive jurisdiction of the courts of Uganda.
                </p>

                <h2>15. Contact</h2>
                <p>
                  For legal notices or questions about these Terms, please contact us through the <a href="/contact">Contact page</a> or the in-app Support Center.
                </p>
                <p>
                  <strong>AfuChat Technologies Limited</strong><br />
                  Entebbe, Central Region, Uganda
                </p>

                <div style={{ marginTop: 40, padding: "20px 24px", background: "var(--bg2)", border: "1px solid var(--bdr)", borderRadius: 12 }}>
                  <p style={{ fontSize: 13, color: "var(--txt3)", marginBottom: 0 }}>
                    These Terms were last updated on <strong style={{ color: "var(--txt2)" }}>{LAST_UPDATED}</strong>. For questions, use the <a href="/contact">Contact page</a> or the in-app Support Center.
                  </p>
                </div>

              </div>
            </div>
          </div>

          {/* ── RELATED ── */}
          <div className="lp-sec-bg">
            <div className="lp-sec" style={{ textAlign: "center" }}>
              <div className="lp-r">
                <h2 className="lp-h2" style={{ marginBottom: 24 }}>Related documents</h2>
                <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" as const }}>
                  <a href="/privacy" className="lp-btn-s">Privacy Policy <ArrowRight size={14} strokeWidth={2} /></a>
                  <a href="/contact" className="lp-btn-s">Contact Us <ArrowRight size={14} strokeWidth={2} /></a>
                </div>
              </div>
            </div>
          </div>

          <LandingFooter />
        </div>
      </div>
      <LandingBottomNav active="about" />
    </>
  );
}
