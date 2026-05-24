import React, { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "@/components/ui/SafeGradient";
import { useTheme } from "@/hooks/useTheme";
import { showAlert } from "@/lib/alert";
import Colors from "@/constants/colors";

type Service = {
  id: string;
  label: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  color: string;
  category: string;
  description: string;
};

const SERVICES: Service[] = [
  { id: "airtime", label: "Airtime", icon: "phone-portrait", color: "#34C759", category: "Mobile", description: "Top up any network in seconds" },
  { id: "data", label: "Data Bundle", icon: "wifi", color: "#007AFF", category: "Mobile", description: "Buy data for any network" },
  { id: "electricity", label: "Electricity", icon: "flash", color: "#FF9500", category: "Utilities", description: "Pay electricity bills" },
  { id: "water", label: "Water", icon: "water", color: "#5AC8FA", category: "Utilities", description: "Pay water utility bills" },
  { id: "tv", label: "TV / DStv", icon: "tv", color: "#AF52DE", category: "Entertainment", description: "Pay for subscription TV" },
  { id: "internet", label: "Internet", icon: "globe", color: "#00BCD4", category: "Utilities", description: "Pay broadband & ISP bills" },
  { id: "insurance", label: "Insurance", icon: "shield-checkmark", color: "#FF6B35", category: "Finance", description: "Pay insurance premiums" },
  { id: "tax", label: "Tax", icon: "document-text", color: "#8E8E93", category: "Finance", description: "Pay government taxes" },
  { id: "school", label: "School Fees", icon: "school", color: "#5856D6", category: "Education", description: "Pay tuition & school fees" },
  { id: "hospital", label: "Hospital Bills", icon: "medical", color: "#FF3B30", category: "Health", description: "Pay medical bills" },
  { id: "fuel", label: "Fuel", icon: "car", color: "#FF9500", category: "Transport", description: "Prepay fuel vouchers" },
  { id: "rent", label: "Rent", icon: "home", color: "#34C759", category: "Housing", description: "Pay rent digitally" },
];

const CATEGORIES = [...new Set(SERVICES.map(s => s.category))];

export default function AfuServicesApp() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [selectedCat, setSelectedCat] = useState("All");

  const cats = ["All", ...CATEGORIES];
  const filtered = selectedCat === "All" ? SERVICES : SERVICES.filter(s => s.category === selectedCat);

  function handleService(service: Service) {
    showAlert(`${service.label}`, `${service.description}\n\nThis service will be available soon. Stay tuned!`, [
      { text: "OK" },
    ]);
  }

  return (
    <ScrollView
      style={[s.root, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
      showsVerticalScrollIndicator={false}
    >
      <LinearGradient colors={["#1A0A2E", "#0D0517"]} style={s.hero}>
        <Ionicons name="card" size={32} color="#AF52DE" />
        <Text style={s.heroTitle}>AfuServices</Text>
        <Text style={s.heroSub}>Pay bills, utilities, and more across Africa</Text>
      </LinearGradient>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.catRow}>
        {cats.map(cat => (
          <TouchableOpacity key={cat} style={[s.catBtn, { backgroundColor: selectedCat === cat ? "#AF52DE" : colors.inputBg, borderColor: selectedCat === cat ? "#AF52DE" : colors.border }]} onPress={() => setSelectedCat(cat)}>
            <Text style={[s.catText, { color: selectedCat === cat ? "#fff" : colors.textMuted }]}>{cat}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={s.grid}>
        {filtered.map(service => (
          <TouchableOpacity key={service.id} style={[s.serviceCard, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => handleService(service)} activeOpacity={0.8}>
            <View style={[s.serviceIcon, { backgroundColor: service.color + "18" }]}>
              <Ionicons name={service.icon} size={24} color={service.color} />
            </View>
            <Text style={[s.serviceLabel, { color: colors.text }]}>{service.label}</Text>
            <Text style={[s.serviceDesc, { color: colors.textMuted }]} numberOfLines={2}>{service.description}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  hero: { margin: 16, borderRadius: 20, padding: 24, alignItems: "center", gap: 6 },
  heroTitle: { color: "#fff", fontSize: 20, fontFamily: "Inter_700Bold" },
  heroSub: { color: "rgba(255,255,255,0.6)", fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },
  catRow: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  catBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  catText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  grid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 16, gap: 10 },
  serviceCard: { width: "47%", borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, padding: 14, gap: 8 },
  serviceIcon: { width: 46, height: 46, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  serviceLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  serviceDesc: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
});
