import React from "react";
import {
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/hooks/useTheme";

const TEAL = "#00BCD4";

const ROLES = [
  {
    dept: "Engineering",
    color: "#3B82F6",
    icon: "code-slash-outline",
    positions: [
      { title: "Senior React Native Engineer", type: "Full-time", location: "Remote" },
      { title: "Backend Engineer (Node.js / Supabase)", type: "Full-time", location: "Remote / Kampala" },
      { title: "DevOps / Infrastructure Engineer", type: "Full-time", location: "Remote" },
    ],
  },
  {
    dept: "Product & Design",
    color: "#8B5CF6",
    icon: "color-palette-outline",
    positions: [
      { title: "Senior Product Designer (Mobile)", type: "Full-time", location: "Remote" },
      { title: "Product Manager — Social & Payments", type: "Full-time", location: "Remote / Kampala" },
    ],
  },
  {
    dept: "Growth & Marketing",
    color: "#10B981",
    icon: "trending-up-outline",
    positions: [
      { title: "Head of Growth", type: "Full-time", location: "Kampala, Uganda" },
      { title: "Community Manager (Africa)", type: "Full-time", location: "Remote" },
      { title: "Content Creator / Copywriter", type: "Contract", location: "Remote" },
    ],
  },
  {
    dept: "Operations & Support",
    color: "#F59E0B",
    icon: "people-outline",
    positions: [
      { title: "Customer Success Lead", type: "Full-time", location: "Kampala, Uganda" },
      { title: "Trust & Safety Specialist", type: "Full-time", location: "Remote" },
    ],
  },
];

const BENEFITS = [
  { icon: "globe-outline",      color: "#3B82F6",  title: "Remote-First",      desc: "Work from anywhere in the world. We are a globally distributed team." },
  { icon: "cash-outline",       color: "#10B981",  title: "Competitive Pay",    desc: "Market-rate salaries benchmarked globally, paid in your local currency." },
  { icon: "trending-up-outline",color: "#8B5CF6",  title: "Equity Options",     desc: "Share in the company's growth with a meaningful equity package." },
  { icon: "book-outline",       color: "#F59E0B",  title: "Learning Budget",    desc: "$1,000/year for courses, books, conferences, and certifications." },
  { icon: "time-outline",       color: TEAL,       title: "Flexible Hours",     desc: "Async-first culture. Own your schedule, ship your best work." },
  { icon: "heart-outline",      color: "#EC4899",  title: "Health Coverage",    desc: "Health insurance for full-time employees (terms vary by region)." },
  { icon: "sparkles-outline",   color: "#F59E0B",  title: "AfuChat Premium",    desc: "Full premium access to AfuChat for you and a family member." },
  { icon: "rocket-outline",     color: "#3B82F6",  title: "Growth Stage",       desc: "Join early, move fast, and have real impact on a product millions will use." },
];

const VALUES = [
  { icon: "people",          label: "Community First",    desc: "We build for real people — their stories, livelihoods, and connections matter most." },
  { icon: "shield-checkmark", label: "Privacy & Safety",  desc: "We encrypt by default and design systems that protect users, not exploit them." },
  { icon: "rocket",           label: "Move Fast",         desc: "We ship, learn, and improve quickly. Bureaucracy slows everyone down." },
  { icon: "globe",            label: "Built for Africa",  desc: "We optimise for low bandwidth, local payments, and African user journeys first." },
];

export default function CareersScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const isTablet  = width >= 640;

  const apply = (role?: string) => {
    const subject = role ? `Application: ${role}` : "General Application";
    Linking.openURL(`mailto:jobs@afuchat.com?subject=${encodeURIComponent(subject)}`);
  };

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
        <Text style={[st.headerTitle, { color: colors.text }]}>Careers</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 60 }}>
        {/* Hero */}
        <View style={[st.heroSection, { paddingHorizontal: isDesktop ? 80 : 24, paddingTop: isDesktop ? 72 : 48, paddingBottom: isDesktop ? 80 : 56 }]}>
          <View style={st.heroBadge}>
            <Ionicons name="sparkles" size={13} color={TEAL} style={{ marginRight: 6 }} />
            <Text style={st.heroBadgeText}>We're hiring</Text>
          </View>
          <Text style={[st.heroHeadline, { fontSize: isDesktop ? 52 : isTablet ? 40 : 32, textAlign: isDesktop ? "left" : "center" }]}>
            Build something{"\n"}
            <Text style={{ color: TEAL }}>that matters.</Text>
          </Text>
          <Text style={[st.heroSub, { textAlign: isDesktop ? "left" : "center", maxWidth: 560 }]}>
            AfuChat is on a mission to build Africa's most impactful super app — messaging, AI, payments, and communities in one place. Join a small, ambitious team moving fast and shipping daily.
          </Text>
          <TouchableOpacity onPress={() => apply()} style={st.heroCta}>
            <Ionicons name="mail-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
            <Text style={st.heroCtaText}>Send Open Application</Text>
          </TouchableOpacity>
        </View>

        {/* Values */}
        <View style={[st.valuesSection, { paddingHorizontal: isDesktop ? 80 : 24 }]}>
          <Text style={st.sectionEyebrow}>OUR VALUES</Text>
          <Text style={[st.sectionHeading, { color: colors.text, fontSize: isDesktop ? 32 : 24 }]}>How we work</Text>
          <View style={[st.valuesGrid, { flexDirection: "row", flexWrap: "wrap", gap: 16, marginTop: 32 }]}>
            {VALUES.map((v) => (
              <View key={v.label} style={[st.valueCard, { backgroundColor: colors.surface, borderColor: colors.border, width: isDesktop ? "47%" : "100%" }]}>
                <Ionicons name={v.icon as any} size={22} color={TEAL} style={{ marginBottom: 10 }} />
                <Text style={[st.valueTitle, { color: colors.text }]}>{v.label}</Text>
                <Text style={[st.valueDesc, { color: colors.textSecondary }]}>{v.desc}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Benefits */}
        <View style={[st.benefitsSection, { paddingHorizontal: isDesktop ? 80 : 24 }]}>
          <Text style={st.sectionEyebrow}>PERKS & BENEFITS</Text>
          <Text style={[st.sectionHeading, { color: colors.text, fontSize: isDesktop ? 32 : 24, marginBottom: 32 }]}>Why you'll love it here</Text>
          <View style={[{ flexDirection: "row", flexWrap: "wrap", gap: 16 }]}>
            {BENEFITS.map((b) => (
              <View
                key={b.title}
                style={[st.benefitCard, { backgroundColor: colors.surface, borderColor: colors.border, width: isDesktop ? "23%" : isTablet ? "47%" : "100%" }]}
              >
                <View style={[st.benefitIcon, { backgroundColor: b.color + "18" }]}>
                  <Ionicons name={b.icon as any} size={20} color={b.color} />
                </View>
                <Text style={[st.benefitTitle, { color: colors.text }]}>{b.title}</Text>
                <Text style={[st.benefitDesc, { color: colors.textSecondary }]}>{b.desc}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Open Roles */}
        <View style={[st.rolesSection, { paddingHorizontal: isDesktop ? 80 : 24 }]}>
          <Text style={st.sectionEyebrow}>OPEN POSITIONS</Text>
          <Text style={[st.sectionHeading, { color: colors.text, fontSize: isDesktop ? 32 : 24, marginBottom: 32 }]}>
            Find your role
          </Text>

          <View style={{ gap: 32 }}>
            {ROLES.map((dept) => (
              <View key={dept.dept}>
                {/* Dept header */}
                <View style={st.deptHeader}>
                  <View style={[st.deptIconWrap, { backgroundColor: dept.color + "18" }]}>
                    <Ionicons name={dept.icon as any} size={18} color={dept.color} />
                  </View>
                  <Text style={[st.deptTitle, { color: colors.text }]}>{dept.dept}</Text>
                  <View style={[st.deptBadge, { backgroundColor: dept.color + "18" }]}>
                    <Text style={[st.deptBadgeText, { color: dept.color }]}>{dept.positions.length} open</Text>
                  </View>
                </View>

                {/* Positions */}
                <View style={{ gap: 10, marginTop: 12 }}>
                  {dept.positions.map((pos) => (
                    <TouchableOpacity
                      key={pos.title}
                      onPress={() => apply(pos.title)}
                      style={[st.posCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                    >
                      <View style={{ flex: 1, gap: 4 }}>
                        <Text style={[st.posTitle, { color: colors.text }]}>{pos.title}</Text>
                        <View style={{ flexDirection: "row", gap: 12 }}>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                            <Ionicons name="briefcase-outline" size={12} color={colors.textMuted ?? colors.textSecondary} />
                            <Text style={[st.posMeta, { color: colors.textMuted ?? colors.textSecondary }]}>{pos.type}</Text>
                          </View>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                            <Ionicons name="location-outline" size={12} color={colors.textMuted ?? colors.textSecondary} />
                            <Text style={[st.posMeta, { color: colors.textMuted ?? colors.textSecondary }]}>{pos.location}</Text>
                          </View>
                        </View>
                      </View>
                      <View style={[st.applyBtn, { borderColor: dept.color }]}>
                        <Text style={[st.applyBtnText, { color: dept.color }]}>Apply</Text>
                        <Ionicons name="arrow-forward" size={13} color={dept.color} />
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* CTA */}
        <View style={[st.ctaSection, { paddingHorizontal: isDesktop ? 80 : 24, marginHorizontal: isDesktop ? 80 : 24 }]}>
          <Ionicons name="mail" size={32} color={TEAL} style={{ marginBottom: 16 }} />
          <Text style={[st.ctaHeading, { fontSize: isDesktop ? 28 : 22 }]}>Don't see your role?</Text>
          <Text style={st.ctaSub}>
            We're always looking for exceptional people. Send your CV and a short note to{" "}
            <Text style={{ color: TEAL }}>jobs@afuchat.com</Text> and tell us how you'd contribute.
          </Text>
          <TouchableOpacity onPress={() => apply()} style={st.ctaBtn}>
            <Text style={st.ctaBtnText}>Send Open Application</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  root:       { flex: 1 },
  header:     { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  backBtn:    { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle:{ flex: 1, textAlign: "center", fontSize: 16, fontFamily: "Inter_700Bold" },

  heroSection:  { gap: 16 },
  heroBadge:    { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", backgroundColor: "rgba(0,188,212,0.1)", borderWidth: 1, borderColor: "rgba(0,188,212,0.25)", paddingHorizontal: 14, paddingVertical: 7, borderRadius: 100 },
  heroBadgeText:{ fontSize: 13, fontFamily: "Inter_500Medium", color: TEAL },
  heroHeadline: { fontFamily: "Inter_700Bold", color: "#1E293B", lineHeight: 56 },
  heroSub:      { fontSize: 17, fontFamily: "Inter_400Regular", color: "#475569", lineHeight: 27 },
  heroCta:      { flexDirection: "row", alignItems: "center", backgroundColor: TEAL, alignSelf: "flex-start", paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12, marginTop: 8 },
  heroCtaText:  { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#fff" },

  sectionEyebrow: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: TEAL, letterSpacing: 1.5, marginBottom: 8 },
  sectionHeading: { fontFamily: "Inter_700Bold", lineHeight: 40, marginBottom: 4 },

  valuesSection:  { paddingVertical: 56 },
  valuesGrid:     {},
  valueCard:      { borderWidth: 1, borderRadius: 16, padding: 22, flex: 1, minWidth: 260 },
  valueTitle:     { fontSize: 16, fontFamily: "Inter_600SemiBold", marginBottom: 6 },
  valueDesc:      { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 21 },

  benefitsSection: { paddingVertical: 56, backgroundColor: "#F8FAFC", paddingHorizontal: 0, marginHorizontal: 0 },
  benefitCard:     { borderWidth: 1, borderRadius: 16, padding: 20, gap: 10, flex: 1, minWidth: 200 },
  benefitIcon:     { width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  benefitTitle:    { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  benefitDesc:     { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 },

  rolesSection:   { paddingVertical: 56 },
  deptHeader:     { flexDirection: "row", alignItems: "center", gap: 10 },
  deptIconWrap:   { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  deptTitle:      { fontSize: 17, fontFamily: "Inter_700Bold", flex: 1 },
  deptBadge:      { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100 },
  deptBadgeText:  { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  posCard:        { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 14, paddingHorizontal: 18, paddingVertical: 16, gap: 12 },
  posTitle:       { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  posMeta:        { fontSize: 12, fontFamily: "Inter_400Regular" },
  applyBtn:       { flexDirection: "row", alignItems: "center", gap: 4, borderWidth: 1, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7 },
  applyBtnText:   { fontSize: 13, fontFamily: "Inter_600SemiBold" },

  ctaSection:  { backgroundColor: "#0A0D14", borderRadius: 20, padding: 40, marginVertical: 40, alignItems: "center" },
  ctaHeading:  { fontFamily: "Inter_700Bold", color: "#fff", textAlign: "center", marginBottom: 12 },
  ctaSub:      { fontSize: 15, fontFamily: "Inter_400Regular", color: "#94A3B8", textAlign: "center", lineHeight: 23, maxWidth: 440 },
  ctaBtn:      { marginTop: 20, backgroundColor: TEAL, paddingHorizontal: 28, paddingVertical: 14, borderRadius: 12 },
  ctaBtnText:  { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#fff" },
});
