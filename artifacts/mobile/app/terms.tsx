import React from "react";
import {
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/hooks/useTheme";

const EFFECTIVE_DATE = "May 16, 2026";
const LAST_UPDATED   = "May 16, 2026";

type Clause  = { heading: string; body: string };
type Section = { title: string; clauses: Clause[] };

const SECTIONS: Section[] = [
  // ─── 1. General ────────────────────────────────────────────
  {
    title: "1. General Terms of Service",
    clauses: [
      {
        heading: "1.1 Acceptance of Terms",
        body: `By downloading, installing, accessing, or using AfuChat ("the Platform", "the App", "the Service"), you agree to be legally bound by these Terms of Service ("Terms"). If you do not agree to all of these Terms, you must not use the Platform.\n\nAfuChat Limited reserves the right to update these Terms at any time. We will notify you of material changes via the Platform or by email. Continued use of the Platform after changes take effect constitutes your acceptance of the revised Terms.`,
      },
      {
        heading: "1.2 Eligibility",
        body: `You must be at least 13 years old to use AfuChat. Users between 13 and 17 years of age must have the consent of a parent or legal guardian. Users 18 years and older may access all features, including paid services.\n\nBy using the Platform, you represent and warrant that you meet these age requirements and have the legal capacity to enter into a binding agreement. AfuChat reserves the right to terminate accounts found to be operated by ineligible users.`,
      },
      {
        heading: "1.3 Account Registration",
        body: `You agree to provide accurate, current, and complete information when creating an AfuChat account. You are solely responsible for:\n\n• Maintaining the confidentiality of your credentials (password, PIN, 2FA codes)\n• All activity that occurs under your account\n• Notifying AfuChat immediately at support@afuchat.com of any unauthorised access or security breach\n\nAfuChat will not be liable for any loss arising from your failure to keep your credentials secure. You may not share, sell, or transfer your account to any third party.`,
      },
      {
        heading: "1.3.1 Third-Party Sign-In",
        body: `You may create an AfuChat account or sign in using third-party identity providers including Google, GitHub, X (formerly Twitter), GitLab, and Apple. By choosing to sign in with one of these providers, you authorise AfuChat to receive certain information from your third-party account (such as your name, email address, profile photo and provider user ID) in accordance with the provider's authorisation screen and our Privacy Policy. You remain bound by the terms of the third-party provider. We do not receive or store your third-party account password.`,
      },
      {
        heading: "1.4 User Content",
        body: `You retain ownership of all content you post, upload, or share on the Platform ("User Content"). By submitting User Content, you grant AfuChat a non-exclusive, worldwide, royalty-free, sublicensable licence to:\n\n• Store, display, reproduce, and distribute your content in connection with operating the Platform\n• Use your content to train content moderation systems (in anonymised, aggregated form only)\n• Resize or reformat content for technical delivery purposes\n\nThis licence terminates when you delete your content or account, except where content has been shared with others and not deleted by them. You represent that you own all rights to any content you post and that such content does not infringe any third-party rights.`,
      },
      {
        heading: "1.5 Prohibited Conduct",
        body: `You agree not to engage in any of the following on or through the Platform:\n\n• Use the Platform for any unlawful, harmful, fraudulent, deceptive, or abusive purpose\n• Post, share, or transmit content that is illegal, hateful, sexually explicit without consent, defamatory, or violent\n• Harass, bully, threaten, stalk, or intimidate other users\n• Impersonate any person, entity, or AfuChat staff\n• Post spam, chain letters, or unsolicited commercial communications\n• Use bots, scrapers, or automated tools without written permission from AfuChat\n• Attempt to gain unauthorised access to other accounts, systems, or AfuChat infrastructure\n• Distribute malware, ransomware, viruses, or phishing content\n• Facilitate money laundering, terrorism financing, or any other financial crime\n• Violate any applicable local, national, or international laws or regulations\n• Circumvent, disable, or interfere with security features of the Platform\n• Engage in any activity that disproportionately burdens AfuChat's infrastructure\n\nViolation of these prohibitions may result in immediate account suspension or termination and may be reported to law enforcement.`,
      },
      {
        heading: "1.6 Intellectual Property",
        body: `The AfuChat Platform, including its name, logo, trademarks, software, source code, design, graphics, user interface, and all original content created by AfuChat, are the exclusive property of AfuChat Limited and are protected by copyright, trademark, and other intellectual property laws in Uganda and internationally.\n\nYou may not copy, reproduce, modify, adapt, translate, distribute, publicly perform, create derivative works from, or reverse-engineer any part of the Platform without our express written permission.`,
      },
    ],
  },

  // ─── 2. In-App Currency & Payments ─────────────────────────
  {
    title: "2. In-App Currency, Payments & Subscriptions",
    clauses: [
      {
        heading: "2.1 ACoins — Virtual Currency",
        body: `AfuChat operates a virtual currency system called "ACoins." ACoins are a digital medium of exchange within the Platform and can be used to:\n\n• Send digital gifts to other users\n• Access premium content and features\n• Purchase items in the Marketplace\n• Tip creators and pay for freelance services\n• Purchase digital goods such as stickers and red envelopes\n\nACoins have no monetary value outside of AfuChat. They cannot be exchanged for real currency, transferred outside the Platform, or redeemed for cash. AfuChat reserves the right to modify, retire, or discontinue ACoins at any time. ACoins are non-refundable except where required by applicable law.`,
      },
      {
        heading: "2.2 Real Money Payments",
        body: `Certain transactions on the Platform (including ACoin top-ups, premium subscriptions, marketplace purchases, and utility bill payments) involve real money processed through Pesapal, a licensed payment service provider. By making a purchase, you agree to Pesapal's terms of service and payment processing policies.\n\nAfuChat does not store your debit/credit card numbers or mobile money PIN. All payment data is handled by Pesapal in a PCI-DSS compliant manner.`,
      },
      {
        heading: "2.3 Premium Subscription",
        body: `AfuChat offers a paid "Premium" subscription that unlocks additional features including but not limited to: advanced AI access, exclusive stickers, profile badges, priority support, and expanded storage. Premium subscriptions are billed on a recurring monthly or annual basis.\n\n• Subscriptions auto-renew unless cancelled at least 24 hours before the renewal date\n• You may cancel your subscription at any time in Settings → Premium\n• Refunds are governed by the platform through which you purchased (Google Play or direct billing)\n• AfuChat does not offer pro-rated refunds for unused subscription periods except as required by law`,
      },
      {
        heading: "2.4 Google Play Purchases",
        body: `If you purchase a subscription or in-app item through the Google Play Store, the purchase is subject to Google Play's terms and conditions. Billing, refund requests, and subscription management for store purchases must be handled directly with Google, not AfuChat.\n\n• Google Play Store: manage at play.google.com/store/account/subscriptions`,
      },
      {
        heading: "2.5 Taxes",
        body: `You are responsible for any applicable taxes, duties, or levies associated with your purchases on the Platform. AfuChat may collect taxes where required by law and will display applicable taxes at the point of purchase.`,
      },
      {
        heading: "2.6 Wallet & Transfers",
        body: `The AfuChat Wallet allows peer-to-peer transfers of ACoins between users, tipping of creators, and payment for in-app services. You acknowledge that:\n\n• All wallet transactions are final and cannot be reversed once completed\n• AfuChat may implement transaction limits, cooling-off periods, or KYC (Know Your Customer) requirements for high-value transactions\n• Wallet transfers for real-money equivalents are processed through Pesapal and subject to Pesapal's limits and compliance requirements\n• You must not use the wallet to facilitate fraudulent transactions or money laundering`,
      },
    ],
  },

  // ─── 3. Marketplace & E-commerce ───────────────────────────
  {
    title: "3. Marketplace & E-commerce",
    clauses: [
      {
        heading: "3.1 Marketplace Overview",
        body: `AfuChat's built-in Marketplace allows verified organisations and individuals to sell products and services to other users. AfuChat acts as a platform intermediary, not the seller. Transactions are between buyers and sellers directly.`,
      },
      {
        heading: "3.2 Seller Obligations",
        body: `Sellers on the Marketplace must:\n\n• Provide accurate product descriptions, images, and pricing\n• Fulfil orders within the stated delivery timeframes\n• Comply with all applicable consumer protection, customs, and tax laws\n• Not list counterfeit, prohibited, or illegal items\n• Maintain a minimum seller rating to remain active on the platform\n\nAfuChat reserves the right to remove listings, suspend seller accounts, and report illegal activity to the relevant authorities.`,
      },
      {
        heading: "3.3 Buyer Protections",
        body: `AfuChat may offer a buyer protection programme for eligible purchases. Items not as described, undelivered goods, or seller fraud may be eligible for dispute resolution through AfuChat's support team. AfuChat's buyer protection does not cover:\n\n• Change of mind purchases\n• Digital goods that have already been downloaded or accessed\n• Items purchased outside the official AfuChat Marketplace`,
      },
    ],
  },

  // ─── 4. Freelance Hub ───────────────────────────────────────
  {
    title: "4. Freelance Hub",
    clauses: [
      {
        heading: "4.1 Service Overview",
        body: `The AfuChat Freelance Hub connects clients seeking services with freelancers offering skills. AfuChat provides the platform and is not a party to any agreement between clients and freelancers. All freelance contracts are between the hiring party and the freelancer.`,
      },
      {
        heading: "4.2 Freelancer Obligations",
        body: `Freelancers agree to:\n\n• Provide services as described in their profile and agreed with the client\n• Deliver work on time and to a professional standard\n• Maintain accurate qualifications, experience, and portfolio information\n• Not accept work they do not have the skills or capacity to complete\n• Pay applicable taxes on income earned through the platform`,
      },
      {
        heading: "4.3 Disputes",
        body: `AfuChat may offer optional dispute mediation for Freelance Hub transactions paid in ACoins or through the AfuChat Wallet. AfuChat's decision in mediated disputes is final. AfuChat is not liable for any loss arising from a freelance contract dispute.`,
      },
    ],
  },

  // ─── 5. AI Assistant (AfuAI) ───────────────────────────────
  {
    title: "5. AI Assistant (AfuAI) & AI-Generated Content",
    clauses: [
      {
        heading: "5.1 AfuAI Service",
        body: `AfuAI is an in-app AI assistant powered by third-party large language models. AfuAI can answer questions, generate text, suggest content, assist with navigation, and generate images (Premium feature). AfuAI's responses are generated automatically and may not always be accurate, complete, or appropriate.`,
      },
      {
        heading: "5.2 AI Content Responsibility",
        body: `You are solely responsible for how you use AI-generated content. AfuChat does not guarantee the accuracy, safety, or suitability of AfuAI's responses for any particular purpose. You must not:\n\n• Use AfuAI to generate content that violates these Terms or applicable law\n• Use AI-generated content to deceive, defraud, or harass others\n• Present AI-generated content as your original human-created work in contexts where that distinction matters\n• Attempt to jailbreak, manipulate, or circumvent AfuAI's safety filters`,
      },
      {
        heading: "5.3 AI Privacy Guarantees",
        body: `AfuAI will never:\n\n• Access, read, or summarise your private (end-to-end encrypted) messages\n• Initiate any action on your behalf without your explicit confirmation\n• Make purchases, transfers, or send messages without your approval\n\nAI conversation history is stored and may be used to improve AfuAI's contextual understanding. You can delete your AI conversation history at any time.`,
      },
      {
        heading: "5.4 AI Image Generation",
        body: `Premium users may generate images using AfuAI. You must not generate images that are:\n\n• Sexually explicit or contain nudity\n• Designed to defame or impersonate real individuals\n• Violent, hateful, or intended to cause harm\n• In violation of any intellectual property rights\n\nAfuChat reserves the right to remove generated images that violate these guidelines and suspend accounts that repeatedly misuse image generation.`,
      },
    ],
  },

  // ─── 6. Content & Community ────────────────────────────────
  {
    title: "6. Content, Communities & Moderation",
    clauses: [
      {
        heading: "6.1 Community Guidelines",
        body: `All users must follow AfuChat's Community Guidelines when posting, commenting, broadcasting, or sharing content. The Community Guidelines are incorporated into these Terms by reference and available in the Help section of the app.`,
      },
      {
        heading: "6.2 Paid Communities",
        body: `Community administrators may charge subscription fees to access paid communities. Community administrators are responsible for delivering the promised content and value. AfuChat takes a platform fee from paid community subscriptions. Community subscription refund requests are evaluated on a case-by-case basis.`,
      },
      {
        heading: "6.3 Content Moderation",
        body: `AfuChat employs automated and human moderation to enforce these Terms and Community Guidelines. We may remove content, issue warnings, restrict features, suspend, or permanently ban accounts that violate our policies. Moderation decisions may be appealed by contacting support@afuchat.com within 30 days of the action.`,
      },
      {
        heading: "6.4 Reporting",
        body: `Users may report content or accounts that they believe violate these Terms using the in-app reporting feature. AfuChat will review reports and take appropriate action. We cannot guarantee a specific timeline for review but aim to address critical safety reports within 24 hours.`,
      },
      {
        heading: "6.5 Digital Gifts",
        body: `Digital gifts (virtual items sent between users) are purchased with ACoins and have no cash value. Gifts received can be partially converted to ACoins at the rates shown in the app. AfuChat takes a platform fee on gift conversions. Gifts are non-refundable once sent.`,
      },
    ],
  },

  // ─── 7. Privacy & Data ─────────────────────────────────────
  {
    title: "7. Privacy & Data",
    clauses: [
      {
        heading: "7.1 Privacy Policy",
        body: `Your use of AfuChat is also governed by our Privacy Policy, which is incorporated into these Terms by reference. The Privacy Policy explains what data we collect, how we use it, and your rights regarding your personal data. Please review it at afuchat.com/privacy or within the app at Settings → Privacy → Privacy Policy.`,
      },
      {
        heading: "7.2 End-to-End Encryption",
        body: `Private 1-on-1 messages on AfuChat are end-to-end encrypted. This means AfuChat cannot read the content of your private messages. Group channels and public posts are not end-to-end encrypted and may be subject to content moderation review.`,
      },
      {
        heading: "7.3 Data Retention on Account Deletion",
        body: `When you delete your account, we will process deletion within 30 days. Some data may be retained for up to 90 days in encrypted backup systems before permanent deletion. Certain records may be retained longer where required by law (e.g. financial transaction records for tax compliance).`,
      },
    ],
  },

  // ─── 8. App Store Distribution ─────────────────────────────
  {
    title: "8. App Store Distribution & Platform Policies",
    clauses: [
      {
        heading: "8.1 Google Play Store",
        body: `AfuChat is distributed on the Google Play Store. Your use of AfuChat obtained from Google Play is also subject to Google Play's Terms of Service. In the event of a conflict between these Terms and Google Play's Terms, Google Play's Terms shall govern solely with respect to your relationship with Google. AfuChat is independently responsible for the App and its content.`,
      },
      {
        heading: "8.2 Huawei AppGallery & Other Stores",
        body: `AfuChat may be distributed through additional stores including the Huawei AppGallery, Samsung Galaxy Store, and direct APK download. Users who install AfuChat via direct APK are responsible for ensuring they download from official AfuChat sources (afuchat.com). AfuChat is not responsible for modified or counterfeit versions of the App.`,
      },
      {
        heading: "8.3 Platform Compliance",
        body: `AfuChat complies with the content policies, data safety disclosures, and developer programme policies of all distribution platforms on which it is listed. Users who believe AfuChat is in violation of any platform's policies are encouraged to contact us at legal@afuchat.com.`,
      },
    ],
  },

  // ─── 9. Disclaimers & Liability ────────────────────────────
  {
    title: "9. Disclaimers, Warranties & Liability",
    clauses: [
      {
        heading: "9.1 No Warranties",
        body: `The Platform is provided "AS IS" and "AS AVAILABLE" without warranties of any kind, whether express or implied, including but not limited to implied warranties of merchantability, fitness for a particular purpose, or non-infringement. AfuChat does not warrant that the Platform will be uninterrupted, error-free, or free of viruses or other harmful components.`,
      },
      {
        heading: "9.2 Limitation of Liability",
        body: `To the maximum extent permitted by applicable law, AfuChat Limited and its directors, employees, agents, partners, and licensors shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of profits, data, goodwill, or other intangible losses, arising from:\n\n• Your use of or inability to use the Platform\n• Unauthorised access to or alteration of your data\n• Actions or content of third parties on the Platform\n• Any other matter relating to the Platform\n\nAfuChat's total liability to you for any claim arising from these Terms or your use of the Platform shall not exceed the amount you paid AfuChat in the 12 months preceding the claim, or USD $50, whichever is greater.`,
      },
      {
        heading: "9.3 Indemnification",
        body: `You agree to indemnify, defend, and hold harmless AfuChat Limited, its officers, directors, employees, and agents from any claims, liabilities, damages, losses, costs, or expenses (including reasonable legal fees) arising from:\n\n• Your violation of these Terms\n• Your User Content\n• Your use of the Platform in violation of any law\n• Your violation of any rights of a third party`,
      },
      {
        heading: "9.4 Force Majeure",
        body: `AfuChat shall not be liable for any failure or delay in performance resulting from causes outside its reasonable control, including but not limited to acts of God, war, terrorism, civil unrest, government action, internet outages, power failures, or acts of third-party service providers.`,
      },
    ],
  },

  // ─── 10. Copyright / DMCA ──────────────────────────────────
  {
    title: "10. Copyright & DMCA Notice",
    clauses: [
      {
        heading: "10.1 Copyright Infringement",
        body: `AfuChat respects the intellectual property rights of others. If you believe that content on AfuChat infringes your copyright, please send a notice to legal@afuchat.com containing:\n\n• A description of the copyrighted work you claim has been infringed\n• A description of where the allegedly infringing content is located on the Platform\n• Your contact information\n• A statement that you have a good faith belief that the use is not authorised\n• A statement, under penalty of perjury, that the information is accurate and you are authorised to act on behalf of the copyright owner\n\nAfuChat will respond to valid notices by removing or disabling access to the infringing content and may terminate accounts of repeat infringers.`,
      },
      {
        heading: "10.2 Counter-Notice",
        body: `If your content was removed due to a copyright notice and you believe the removal was a mistake, you may file a counter-notice at legal@afuchat.com. Counter-notices must include your identification, description of the removed content, and a statement under penalty of perjury that the material was removed by mistake or misidentification.`,
      },
    ],
  },

  // ─── 11. Termination ───────────────────────────────────────
  {
    title: "11. Account Termination",
    clauses: [
      {
        heading: "11.1 Termination by User",
        body: `You may delete your account at any time from Settings → Account → Delete Account. Upon deletion, your profile, posts, and public content will be removed from the Platform within 30 days. Any unused ACoins will be forfeited upon account deletion and cannot be refunded. Active subscriptions must be cancelled separately.`,
      },
      {
        heading: "11.2 Termination by AfuChat",
        body: `AfuChat may suspend or terminate your account at any time, with or without notice, for:\n\n• Violation of these Terms or Community Guidelines\n• Illegal activity conducted through the Platform\n• Risk of harm to other users or the Platform\n• Extended inactivity (accounts inactive for more than 24 months may be deactivated)\n\nAfuChat will make reasonable efforts to notify you before permanent termination unless doing so would cause harm or is prohibited by law.`,
      },
      {
        heading: "11.3 Effect of Termination",
        body: `Upon termination, your right to use the Platform ceases immediately. Sections of these Terms relating to intellectual property, liability, indemnification, and governing law shall survive termination.`,
      },
    ],
  },

  // ─── 12. Governing Law ─────────────────────────────────────
  {
    title: "12. Governing Law & Dispute Resolution",
    clauses: [
      {
        heading: "12.1 Governing Law",
        body: `These Terms shall be governed by and construed in accordance with the laws of the Republic of Uganda, without regard to its conflict of law provisions. Where applicable consumer protection laws of your country of residence provide greater protections, those laws shall apply.`,
      },
      {
        heading: "12.2 Dispute Resolution",
        body: `Any dispute arising from or related to these Terms or your use of the Platform shall first be submitted to AfuChat for informal resolution at support@afuchat.com. If informal resolution fails within 30 days, the dispute shall be referred to binding arbitration under the Arbitration and Conciliation Act of Uganda. You waive any right to participate in a class action lawsuit against AfuChat to the extent permitted by applicable law.`,
      },
      {
        heading: "12.3 Jurisdictional Exceptions",
        body: `Users in certain jurisdictions (including the European Union, United Kingdom, Australia, and Canada) may have additional statutory rights that cannot be waived by contract. These Terms do not affect such statutory rights.`,
      },
    ],
  },

  // ─── 13. General ───────────────────────────────────────────
  {
    title: "13. General Provisions",
    clauses: [
      {
        heading: "13.1 Entire Agreement",
        body: `These Terms, together with the Privacy Policy and Community Guidelines, constitute the entire agreement between you and AfuChat regarding your use of the Platform and supersede all prior agreements and understandings.`,
      },
      {
        heading: "13.2 Severability",
        body: `If any provision of these Terms is found to be unenforceable or invalid by a court of competent jurisdiction, that provision shall be limited or eliminated to the minimum extent necessary so that the remaining provisions remain in full force and effect.`,
      },
      {
        heading: "13.3 Waiver",
        body: `AfuChat's failure to enforce any right or provision of these Terms shall not constitute a waiver of that right or provision. Any waiver of any provision of these Terms will be effective only if in writing and signed by AfuChat.`,
      },
      {
        heading: "13.4 Assignment",
        body: `You may not assign or transfer these Terms or any rights hereunder without AfuChat's prior written consent. AfuChat may assign its rights and obligations under these Terms without restriction, including in connection with a merger, acquisition, or sale of assets.`,
      },
      {
        heading: "13.5 Contact",
        body: `For questions about these Terms, please contact us:\n\nAfuChat Limited\nKampala, Uganda\nEmail: legal@afuchat.com\nSupport: support@afuchat.com\nWebsite: https://afuchat.com`,
      },
    ],
  },
];

export default function TermsScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[st.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[st.header, { paddingTop: insets.top + 8, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => router.canGoBack() ? router.back() : router.replace("/")}
          style={st.backBtn}
        >
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[st.headerTitle, { color: colors.text }]}>Terms of Service</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[st.scroll, { paddingBottom: insets.bottom + 48 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Intro */}
        <View style={st.intro}>
          <Text style={[st.introTitle, { color: colors.text }]}>Terms of Service</Text>
          <Text style={[st.introMeta, { color: colors.textMuted }]}>
            Effective: {EFFECTIVE_DATE} · Last updated: {LAST_UPDATED}
          </Text>
          <View style={[st.introBanner, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="information-circle" size={18} color="#3B82F6" style={{ marginTop: 1 }} />
            <Text style={[st.introBannerText, { color: colors.textSecondary }]}>
              These Terms govern your access to and use of AfuChat across all platforms, including Android, Web, and any other distribution channels. Please read them carefully before using the Platform.
            </Text>
          </View>
          <Text style={[st.introBody, { color: colors.textSecondary }]}>
            Welcome to AfuChat — the all-in-one social super app. These Terms of Service ("Terms") form a legally binding agreement between you and AfuChat Limited ("AfuChat", "we", "us", or "our"). By using AfuChat, you agree to these Terms.
          </Text>
        </View>

        <View style={[st.divider, { backgroundColor: colors.border }]} />

        {/* Quick links */}
        <View style={[st.quickLinks, { borderBottomColor: colors.border }]}>
          <Text style={[st.quickLinksTitle, { color: colors.textMuted }]}>QUICK LINKS</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {SECTIONS.map((s, i) => (
              <View key={i} style={[st.quickChip, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[st.quickChipText, { color: colors.textSecondary }]}>{s.title.split(".")[0] + ". " + s.title.split(". ")[1]}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Sections */}
        {SECTIONS.map((section, si) => (
          <View key={si}>
            <View style={st.sectionBlock}>
              <Text style={[st.sectionTitle, { color: colors.text }]}>{section.title}</Text>
              {section.clauses.map((clause, ci) => (
                <View key={ci} style={st.clauseBlock}>
                  <Text style={[st.clauseHeading, { color: colors.text }]}>{clause.heading}</Text>
                  <Text style={[st.clauseBody, { color: colors.textSecondary }]}>{clause.body}</Text>
                </View>
              ))}
            </View>
            {si < SECTIONS.length - 1 && (
              <View style={[st.divider, { backgroundColor: colors.border }]} />
            )}
          </View>
        ))}

        {/* Footer */}
        <View style={[st.footer, { borderTopColor: colors.border }]}>
          <Ionicons name="shield-checkmark" size={24} color="#3B82F6" style={{ marginBottom: 8 }} />
          <Text style={[st.footerText, { color: colors.textMuted }]}>
            AfuChat Limited · Kampala, Republic of Uganda
          </Text>
          <Text style={[st.footerText, { color: colors.textMuted }]}>
            legal@afuchat.com · support@afuchat.com
          </Text>
          <Text style={[st.footerText, { color: colors.textMuted }]}>
            © {new Date().getFullYear()} AfuChat Limited. All rights reserved.
          </Text>
          <TouchableOpacity onPress={() => router.push("/privacy")} style={{ marginTop: 12 }}>
            <Text style={{ color: "#1f95ff", fontSize: 14, fontFamily: "Inter_500Medium", textAlign: "center" }}>
              View Privacy Policy →
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => Linking.openURL("mailto:legal@afuchat.com")} style={{ marginTop: 6 }}>
            <Text style={{ color: "#6B7280", fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" }}>
              Questions? Email legal@afuchat.com
            </Text>
          </TouchableOpacity>
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
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn:     { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, textAlign: "center", fontSize: 16, fontFamily: "Inter_700Bold" },

  scroll:        { },
  intro:         { paddingHorizontal: 20, paddingTop: 28, paddingBottom: 24, gap: 12 },
  introTitle:    { fontSize: 24, fontFamily: "Inter_700Bold", lineHeight: 30 },
  introMeta:     { fontSize: 13, fontFamily: "Inter_400Regular" },
  introBanner:   { flexDirection: "row", gap: 10, borderWidth: 1, borderRadius: 12, padding: 14 },
  introBannerText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20 },
  introBody:     { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 22 },

  divider:       { height: StyleSheet.hairlineWidth, marginHorizontal: 20, marginVertical: 4 },

  quickLinks:    { paddingHorizontal: 20, paddingVertical: 20, borderBottomWidth: StyleSheet.hairlineWidth },
  quickLinksTitle: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 1.2, marginBottom: 10 },
  quickChip:     { borderWidth: 1, borderRadius: 100, paddingHorizontal: 12, paddingVertical: 5 },
  quickChipText: { fontSize: 12, fontFamily: "Inter_400Regular" },

  sectionBlock:  { paddingHorizontal: 20, paddingVertical: 28, gap: 22 },
  sectionTitle:  { fontSize: 17, fontFamily: "Inter_700Bold", lineHeight: 24, marginBottom: 4, color: "#1E293B" },

  clauseBlock:   { gap: 7 },
  clauseHeading: { fontSize: 15, fontFamily: "Inter_600SemiBold", lineHeight: 22 },
  clauseBody:    { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 23 },

  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 20,
    paddingVertical: 32,
    gap: 5,
    alignItems: "center",
  },
  footerText: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center" },
});
