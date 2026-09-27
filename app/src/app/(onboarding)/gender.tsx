import { router } from "expo-router";
import { useState } from "react";

import {
  BareInput,
  Box,
  Button,
  Divider,
  SelectableRow,
  ToggleRow,
  WizardShell,
  useTheme,
} from "@/components/common";
import { copy } from "@/copy";
import { meService } from "@/services/me.service";
import type { Gender } from "@/services/types";

type Option = { kind: Gender["kind"]; label: string };

/** A5 — self-describe and prefer-not-to-say are first-class, not an "other". */
const OPTIONS: Option[] = [
  { kind: "woman", label: copy.onboarding.genderWoman },
  { kind: "man", label: copy.onboarding.genderMan },
  { kind: "nonBinary", label: copy.onboarding.genderNonBinary },
  { kind: "selfDescribed", label: copy.onboarding.genderSelfDescribe },
  { kind: "preferNotToSay", label: copy.onboarding.genderPreferNot },
];

export default function GenderScreen() {
  const theme = useTheme();
  const [kind, setKind] = useState<Gender["kind"] | null>(null);
  const [selfLabel, setSelfLabel] = useState("");
  const [show, setShow] = useState(true);
  const [saving, setSaving] = useState(false);

  const ready = kind !== null && (kind !== "selfDescribed" || selfLabel.trim().length > 0);

  async function next() {
    if (!kind) return;
    setSaving(true);
    try {
      const gender: Gender =
        kind === "selfDescribed"
          ? { kind: "selfDescribed", label: selfLabel.trim() }
          : ({ kind } as Gender);

      await meService.updateMe({ gender, showGender: show });
      router.push("/avatar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <WizardShell
      step={3}
      total={7}
      question={copy.onboarding.genderQuestion}
      onBack={() => router.back()}
      footer={
        <Button
          label={copy.common.continue}
          onPress={next}
          disabled={!ready}
          loading={saving}
        />
      }
    >
      <Box style={{ gap: theme.spacing.md }}>
        <Box style={{ gap: theme.spacing.sm }}>
          {OPTIONS.map((option) => (
            <SelectableRow
              key={option.kind}
              label={option.label}
              selected={option.kind === kind}
              onPress={() => setKind(option.kind)}
              indicator="radio"
            />
          ))}
        </Box>

        {kind === "selfDescribed" ? (
          <BareInput
            value={selfLabel}
            onChangeText={setSelfLabel}
            placeholder="How do you describe yourself?"
            autoFocus
            maxLength={40}
            accessibilityLabel="Describe yourself"
            style={{
              borderWidth: 1,
              borderColor: theme.color.border,
              borderRadius: theme.radius.md,
              paddingHorizontal: theme.spacing.lg,
              minHeight: 56,
              backgroundColor: theme.color.surface,
            }}
          />
        ) : null}

        <Divider />

        <ToggleRow
          label={copy.onboarding.genderShowToggle}
          description={copy.onboarding.genderShowHint}
          value={show}
          onValueChange={setShow}
        />
      </Box>
    </WizardShell>
  );
}
