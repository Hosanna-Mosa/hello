/**
 * A small count, worn on something else.
 *
 * Unread messages, pending requests, inbound likes. Caps at 99+ so a runaway
 * count cannot stretch the tab bar.
 */

import { Box } from "@/components/common/atoms/Box";
import { Caption } from "@/components/common/atoms/Caption";
import { useTheme } from "@/components/common/hooks/useTheme";

export type BadgeProps = {
  count: number;
  /** Render as a bare dot with no number. */
  dot?: boolean;
};

export function Badge({ count, dot = false }: BadgeProps) {
  const theme = useTheme();

  if (count <= 0) return null;

  if (dot) {
    return (
      <Box
        accessibilityLabel={`${count} unread`}
        style={{
          width: theme.spacing.sm,
          height: theme.spacing.sm,
          borderRadius: theme.radius.pill,
          backgroundColor: theme.color.accent,
        }}
      />
    );
  }

  return (
    <Box
      accessible
      accessibilityLabel={`${count} unread`}
      style={{
        minWidth: 20,
        height: 20,
        borderRadius: theme.radius.pill,
        backgroundColor: theme.color.accent,
        paddingHorizontal: theme.spacing.xs,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Caption color="onAccent">{count > 99 ? "99+" : String(count)}</Caption>
    </Box>
  );
}
