import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";

import {
  Body,
  Box,
  Button,
  Caption,
  Heading,
  Icon,
  KeyboardAware,
  Label,
  SafeArea,
  Tappable,
  useTheme,
} from "@/components/common";
import { OTP_LENGTH, OtpInput } from "@/components/otp/organisms/OtpInput";
import { copy } from "@/copy";
import { useSessionStore } from "@/stores/session.store";

const RESEND_SECONDS = 30;

export default function OtpScreen() {
  const theme = useTheme();
  const { dial, number } = useLocalSearchParams<{ dial?: string; number?: string }>();
  const verifyCode = useSessionStore((state) => state.verifyCode);

  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [remaining, setRemaining] = useState(RESEND_SECONDS);

  useEffect(() => {
    if (remaining <= 0) return;
    const timer = setTimeout(() => setRemaining((n) => n - 1), 1000);
    return () => clearTimeout(timer);
  }, [remaining]);

  async function submit(value: string) {
    setVerifying(true);
    setError(null);
    try {
      // Success flips the session to "onboarding", and the root layout's
      // Stack.Protected guard swaps the group. No router.replace needed.
      await verifyCode(value);
    } catch {
      setError(copy.auth.otpInvalid);
      setCode("");
    } finally {
      setVerifying(false);
    }
  }

  return (
    <SafeArea style={{ flex: 1, backgroundColor: theme.color.background }}>
      <KeyboardAware style={{ flex: 1 }}>
        <Box style={{ flex: 1, paddingHorizontal: theme.spacing.xl, gap: theme.spacing.lg }}>
          {/* A chevron, like the wizard header — a text "Back" button read as
              a different control on the same journey. */}
          <Box style={{ paddingTop: theme.spacing.sm, minHeight: 44, justifyContent: "center" }}>
            <Tappable
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel={copy.common.back}
              hitSlop={12}
              style={{ alignSelf: "flex-start" }}
            >
              <Icon name={{ ios: "chevron.left", android: "arrow_back" }} size={22} />
            </Tappable>
          </Box>

          <Heading level="display">{copy.auth.otpTitle}</Heading>

          <Box style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.md }}>
            <Body color="textSecondary" style={{ fontSize: 16, lineHeight: 24 }}>
              {copy.auth.otpSubtitle(`${dial ?? ""} ${number ?? ""}`.trim())}
            </Body>
            <Tappable
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel={copy.auth.otpChange}
              hitSlop={12}
            >
              <Label color="accent" style={{ textDecorationLine: "underline" }}>
                {copy.auth.otpChange}
              </Label>
            </Tappable>
          </Box>

          <OtpInput
            value={code}
            onChangeText={(next) => {
              setCode(next);
              setError(null);
            }}
            onComplete={submit}
            invalid={Boolean(error)}
          />

          <Box style={{ alignItems: "center", gap: theme.spacing.sm }}>
            {error ? <Caption color="danger">{error}</Caption> : null}

            {remaining > 0 ? (
              <Caption>{copy.auth.otpResendIn(remaining)}</Caption>
            ) : (
              <Tappable
                onPress={() => setRemaining(RESEND_SECONDS)}
                accessibilityRole="button"
                accessibilityLabel={copy.auth.otpResend}
                hitSlop={12}
              >
                <Label color="accent">{copy.auth.otpResend}</Label>
              </Tappable>
            )}
          </Box>
        </Box>

        <Box style={{ padding: theme.spacing.xl }}>
          <Button
            label={copy.common.continue}
            onPress={() => submit(code)}
            disabled={code.length < OTP_LENGTH}
            loading={verifying}
          />
        </Box>
      </KeyboardAware>
    </SafeArea>
  );
}
