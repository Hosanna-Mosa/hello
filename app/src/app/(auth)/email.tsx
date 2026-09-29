import { router } from "expo-router";
import { useState } from "react";

import {
  Body,
  Box,
  Button,
  Caption,
  Heading,
  Icon,
  Input,
  KeyboardAware,
  Label,
  SafeArea,
  Tappable,
  useTheme,
} from "@/components/common";
import { copy } from "@/copy";
import { ApiError } from "@/services/client";
import { useSessionStore } from "@/stores/session.store";

/**
 * Only a `validation` answer means the pair was wrong. Everything else — no
 * connection, the rate limit, a server without this route — has to say so, or
 * a reviewer with the right password is told it is wrong and gives up.
 */
function signInError(error: unknown): string {
  if (!(error instanceof ApiError)) return copy.auth.emailFailed;
  switch (error.code) {
    case "validation":
      return copy.auth.emailInvalid;
    case "network":
      return copy.auth.emailNetwork;
    case "rateLimited":
      return copy.auth.emailRateLimited;
    // 404: the server predates `POST /auth/email`.
    case "notFound":
      return copy.auth.emailUnavailable;
    default:
      return copy.auth.emailFailed;
  }
}

/**
 * Email + password sign-in, for store reviewers.
 *
 * The server maps the one configured email to an existing phone account, so a
 * success here is the same session that number's OTP sign-in would open.
 */
export default function EmailScreen() {
  const theme = useTheme();
  const emailLogin = useSessionStore((state) => state.emailLogin);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = email.trim().length > 0 && password.length > 0 && !submitting;

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      // Success flips the session status, and the root layout's
      // Stack.Protected guard swaps the group. No router.replace needed.
      await emailLogin(email, password);
    } catch (e) {
      setError(signInError(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeArea style={{ flex: 1, backgroundColor: theme.color.background }}>
      <KeyboardAware style={{ flex: 1 }}>
        <Box style={{ flex: 1, paddingHorizontal: theme.spacing.xl, gap: theme.spacing.lg }}>
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
            <Heading level="display">{copy.auth.emailTitle}</Heading>
            <Body color="textSecondary" style={{ fontSize: 16, lineHeight: 24 }}>
              {copy.auth.emailSubtitle}
            </Body>
          </Box>

          <Box style={{ gap: theme.spacing.sm }}>
            <Label>{copy.auth.emailLabel}</Label>
            <Input
              value={email}
              onChangeText={(next) => {
                setEmail(next);
                setError(null);
              }}
              invalid={Boolean(error)}
              keyboardType="email-address"
              textContentType="emailAddress"
              autoComplete="email"
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
              returnKeyType="next"
              accessibilityLabel={copy.auth.emailLabel}
            />
          </Box>

          <Box style={{ gap: theme.spacing.sm }}>
            <Label>{copy.auth.passwordLabel}</Label>
            <Input
              value={password}
              onChangeText={(next) => {
                setPassword(next);
                setError(null);
              }}
              invalid={Boolean(error)}
              secureTextEntry
              textContentType="password"
              autoComplete="password"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="go"
              onSubmitEditing={() => {
                if (canSubmit) void submit();
              }}
              accessibilityLabel={copy.auth.passwordLabel}
            />
          </Box>

          {error ? <Caption color="danger">{error}</Caption> : null}
        </Box>

        <Box style={{ padding: theme.spacing.xl }}>
          <Button
            label={copy.auth.emailCta}
            onPress={submit}
            disabled={!canSubmit}
            loading={submitting}
          />
        </Box>
      </KeyboardAware>
    </SafeArea>
  );
}
