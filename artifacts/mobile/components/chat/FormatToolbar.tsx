/**
 * FormatToolbar
 * Appears above the chat input whenever the user has text selected.
 *
 * Level 1 — formatting: Bold · Italic · Mono · Strike · Underline · ⋮
 * Level 2 — extras (⋮):  Cut · Copy · Quote · Spoiler · ← Back
 *
 * The parent must pass:
 *   visible   — whether to show (true when selection.start < selection.end)
 *   selection — current {start, end} from onSelectionChange
 *   value     — full text input value
 *   onFormat  — called with the new string after applying a format
 *   onClose   — called when the toolbar should hide (selection cleared)
 */
import React, { useEffect, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { useTheme } from "@/hooks/useTheme";
import { useAppAccent } from "@/context/AppAccentContext";

type Props = {
  visible: boolean;
  selection: { start: number; end: number };
  value: string;
  onFormat: (newText: string) => void;
  onClose: () => void;
};

type Level = "format" | "more";

export default function FormatToolbar({
  visible,
  selection,
  value,
  onFormat,
  onClose,
}: Props) {
  const { colors } = useTheme();
  const { accent } = useAppAccent();
  const [level, setLevel] = useState<Level>("format");

  useEffect(() => {
    if (!visible) setLevel("format");
  }, [visible]);

  if (!visible || selection.start >= selection.end) return null;

  const { start, end } = selection;
  const before = value.slice(0, start);
  const selected = value.slice(start, end);
  const after = value.slice(end);

  function wrap(open: string, close: string) {
    onFormat(before + open + selected + close + after);
    onClose();
  }

  const btnStyle = [
    s.btn,
    {
      backgroundColor: colors.surface as string,
      borderColor: ((colors.border as string) ?? "#ccc") + "70",
    },
  ];

  return (
    <View
      style={[
        s.container,
        {
          backgroundColor:
            (colors.backgroundSecondary as string) ??
            (colors.background as string),
          borderColor: ((colors.border as string) ?? "#ccc") + "50",
        },
      ]}
    >
      {level === "format" ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.row}
          keyboardShouldPersistTaps="always"
        >
          <TouchableOpacity
            style={btnStyle}
            onPress={() => wrap("**", "**")}
            activeOpacity={0.7}
          >
            <Text
              style={[
                s.label,
                { color: colors.text as string, fontFamily: "Inter_700Bold" },
              ]}
            >
              Bold
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={btnStyle}
            onPress={() => wrap("_", "_")}
            activeOpacity={0.7}
          >
            <Text
              style={[
                s.label,
                { color: colors.text as string, fontStyle: "italic" },
              ]}
            >
              Italic
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={btnStyle}
            onPress={() => wrap("`", "`")}
            activeOpacity={0.7}
          >
            <Text
              style={[
                s.label,
                {
                  color: accent,
                  fontFamily: Platform.select({
                    web: "monospace",
                    default: "Inter_400Regular",
                  }),
                },
              ]}
            >
              Mono
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={btnStyle}
            onPress={() => wrap("~~", "~~")}
            activeOpacity={0.7}
          >
            <Text
              style={[
                s.label,
                {
                  color: colors.text as string,
                  textDecorationLine: "line-through",
                },
              ]}
            >
              Strikethrough
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={btnStyle}
            onPress={() => wrap("__", "__")}
            activeOpacity={0.7}
          >
            <Text
              style={[
                s.label,
                {
                  color: colors.text as string,
                  textDecorationLine: "underline",
                },
              ]}
            >
              Underline
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[btnStyle, s.moreBtn, { borderColor: accent + "60", backgroundColor: accent + "15" }]}
            onPress={() => setLevel("more")}
            activeOpacity={0.7}
          >
            <Text style={[s.label, { color: accent, fontFamily: "Inter_700Bold", fontSize: 18, lineHeight: 20 }]}>
              ⋮
            </Text>
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.row}
          keyboardShouldPersistTaps="always"
        >
          <TouchableOpacity
            style={btnStyle}
            onPress={async () => {
              await Clipboard.setStringAsync(selected);
              onFormat(before + after);
              onClose();
            }}
            activeOpacity={0.7}
          >
            <Text style={[s.label, { color: colors.text as string }]}>Cut</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={btnStyle}
            onPress={async () => {
              await Clipboard.setStringAsync(selected);
              onClose();
            }}
            activeOpacity={0.7}
          >
            <Text style={[s.label, { color: colors.text as string }]}>Copy</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={btnStyle}
            onPress={() => {
              const lines = selected
                .split("\n")
                .map((l) => "> " + l)
                .join("\n");
              onFormat(before + lines + after);
              onClose();
            }}
            activeOpacity={0.7}
          >
            <Text style={[s.label, { color: colors.text as string }]}>Quote</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={btnStyle}
            onPress={() => wrap("||", "||")}
            activeOpacity={0.7}
          >
            <Text style={[s.label, { color: colors.text as string }]}>Spoiler</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[btnStyle, s.moreBtn, { borderColor: accent + "60", backgroundColor: accent + "15" }]}
            onPress={() => setLevel("format")}
            activeOpacity={0.7}
          >
            <Text style={[s.label, { color: accent, fontFamily: "Inter_600SemiBold" }]}>
              ← Back
            </Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 7,
    marginBottom: 4,
  },
  row: {
    flexDirection: "row",
    paddingHorizontal: 12,
    gap: 8,
    alignItems: "center",
  },
  btn: {
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 18,
    borderWidth: 1.2,
  },
  moreBtn: {
    paddingHorizontal: 14,
  },
  label: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
});
