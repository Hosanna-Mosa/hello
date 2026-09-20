/**
 * A labelled input with its helper text and counter.
 *
 * Reserves the helper line whether or not there is a message, so validating a
 * field does not shunt the rest of the form down by one line.
 */

import { Box } from "@/components/common/atoms/Box";
import { Caption } from "@/components/common/atoms/Caption";
import { Input, type InputProps } from "@/components/common/atoms/Input";
import { Label } from "@/components/common/atoms/Label";
import { useTheme } from "@/components/common/hooks/useTheme";

export type FieldProps = InputProps & {
  label: string;
  /** Shown in place of `hint` and turns the field red. */
  error?: string;
  hint?: string;
  /** Renders "12/300" under the field. Pair with `maxLength`. */
  showCounter?: boolean;
};

export function Field({
  label,
  error,
  hint,
  showCounter = false,
  maxLength,
  value,
  ...inputProps
}: FieldProps) {
  const theme = useTheme();
  const message = error ?? hint;

  return (
    <Box style={{ gap: theme.spacing.sm }}>
      <Label color={error ? "danger" : "textSecondary"}>{label}</Label>

      <Input
        {...inputProps}
        value={value}
        maxLength={maxLength}
        invalid={Boolean(error)}
        accessibilityLabel={label}
        accessibilityHint={message}
      />

      <Box style={{ flexDirection: "row", justifyContent: "space-between", minHeight: 17 }}>
        <Caption color={error ? "danger" : "textSecondary"}>{message ?? ""}</Caption>
        {showCounter && maxLength ? (
          <Caption>{`${value?.length ?? 0}/${maxLength}`}</Caption>
        ) : null}
      </Box>
    </Box>
  );
}
