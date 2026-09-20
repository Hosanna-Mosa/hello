/**
 * The general list row: something on the left, two lines of text, something on
 * the right.
 *
 * Backs the conversation list, the blocked list and the notifications feed.
 * `leading` takes an Avatar or an Icon; the row does not care which.
 */

import type { ReactNode } from "react";

import { Body } from "@/components/common/atoms/Body";
import { Box } from "@/components/common/atoms/Box";
import { Caption } from "@/components/common/atoms/Caption";
import { Tappable } from "@/components/common/atoms/Tappable";
import { useTheme } from "@/components/common/hooks/useTheme";

export type ListRowProps = {
  title: string;
  subtitle?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  onPress?: () => void;
  /** Dim the row — used for an unmatched or deactivated person. */
  muted?: boolean;
};

export function ListRow({
  title,
  subtitle,
  leading,
  trailing,
  onPress,
  muted = false,
}: ListRowProps) {
  const theme = useTheme();

  return (
    <Tappable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={subtitle ? `${title}. ${subtitle}` : title}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: theme.spacing.md,
        paddingVertical: theme.spacing.md,
        paddingHorizontal: theme.spacing.xl,
        minHeight: 64,
        opacity: muted ? 0.5 : 1,
      }}
    >
      {leading}

      <Box style={{ flex: 1, gap: theme.spacing.xxs }}>
        <Body strong numberOfLines={1}>
          {title}
        </Body>
        {subtitle ? <Caption numberOfLines={1}>{subtitle}</Caption> : null}
      </Box>

      {trailing}
    </Tappable>
  );
}
