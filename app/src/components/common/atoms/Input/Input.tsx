/**
 * The styled text field.
 *
 * Carries the focus and error affordances so no screen has to rebuild them.
 * When a field needs a label, helper text or a counter around it, that is
 * `Field` in Phase 2 — this is just the box you type in.
 */

import { useState } from "react";
import { TextInput, type TextInputProps } from "react-native";

import { useTheme } from "@/components/common/hooks/useTheme";
import { typography } from "@/theme";

export type InputProps = TextInputProps & {
  /** Draw the error border and tint. */
  invalid?: boolean;
};

export function Input({
  invalid = false,
  style,
  onFocus,
  onBlur,
  ...rest
}: InputProps) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);

  const borderColor = invalid
    ? theme.color.danger
    : focused
      ? theme.color.borderStrong
      : theme.color.border;

  return (
    <TextInput
      {...rest}
      onFocus={(event) => {
        setFocused(true);
        onFocus?.(event);
      }}
      onBlur={(event) => {
        setFocused(false);
        onBlur?.(event);
      }}
      placeholderTextColor={theme.color.textTertiary}
      style={[
        typography.body,
        {
          color: theme.color.textPrimary,
          backgroundColor: theme.color.surfaceSunken,
          borderColor,
          borderWidth: 1,
          borderRadius: theme.radius.sm,
          paddingHorizontal: theme.spacing.md,
          // 44pt minimum touch target (A10).
          minHeight: 44,
          paddingVertical: theme.spacing.sm,
        },
        style,
      ]}
    />
  );
}
