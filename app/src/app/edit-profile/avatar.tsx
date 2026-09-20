import { router } from "expo-router";
import { useEffect, useState } from "react";

import {
  Avatar,
  AvatarPicker,
  Box,
  Button,
  Caption,
  ScreenShell,
  Scroller,
  useTheme,
} from "@/components/common";
import { copy } from "@/copy";
import { AVATARS } from "@/mocks/avatars";
import { meService } from "@/services/me.service";

/**
 * Change your avatar.
 *
 * Still no photographs (PLAN §1) — the same thirty presets as onboarding, and
 * no upload anywhere. Opens on the one you already have selected.
 */
export default function EditAvatarScreen() {
  const theme = useTheme();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const me = await meService.getMe();
        setSelectedId(me.avatarId ?? null);
      } catch {
        // The form stays in its initial state rather than throwing out
        // of an effect, where the rejection would be unhandled.
      }
    })();
  }, []);

  const selected = AVATARS.find((option) => option.id === selectedId);

  async function save() {
    if (!selectedId) return;
    setSaving(true);
    try {
      await meService.updateMe({ avatarId: selectedId });
      router.back();
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScreenShell title={copy.onboarding.avatarQuestion} onBack={() => router.back()}>
      <Scroller contentContainerStyle={{ padding: theme.spacing.xl, gap: theme.spacing.xl }}>
        <Box style={{ alignItems: "center", gap: theme.spacing.sm }}>
          {/* No `source`: the preset artwork does not exist yet (R2), so this
              falls back to the initial, exactly as onboarding does. */}
          <Avatar name={selected?.label} size="xl" />
          <Caption>{copy.onboarding.avatarHint}</Caption>
        </Box>

        <AvatarPicker
          options={AVATARS.map((option) => ({ id: option.id, label: option.label }))}
          selectedId={selectedId ?? undefined}
          onSelect={setSelectedId}
        />
      </Scroller>

      <Box style={{ padding: theme.spacing.xl, paddingBottom: theme.spacing.xxl }}>
        <Button
          label={copy.common.save}
          onPress={() => void save()}
          disabled={!selectedId}
          loading={saving}
        />
      </Box>
    </ScreenShell>
  );
}
