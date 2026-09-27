/**
 * "Today", "Yesterday", "12 Mar" — between two days' messages.
 *
 * Centred on a rule so it reads as a break in time rather than as a message
 * nobody sent.
 */

import { Box } from "@/components/common/atoms/Box";
import { Caption } from "@/components/common/atoms/Caption";
import { useTheme } from "@/components/common/hooks/useTheme";

export type DaySeparatorProps = {
  label: string;
};

export function DaySeparator({ label }: DaySeparatorProps) {
  const theme = useTheme();

  return (
    <Box
      accessibilityRole="header"
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: theme.spacing.md,
        paddingVertical: theme.spacing.md,
      }}
    >
      <Box style={{ flex: 1, height: 1, backgroundColor: theme.color.divider }} />
      <Caption color="textTertiary">{label}</Caption>
      <Box style={{ flex: 1, height: 1, backgroundColor: theme.color.divider }} />
    </Box>
  );
}
