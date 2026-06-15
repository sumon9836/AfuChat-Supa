/**
 * /join/[id] — Group/Channel invite landing screen (Expo web)
 *
 * When someone clicks an afuchat.com/join/:id link on a device that already
 * has the Expo web app open, this screen intercepts the route, fetches the
 * group details, and navigates to the proper /group/:id screen.
 */
import { useEffect, useState } from "react";
import { ActivityIndicator, Text, View, StyleSheet } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/hooks/useTheme";

export default function JoinRedirect() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const [status, setStatus] = useState<"loading" | "not_found">("loading");

  useEffect(() => {
    if (!id) { setStatus("not_found"); return; }

    supabase
      .from("chats")
      .select("id, name, is_group, is_channel")
      .eq("id", id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          router.replace(`/group/${id}`);
        } else {
          setStatus("not_found");
        }
      });
  }, [id]);

  return (
    <View style={[s.root, { backgroundColor: colors.background }]}>
      {status === "loading" ? (
        <>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={[s.label, { color: colors.textSecondary }]}>Opening group…</Text>
        </>
      ) : (
        <Text style={[s.label, { color: colors.textMuted }]}>Group not found or is private.</Text>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16 },
  label: { fontSize: 15, fontFamily: "Inter_400Regular" },
});
