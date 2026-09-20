import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";

import {
  Avatar,
  Body,
  Box,
  Button,
  Caption,
  DistanceLabel,
  ErrorState,
  Heading,
  Icon,
  InterestChips,
  SectionHeader,
  SheetShell,
  Spinner,
  Tappable,
  useTheme,
} from "@/components/common";
import { copy } from "@/copy";
import { interestsByIds } from "@/mocks/interests";
import { profilesService } from "@/services/profiles.service";
import type { PublicProfile } from "@/services/types";

/**
 * A person's full profile, in a form sheet.
 *
 * `presentation: 'formSheet'` is configured on the route in the root layout —
 * it is native and needs no bottom-sheet library (PLAN §2).
 */
export default function UserProfileScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    if (!id) return;
    void profilesService.getProfile(id).then(setProfile).catch(setError);
  }, [id]);

  if (error) {
    return (
      <SheetShell title={copy.errors.notFoundTitle}>
        <ErrorState title={copy.errors.notFoundTitle} message={copy.errors.notFoundBody} />
      </SheetShell>
    );
  }

  if (!profile) {
    return (
      <SheetShell>
        <Box style={{ paddingVertical: theme.spacing.xxxl, alignItems: "center" }}>
          <Spinner />
        </Box>
      </SheetShell>
    );
  }

  return (
    <SheetShell footer={<Button label={copy.common.done} onPress={() => router.back()} />}>
      <Box style={{ alignItems: "center", gap: theme.spacing.md }}>
        <Avatar name={profile.name} size="xl" />
        <Heading level="heading">{`${profile.name}, ${profile.age}`}</Heading>
        <DistanceLabel metres={profile.distanceMetres} />
      </Box>

      {profile.bio ? (
        <Box style={{ gap: theme.spacing.sm }}>
          <SectionHeader title={copy.profile.about} />
          <Body color="textSecondary">{profile.bio}</Body>
        </Box>
      ) : null}

      <Box style={{ gap: theme.spacing.sm }}>
        <SectionHeader title={copy.profile.interests} />
        <InterestChips interests={interestsByIds(profile.interestIds)} />
      </Box>

      {/*
        The safety entry PLAN requires on a profile. Quiet and at the bottom —
        it should be findable without being the loudest thing on someone's
        profile, which would be its own kind of accusation.
      */}
      <Box style={{ alignItems: "center", paddingTop: theme.spacing.lg }}>
        <Tappable
          onPress={() => router.push({ pathname: "/report/[id]", params: { id: profile.id } })}
          accessibilityRole="button"
          accessibilityLabel={`${copy.safety.reportTitle} ${profile.name}`}
          hitSlop={12}
          style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.xs }}
        >
          <Icon name={{ ios: "flag", android: "flag" }} size={16} color="textTertiary" />
          <Caption>{`${copy.safety.reportTitle} ${profile.name}`}</Caption>
        </Tappable>
      </Box>
    </SheetShell>
  );
}
