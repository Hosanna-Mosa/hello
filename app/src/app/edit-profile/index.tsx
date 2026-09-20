import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";

import {
  Avatar,
  Body,
  Box,
  Caption,
  Label,
  ScreenShell,
  Scroller,
  SettingsRow,
  calculateAge,
  useTheme,
} from "@/components/common";
import { copy } from "@/copy";
import { interestsByIds } from "@/mocks/interests";
import { meService } from "@/services/me.service";
import type { User } from "@/services/types";
import { useSessionStore } from "@/stores/session.store";

/**
 * Edit profile — the hub.
 *
 * Name and birthday are shown but not editable: onboarding says "you can't
 * change this later" about the name, and the birthday drives the 18+ gate. A
 * field that looks editable and then refuses is worse than one that never
 * looked it, so they render as plain rows with no chevron.
 */
export default function EditProfileScreen() {
  const theme = useTheme();
  const refreshUser = useSessionStore((state) => state.refreshUser);
  const [me, setMe] = useState<User | null>(null);

  useFocusEffect(
    useCallback(() => {
      void (async () => {
        try {
          setMe(await meService.getMe());
          // Keep the session's copy in step — the tabs read `user` from it.
          await refreshUser();
        } catch {
          // Leaves the rows blank rather than throwing out of a focus effect.
        }
      })();
    }, [refreshUser]),
  );

  const age = me?.birthday ? calculateAge(me.birthday) : null;
  const interests = me ? interestsByIds(me.interestIds) : [];

  return (
    <ScreenShell title={copy.profile.edit} onBack={() => router.back()}>
      <Scroller
        contentContainerStyle={{
          paddingVertical: theme.spacing.lg,
          gap: theme.spacing.lg,
        }}
      >
        <Box style={{ alignItems: "center", gap: theme.spacing.sm }}>
          <Avatar name={me?.name} size="xl" />
          <Caption>{copy.profile.completeHint}</Caption>
        </Box>

        <Box style={{ backgroundColor: theme.color.surface }}>
          <SettingsRow
            label={copy.onboarding.nameQuestion}
            value={me?.name}
            showChevron={false}
          />
          <SettingsRow
            label={copy.onboarding.birthdayQuestion}
            value={age !== null ? String(age) : undefined}
            showChevron={false}
          />

          <SettingsRow
            label={copy.onboarding.avatarQuestion}
            icon={{ ios: "person.crop.circle", android: "account_circle" }}
            onPress={() => router.push("/edit-profile/avatar")}
          />
          <SettingsRow
            label={copy.profile.about}
            icon={{ ios: "text.alignleft", android: "notes" }}
            onPress={() => router.push("/edit-profile/bio")}
          />
          <SettingsRow
            label={copy.profile.interests}
            value={interests.length > 0 ? String(interests.length) : undefined}
            icon={{ ios: "tag", android: "sell" }}
            onPress={() => router.push("/edit-profile/interests")}
          />
        </Box>

        {me?.bio ? (
          <Box style={{ paddingHorizontal: theme.spacing.xl, gap: theme.spacing.sm }}>
            <Label color="textSecondary">{copy.profile.about}</Label>
            <Body color="textSecondary">{me.bio}</Body>
          </Box>
        ) : null}
      </Scroller>
    </ScreenShell>
  );
}
