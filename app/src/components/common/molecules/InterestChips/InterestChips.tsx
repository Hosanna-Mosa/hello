/**
 * A wrapped set of interest tags.
 *
 * With no photographs anywhere, this is what actually carries a profile card,
 * so it appears on the card, the deck, the full profile, onboarding and the
 * filter sheet. `max` truncates for the card; `selectable` turns it into the
 * picker.
 */

import { Box } from "@/components/common/atoms/Box";
import { Caption } from "@/components/common/atoms/Caption";
import { Chip } from "@/components/common/atoms/Chip";
import { useTheme } from "@/components/common/hooks/useTheme";

export type Interest = { id: string; label: string; category?: string };

/**
 * Category → palette index, hashed so it is stable without importing the
 * taxonomy. The same category always lands on the same colour.
 */
function toneFor(interest: Interest, fallbackIndex: number): number {
  const key = interest.category ?? interest.id;
  return [...key].reduce((sum, ch) => sum + ch.charCodeAt(0), fallbackIndex);
}

export type InterestChipsProps = {
  interests: readonly Interest[];
  /** Colour the chips by category. Off for pickers, where selection is the signal. */
  coloured?: boolean;
  /** Ids currently selected. Omit for a read-only display. */
  selectedIds?: readonly string[];
  onToggle?: (id: string) => void;
  /** Show only the first N. */
  max?: number;
  /** Show the "+3" marker when truncated. Off on the grid tile, per the design. */
  overflow?: boolean;
  /**
   * Keep every chip on one row.
   *
   * The grid tile needs this: a wrapped chip row made one card taller than its
   * neighbour, which is the uneven-grid bug. Clipping a long label is a much
   * smaller problem than a ragged grid.
   */
  singleLine?: boolean;
  /** Stop selecting once this many are chosen. */
  selectionLimit?: number;
};

export function InterestChips({
  interests,
  coloured = false,
  selectedIds,
  onToggle,
  max,
  overflow = true,
  singleLine = false,
  selectionLimit,
}: InterestChipsProps) {
  const theme = useTheme();

  const visible = max ? interests.slice(0, max) : interests;
  const hiddenCount = max ? interests.length - visible.length : 0;

  const atLimit =
    selectionLimit !== undefined && (selectedIds?.length ?? 0) >= selectionLimit;

  return (
    <Box
      style={{
        flexDirection: "row",
        flexWrap: singleLine ? "nowrap" : "wrap",
        gap: theme.spacing.sm,
        overflow: "hidden",
      }}
    >
      {visible.map((interest, index) => {
        const selected = selectedIds?.includes(interest.id) ?? false;

        return (
          <Chip
            key={interest.id}
            label={interest.label}
            tone={coloured ? toneFor(interest, index) : undefined}
            selected={selected}
            onPress={onToggle ? () => onToggle(interest.id) : undefined}
            // At the limit, only already-selected chips stay tappable so the
            // user can swap one out rather than being stuck.
            disabled={atLimit && !selected}
          />
        );
      })}

      {overflow && hiddenCount > 0 ? (
        <Box style={{ justifyContent: "center", paddingHorizontal: theme.spacing.sm }}>
          <Caption>{`+${hiddenCount}`}</Caption>
        </Box>
      ) : null}
    </Box>
  );
}
