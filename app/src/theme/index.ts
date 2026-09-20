/**
 * Semantic token contract.
 *
 * Every value used anywhere in the app comes from here. A screen never names a
 * colour, a size or a radius directly — it names a *role*. That is what makes
 * the placeholder palette (PLAN R1) swappable for the client's real design
 * without touching a single component.
 *
 * `light` and `dark` are both typed as `ThemeTokens`, so a value missing from
 * either one is a compile error, not a runtime hole.
 */

import type { TextStyle, ViewStyle } from "react-native";

import { dark } from "./tokens.dark";
import { light } from "./tokens.light";

/** Colours are named by the job they do, never by what they look like. */
export type ColorTokens = {
  /** Page background, behind everything. */
  background: string;
  /** Cards, rows, sheets sitting on the background. */
  surface: string;
  /** A surface that needs to read as lifted (modals, popovers). */
  surfaceElevated: string;
  /** A surface that needs to read as recessed (inputs, wells). */
  surfaceSunken: string;

  /** Body copy and headings. */
  textPrimary: string;
  /** Supporting copy, captions, metadata. */
  textSecondary: string;
  /** Placeholders and disabled copy. */
  textTertiary: string;
  /** Copy on top of a filled accent/danger surface. */
  textInverse: string;

  /** The one brand colour. Used sparingly — at most two elements per screen. */
  accent: string;
  /** Accent in its pressed state. */
  accentPressed: string;
  /** A tinted accent wash for selected chips and highlighted rows. */
  accentMuted: string;
  /** Copy and icons on top of `accent`. */
  onAccent: string;

  /** The teal. Positive states and selections, per the design system. */
  secondary: string;
  /** A tinted teal wash. */
  secondaryMuted: string;
  /** Copy on top of `secondary`. */
  onSecondary: string;

  /** Positive outcomes: match made, request accepted. */
  success: string;
  /** Soft warnings: quota nearly spent, weak connection. */
  warning: string;
  /** Destructive and unsafe: unmatch, block, report. */
  danger: string;
  /** Copy on top of `danger`. */
  onDanger: string;
  /** Neutral informational accents. */
  info: string;
  /** Copy on top of `info`. */
  onInfo: string;

  /** Hairline separators inside a surface. */
  border: string;
  /** A border that must be seen — focused inputs, selected cards. */
  borderStrong: string;
  /** Full-width list dividers. */
  divider: string;

  /** Dimming behind a sheet or modal. */
  overlay: string;
  /** Heavier dim for full-screen takeovers (the call screen). */
  scrim: string;

  /** Deck: the LIKE stamp. */
  stampLike: string;
  /** Deck: the NOPE stamp. */
  stampNope: string;

  /** Inert ad placeholder fill — deliberately unattractive, never accent. */
  adPlaceholder: string;
};

/** An 8pt rhythm with a 4pt half-step. Never use a raw number in a component. */
export type SpacingTokens = {
  /** 2 — hairline nudges only. */
  xxs: number;
  /** 4 */
  xs: number;
  /** 8 */
  sm: number;
  /** 12 */
  md: number;
  /** 16 — the default gutter inside a surface. */
  lg: number;
  /** 24 — the screen side gutter. */
  xl: number;
  /** 32 */
  xxl: number;
  /** 48 — separating major blocks. */
  xxxl: number;
};

export type RadiusTokens = {
  /** 4 — chips inside chips, tiny badges. */
  xs: number;
  /** 8 — inputs, small buttons. */
  sm: number;
  /** 12 — list rows. */
  md: number;
  /** 16 — cards. */
  lg: number;
  /** 24 — sheets and the deck card. */
  xl: number;
  /** 999 — pills and circles. */
  pill: number;
};

/** Elevation as a token, because iOS and Android express it differently. */
export type ShadowTokens = {
  none: ViewStyle;
  /** Resting cards. */
  sm: ViewStyle;
  /** Lifted cards, the top of the deck stack. */
  md: ViewStyle;
  /** Sheets and modals. */
  lg: ViewStyle;
};

/** One ordering for the whole app, so nothing fights over stacking. */
export type ZIndexTokens = {
  base: number;
  card: number;
  header: number;
  sheet: number;
  modal: number;
  toast: number;
};

/**
 * Decorative chip colours.
 *
 * The design gives interest chips a rotating pastel palette rather than one
 * grey. These are not semantic — a chip is not "success" — so they live apart
 * from `ColorTokens` and are chosen by category, deterministically, so the same
 * interest is always the same colour.
 */
export type ChipTone = { background: string; text: string };

export type ThemeTokens = {
  color: ColorTokens;
  chipTones: ChipTone[];
  spacing: SpacingTokens;
  radius: RadiusTokens;
  shadow: ShadowTokens;
  zIndex: ZIndexTokens;
};

/** Text styles are chosen by role, never by size. */
export type TypeRole =
  | "display"
  | "heading"
  | "title"
  | "bodyLarge"
  | "body"
  | "bodyStrong"
  | "label"
  | "caption"
  | "button";

/**
 * Weight is carried by `fontFamily`, not `fontWeight`.
 *
 * Inter ships as four separate static files. React Native does not synthesise a
 * bold from a regular file, so asking for `fontWeight: "700"` on `Inter-Regular`
 * silently renders regular on iOS and a faux-bold on Android. Naming the file is
 * the only reliable way.
 */
export type TypeStyle = Pick<TextStyle, "fontSize" | "lineHeight" | "letterSpacing"> & {
  fontFamily: string;
};


export type ThemeName = "light" | "dark";

/** A resolved theme, as handed to components by `useTheme()`. */
export type Theme = ThemeTokens & { name: ThemeName };

export const themes: Record<ThemeName, ThemeTokens> = { light, dark };

export { dark, light };
export { FONTS, typography } from "./typography";
