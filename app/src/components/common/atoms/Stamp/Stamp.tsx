/**
 * The LIKE / NOPE overlay on a deck card.
 *
 * Phase 6 drives `opacity` from drag distance on the UI thread, so this stays a
 * plain presentational component: it renders the mark, it does not decide when
 * the mark is visible.
 *
 * Deliberately not called "PASS" — the word on the card is NOPE, and the
 * decision is never framed romantically (PLAN §1).
 */

import { Box } from "@/components/common/atoms/Box";
import { Heading } from "@/components/common/atoms/Heading";
import { useTheme } from "@/components/common/hooks/useTheme";

export type StampKind = "like" | "nope";

export type StampProps = {
  kind: StampKind;
};

export function Stamp({ kind }: StampProps) {
  const theme = useTheme();

  const color = kind === "like" ? theme.color.stampLike : theme.color.stampNope;

  return (
    <Box
      accessibilityElementsHidden
      importantForAccessibility="no"
      style={{
        borderColor: color,
        borderWidth: 4,
        borderRadius: theme.radius.sm,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.xs,
        transform: [{ rotate: kind === "like" ? "-15deg" : "15deg" }],
        alignSelf: "flex-start",
      }}
    >
      <Heading level="heading" style={{ color }}>
        {kind === "like" ? "LIKE" : "NOPE"}
      </Heading>
    </Box>
  );
}
