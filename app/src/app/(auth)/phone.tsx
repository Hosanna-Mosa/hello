import { router } from "expo-router";
import { useState } from "react";

import {
  BareInput,
  Body,
  Box,
  Button,
  Caption,
  Heading,
  Icon,
  KeyboardAware,
  SafeArea,
  Tappable,
  useTheme,
} from "@/components/common";
import { CountryPicker, DEFAULT_COUNTRY, type Country } from "@/components/phone/CountryPicker";
import { copy } from "@/copy";
import { authService } from "@/services/auth.service";

/** Loose enough for any country, strict enough to catch a typo. */
const MIN_DIGITS = 6;

export default function PhoneScreen() {
  const theme = useTheme();
  const [country, setCountry] = useState<Country>(DEFAULT_COUNTRY);
  const [number, setNumber] = useState("");
  const [focused, setFocused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const digits = number.replace(/\D/g, "");
  const canSend = digits.length >= MIN_DIGITS && !sending;

  async function send() {
    setSending(true);
    setError(null);
    try {
      await authService.sendCode(country.dial, digits);
      router.push({ pathname: "/otp", params: { dial: country.dial, number: digits } });
    } catch {
      setError(copy.auth.phoneInvalid);
    } finally {
      setSending(false);
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

          <Box style={{ gap: theme.spacing.sm }}>
            <Heading level="display">{copy.auth.phoneTitle}</Heading>
            <Body color="textSecondary" style={{ fontSize: 16, lineHeight: 24 }}>
              {copy.auth.phoneSubtitle}
            </Body>
          </Box>

          <Box style={{ flexDirection: "row", gap: theme.spacing.md }}>
            <CountryPicker value={country} onChange={setCountry} />

            <Box
              style={{
                flex: 1,
                justifyContent: "center",
                borderWidth: 1,
                borderColor: error ? theme.color.danger : theme.color.border,
                borderRadius: theme.radius.sm,
                // The focus affordance is the coral underline in the design.
                borderBottomWidth: focused ? 2 : 1,
                borderBottomColor: error
                  ? theme.color.danger
                  : focused
                    ? theme.color.accent
                    : theme.color.border,
                paddingHorizontal: theme.spacing.md,
                minHeight: 56,
                backgroundColor: theme.color.surface,
              }}
            >
              <BareInput
                value={number}
                onChangeText={setNumber}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                keyboardType="phone-pad"
                textContentType="telephoneNumber"
                autoFocus
                accessibilityLabel="Phone number"
                style={{ fontSize: 20, lineHeight: 28 }}
              />
            </Box>
          </Box>

          <Caption color={error ? "danger" : "textSecondary"}>
            {error ?? copy.auth.phonePrivacy}
          </Caption>
        </Box>

        <Box style={{ padding: theme.spacing.xl }}>
          <Button
            label={copy.auth.phoneCta}
            onPress={send}
            disabled={!canSend}
            loading={sending}
          />
        </Box>
      </KeyboardAware>
    </SafeArea>
  );
}
