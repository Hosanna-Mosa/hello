/**
 * Interests as a sentence, not as tags.
 *
 * The READ-ONLY treatment of an interest list. Selecting them is
 * `InterestPicker`, which draws its own chips from the `Chip` atom. Operator decision, 2026-09-26: a profile
 * reads better as "Hiking · Board games · Live music" than as a wall of
 * coloured pills, and with no photographs anywhere the interests are the main
 * thing a card has to say.
 *
 * A middot rather than commas: these are labels, not clauses, and several of
 * them contain a comma's worth of pause already ("Film, TV and streaming").
 * It is also the separator the app already uses ("Voice call · 2:14").
 */

import { Body } from "@/components/common/atoms/Body";
import type { Interest } from "@/services/types";

export type InterestTextProps = {
  interests: readonly Interest[];
  /** Show only the first N. */
  max?: number;
  /**
   * Append "+3" when truncated.
   *
   * Off on the grid tile, where the row is clipped to one line anyway and the
   * marker would be the part that survives.
   */
  overflow?: boolean;
  /**
   * Keep it to one line.
   *
   * The grid tile needs this: a wrapped row made one card taller than its
   * neighbour, which is the uneven-grid bug that cost a Phase 5 pass.
   */
  numberOfLines?: number;
  /** Defaults to secondary — this is supporting text, not the headline. */
  color?: "textPrimary" | "textSecondary" | "accent";
};

const SEPARATOR = " · ";

export function InterestText({
  interests,
  max,
  overflow = true,
  numberOfLines,
  color = "textSecondary",
}: InterestTextProps) {
  if (interests.length === 0) return null;

  const shown = max === undefined ? interests : interests.slice(0, max);
  const hidden = interests.length - shown.length;

  const text =
    shown.map((interest) => interest.label).join(SEPARATOR) +
    (overflow && hidden > 0 ? `${SEPARATOR}+${hidden}` : "");

  return (
    <Body color={color} numberOfLines={numberOfLines}>
      {text}
    </Body>
  );
}
