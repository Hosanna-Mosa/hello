/**
 * Light theme values — the client's design system.
 *
 * R1 is closed: these are no longer placeholders. Every hex here comes from
 * `design/design-system.png` (§01 Colour Palette). Anything the design system
 * does not name is derived from what it does, and marked below.
 *
 * Warm neutrals with a coral primary and a teal secondary — deliberately not
 * the pink/purple gradient that reads as a dating app.
 */

import type { ThemeTokens } from "./index";

export const light: ThemeTokens = {
  color: {
    // --- §01, named directly ---
    background: "#FAF8F5", // Off White — app background
    surface: "#FFFFFF", // White — cards, sheets
    surfaceElevated: "#FFFFFF",
    surfaceSunken: "#F1EDEA", // Muted — muted backgrounds

    textPrimary: "#1A1815", // Text
    textSecondary: "#686B6B", // Text Secondary
    textTertiary: "#9A9C9C", // derived: one step lighter than secondary
    textInverse: "#FFFFFF",

    accent: "#F2724B", // Primary — coral, primary actions
    accentPressed: "#D95C37", // derived: the pressed state in §05
    accentMuted: "#FCE9E2", // derived: the selected-row wash in step3/step4
    onAccent: "#FFFFFF",

    secondary: "#2FA89B", // Secondary — teal, positive states, selections
    secondaryMuted: "#E3F4F1", // derived
    onSecondary: "#FFFFFF",

    success: "#10B891", // Semantic
    warning: "#F59E0B", // Semantic
    danger: "#EF4444", // Semantic — Error
    onDanger: "#FFFFFF",
    info: "#3882F6", // Semantic
    onInfo: "#FFFFFF",

    border: "#E6E2DD", // Divider — borders, dividers
    borderStrong: "#CFC9C2", // derived: a border that must be seen
    divider: "#E6E2DD",

    overlay: "rgba(26, 24, 21, 0.40)",
    scrim: "rgba(26, 24, 21, 0.72)",

    // Deck stamps reuse the semantic pair rather than inventing colours.
    stampLike: "#2FA89B",
    stampNope: "#EF4444",

    adPlaceholder: "#F1EDEA",
  },

  // Pastel chip palette, from the design system (§07 Chips/Tags).
  chipTones: [
    { background: "#E3F4F1", text: "#18645A" }, // teal
    { background: "#FDE8E2", text: "#A8412A" }, // coral
    { background: "#E4EEFC", text: "#25508F" }, // blue
    { background: "#FBE7EF", text: "#8F2B52" }, // pink
    { background: "#FDF0DC", text: "#8A5B12" }, // amber
    { background: "#EDE8FA", text: "#4B3A8F" }, // violet
  ],

  // §10 — 8px grid: 4, 8, 12, 16, 24, 32, 48.
  spacing: { xxs: 2, xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 },

  // §11 — 4, 8, 12, 16, 20. `pill` is derived for circles and chips.
  radius: { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, pill: 999 },

  // §12 — Low / Medium / High.
  shadow: {
    none: {},
    sm: {
      shadowColor: "#1A1815",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 2,
      elevation: 1,
    },
    md: {
      shadowColor: "#1A1815",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
    },
    lg: {
      shadowColor: "#1A1815",
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.16,
      shadowRadius: 24,
      elevation: 12,
    },
  },

  zIndex: { base: 0, card: 10, header: 20, sheet: 30, modal: 40, toast: 50 },
};
