/**
 * Loading placeholder for the deck.
 *
 * Card-shaped, not a spinner: the deck is one big object, and a spinner in the
 * middle of an empty screen gives no sense of what is arriving. This shows the
 * shape that is coming — image block, name, chips, bio.
 */

import { Box } from "@/components/common/atoms/Box";
import { useTheme } from "@/components/common/hooks/useTheme";
import { Skeleton } from "@/components/common/molecules/Skeleton";

export function DeckSkeleton() {
  const theme = useTheme();

  return (
    <Box
      style={{
        flex: 1,
        borderRadius: theme.radius.xl,
        backgroundColor: theme.color.surface,
        borderWidth: 1,
        borderColor: theme.color.border,
        overflow: "hidden",
      }}
    >
      <Skeleton width="100%" height={0} radius={0} />
      <Box style={{ flex: 1 }}>
        <Skeleton width="100%" height={9999} radius={0} />
      </Box>

      <Box style={{ padding: theme.spacing.xl, gap: theme.spacing.md }}>
        <Skeleton width="60%" height={28} />
        <Box style={{ flexDirection: "row", gap: theme.spacing.sm }}>
          <Skeleton width={72} height={28} radius={theme.radius.pill} />
          <Skeleton width={60} height={28} radius={theme.radius.pill} />
          <Skeleton width={88} height={28} radius={theme.radius.pill} />
        </Box>
        <Skeleton width="100%" height={16} />
        <Skeleton width="80%" height={16} />
      </Box>
    </Box>
  );
}
