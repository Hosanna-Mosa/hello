/**
 * The 6-digit code field.
 *
 * One real `TextInput` sits invisibly over six drawn boxes, rather than six
 * separate inputs. That is what makes SMS autofill work: iOS only offers the
 * "From Messages" strip to a single field with `textContentType="oneTimeCode"`,
 * and Android's `autoComplete="sms-otp"` behaves the same way. Six inputs give
 * six fields the OS will not fill, and focus-juggling bugs on every backspace.
 */

import { useRef, useState } from "react";

import { BareInput, type BareInputHandle } from "@/components/common/atoms/BareInput";
import { Box } from "@/components/common/atoms/Box";
import { Heading } from "@/components/common/atoms/Heading";
import { Tappable } from "@/components/common/atoms/Tappable";
import { useTheme } from "@/components/common/hooks/useTheme";

export const OTP_LENGTH = 6;

export type OtpInputProps = {
  value: string;
  onChangeText: (next: string) => void;
  /** Fires once the sixth digit lands. */
  onComplete?: (code: string) => void;
  invalid?: boolean;
};

export function OtpInput({ value, onChangeText, onComplete, invalid = false }: OtpInputProps) {
  const theme = useTheme();
  const inputRef = useRef<BareInputHandle>(null);
  const [focused, setFocused] = useState(false);

  const digits = value.padEnd(OTP_LENGTH, " ").split("").slice(0, OTP_LENGTH);
  const activeIndex = Math.min(value.length, OTP_LENGTH - 1);

  function handleChange(next: string) {
    const cleaned = next.replace(/\D/g, "").slice(0, OTP_LENGTH);
    onChangeText(cleaned);
    if (cleaned.length === OTP_LENGTH) onComplete?.(cleaned);
  }

  return (
    <Tappable
      onPress={() => inputRef.current?.focus()}
      accessibilityRole="none"
      accessibilityLabel="Verification code"
      style={{ flexDirection: "row", justifyContent: "space-between", gap: theme.spacing.sm }}
    >
      {digits.map((digit, index) => {
        const isActive = focused && index === activeIndex;

        return (
          <Box
            key={index}
            style={{
              flex: 1,
              aspectRatio: 0.85,
              maxWidth: 56,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: theme.radius.md,
              borderWidth: isActive || invalid ? 2 : 1,
              borderColor: invalid
                ? theme.color.danger
                : isActive
                  ? theme.color.accent
                  : theme.color.border,
              backgroundColor: isActive ? theme.color.accentMuted : theme.color.surface,
            }}
          >
            <Heading level="heading">{digit.trim()}</Heading>
          </Box>
        );
      })}

      <BareInput
        ref={inputRef}
        value={value}
        onChangeText={handleChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        keyboardType="number-pad"
        maxLength={OTP_LENGTH}
        autoFocus
        // The two props that make OS autofill offer the code.
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        accessibilityLabel="Verification code"
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          opacity: 0,
        }}
      />
    </Tappable>
  );
}
