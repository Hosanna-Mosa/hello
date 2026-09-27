/**
 * An icon wearing a count.
 *
 * The Home header's likes entry and the Requests segment. Kept distinct from
 * the `Badge` atom: that draws the bubble, this positions one on top of
 * something tappable and owns the combined accessibility label.
 */

import type { ReactNode } from "react";

import { Badge } from "@/components/common/atoms/Badge";
import { Box } from "@/components/common/atoms/Box";
import { Icon, type IconName } from "@/components/common/atoms/Icon";
import { Tappable } from "@/components/common/atoms/Tappable";
import { useTheme } from "@/components/common/hooks/useTheme";
import type { ColorTokens } from "@/theme";

export type CountBadgeProps = {
  count: number;
  /** Supply either an icon or arbitrary content to wear the badge. */
  icon?: IconName;
  children?: ReactNode;
  onPress?: () => void;
  label: string;
  color?: keyof ColorTokens;
};

export function CountBadge({
  count,
  icon,
  children,
  onPress,
  label,
  color = "textPrimary",
}: CountBadgeProps) {
  const theme = useTheme();

  return (
    <Tappable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={count > 0 ? `${label}, ${count} new` : label}
      hitSlop={12}
      style={{ minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" }}
    >
      {icon ? <Icon name={icon} color={color} /> : children}

      <Box style={{ position: "absolute", top: 2, right: 2, zIndex: theme.zIndex.card }}>
        <Badge count={count} />
      </Box>
    </Tappable>
  );
}
