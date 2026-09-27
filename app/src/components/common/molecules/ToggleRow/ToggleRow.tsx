/**
 * A setting you flip.
 *
 * The whole row is the target, not just the switch — a 51pt switch at the far
 * right of the screen is a small target for a thumb.
 */

import { Body } from "@/components/common/atoms/Body";
import { Box } from "@/components/common/atoms/Box";
import { Caption } from "@/components/common/atoms/Caption";
import { Tappable } from "@/components/common/atoms/Tappable";
import { Toggle } from "@/components/common/atoms/Toggle";
import { useTheme } from "@/components/common/hooks/useTheme";

export type ToggleRowProps = {
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (next: boolean) => void;
  disabled?: boolean;
};

export function ToggleRow({
  label,
  description,
  value,
  onValueChange,
  disabled = false,
}: ToggleRowProps) {
  const theme = useTheme();

  return (
    <Tappable
      onPress={() => onValueChange(!value)}
      disabled={disabled}
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityHint={description}
      accessibilityState={{ checked: value, disabled }}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: theme.spacing.md,
        paddingVertical: theme.spacing.md,
        paddingHorizontal: theme.spacing.xl,
        minHeight: 56,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <Box style={{ flex: 1, gap: theme.spacing.xxs }}>
        <Body>{label}</Body>
        {description ? <Caption>{description}</Caption> : null}
      </Box>

      <Toggle
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        // The switch is decorative here; the row carries the a11y role.
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      />
    </Tappable>
  );
}
