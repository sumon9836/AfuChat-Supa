import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ScrollView,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/hooks/useTheme";

export default function ResetPasswordNative() {
  const { colors } = useTheme();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    const trimmed = email.trim();
    if (!trimmed) { setError("Please enter your email address."); return; }
    setError("");
    setSubmitting(true);
    try {
      const { error: sbErr } = await supabase.auth.resetPasswordForEmail(trimmed, {
        redirectTo: "https://afuchat.com/update-password",
      });
      if (sbErr) throw sbErr;
      setSent(true);
    } catch (e: any) {
      setError(e.message || "Failed to send reset email.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={[s.root, { backgroundColor: colors.background }]} keyboardShouldPersistTaps="handled">
        <TouchableOpacity style={s.back} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
          <Text style={[s.backTxt, { color: colors.text }]}>Back</Text>
        </TouchableOpacity>

        <View style={[s.iconWrap, { backgroundColor: "rgba(0,188,212,.12)", borderColor: "rgba(0,188,212,.22)" }]}>
          <Ionicons name="key-outline" size={28} color="#00BCD4" />
        </View>

        <Text style={[s.title, { color: colors.text }]}>Forgot password?</Text>
        <Text style={[s.sub, { color: colors.textMuted }]}>
          Enter your email and we'll send a reset link.
        </Text>

        {error !== "" && (
          <View style={s.errBox}>
            <Text style={s.errTxt}>{error}</Text>
          </View>
        )}

        {sent ? (
          <>
            <View style={[s.successBox, { backgroundColor: "rgba(52,199,89,.12)", borderColor: "rgba(52,199,89,.25)" }]}>
              <Text style={{ color: "#34C759", fontSize: 14, textAlign: "center", lineHeight: 22 }}>
                ✅ Reset link sent! Check your inbox and spam folder, then click the link to set your new password.
              </Text>
            </View>
            <TouchableOpacity style={[s.btn, { backgroundColor: "#00BCD4" }]} onPress={() => router.replace("/(auth)/login")}>
              <Text style={s.btnTxt}>Back to sign in</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={[s.inputWrap, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
              <Ionicons name="mail-outline" size={17} color={colors.textMuted} style={{ marginRight: 8 }} />
              <TextInput
                style={[s.input, { color: colors.text }]}
                placeholder="you@example.com"
                placeholderTextColor={colors.textMuted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoFocus
              />
            </View>
            <TouchableOpacity
              style={[s.btn, { backgroundColor: "#00BCD4", opacity: submitting ? 0.6 : 1 }]}
              onPress={handleSubmit}
              disabled={submitting}
              activeOpacity={0.85}
            >
              <Text style={s.btnTxt}>{submitting ? "Sending…" : "Send reset link"}</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flexGrow: 1, padding: 28, paddingTop: 60 },
  back: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 32, alignSelf: "flex-start" },
  backTxt: { fontSize: 16, fontFamily: "Inter_500Medium" },
  iconWrap: { width: 60, height: 60, borderRadius: 18, borderWidth: 1, alignItems: "center", justifyContent: "center", marginBottom: 20 },
  title: { fontSize: 26, fontFamily: "Inter_700Bold", marginBottom: 8 },
  sub: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 22, marginBottom: 28 },
  errBox: { backgroundColor: "rgba(192,57,43,.12)", borderColor: "rgba(192,57,43,.3)", borderWidth: 1, borderRadius: 8, padding: 12, marginBottom: 14 },
  errTxt: { color: "#FF6B6B", fontSize: 13, fontFamily: "Inter_400Regular" },
  successBox: { borderWidth: 1, borderRadius: 10, padding: 16, marginBottom: 20 },
  inputWrap: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 14 },
  input: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  btn: { borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 4 },
  btnTxt: { color: "#000", fontSize: 15, fontFamily: "Inter_700Bold" },
});
