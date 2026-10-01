import { router } from "expo-router";
import { useState } from "react";

import {
  authErrorMessage,
  Body,
  Box,
  Button,
  Caption,
  FormShell,
  Heading,
  Input,
  Label,
  PasswordInput,
  TextLink,
  useTheme,
} from "@/components/common";
import { copy } from "@/copy";
import { useSessionStore } from "@/stores/session.store";

/**
 * Log in with an email or phone number, and a password.
 *
 * Every failure that is about the pair reads the same — "isn't right" — on
 * purpose: saying "no account with that email" would tell anyone who asks
 * which addresses are registered. The server answers the same way.
 */
export default function LoginScreen() {
  const theme = useTheme();
  const login = useSessionStore((state) => state.login);

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = identifier.trim().length > 0 && password.length > 0 && !submitting;

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      // Success flips the session status, and the root layout's
      // Stack.Protected guard swaps the group. No router.replace needed.
      await login(identifier, password);
    } catch (e) {
      setError(authErrorMessage(e, copy.auth.loginInvalid));
      // Never leave a rejected password sitting in the field.
      setPassword("");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <FormShell
      onBack={() => router.back()}
      footer={
        <>
          <Button label={copy.auth.loginCta} onPress={submit} disabled={!canSubmit} loading={submitting} />
          <TextLink
            prompt={copy.auth.noAccount}
            link={copy.auth.signupLink}
            onPress={() => router.dismissTo("/signup")}
          />
        </>
      }
    >
      <Box style={{ gap: theme.spacing.sm }}>
        <Heading level="display">{copy.auth.loginTitle}</Heading>
        <Body color="textSecondary" style={{ fontSize: 16, lineHeight: 24 }}>
          {copy.auth.loginSubtitle}
        </Body>
      </Box>

      <Box style={{ gap: theme.spacing.sm }}>
        <Label>{copy.auth.identifierLabel}</Label>
        <Input
          value={identifier}
          onChangeText={(next) => {
            setIdentifier(next);
            setError(null);
          }}
          invalid={Boolean(error)}
          keyboardType="email-address"
          textContentType="username"
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect={false}
          autoFocus
          returnKeyType="next"
          maxLength={254}
          accessibilityLabel={copy.auth.identifierLabel}
        />
        <Caption color="textSecondary">{copy.auth.identifierHint}</Caption>
      </Box>

      <Box style={{ gap: theme.spacing.sm }}>
        <Label>{copy.auth.passwordLabel}</Label>
        <PasswordInput
          value={password}
          onChangeText={(next) => {
            setPassword(next);
            setError(null);
          }}
          invalid={Boolean(error)}
          textContentType="password"
          autoComplete="current-password"
          returnKeyType="go"
          maxLength={128}
          onSubmitEditing={() => {
            if (canSubmit) void submit();
          }}
          accessibilityLabel={copy.auth.passwordLabel}
          showLabel={copy.auth.passwordShow}
          hideLabel={copy.auth.passwordHide}
        />
      </Box>

      {error ? <Caption color="danger">{error}</Caption> : null}
    </FormShell>
  );
}
