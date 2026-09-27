/**
 * `TextInput` with no chrome at all — no border, no background, no padding.
 *
 * For fields that are already inside something that draws the box: the OTP
 * code cells, the chat composer, the borderless name field on onboarding.
 * It still binds the theme's text and placeholder colours, because those are
 * never a per-screen decision.
 */

import type { Ref } from "react";
import { TextInput, type TextInputProps } from "react-native";

import { useTheme } from "@/components/common/hooks/useTheme";
import { typography } from "@/theme";

/**
 * The imperative handle a `ref` on this atom gives you.
 *
 * Re-exported so a call site can type its ref without importing `TextInput`
 * from react-native — which the lint guard forbids, correctly, since naming the
 * primitive is the first step to rendering one.
 */
export type BareInputHandle = TextInput;

export type BareInputProps = TextInputProps & {
  /**
   * Forwarded to the underlying input.
   *
   * Needed because some call sites must focus the field imperatively — the OTP
   * screen taps six drawn boxes to focus one hidden input. Without this the
   * screen would have to import the bare primitive, which the lint guard
   * (rightly) forbids.
   */
  ref?: Ref<TextInput>;
};

export function BareInput({ style, ref, ...rest }: BareInputProps) {
  const theme = useTheme();

  return (
    <TextInput
      ref={ref}
      {...rest}
      placeholderTextColor={theme.color.textTertiary}
      style={[typography.body, { color: theme.color.textPrimary }, style]}
    />
  );
}
