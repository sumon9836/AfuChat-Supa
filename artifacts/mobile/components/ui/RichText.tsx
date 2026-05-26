/**
 * RichText — inline-formatted text renderer.
 *
 * Supported markdown-style markers (user messages & chat bubbles):
 *   **text**   → Bold
 *   _text_     → Italic
 *   `text`     → Mono / code
 *   ~~text~~   → Strikethrough
 *   __text__   → Underline
 *   ||text||   → Spoiler (hidden; tap to reveal)
 *
 * Also renders URLs, @mentions, and #hashtags as tappable links.
 */
import React, { useState } from "react";
import { Linking, StyleSheet, Text } from "react-native";
import { router } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useAppAccent } from "@/context/AppAccentContext";
import { useOpenLink } from "@/lib/useOpenLink";

// ─── Types ────────────────────────────────────────────────────────────────────

type SpanType =
  | "text"
  | "bold"
  | "italic"
  | "mono"
  | "strike"
  | "underline"
  | "spoiler"
  | "url"
  | "mention"
  | "hashtag"
  | "email";

type Span = {
  text: string;
  type: SpanType;
};

// ─── Parser ───────────────────────────────────────────────────────────────────

/**
 * Order matters: longer / higher-priority patterns first.
 *   **  before  _   (bold vs italic)
 *   __  before  _   (underline vs italic)
 *   ~~              (strikethrough)
 *   ||              (spoiler)
 *   `               (mono)
 *   _               (italic — must come after __ and **)
 *   URLs / email / mention / hashtag
 */
