/**
 * A bordered row you pick: label on the left, selection mark on the right.
 *
 * This markup was written by hand on three screens — the report reasons, the
 * delete-account reasons and the onboarding gender step — two of them
 * character for character. The only real difference was the mark on the right,
 * which is what `indicator` selects.
 *
 * `role` only changes what assistive tech is told: `radio` announces one-of-many
 * (`selected`), `checkbox` announces a toggle (`checked`). It does not enforce
 * either — the caller owns the state.
 *
 * The plain divider list on the gender *filter* is deliberately NOT this
 * component: it has no border, no surface and a `Divider` between rows, so
 * folding it in here would need a variant that changes everything.
 */

import { Body } from "@/components/common/atoms/Body";
import { Box } from "@/components/common/atoms/Box";
import { Icon } from "@/components/common/atoms/Icon";
import { Tappable } from "@/components/common/atoms/Tappable";
import { useTheme } from "@/components/common/hooks/useTheme";

export type SelectableRowProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
  /** What assistive tech announces. `radio` = one of many (default). */
  role?: "radio" | "checkbox";
  /** `check` = a tick that appears when selected (default). `radio` = a ring that fills. */
  indicator?: "check" | "radio";
};

export function SelectableRow({
  label,
  selected,
  onPress,
  role = "radio",
  indicator = "check",
}: SelectableRowProps) {
  const theme = useTheme();

  return (
    <Tappable
      onPress={onPress}
      accessibilityRole={role}
      accessibilityState={role === "checkbox" ? { checked: selected } : { selected }}
      accessibilityLabel={label}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: theme.spacing.md,
        padding: theme.spacing.lg,
        minHeight: 56,
        borderRadius: theme.radius.md,
        borderWidth: 1,
        borderColor: selected ? theme.color.accent : theme.color.border,
        backgroundColor: selected ? theme.color.accentMuted : theme.color.surface,
      }}
    >
      <Body style={{ flex: 1 }}>{label}</Body>

      {indicator === "check" ? (
        selected ? (
          <Icon
            name={{ ios: "checkmark.circle.fill", android: "check_circle" }}
            size={20}
            color="accent"
          />
        ) : null
      ) : selected ? (
        <Box
          style={{
            width: 24,
            height: 24,
            borderRadius: theme.radius.pill,
            backgroundColor: theme.color.accent,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon name={{ ios: "checkmark", android: "check" }} size={14} color="onAccent" />
        </Box>
      ) : (
        <Box
          style={{
            width: 24,
            height: 24,
            borderRadius: theme.radius.pill,
            borderWidth: 1,
            borderColor: theme.color.borderStrong,
          }}
        />
      )}
    </Tappable>
  );
}
