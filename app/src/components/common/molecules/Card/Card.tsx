/**
 * A group of rows, in a bordered container.
 *
 * Extracted in Phase 10: this exact block — surface, hairline border, `lg`
 * radius, clipped — was written out by hand six times across the settings tree
 * and the profile menu. Six copies means six places to miss when the grouping
 * style changes.
 *
 * `overflow: "hidden"` is load-bearing, not decorative: the rows inside carry
 * their own background, and without the clip their square corners poke through
 * the rounded ones.
 *
 * Dividers are deliberately NOT drawn automatically. The six call sites do not
 * agree on them — Account has none at all between its three rows, and Legal
 * uses a full-bleed line because its rows have no icon gutter to clear. A Card
 * that inserted them would be quietly changing two screens while claiming to
 * deduplicate a third.
 */

import type { ReactNode } from "react";

import { Box } from "@/components/common/atoms/Box";
import { useTheme } from "@/components/common/hooks/useTheme";

export type CardProps = {
  children: ReactNode;
};

export function Card({ children }: CardProps) {
  const theme = useTheme();

  return (
    <Box
      style={{
        borderRadius: theme.radius.lg,
        borderWidth: 1,
        borderColor: theme.color.border,
        backgroundColor: theme.color.surface,
        overflow: "hidden",
      }}
    >
      {children}
    </Box>
  );
}
