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
const CONTACT_EMAIL = "legal@afuchat.com";
const APP_NAME = "AfuChat";

type Section = {
  id: string;
  title: string;
  body: string;
};

const SECTIONS: Section[] = [
  {
    id: "1",
    title: "1. Acceptance of Terms",
    body: `By downloading, installing, or using ${APP_NAME} ("the App", "Service"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree, do not use the Service.\n\nThese Terms apply to all users including visitors, registered users, and anyone who accesses the App. ${COMPANY} reserves the right to update these Terms at any time. Continued use after changes constitutes acceptance.`,
  },
  {
    id: "2",
    title: "2. Eligibility",
    body: `You must be at least 16 years old to create an account. If you are under 18, you confirm you have parental or guardian consent.\n\nBy using the Service you represent that: (a) you are at least 16 years old; (b) you have the legal capacity to enter into a binding agreement; (c) you are not barred from receiving the Service under applicable law; and (d) all information you provide is accurate and truthful.`,
  },
  {
    id: "3",
    title: "3. Account Registration",
    body: `To access most features you must create an account using a valid phone number or email address. You are responsible for:\n\n• Keeping your credentials confidential\n• All activity that occurs under your account\n• Notifying us immediately of any unauthorized use at ${CONTACT_EMAIL}\n\nWe reserve the right to suspend or terminate accounts that violate these Terms, impersonate other users, or engage in fraud.`,
  },
  {
    id: "4",
    title: "4. Acceptable Use",
    body: `You agree not to use ${APP_NAME} to:\n\n• Post or transmit illegal, harmful, threatening, abusive, defamatory, or obscene content\n• Harass, bully, stalk, or intimidate other users\n• Distribute spam, malware, or phishing content\n• Scrape, crawl, or extract data from the Service without permission\n• Impersonate any person, entity, or ${APP_NAME} staff\n• Engage in money laundering, fraud, or any illegal financial activity\n• Violate any applicable local, national, or international law\n• Attempt to gain unauthorized access to our systems or other users' accounts\n• Use the Service for any commercial purpose not expressly permitted by ${COMPANY}\n• Upload content that infringes third-party intellectual property rights\n• Use automated tools, bots, or scripts to interact with the Service`,
  },
  {
    id: "5",
    title: "5. Platform Features",
    body: `${APP_NAME} is a super-app offering the following features, each subject to these Terms:\n\n• Messaging & Calls: real-time one-to-one and group chats, voice/video calls, end-to-end encrypted private messages, voice notes, file sharing\n• Moments & Posts: photo posts, text posts, articles, video reels/Shorts, and Duet videos\n• Stories: ephemeral 24-hour photo and video stories\n• Channels & Broadcasts: one-to-many broadcast channels for creators and organisations\n• Communities: topic-based groups with moderation tools\n• Groups: private or public group chats up to large member counts\n• AfuAI: AI-powered chat assistant, image generation, voice transcription, and in-app suggestions (premium)\n• Wallet & ACoins: in-app virtual currency, peer-to-peer transfers, Red Envelopes, and digital gifts\n• Mini Programs: airtime top-up, mobile data bundles, utility bill payments, hotel bookings, event tickets, and money transfers — powered by in-app third-party integrations\n• AfuMarket: peer-to-peer marketplace for buying and selling goods\n• Shop: brand storefronts for businesses to sell products and services\n• Freelance: service listings where professionals can offer and purchase freelance work\n• AfuMatch: opt-in social matching and discovery feature\n• Digital Events: create, promote, and sell tickets to virtual and physical events\n• Digital ID: verifiable in-app identity card linked to your profile\n• Games: casual in-app games\n• Username Market: buy, sell, and transfer premium @handles\n• Business & Company Pages: dedicated pages for businesses and organisations\n• Live Streaming: real-time video broadcasts with viewer interaction and gifts\n\nAccess to certain features may require a verified account, a premium subscription, or sufficient ACoins balance.`,
  },
  {
    id: "6",
    title: "6. User Content",
    body: `You retain ownership of content you post ("User Content"). By posting, you grant ${COMPANY} a worldwide, royalty-free, non-exclusive, sublicensable license to host, store, reproduce, distribute, display, and adapt your content for the purpose of operating and improving the Service.\n\nYou represent and warrant that you own or have all necessary rights to any content you post, and that your content does not infringe third-party rights. We reserve the right to remove any content that violates these Terms without notice.\n\nContent posted in public areas (posts, stories, channels, communities, shorts) is accessible to other users and, where applicable, indexed by search engines.`,
  },
  {
    id: "7",
    title: "7. ACoins, Wallet & Payments",
    body: `ACoins are the virtual currency of ${APP_NAME}. ACoins have no monetary value outside the platform and cannot be redeemed for cash except where required by applicable law.\n\nPayments are processed through our third-party payment providers including Pesapal. By making a purchase you agree to our payment provider's terms and conditions.\n\nAll purchases of ACoins are final unless otherwise required by applicable consumer protection law. Refunds are handled on a case-by-case basis at our sole discretion.\n\nPeer-to-peer transfers, Red Envelopes, gifts to streamers, and Mini Program payments are executed immediately and are generally non-reversible. You are responsible for verifying recipient details before initiating any transfer.\n\nWe reserve the right to modify ACoins pricing, availability, conversion rates, and redemption rules at any time with reasonable notice.`,
  },
  {
    id: "8",
    title: "8. AfuMarket, Shop & Freelance",
    body: `${APP_NAME} provides marketplace features — AfuMarket (peer-to-peer goods), Shop (brand storefronts), and Freelance (service listings) — where users can buy and sell goods and services. ${APP_NAME} acts as a platform intermediary and is not a party to transactions between buyers and sellers.\n\nSellers are responsible for: the accuracy of their listings; lawful ownership or authorisation to sell listed items; delivery of goods or services as described; and compliance with all applicable laws including consumer protection and tax regulations.\n\nBuyers are responsible for verifying listings before purchase. Disputes are handled through our escrow and resolution process where applicable.\n\n${COMPANY} takes a platform service fee on completed transactions. We reserve the right to suspend any listing or seller account that violates these Terms or our marketplace policies.`,
  },
  {
    id: "9",
    title: "9. Mini Programs & Third-Party Services",
    body: `Mini Programs are lightweight in-app services powered by third-party providers (airtime, data bundles, utility bills, hotel bookings, event tickets, and money transfers). When you use a Mini Program:\n\n• The transaction is processed by the relevant third-party provider, who has their own terms and privacy policy\n• ${COMPANY} facilitates the transaction but is not responsible for third-party service delivery failures\n• ACoins or local payment methods may be used depending on the Mini Program\n• Refunds and disputes for Mini Program transactions are subject to the relevant provider's policies\n\nWe make no warranty regarding the availability, accuracy, or reliability of third-party Mini Program services.`,
  },
  {
    id: "10",
    title: "10. AfuAI — Artificial Intelligence Features",
    body: `AfuAI provides AI-powered features including chat assistance, smart reply suggestions, voice message transcription, and AI image generation. By using AfuAI:\n\n• You understand that AI-generated content may be inaccurate, incomplete, or inappropriate — always apply your own judgement\n• You must not use AfuAI to generate illegal, harmful, defamatory, or deceptive content\n• AI image generation is a premium feature and subject to usage limits\n• Conversations with AfuAI may be used to improve our AI models in anonymised, aggregated form\n\nAfuAI is powered by third-party AI providers. We are not liable for the accuracy or completeness of AI-generated responses.`,
  },
  {
    id: "11",
    title: "11. Intellectual Property",
    body: `All ${APP_NAME} branding, logos, software, and content (excluding User Content) are owned by ${COMPANY} and protected by copyright, trademark, and other intellectual property laws.\n\nYou may not copy, modify, reverse-engineer, or create derivative works based on our software or branding without our prior written consent.\n\nIf you believe content on the platform infringes your copyright, please contact ${CONTACT_EMAIL} with details of the alleged infringement.`,
  },
  {
    id: "12",
    title: "12. Privacy",
    body: `Your use of the Service is also governed by our Privacy Policy, which is incorporated into these Terms by reference. Please read our Privacy Policy carefully to understand how we collect, use, and share information about you.\n\nBy using ${APP_NAME} you consent to our data practices as described in the Privacy Policy.`,
  },
  {
    id: "13",
    title: "13. Disclaimers",
    body: `THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND. TO THE FULLEST EXTENT PERMITTED BY LAW, ${COMPANY.toUpperCase()} DISCLAIMS ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.\n\nWe do not guarantee that the Service will be uninterrupted, error-free, or free of viruses or other harmful components. We are not responsible for the conduct of other users on the platform.`,
  },
  {
    id: "14",
    title: "14. Limitation of Liability",
    body: `TO THE FULLEST EXTENT PERMITTED BY LAW, ${COMPANY.toUpperCase()} WILL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING FROM YOUR USE OF THE SERVICE, INCLUDING LOSS OF DATA, PROFITS, OR GOODWILL.\n\nOur total liability for any claim arising from these Terms shall not exceed the amount you paid us in the twelve months preceding the claim, or USD $100, whichever is greater.\n\nWe are not liable for losses arising from peer-to-peer transactions, third-party Mini Program failures, AI-generated content, or actions of other users.`,
  },
  {
    id: "15",
    title: "15. Termination",
    body: `We may suspend or terminate your account at any time with or without cause and with or without notice, including if you violate these Terms.\n\nYou may delete your account at any time through the app Settings > Privacy & Data. Upon termination, your right to use the Service ceases immediately. Any unused ACoins balance is forfeited upon voluntary account deletion unless required by law. Provisions that by their nature should survive termination will survive.`,
  },
  {
    id: "16",
    title: "16. Governing Law",
    body: `These Terms are governed by the laws of the Republic of Uganda, without regard to its conflict-of-law principles. Any dispute arising from these Terms shall be subject to the exclusive jurisdiction of the courts of Uganda.\n\nIf you are a consumer in the European Union, you also have the right to use your local courts and applicable EU consumer protection laws.`,
  },
  {
    id: "17",
    title: "17. Changes to Terms",
    body: `We may update these Terms periodically. We will notify you of material changes through the App or by email. Your continued use of the Service after the effective date of changes constitutes acceptance of the updated Terms.`,
  },
  {
    id: "18",
    title: "18. Contact Us",
    body: `For questions about these Terms, please contact:\n\n${COMPANY}\n${COMPANY_ADDRESS}\nEmail: ${CONTACT_EMAIL}\nWebsite: https://afuchat.com\n\nFor urgent account issues or to report abuse, use the in-app report feature or contact support@afuchat.com.`,
  },
];

export default function TermsOfService() {
  const { colors, isDark } = useTheme();
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
          <Text style={[st.headerTitle, { color: colors.text }]}>Terms of Service</Text>
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
            Please read these Terms carefully before using AfuChat. These Terms constitute a
            legally binding agreement between you and {COMPANY}. Last updated: {LAST_UPDATED}.
          </Text>
        </View>

        {/* Sections — accordion on mobile, all expanded on web */}
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
              style={[st.privacyLink]}
              onPress={() => router.push("/privacy" as any)}
            >
              <Text style={[st.privacyLinkText, { color: BRAND }]}>
                View Privacy Policy →
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
    marginBottom: 28,
  },
  introText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 22,
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
  privacyLink: { paddingVertical: 4 },
  privacyLinkText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
});
