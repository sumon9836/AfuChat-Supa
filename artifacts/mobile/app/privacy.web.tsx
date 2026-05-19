import React, { useRef } from "react";
import { Shield, ArrowRight } from "lucide-react";
import {
  LANDING_CSS, TEAL, LandingNav, LandingFooter, LandingBottomNav, useLandingSetup,
} from "@/components/landing/index.web";

const LAST_UPDATED = "1 June 2025";

export default function PrivacyPage() {
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
                  <em>Privacy</em> Policy
                </h1>
                <p className="lp-page-sub">
                  We take your privacy seriously. This policy explains what data we collect, why we collect it, and how we protect it.
                </p>
                <div style={{ display: "flex", gap: 10, marginTop: 18, flexWrap: "wrap" as const }}>
                  <span className="lp-legal-chip"><Shield size={11} color={TEAL} /> AfuChat Technologies Limited</span>
                  <span className="lp-legal-chip">Effective: {LAST_UPDATED}</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── CONTENT ── */}
          <div style={{ borderBottom: "1px solid var(--bdr)" }}>
            <div className="lp-sec">
              <div className="lp-legal-body lp-r">

                <h2>1. Introduction</h2>
                <p>
                  AfuChat Technologies Limited ("AfuChat", "we", "us", or "our") operates the AfuChat mobile application and website (collectively, the "Service"). This Privacy Policy describes how we collect, use, disclose, and protect your personal information when you use our Service.
                </p>
                <p>
                  By using AfuChat, you agree to the collection and use of information in accordance with this policy. If you do not agree, please do not use the Service.
                </p>

                <h2>2. Information We Collect</h2>
                <p>We collect the following categories of information:</p>

                <p><strong>2.1 Information You Provide</strong></p>
                <ul>
                  <li>Account information: name, phone number, username, and profile photo</li>
                  <li>Profile information: bio, date of birth (for age verification), location (optional)</li>
                  <li>Messages and communications (stored securely; private messages are end-to-end encrypted)</li>
                  <li>Payment information for AfuPay (processed securely; we do not store full card numbers)</li>
                  <li>Support tickets and communications with our team</li>
                  <li>Content you create: posts, stories, moments, and uploaded media</li>
                </ul>

                <p><strong>2.2 Information Collected Automatically</strong></p>
                <ul>
                  <li>Device information: device type, operating system, and unique device identifiers</li>
                  <li>Usage data: features used, time spent, navigation within the app</li>
                  <li>Log data: IP address, crash reports, and performance data</li>
                  <li>Location data (only if you grant permission; used for Discover and nearby features)</li>
                  <li>Push notification tokens (for delivering notifications)</li>
                </ul>

                <p><strong>2.3 Information from Third Parties</strong></p>
                <ul>
                  <li>Authentication data from Google or Apple Sign-In (if you choose this option)</li>
                  <li>Payment processor data from our payment partners (for AfuPay)</li>
                </ul>

                <h2>3. How We Use Your Information</h2>
                <p>We use the information we collect to:</p>
                <ul>
                  <li>Provide, operate, and improve the AfuChat Service</li>
                  <li>Authenticate your identity and maintain your account</li>
                  <li>Process payments and financial transactions via AfuPay</li>
                  <li>Personalise your experience and recommend content</li>
                  <li>Send notifications about messages, activity, and app updates</li>
                  <li>Provide customer support and respond to your inquiries</li>
                  <li>Detect and prevent fraud, abuse, and security incidents</li>
                  <li>Comply with legal obligations</li>
                  <li>Display relevant advertising (free tier only; ads can be removed with Premium)</li>
                  <li>Analyse trends and improve features based on aggregate usage data</li>
                </ul>

                <h2>4. End-to-End Encryption</h2>
                <p>
                  Private one-to-one messages in AfuChat are end-to-end encrypted by default. This means only you and the recipient can read them — not AfuChat, not our servers, and not any third party. Group messages in private groups are also encrypted. Public channels and posts are not end-to-end encrypted as they are visible to all followers.
                </p>

                <h2>5. How We Share Your Information</h2>
                <p>We do not sell your personal data. We may share information with:</p>
                <ul>
                  <li><strong>Service providers:</strong> Cloud hosting, analytics, payment processors, and push notification services that help us operate the platform</li>
                  <li><strong>Other users:</strong> Information you choose to make public on your profile, posts, and public channels</li>
                  <li><strong>Legal authorities:</strong> When required by law, court order, or to protect the safety of users or the public</li>
                  <li><strong>Business transfers:</strong> In the event of a merger, acquisition, or sale of assets</li>
                </ul>

                <h2>6. Data Retention</h2>
                <p>
                  We retain your data for as long as your account is active or as needed to provide the Service. If you delete your account, we will delete your personal data within 30 days, except where retention is required by law.
                </p>
                <p>
                  Deleted messages are removed from our servers. End-to-end encrypted messages that were never stored on our servers are not recoverable after deletion.
                </p>

                <h2>7. In-App Purchases & Payments</h2>
                <p>
                  AfuChat offers optional in-app purchases, including AfuChat Premium subscriptions and AfuPay wallet top-ups. These transactions are processed by our payment partners. We collect transaction records for accounting and fraud prevention purposes. We do not store full payment card numbers on our servers.
                </p>
                <p>
                  All in-app purchases are clearly disclosed before payment. Subscriptions can be managed and cancelled at any time from your account settings or the app store.
                </p>

                <h2>8. Children's Privacy</h2>
                <p>
                  AfuChat is rated for users aged 13 and above and is not directed at children under the age of 13. We do not knowingly collect personal information from children under 13. If we learn that a user is under 13, we will terminate their account and delete their data. If you believe a child under 13 has created an account, please contact us via the Support Center.
                </p>
                <p>
                  Users between the ages of 13 and 17 (minors) should use the Service under the supervision of a parent or legal guardian.
                </p>

                <h2>9. Your Rights</h2>
                <p>Depending on your location, you may have the following rights:</p>
                <ul>
                  <li><strong>Access:</strong> Request a copy of the personal data we hold about you</li>
                  <li><strong>Correction:</strong> Update or correct inaccurate information via your profile settings</li>
                  <li><strong>Deletion:</strong> Request deletion of your account and associated data</li>
                  <li><strong>Portability:</strong> Request an export of your data in a machine-readable format</li>
                  <li><strong>Objection:</strong> Object to processing of your data for direct marketing purposes</li>
                  <li><strong>Restriction:</strong> Request that we limit how we process your data</li>
                </ul>
                <p>To exercise any of these rights, please submit a request through the Support Center in the app.</p>

                <h2>10. Data Security</h2>
                <p>
                  We implement industry-standard security measures including TLS encryption in transit, AES-256 encryption at rest for sensitive data, and end-to-end encryption for private messages. We conduct regular security reviews and promptly address identified vulnerabilities.
                </p>
                <p>
                  No method of transmission over the internet is 100% secure. While we strive to protect your data, we cannot guarantee absolute security.
                </p>

                <h2>11. Cookies & Tracking</h2>
                <p>
                  Our web application uses cookies and similar technologies to maintain your session, remember your preferences, and analyse how our website is used. You can control cookies through your browser settings. Disabling certain cookies may affect website functionality.
                </p>

                <h2>12. Third-Party Links</h2>
                <p>
                  AfuChat may contain links to third-party websites, mini-apps, or services. We are not responsible for the privacy practices of these third parties. We encourage you to review their privacy policies before sharing any personal information.
                </p>

                <h2>13. International Data Transfers</h2>
                <p>
                  AfuChat is operated from Uganda and uses cloud infrastructure that may be located in other countries. By using our Service, you consent to the transfer of your data to these locations. We ensure that appropriate safeguards are in place for any international data transfers.
                </p>

                <h2>14. Changes to This Policy</h2>
                <p>
                  We may update this Privacy Policy from time to time. When we make significant changes, we will notify you via the app or a prominent notice on our website. The "Effective" date at the top of this page indicates when it was last revised. Continued use of the Service after changes are posted constitutes your acceptance.
                </p>

                <h2>15. Contact Us</h2>
                <p>
                  If you have questions or concerns about this Privacy Policy or how we handle your data, please contact us through the <a href="/contact">Contact page</a> or via the Support Center inside the AfuChat app.
                </p>
                <p>
                  <strong>AfuChat Technologies Limited</strong><br />
                  Entebbe, Central Region, Uganda
                </p>

                <div style={{ marginTop: 40, padding: "20px 24px", background: "var(--bg2)", border: "1px solid var(--bdr)", borderRadius: 12 }}>
                  <p style={{ fontSize: 13, color: "var(--txt3)", marginBottom: 0 }}>
                    This Privacy Policy was last updated on <strong style={{ color: "var(--txt2)" }}>{LAST_UPDATED}</strong>. For questions or data requests, use the{" "}
                    <a href="/contact">Contact page</a> or the in-app Support Center.
                  </p>
                </div>

              </div>
            </div>
          </div>

          {/* ── FOOTER LINKS ── */}
          <div className="lp-sec-bg">
            <div className="lp-sec" style={{ textAlign: "center" }}>
              <div className="lp-r">
                <h2 className="lp-h2" style={{ marginBottom: 24 }}>Related documents</h2>
                <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" as const }}>
                  <a href="/terms" className="lp-btn-s">Terms of Service <ArrowRight size={14} strokeWidth={2} /></a>
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
