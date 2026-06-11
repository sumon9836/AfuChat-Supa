import React, { useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";
import Colors from "@/constants/colors";

const LAST_UPDATED = "June 11, 2026";
const EFFECTIVE_DATE = "June 11, 2026";
const COMPANY = "AfuChat Technologies Limited";
const COMPANY_ADDRESS = "Entebbe, Uganda";
const CONTACT_EMAIL = "privacy@afuchat.com";
const APP_NAME = "AfuChat";

type Section = {
  id: string;
  title: string;
  body: string;
};

const SECTIONS: Section[] = [
  {
    id: "1",
    title: "1. Introduction",
    body: `${COMPANY} ("we", "us", "our") operates ${APP_NAME}. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application and related services.\n\nWe are committed to protecting your privacy. Please read this policy carefully. If you disagree with any part of it, please discontinue use of the Service.`,
  },
  {
    id: "2",
    title: "2. Information We Collect",
    body: `We collect information in the following ways:\n\nInformation you provide directly:\n• Account details: phone number, email address, display name, username, profile photo, bio\n• Messages and content you send or post\n• Payment information (processed securely by our payment providers — we do not store card numbers)\n• Support tickets and communications with our team\n\nInformation collected automatically:\n• Device identifiers (device model, OS version, app version)\n• Log data: IP address, access times, pages viewed, errors\n• Usage data: features used, interactions, session duration\n• Push notification tokens (for delivery of notifications)\n\nInformation from third parties:\n• OAuth providers (Google, Apple) if you sign in via those services\n• Payment providers (Pesapal) for transaction verification`,
  },
  {
    id: "3",
    title: "3. How We Use Your Information",
    body: `We use your information to:\n\n• Provide, operate, and improve the Service\n• Authenticate your identity and maintain account security\n• Process payments and ACoins transactions\n• Deliver messages, notifications, and content\n• Personalise your experience and feed\n• Respond to support requests and resolve disputes\n• Detect, prevent, and investigate fraud, abuse, and security incidents\n• Comply with legal obligations\n• Send product updates and marketing communications (you may opt out at any time)\n• Conduct analytics to understand usage patterns and improve features`,
  },
  {
    id: "4",
    title: "4. Legal Bases for Processing (EEA/UK Users)",
    body: `If you are located in the European Economic Area or United Kingdom, we process your data under the following legal bases:\n\n• Contract: processing necessary to deliver the services you have requested\n• Legitimate interests: fraud prevention, security, product improvement, and analytics\n• Consent: where you have explicitly opted in (e.g., marketing emails, optional data sharing)\n• Legal obligation: where processing is required by applicable law\n\nYou may withdraw consent at any time without affecting the lawfulness of prior processing.`,
  },
  {
    id: "5",
    title: "5. Information Sharing",
    body: `We do not sell your personal information. We share information only in the following circumstances:\n\nWith other users: your public profile information (display name, handle, avatar, bio, posts) is visible to other users. Direct messages are end-to-end encrypted and not readable by us.\n\nWith service providers: we share data with carefully selected vendors who help us operate the Service (cloud hosting, payment processing, email delivery, analytics). These providers are bound by data processing agreements and may not use your data for their own purposes.\n\nFor legal reasons: we may disclose information if required by law, court order, or governmental authority, or if we believe disclosure is necessary to protect rights, safety, or property.\n\nBusiness transfers: in the event of a merger, acquisition, or sale of assets, your information may be transferred as part of that transaction.`,
  },
  {
    id: "6",
    title: "6. Messaging & End-to-End Encryption",
    body: `Private one-to-one messages on ${APP_NAME} are end-to-end encrypted by default. This means only you and the recipient can read message content — we cannot access it.\n\nGroup messages, posts, stories, and other public content are stored on our servers and are readable by us for moderation and safety purposes.\n\nVoice and video calls are transmitted securely but call metadata (duration, participants) is retained for up to 90 days.`,
  },
  {
    id: "7",
    title: "7. Data Retention",
    body: `We retain your data for as long as your account is active or as needed to provide the Service. Specific retention periods:\n\n• Account data: retained until you delete your account\n• Messages (E2E encrypted): stored on device; server stores encrypted blobs for 30 days after delivery\n• Posts and public content: retained until you delete them\n• Payment records: retained for 7 years for accounting and legal compliance\n• Support tickets: retained for 3 years\n• Log and analytics data: retained for up to 12 months\n\nAfter account deletion, most personal data is purged within 30 days. Some anonymised data may be retained for aggregate analytics.`,
  },
  {
    id: "8",
    title: "8. Your Rights",
    body: `Depending on your location, you may have the following rights:\n\n• Access: request a copy of the personal data we hold about you\n• Correction: ask us to correct inaccurate or incomplete data\n• Erasure: request deletion of your personal data ("right to be forgotten")\n• Portability: receive your data in a machine-readable format\n• Objection: object to processing based on legitimate interests\n• Restriction: request that we limit processing in certain circumstances\n• Withdrawal of consent: opt out of any consent-based processing\n\nTo exercise these rights, contact us at ${CONTACT_EMAIL} or use the Data & Privacy section in app Settings. We will respond within 30 days.`,
  },
  {
    id: "9",
    title: "9. Cookies & Tracking",
    body: `The ${APP_NAME} mobile app does not use browser cookies. On our web version, we use:\n\n• Essential cookies: required for login session management\n• Analytics cookies: to understand how users interact with the web app (you may opt out)\n\nWe do not use advertising tracking cookies or sell your browsing behaviour to advertisers.`,
  },
  {
    id: "10",
    title: "10. Children's Privacy",
    body: `${APP_NAME} is not directed at children under the age of 16. We do not knowingly collect personal information from children under 16.\n\nIf you are a parent or guardian and believe your child has provided us with personal information, please contact ${CONTACT_EMAIL} and we will promptly delete such information.\n\nIf we learn we have collected data from a child under 16 without verified parental consent, we will take steps to delete that information.`,
  },
  {
    id: "11",
    title: "11. Data Security",
    body: `We implement industry-standard security measures to protect your information:\n\n• TLS encryption for all data in transit\n• AES-256 encryption for sensitive data at rest\n• End-to-end encryption for private messages\n• Regular security audits and penetration testing\n• Strict access controls and staff training\n\nDespite these measures, no system is completely secure. We encourage you to use a strong, unique password and enable two-factor authentication.`,
  },
  {
    id: "12",
    title: "12. International Data Transfers",
    body: `${COMPANY} is incorporated and based in Entebbe, Uganda. Your data may be processed in countries outside your own, including countries where data protection laws may differ.\n\nWhen we transfer data internationally, we use appropriate safeguards such as Standard Contractual Clauses (SCCs) approved by the European Commission, or we transfer to countries recognised as providing adequate data protection.\n\nBy using the Service, you consent to these international transfers.`,
  },
  {
    id: "13",
    title: "13. Third-Party Services",
    body: `The Service integrates with third-party services:\n\n• Supabase (database and authentication — EU/US servers)\n• Cloudflare (CDN, media storage)\n• Pesapal (payment processing — Kenya/Africa)\n• Resend (transactional email)\n• Google/Apple (OAuth sign-in, optional)\n\nEach third party has its own privacy policy. We encourage you to review them. We are not responsible for the privacy practices of third-party services.`,
  },
  {
    id: "14",
    title: "14. Changes to This Policy",
    body: `We may update this Privacy Policy from time to time. We will notify you of significant changes through the App or by email before the changes take effect.\n\nThe "Last Updated" date at the top of this page reflects when the policy was last revised. Your continued use of the Service after changes indicates acceptance of the updated policy.`,
  },
  {
    id: "15",
    title: "15. Contact & Data Protection Officer",
    body: `For privacy questions, data requests, or to exercise your rights:\n\n${COMPANY}\n${COMPANY_ADDRESS}\nPrivacy team: ${CONTACT_EMAIL}\nWebsite: https://afuchat.com/privacy\n\nFor EEA users: you also have the right to lodge a complaint with your local data protection authority. A list of EEA data protection authorities is available at https://edpb.europa.eu.`,
  },
];

export default function PrivacyPolicy() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const BRAND = Colors.brand;

  const [expanded, setExpanded] = useState<string | null>(null);

  function toggle(id: string) {
    setExpanded((prev) => (prev === id ? null : id));
  }

  const canGoBack = Platform.OS !== "web";

  return (
    <View style={[st.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          st.header,
          {
            paddingTop: insets.top + (Platform.OS === "web" ? 12 : 8),
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
          },
        ]}
      >
        {canGoBack && (
          <TouchableOpacity style={st.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </TouchableOpacity>
        )}
        <View style={st.headerText}>
          <Text style={[st.headerTitle, { color: colors.text }]}>Privacy Policy</Text>
          <Text style={[st.headerSub, { color: colors.textMuted }]}>
            Effective {EFFECTIVE_DATE}
          </Text>
        </View>
      </View>

      <ScrollView
        style={st.scroll}
        contentContainerStyle={[
          st.scrollContent,
          { paddingBottom: insets.bottom + 48 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Intro */}
        <View style={[st.introBox, { borderLeftColor: BRAND }]}>
          <Text style={[st.introText, { color: colors.textMuted }]}>
            Your privacy matters to us. This policy describes what information we collect,
            why we collect it, and how you control it. Last updated: {LAST_UPDATED}.
          </Text>
        </View>

        {/* Quick-nav summary */}
        <View style={[st.summaryBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[st.summaryTitle, { color: colors.text }]}>At a Glance</Text>
          {[
            { icon: "lock-closed-outline", text: "Private messages are end-to-end encrypted" },
            { icon: "ban-outline",         text: "We never sell your personal data" },
            { icon: "eye-off-outline",     text: "No advertising tracking or profiling" },
            { icon: "hand-left-outline",   text: "You can download or delete your data anytime" },
          ].map((item, i) => (
            <View key={i} style={st.summaryRow}>
              <Ionicons name={item.icon as any} size={16} color={BRAND} />
              <Text style={[st.summaryText, { color: colors.textMuted }]}>{item.text}</Text>
            </View>
          ))}
        </View>

        {/* Sections */}
        {SECTIONS.map((section) => {
          const isOpen = Platform.OS === "web" || expanded === section.id;
          return (
            <View key={section.id} style={[st.section, { borderBottomColor: colors.border }]}>
              {Platform.OS === "web" ? (
                <>
                  <Text style={[st.sectionTitle, { color: colors.text }]}>{section.title}</Text>
                  <Text style={[st.sectionBody, { color: colors.textMuted }]}>{section.body}</Text>
                </>
              ) : (
                <>
                  <TouchableOpacity
                    style={st.sectionHeader}
                    onPress={() => toggle(section.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={[st.sectionTitle, { color: colors.text, marginBottom: 0, flex: 1 }]}>
                      {section.title}
                    </Text>
                    <Ionicons
                      name={isOpen ? "chevron-up" : "chevron-down"}
                      size={16}
                      color={colors.textMuted}
                    />
                  </TouchableOpacity>
                  {isOpen && (
                    <Text style={[st.sectionBody, { color: colors.textMuted }]}>
                      {section.body}
                    </Text>
                  )}
                </>
              )}
            </View>
          );
        })}

        {/* Footer */}
        <View style={st.footer}>
          <Text style={[st.footerText, { color: colors.textMuted }]}>
            © {new Date().getFullYear()} {COMPANY}. All rights reserved.
          </Text>
          {Platform.OS !== "web" && (
            <TouchableOpacity
              style={st.termsLink}
              onPress={() => router.push("/terms" as any)}
            >
              <Text style={[st.termsLinkText, { color: BRAND }]}>
                View Terms of Service →
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 0.5,
    gap: 10,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: { flex: 1 },
  headerTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.3,
  },
  headerSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: Platform.OS === "web" ? 40 : 20,
    paddingTop: 20,
    maxWidth: 720,
    alignSelf: "center",
    width: "100%",
  },
  introBox: {
    borderLeftWidth: 3,
    paddingLeft: 14,
    marginBottom: 24,
  },
  introText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 22,
  },
  summaryBox: {
    borderRadius: 12,
    borderWidth: 0.5,
    padding: 16,
    marginBottom: 24,
    gap: 10,
  },
  summaryTitle: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    marginBottom: 4,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  summaryText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
    flex: 1,
  },
  section: {
    borderBottomWidth: 0.5,
    paddingVertical: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    marginBottom: 10,
    lineHeight: 22,
  },
  sectionBody: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 23,
    marginTop: 6,
  },
  footer: {
    paddingTop: 32,
    alignItems: "center",
    gap: 10,
  },
  footerText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  termsLink: { paddingVertical: 4 },
  termsLinkText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
});
