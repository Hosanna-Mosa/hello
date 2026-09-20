/**
 * Dark theme values.
 *
 * IMPORTANT: the client's design system is **light only** — it specifies no
 * dark palette. PLAN §1 requires light and dark from day one, so this is
 * derived from the light tokens rather than supplied, and should be reviewed
 * when the client has a dark spec. See parking log.
 *
 * Not an inversion. Surfaces get *lighter* as they rise, the coral and teal are
 * lifted so they survive on a dark ground, and shadows are nearly inert because
 * elevation reads through surface colour instead.
 */

import type { ThemeTokens } from "./index";

export const dark: ThemeTokens = {
  color: {
    background: "#141210",
    surface: "#1E1B18",
    surfaceElevated: "#262220",
    surfaceSunken: "#100E0C",

    textPrimary: "#F5F2ED",
    textSecondary: "#A3A5A5",
    textTertiary: "#747777",
    textInverse: "#141210",

    accent: "#FF8560",
    accentPressed: "#E06A47",
    accentMuted: "#3A2419",
    onAccent: "#1A1815",

    secondary: "#45C4B5",
    secondaryMuted: "#12302D",
    onSecondary: "#101817",

    success: "#2AD3A7",
    warning: "#FFB930",
    danger: "#FF6B6B",
    onDanger: "#141210",
    info: "#5C9BFF",
    onInfo: "#0D1117",

    border: "#322D29",
    borderStrong: "#4A433D",
    divider: "#2A2522",

    overlay: "rgba(0, 0, 0, 0.50)",
    scrim: "rgba(0, 0, 0, 0.80)",

    stampLike: "#45C4B5",
    stampNope: "#FF6B6B",

    adPlaceholder: "#221F1C",
  },

  // Same hues, inverted: deep muted grounds with light text so they stay
  // readable without glowing on a dark screen.
  chipTones: [
    { background: "#12302D", text: "#7FD9CB" },
    { background: "#3A2419", text: "#FFAE90" },
    { background: "#17253C", text: "#8FB8F5" },
    { background: "#331A26", text: "#F09ABA" },
    { background: "#33280F", text: "#EFC377" },
    { background: "#241E3B", text: "#B5A6F0" },
  ],

  spacing: { xxs: 2, xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 },

  radius: { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, pill: 999 },

  shadow: {
    none: {},
    sm: {
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.3,
      shadowRadius: 2,
      elevation: 1,
    },
    md: {
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 8,
      elevation: 4,
    },
    lg: {
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.55,
      shadowRadius: 24,
      elevation: 12,
    },
  },

  zIndex: { base: 0, card: 10, header: 20, sheet: 30, modal: 40, toast: 50 },
};
