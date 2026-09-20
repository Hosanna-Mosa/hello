/**
 * The small label above a group of rows or chips.
 *
 * Optional trailing action is the "Reset" / "See all" link that usually sits
 * opposite it.
 */

import { Box } from "@/components/common/atoms/Box";
import { Caption } from "@/components/common/atoms/Caption";
import { Label } from "@/components/common/atoms/Label";
import { Tappable } from "@/components/common/atoms/Tappable";
import { useTheme } from "@/components/common/hooks/useTheme";

export type SectionHeaderProps = {
  title: string;
  actionLabel?: string;
  onActionPress?: () => void;
};

export function SectionHeader({ title, actionLabel, onActionPress }: SectionHeaderProps) {
  const theme = useTheme();

  return (
    <Box
      accessibilityRole="header"
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: theme.spacing.sm,
      }}
    >
      <Caption color="textSecondary" style={{ textTransform: "uppercase", letterSpacing: 0.6 }}>
        {title}
      </Caption>

      {actionLabel && onActionPress ? (
        <Tappable
          onPress={onActionPress}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          hitSlop={12}
        >
          <Label color="accent">{actionLabel}</Label>
        </Tappable>
      ) : null}
    </Box>
  );
}
