/**
 * Shared design tokens — ONE source of truth for the entire app.
 * Import from here so every screen uses identical sizes, weights, and spacing.
 */

export const T = {
  // ── Typography ─────────────────────────────────────────────────────────────
  h1:       { fontSize: 28, fontFamily: "Inter_700Bold",    letterSpacing: -0.5, lineHeight: 34 },
  h2:       { fontSize: 22, fontFamily: "Inter_700Bold",    letterSpacing: -0.3, lineHeight: 28 },
  h3:       { fontSize: 19, fontFamily: "Inter_700Bold",    letterSpacing: -0.2, lineHeight: 24 },
  title:    { fontSize: 17, fontFamily: "Inter_600SemiBold", letterSpacing: -0.2, lineHeight: 22 },
  body:     { fontSize: 15, fontFamily: "Inter_400Regular", lineHeight: 22 },
  bodyMed:  { fontSize: 15, fontFamily: "Inter_500Medium",  lineHeight: 22 },
  bodySemi: { fontSize: 15, fontFamily: "Inter_600SemiBold", lineHeight: 22 },
  caption:  { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  captionMed: { fontSize: 13, fontFamily: "Inter_500Medium", lineHeight: 18 },
  label:    { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.7, lineHeight: 16 },
  micro:    { fontSize: 10, fontFamily: "Inter_500Medium",  lineHeight: 14 },

  // ── Spacing ────────────────────────────────────────────────────────────────
  pageH:    20,   // horizontal page padding
  itemV:    14,   // vertical padding inside list items
  sectionV: 24,   // vertical gap between page sections
  sepLeft:  54,   // left indent for separators under icon-label rows

  // ── Icon list rows ─────────────────────────────────────────────────────────
  iconSize:    20,
  iconWrapW:   36,
  iconWrapH:   36,
  iconWrapR:   9,
} as const;
