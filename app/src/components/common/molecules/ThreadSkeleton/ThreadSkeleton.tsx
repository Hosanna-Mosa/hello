/**
 * Loading placeholders for the conversation list.
 *
 * Shaped like `ThreadRow` — a circle, two lines, a short time block — so the
 * list does not reflow when the real rows arrive. A generic grey box would
 * jump, which is the thing a skeleton exists to prevent.
 */

import { Box } from "@/components/common/atoms/Box";
import { useTheme } from "@/components/common/hooks/useTheme";
import { Skeleton } from "@/components/common/molecules/Skeleton";

export type ThreadSkeletonProps = {
  count?: number;
};

export function ThreadSkeleton({ count = 6 }: ThreadSkeletonProps) {
  const theme = useTheme();

  return (
    <Box style={{ gap: theme.spacing.lg }}>
      {Array.from({ length: count }, (_, index) => (
        <Box
          key={index}
          style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.md }}
        >
          <Skeleton width={44} height={44} radius={theme.radius.pill} />

          <Box style={{ flex: 1, gap: theme.spacing.sm }}>
            <Skeleton width="45%" height={14} />
            <Skeleton width="80%" height={12} />
          </Box>

          <Skeleton width={28} height={10} />
        </Box>
      ))}
    </Box>
  );
}
