import { router } from "expo-router";
import { useState } from "react";

import {
  BareInput,
  Box,
  Button,
  Caption,
  Chip,
  Label,
  Tappable,
  useTheme,
  WizardShell,
} from "@/components/common";
import { copy } from "@/copy";
import { meService } from "@/services/me.service";

const MAX = 300;

export default function BioScreen() {
  const theme = useTheme();
  const [bio, setBio] = useState("");
  const [saving, setSaving] = useState(false);

  async function next(skip = false) {
    setSaving(true);
    try {
      await meService.updateMe({ bio: skip ? "" : bio.trim() });
      router.push("/location");
    } finally {
      setSaving(false);
    }
  }

  return (
    <WizardShell
      step={6}
      total={7}
      question={copy.onboarding.bioQuestion}
      hint={copy.onboarding.bioHint}
      onBack={() => router.back()}
      footer={
        <>
          <Button label={copy.common.continue} onPress={() => next()} loading={saving} />
          <Box style={{ alignItems: "center", paddingTop: theme.spacing.xs }}>
            <Tappable
              onPress={() => next(true)}
              accessibilityRole="button"
              accessibilityLabel={copy.common.skip}
              hitSlop={12}
            >
              <Label color="textSecondary" style={{ textDecorationLine: "underline" }}>
                {copy.common.skip}
              </Label>
            </Tappable>
          </Box>
        </>
      }
    >
      <Box style={{ gap: theme.spacing.md }}>
        <BareInput
          value={bio}
          onChangeText={setBio}
          placeholder={copy.profile.bioPlaceholder}
          multiline
          maxLength={MAX}
          autoFocus
          accessibilityLabel={copy.onboarding.bioQuestion}
          style={{
            minHeight: 140,
            borderRadius: theme.radius.md,
            backgroundColor: theme.color.surfaceSunken,
            padding: theme.spacing.lg,
            textAlignVertical: "top",
            fontSize: 16,
            lineHeight: 24,
          }}
        />

        <Box style={{ alignItems: "flex-end" }}>
          <Caption>{`${bio.length}/${MAX}`}</Caption>
        </Box>

        <Box style={{ gap: theme.spacing.sm }}>
          <Caption color="textSecondary">Need a hand?</Caption>
          <Box style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.sm }}>
            {copy.onboarding.bioPrompts.map((prompt) => (
              <Chip
                key={prompt}
                label={prompt}
                onPress={() => setBio((current) => (current ? current : `${prompt} `))}
              />
            ))}
          </Box>
        </Box>
      </Box>
    </WizardShell>
  );
}
