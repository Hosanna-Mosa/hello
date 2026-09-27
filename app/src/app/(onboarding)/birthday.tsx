import { router } from "expo-router";
import { useState } from "react";

import { Box, Button, Caption, useTheme, WizardShell } from "@/components/common";
import { calculateAge, isOldEnough } from "@/components/common/utils/calculateAge";
import { DateWheel } from "@/components/birthday/organisms/DateWheel";
import { copy } from "@/copy";
import { meService } from "@/services/me.service";

/** Opens on a plausible adult birthday rather than today. */
function initialDate(): Date {
  const date = new Date();
  date.setFullYear(date.getFullYear() - 25);
  return date;
}

export default function BirthdayScreen() {
  const theme = useTheme();
  const [date, setDate] = useState(initialDate);
  const [saving, setSaving] = useState(false);

  const age = calculateAge(date);
  const allowed = isOldEnough(date);

  async function next() {
    // The gate. An under-18 birthday goes to the dead end and never reaches the
    // service — which rejects it too, independently (PLAN §1).
    if (!allowed) {
      router.replace("/age-restricted");
      return;
    }

    setSaving(true);
    try {
      await meService.updateMe({ birthday: date.toISOString().slice(0, 10) });
      router.push("/gender");
    } finally {
      setSaving(false);
    }
  }

  return (
    <WizardShell
      step={2}
      total={7}
      question={copy.onboarding.birthdayQuestion}
      hint={copy.onboarding.birthdayHint}
      onBack={() => router.back()}
      scroll={false}
      footer={<Button label={copy.common.continue} onPress={next} loading={saving} />}
    >
      <Box style={{ gap: theme.spacing.lg }}>
        <DateWheel value={date} onChange={setDate} />

        <Box style={{ alignItems: "center" }}>
          <Caption color={allowed ? "textSecondary" : "danger"}>
            {allowed ? copy.onboarding.birthdayAge(age) : copy.onboarding.birthdayHint}
          </Caption>
        </Box>
      </Box>
    </WizardShell>
  );
}
