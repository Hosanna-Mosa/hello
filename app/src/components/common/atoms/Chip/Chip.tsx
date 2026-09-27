/**
 * An interest tag.
 *
 * The workhorse of this product: with no photographs, interest chips and the
 * bio are what carry a profile card. Selectable in the onboarding picker and
 * the filter sheet, static everywhere else.
 */

import { Label } from "@/components/common/atoms/Label";
import { Tappable } from "@/components/common/atoms/Tappable";
import { useTheme } from "@/components/common/hooks/useTheme";

export type ChipProps = {
  label: string;
  /**
   * Index into the theme's pastel palette. Omit for the neutral chip.
   *
   * Interest chips are coloured by category so the same interest is always the
   * same colour — a chip whose colour changed between screens would read as
   * meaning something.
   */
  tone?: number;
  /** Filled accent when true, outlined when false. */
  selected?: boolean;
  /** Omit to render a static, non-interactive tag. */
  onPress?: () => void;
  disabled?: boolean;
};

export function Chip({ label, tone, selected = false, onPress, disabled = false }: ChipProps) {
  const theme = useTheme();

  const palette = tone === undefined ? undefined : theme.chipTones[tone % theme.chipTones.length];

  const style = {
    backgroundColor: selected
      ? theme.color.accent
      : (palette?.background ?? theme.color.surfaceSunken),
    borderColor: selected ? theme.color.accent : (palette?.background ?? theme.color.border),
    borderWidth: 1,
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    opacity: disabled ? 0.5 : 1,
    alignSelf: "flex-start" as const,
  };

  const text = (
    <Label
      numberOfLines={1}
      color={selected ? "onAccent" : "textPrimary"}
      style={palette && !selected ? { color: palette.text } : undefined}
    >
      {label}
    </Label>
  );

  if (!onPress) {
    return <Tappable disabled style={style}>{text}</Tappable>;
  }

  return (
    <Tappable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      accessibilityLabel={label}
      hitSlop={8}
      style={style}
    >
      {text}
    </Tappable>
  );
}
