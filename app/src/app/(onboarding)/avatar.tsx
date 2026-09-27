import { router } from "expo-router";
import { useState } from "react";

import { Avatar, AvatarPicker, Box, Button, useTheme, WizardShell } from "@/components/common";
import { copy } from "@/copy";
import { AVATARS } from "@/mocks/avatars";
import { meService } from "@/services/me.service";

export default function AvatarScreen() {
  const theme = useTheme();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const selected = AVATARS.find((a) => a.id === selectedId);

  async function next() {
    if (!selectedId) return;
    setSaving(true);
    try {
      await meService.updateMe({ avatarId: selectedId });
      router.push("/interests");
    } finally {
      setSaving(false);
    }
  }

  return (
    <WizardShell
      step={4}
      total={7}
      question={copy.onboarding.avatarQuestion}
      // Says the quiet part out loud — people expect to upload a photo here.
      hint={copy.onboarding.avatarHint}
      onBack={() => router.back()}
      footer={
        <Button
          label={copy.common.continue}
          onPress={next}
          disabled={!selectedId}
          loading={saving}
        />
      }
    >
      <Box style={{ gap: theme.spacing.xl }}>
        <Box style={{ alignItems: "center" }}>
          <Avatar source={selected?.asset} name={selected?.label} size="xl" />
        </Box>

        <AvatarPicker
          options={AVATARS.map((a) => ({ id: a.id, label: a.label, source: a.asset }))}
          selectedId={selectedId ?? undefined}
          onSelect={setSelectedId}
          columns={5}
        />
      </Box>
    </WizardShell>
  );
}
