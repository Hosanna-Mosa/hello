/**
 * The type scale, from the design system (§02 Typography).
 *
 * Inter, addressed by role. Sizes and line heights are exactly those in the
 * spec; the `fontFamily` per role is what makes the weight real, because React
 * Native will not synthesise a bold from a separate regular file.
 *
 * Line heights are absolute rather than multipliers so they stay predictable
 * when Dynamic Type scales the font size (A10).
 */

import type { TypeRole, TypeStyle } from "./index";

/**
 * The four bundled Inter weights.
 *
 * Defined here rather than in `index.ts` on purpose. `index.ts` imports this
 * module, so a *value* imported the other way is a real runtime cycle — `FONTS`
 * evaluates as undefined and every text style crashes. Type-only imports are
 * erased and safe; values are not.
 */
export const FONTS = {
  regular: "Inter-Regular",
  medium: "Inter-Medium",
  semibold: "Inter-SemiBold",
  bold: "Inter-Bold",
} as const;

export const typography: Record<TypeRole, TypeStyle> = {
  /** H1 / Display — one per screen: the wizard question, a screen title. */
  display: { fontSize: 32, lineHeight: 40, fontFamily: FONTS.bold, letterSpacing: -0.5 },
  /** H2 / Title — section headings inside a screen. */
  heading: { fontSize: 24, lineHeight: 32, fontFamily: FONTS.bold, letterSpacing: -0.3 },
  /** H3 / Section — card and row titles, a person's name. */
  title: { fontSize: 20, lineHeight: 28, fontFamily: FONTS.semibold },
  /** Body Large — lead paragraphs and primer copy. */
  bodyLarge: { fontSize: 16, lineHeight: 24, fontFamily: FONTS.regular },
  /** Body — default running copy: bios, message bubbles. */
  body: { fontSize: 15, lineHeight: 22, fontFamily: FONTS.regular },
  /** Body, weight-lifted for emphasis inside a paragraph. */
  bodyStrong: { fontSize: 15, lineHeight: 22, fontFamily: FONTS.semibold },
  /** Body Small — field labels, chips, segmented items. */
  label: { fontSize: 13, lineHeight: 18, fontFamily: FONTS.medium },
  /** Caption — metadata: "2 km away", timestamps, counters. */
  caption: { fontSize: 12, lineHeight: 16, fontFamily: FONTS.regular },
  /** Button — kept separate so button weight can move alone. */
  button: { fontSize: 16, lineHeight: 24, fontFamily: FONTS.semibold, letterSpacing: 0.2 },
};