const INLINE_RE =
  /(\*\*[^*\n]+?\*\*|__[^_\n]+?__|~~[^~\n]+?~~|\|\|[^\|\n]+?\|\||`[^`\n]+?`|_[^_\n]+?_|https?:\/\/[^\s<)"\]]+|www\.[^\s<)"\]]+\.[^\s<)"\]]+|[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}|@[a-zA-Z0-9_]{1,30}|#[a-zA-Z0-9_]{2,30})/g;

function parseRichText(text: string): Span[] {
  if (!text) return [];
  const spans: Span[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  INLINE_RE.lastIndex = 0;

  while ((match = INLINE_RE.exec(text)) !== null) {
    if (match.index > last) {
      spans.push({ text: text.slice(last, match.index), type: "text" });
    }
    const m = match[0];
    if (m.startsWith("**") && m.endsWith("**")) {
      spans.push({ text: m.slice(2, -2), type: "bold" });
    } else if (m.startsWith("__") && m.endsWith("__")) {
      spans.push({ text: m.slice(2, -2), type: "underline" });
    } else if (m.startsWith("~~") && m.endsWith("~~")) {
      spans.push({ text: m.slice(2, -2), type: "strike" });
    } else if (m.startsWith("||") && m.endsWith("||")) {
      spans.push({ text: m.slice(2, -2), type: "spoiler" });
    } else if (m.startsWith("`") && m.endsWith("`")) {
      spans.push({ text: m.slice(1, -1), type: "mono" });
    } else if (m.startsWith("_") && m.endsWith("_")) {
      spans.push({ text: m.slice(1, -1), type: "italic" });
    } else if (m.startsWith("@")) {
      spans.push({ text: m, type: "mention" });
    } else if (m.startsWith("#")) {
      spans.push({ text: m, type: "hashtag" });
    } else if (m.includes("@") && !m.startsWith("http")) {
      spans.push({ text: m, type: "email" });
    } else {
      spans.push({ text: m, type: "url" });
    }
    last = match.index + m.length;
  }

  if (last < text.length) {
    spans.push({ text: text.slice(last), type: "text" });
  }
  if (spans.length === 0) {
    spans.push({ text, type: "text" });
  }
  return spans;
}

// ─── Spoiler span ─────────────────────────────────────────────────────────────

function SpoilerSpan({
  text,
  baseColor,
}: {
  text: string;
  baseColor: string;
}) {
  const [revealed, setRevealed] = useState(false);
  return (
    <Text
      onPress={() => setRevealed((v) => !v)}
      style={{
        color: revealed ? baseColor : "transparent",
        backgroundColor: revealed ? "transparent" : baseColor + "55",
        borderRadius: 3,
      }}
    >
      {text}
    </Text>
  );
}

// ─── RichText ─────────────────────────────────────────────────────────────────

type RichTextProps = {
  children: string;
  style?: any;
  linkColor?: string;
  numberOfLines?: number;
  selectable?: boolean;
};

export function RichText({
  children,
  style,
  linkColor,
  numberOfLines,
  selectable,
}: RichTextProps) {
  const { accent } = useAppAccent();
  const openLink = useOpenLink();
  const effectiveLinkColor = linkColor ?? accent;

  function handlePress(span: Span) {
    switch (span.type) {
      case "url": {
        let url = span.text;
        if (!url.startsWith("http")) url = "https://" + url;
        openLink(url);
        break;
      }
      case "email":
        Linking.openURL(`mailto:${span.text}`).catch(() => {});
        break;
      case "mention": {
        const handle = span.text.replace("@", "");
        supabase
          .from("profiles")
          .select("id")
          .eq("handle", handle)
          .maybeSingle()
          .then(({ data }) => {
            if (data?.id) {
              router.push({ pathname: "/contact/[id]", params: { id: data.id } });
            }
          });
        break;
      }
      case "hashtag": {
        const tag = span.text.replace("#", "");
        router.push({ pathname: "/(tabs)/search", params: { tag } });
        break;
      }
    }
  }

  if (!children) return <Text style={style} selectable={selectable}>{""}</Text>;

  const spans = parseRichText(children);
  const baseColor =
    typeof style?.color === "string"
      ? style.color
      : (style?.[style?.length - 1]?.color ?? "#000");

  return (
    <Text style={style} numberOfLines={numberOfLines} selectable={selectable}>
      {spans.map((span, i) => {
        switch (span.type) {
          case "bold":
            return (
              <Text key={i} style={styles.bold} selectable={selectable}>
                {span.text}
              </Text>
            );
          case "italic":
            return (
              <Text key={i} style={styles.italic} selectable={selectable}>
                {span.text}
              </Text>
            );
          case "mono":
            return (
              <Text
                key={i}
                style={[styles.mono, { color: effectiveLinkColor }]}
                selectable={selectable}
              >
                {span.text}
              </Text>
            );
          case "strike":
            return (
              <Text key={i} style={styles.strike} selectable={selectable}>
                {span.text}
              </Text>
            );
          case "underline":
            return (
              <Text key={i} style={styles.underline} selectable={selectable}>
                {span.text}
              </Text>
            );
          case "spoiler":
            return (
              <SpoilerSpan key={i} text={span.text} baseColor={baseColor} />
            );
          case "url":
          case "email":
          case "mention":
          case "hashtag":
            return (
              <Text
                key={i}
                style={[
                  styles.link,
                  { color: effectiveLinkColor },
                  span.type === "mention" && styles.mention,
                ]}
                onPress={() => handlePress(span)}
                selectable={selectable}
              >
                {span.text}
              </Text>
            );
          default:
            return (
              <Text key={i} selectable={selectable}>
                {span.text}
              </Text>
            );
        }
      })}
    </Text>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  bold: {
    fontFamily: "Inter_700Bold",
  },
  italic: {
    fontStyle: "italic",
  },
  mono: {
    fontFamily: "monospace" as any,
    fontSize: 13,
  },
  strike: {
    textDecorationLine: "line-through",
  },
  underline: {
    textDecorationLine: "underline",
  },
  link: {
    fontFamily: "Inter_500Medium",
  },
  mention: {
    fontFamily: "Inter_600SemiBold",
  },
});
