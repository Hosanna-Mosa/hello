import { router } from "expo-router";
import { useEffect, useState } from "react";

import { Box, Button, ScreenShell, useTheme } from "@/components/common";
import { MINIMUM_INTERESTS } from "@/components/common/utils/profileCompleteness";
import { InterestPicker } from "@/components/common/organisms/InterestPicker";
import { copy } from "@/copy";
import { meService } from "@/services/me.service";

/**
 * Change your interests.
 *
 * The three-interest floor (A6) is enforced here too. It is not an onboarding
 * formality — with no photographs, interests are most of what a card shows, so
 * a profile is allowed to gain them but never to drop below the minimum.
 */
export default function EditInterestsScreen() {
  const theme = useTheme();
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const me = await meService.getMe();
        setSelected(me.interestIds);
      } catch {
        // The form stays in its initial state rather than throwing out
        // of an effect, where the rejection would be unhandled.
      }
    })();
  }, []);

  const remaining = Math.max(MINIMUM_INTERESTS - selected.length, 0);
  const ready = remaining === 0;

  function toggle(id: string) {
    // Rebuilt, never spliced — in-place mutation is the React Compiler breakage.
    setSelected((current) =>
      current.includes(id) ? current.filter((each) => each !== id) : [...current, id],
    );
  }

  async function save() {
    setSaving(true);
    try {
      await meService.updateMe({ interestIds: selected });
      router.back();
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScreenShell title={copy.profile.interests} onBack={() => router.back()}>
      <Box style={{ flex: 1 }}>
        <InterestPicker selectedIds={selected} onToggle={toggle} />
      </Box>

      <Box style={{ padding: theme.spacing.xl, paddingBottom: theme.spacing.xxl }}>
        <Button
          // States the shortfall rather than sitting silently disabled.
          label={ready ? copy.common.save : copy.onboarding.interestsRemaining(remaining)}
          onPress={() => void save()}
          disabled={!ready}
          loading={saving}
        />
      </Box>
    </ScreenShell>
  );
}
