/**
 * Loading placeholder for the nearby grid.
 *
 * Shaped like the cards it stands in for — two columns, avatar block, two text
 * lines, two chips. A generic spinner tells the user nothing about what is
 * coming; this makes the wait feel like the screen loading rather than stalling.
 */

import { Box } from "@/components/common/atoms/Box";
import { useTheme } from "@/components/common/hooks/useTheme";
import { Skeleton } from "@/components/common/molecules/Skeleton";

export type NearbySkeletonProps = {
  /** How many placeholder cards. Defaults to 6 — roughly one screenful. */
  count?: number;
};

export function NearbySkeleton({ count = 6 }: NearbySkeletonProps) {
  const theme = useTheme();

  return (
    <Box style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.md }}>
      {Array.from({ length: count }, (_, index) => (
        <Box
          key={index}
          style={{
            width: "47%",
            borderRadius: theme.radius.lg,
            backgroundColor: theme.color.surface,
            borderWidth: 1,
            borderColor: theme.color.border,
            overflow: "hidden",
          }}
        >
          <Skeleton width="100%" height={120} radius={0} />
          <Box style={{ padding: theme.spacing.md, gap: theme.spacing.sm }}>
            <Skeleton width="70%" height={18} />
            <Skeleton width="45%" height={12} />
            <Box style={{ flexDirection: "row", gap: theme.spacing.xs }}>
              <Skeleton width={56} height={24} radius={theme.radius.pill} />
              <Skeleton width={48} height={24} radius={theme.radius.pill} />
            </Box>
          </Box>
        </Box>
      ))}
    </Box>
  );
}
