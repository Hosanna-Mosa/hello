import { router } from "expo-router";
import { useState } from "react";

import { Button, WizardShell } from "@/components/common";
import { MINIMUM_INTERESTS } from "@/components/common/utils/profileCompleteness";
import { InterestPicker } from "@/components/interests/InterestPicker";
import { copy } from "@/copy";
import { meService } from "@/services/me.service";

export default function InterestsScreen() {
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const remaining = Math.max(MINIMUM_INTERESTS - selected.length, 0);
  const ready = remaining === 0;

  function toggle(id: string) {
    // Rebuilt, never spliced — in-place mutation is the React Compiler breakage.
    setSelected((current) =>
      current.includes(id) ? current.filter((x) => x !== id) : [...current, id],
    );
  }

  async function next() {
    setSaving(true);
    try {
      await meService.updateMe({ interestIds: selected });
      router.push("/bio");
    } finally {
      setSaving(false);
    }
  }

  return (
    <WizardShell
      step={5}
      total={7}
      question={copy.onboarding.interestsQuestion}
      hint={copy.onboarding.interestsHint}
      onBack={() => router.back()}
      footer={
        <Button
          // The button states the shortfall rather than just sitting disabled,
          // so it is obvious why it will not move.
          label={ready ? copy.common.continue : copy.onboarding.interestsRemaining(remaining)}
          onPress={next}
          disabled={!ready}
          loading={saving}
        />
      }
    >
      <InterestPicker selectedIds={selected} onToggle={toggle} />
    </WizardShell>
  );
}
