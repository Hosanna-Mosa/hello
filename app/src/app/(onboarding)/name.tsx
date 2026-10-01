import { router } from "expo-router";
import { useState } from "react";

import { BareInput, Box, Button, Caption, useTheme, WizardShell } from "@/components/common";
import { copy } from "@/copy";
import { meService } from "@/services/me.service";
import { useSessionStore } from "@/stores/session.store";

export default function NameScreen() {
  const theme = useTheme();
  // Pre-filled from sign-up, which already asked; still editable until here,
  // since this is the step that says it cannot change later.
  const signedUpAs = useSessionStore((state) => state.user?.name ?? "");
  const [name, setName] = useState(signedUpAs);
  const [focused, setFocused] = useState(false);
  const [saving, setSaving] = useState(false);

  const trimmed = name.trim();

  async function next() {
    setSaving(true);
    try {
      await meService.updateMe({ name: trimmed });
      router.push("/birthday");
    } finally {
      setSaving(false);
    }
  }

  return (
    <WizardShell
      step={1}
      total={7}
      question={copy.onboarding.nameQuestion}
      hint={copy.onboarding.nameHint}
      onBack={() => router.back()}
      footer={
        <Button
          label={copy.common.continue}
          onPress={next}
          disabled={trimmed.length === 0}
          loading={saving}
        />
      }
    >
      <Box style={{ gap: theme.spacing.sm }}>
        <BareInput
          value={name}
          onChangeText={setName}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Your name"
          autoFocus
          autoCapitalize="words"
          autoCorrect={false}
          maxLength={40}
          accessibilityLabel={copy.onboarding.nameQuestion}
          style={{ fontSize: 28, lineHeight: 36, paddingVertical: theme.spacing.sm }}
        />
        <Box
          style={{
            height: focused ? 2 : 1,
            backgroundColor: focused ? theme.color.accent : theme.color.border,
          }}
        />
        <Caption>{copy.onboarding.namePermanent}</Caption>
      </Box>
    </WizardShell>
  );
}
