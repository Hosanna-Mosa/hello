import { router } from "expo-router";
import { useEffect, useState } from "react";

import {
  BareInput,
  Box,
  Button,
  Caption,
  Chip,
  FormShell,
  useTheme,
} from "@/components/common";
import { copy } from "@/copy";
import { meService } from "@/services/me.service";

const MAX = 300;

/**
 * Edit the bio.
 *
 * Same field as onboarding step 6, with two differences that matter: it opens
 * with what you already wrote, and Save goes back rather than forward. The
 * prompt chips append to the end here instead of replacing the text — at
 * onboarding the field is always empty, but here it rarely is, and a chip that
 * silently discarded a paragraph would be a nasty surprise.
 */
export default function EditBioScreen() {
  const theme = useTheme();
  const [bio, setBio] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const me = await meService.getMe();
        setBio(me.bio ?? "");
        setLoaded(true);
      } catch {
        // The form stays in its initial state rather than throwing out
        // of an effect, where the rejection would be unhandled.
      }
    })();
  }, []);

  async function save() {
    setSaving(true);
    try {
      await meService.updateMe({ bio: bio.trim() });
      router.back();
    } finally {
      setSaving(false);
    }
  }

  return (
    <FormShell
      title={copy.profile.about}
      onBack={() => router.back()}
      footer={
        <Button
          label={copy.common.save}
          onPress={() => void save()}
          loading={saving}
          disabled={!loaded}
        />
      }
    >
      <BareInput
        value={bio}
        onChangeText={setBio}
        placeholder={copy.profile.bioPlaceholder}
        multiline
        maxLength={MAX}
        editable={loaded}
        accessibilityLabel={copy.profile.about}
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
              onPress={() =>
                setBio((current) => {
                  const next = current.trim() ? `${current.trim()} ${prompt} ` : `${prompt} `;
                  return next.slice(0, MAX);
                })
              }
            />
          ))}
        </Box>
      </Box>
    </FormShell>
  );
}
