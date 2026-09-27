/**
 * One standard, as a card: tinted icon, title, one line underneath.
 *
 * Straight from the design. The tint comes from `theme.chipTones`, the same
 * six-pair palette the interest chips use, so the safety screen and a profile
 * card feel like the same product rather than two designers' work.
 */

import { Body } from "@/components/common/atoms/Body";
import { Box } from "@/components/common/atoms/Box";
import { Icon, type IconName } from "@/components/common/atoms/Icon";
import { Label } from "@/components/common/atoms/Label";
import { Tappable } from "@/components/common/atoms/Tappable";
import { useTheme } from "@/components/common/hooks/useTheme";

export type SafetyCardProps = {
  title: string;
  body: string;
  icon: IconName;
  /** Index into the theme's chip tones. */
  tone?: number;
  onPress?: () => void;
};

export function SafetyCard({ title, body, icon, tone = 0, onPress }: SafetyCardProps) {
  const theme = useTheme();
  const palette = theme.chipTones[tone % theme.chipTones.length];

  return (
    <Tappable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={`${title}. ${body}`}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: theme.spacing.lg,
        padding: theme.spacing.lg,
        borderRadius: theme.radius.lg,
        backgroundColor: theme.color.surface,
        borderWidth: 1,
        borderColor: theme.color.border,
      }}
    >
      <Box
        style={{
          width: 48,
          height: 48,
          borderRadius: theme.radius.pill,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: palette.background,
        }}
      >
        {/*
          Icon colour is a theme token, so it cannot take the chip tone's own
          foreground directly — the tinted circle carries the colour and the
          glyph stays legible against it either way.
        */}
        <Icon name={icon} size={24} color="textPrimary" />
      </Box>

      <Box style={{ flex: 1, gap: theme.spacing.xxs }}>
        <Label>{title}</Label>
        <Body color="textSecondary">{body}</Body>
      </Box>
    </Tappable>
  );
}
