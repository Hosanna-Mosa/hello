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
import { CountryPicker, DEFAULT_COUNTRY, type Country } from "@/components/signup/organisms/CountryPicker";
import { copy } from "@/copy";
import { isEmail, isStrongPassword } from "@/services/auth.service";
import { useSessionStore } from "@/stores/session.store";

type Field = "name" | "email" | "phone" | "password" | "confirm";

/**
 * Create an account: name, email, mobile number and a password.
 *
 * Success opens a session straight away — the tokens go to the keychain — and
 * the root layout's guard moves the person into the onboarding wizard, which
 * still asks the birthday (the 18+ gate), avatar, interests and the rest.
 *
 * Each field is checked here first with the server's own rules, so a typo is
 * caught beside the field it is in rather than after a round trip.
 */
export default function SignupScreen() {
  const theme = useTheme();
  const signup = useSessionStore((state) => state.signup);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [country, setCountry] = useState<Country>(DEFAULT_COUNTRY);
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const filled = [name, email, phone, password, confirm].every((v) => v.trim().length > 0);
  const canSubmit = filled && !submitting;

  /** Edits clear that field's error and the form's, never another field's. */
  function edit(field: Field, setter: (v: string) => void) {
    return (next: string) => {
      setter(next);
      setErrors((prev) => ({ ...prev, [field]: undefined }));
      setFormError(null);
    };
  }

  function validate(): Partial<Record<Field, string>> {
    const digits = phone.replace(/\D/g, "");
    const found: Partial<Record<Field, string>> = {};
    if (!name.trim()) found.name = copy.auth.nameRequired;
    if (!isEmail(email)) found.email = copy.auth.emailInvalid;
    if (digits.length < 6 || digits.length > 15) found.phone = copy.auth.phoneInvalid;
    if (!isStrongPassword(password)) found.password = copy.auth.passwordWeak;
    else if (confirm !== password) found.confirm = copy.auth.passwordMismatch;
    return found;
  }

  async function submit() {
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSubmitting(true);
    setFormError(null);
    try {
      await signup({ name, email, countryCode: country.dial, phoneNumber: phone, password });
    } catch (e) {
      setFormError(authErrorMessage(e, copy.auth.authFailed));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <FormShell
      onBack={() => router.back()}
      footer={
        <>
          <Button label={copy.auth.signupCta} onPress={submit} disabled={!canSubmit} loading={submitting} />
          <TextLink
            prompt={copy.auth.haveAccount}
            link={copy.auth.loginLink}
            onPress={() => router.dismissTo("/login")}
          />
        </>
      }
    >
      <Box style={{ gap: theme.spacing.sm }}>
        <Heading level="display">{copy.auth.signupTitle}</Heading>
        <Body color="textSecondary" style={{ fontSize: 16, lineHeight: 24 }}>
          {copy.auth.signupSubtitle}
        </Body>
      </Box>

      <Box style={{ gap: theme.spacing.sm }}>
        <Label>{copy.auth.nameLabel}</Label>
        <Input
          value={name}
          onChangeText={edit("name", setName)}
          invalid={Boolean(errors.name)}
          textContentType="name"
          autoComplete="name"
          autoCapitalize="words"
          autoCorrect={false}
          autoFocus
          maxLength={40}
          returnKeyType="next"
          accessibilityLabel={copy.auth.nameLabel}
        />
        {errors.name ? <Caption color="danger">{errors.name}</Caption> : null}
      </Box>

      <Box style={{ gap: theme.spacing.sm }}>
        <Label>{copy.auth.emailLabel}</Label>
        <Input
          value={email}
          onChangeText={edit("email", setEmail)}
          invalid={Boolean(errors.email)}
          keyboardType="email-address"
          textContentType="emailAddress"
          autoComplete="email"
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={254}
          returnKeyType="next"
          accessibilityLabel={copy.auth.emailLabel}
        />
        {errors.email ? <Caption color="danger">{errors.email}</Caption> : null}
      </Box>

      <Box style={{ gap: theme.spacing.sm }}>
        <Label>{copy.auth.phoneLabel}</Label>
        <Box style={{ flexDirection: "row", gap: theme.spacing.md }}>
          <CountryPicker value={country} onChange={setCountry} />
          <Input
            value={phone}
            onChangeText={edit("phone", setPhone)}
            invalid={Boolean(errors.phone)}
            keyboardType="phone-pad"
            textContentType="telephoneNumber"
            autoComplete="tel"
            maxLength={20}
            accessibilityLabel={copy.auth.phoneLabel}
            style={{ flex: 1 }}
          />
        </Box>
        {errors.phone ? <Caption color="danger">{errors.phone}</Caption> : null}
      </Box>

      <Box style={{ gap: theme.spacing.sm }}>
        <Label>{copy.auth.passwordLabel}</Label>
        <PasswordInput
          value={password}
          onChangeText={edit("password", setPassword)}
          invalid={Boolean(errors.password)}
          textContentType="newPassword"
          autoComplete="new-password"
          maxLength={128}
          accessibilityLabel={copy.auth.passwordLabel}
          showLabel={copy.auth.passwordShow}
          hideLabel={copy.auth.passwordHide}
        />
        <Caption color={errors.password ? "danger" : "textSecondary"}>
          {errors.password ?? copy.auth.passwordRule}
        </Caption>
      </Box>

      <Box style={{ gap: theme.spacing.sm }}>
        <Label>{copy.auth.confirmPasswordLabel}</Label>
        <PasswordInput
          value={confirm}
          onChangeText={edit("confirm", setConfirm)}
          invalid={Boolean(errors.confirm)}
          textContentType="newPassword"
          autoComplete="new-password"
          maxLength={128}
          returnKeyType="go"
          onSubmitEditing={() => {
            if (canSubmit) void submit();
          }}
          accessibilityLabel={copy.auth.confirmPasswordLabel}
          showLabel={copy.auth.passwordShow}
          hideLabel={copy.auth.passwordHide}
        />
        {errors.confirm ? <Caption color="danger">{errors.confirm}</Caption> : null}
      </Box>

      {formError ? <Caption color="danger">{formError}</Caption> : null}
    </FormShell>
  );
}
