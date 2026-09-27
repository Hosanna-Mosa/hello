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
  InterestText,
  SectionHeader,
  SheetShell,
  Spinner,
  Tappable,
  useTheme,
} from "@/components/common";
import { copy } from "@/copy";
import { avatarSource } from "@/mocks/avatars";
import { interestsByIds } from "@/mocks/interests";
import { matchesService } from "@/services/matches.service";
import { profilesService } from "@/services/profiles.service";
import type { Match, PublicProfile } from "@/services/types";

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
  /**
   * The active match with this person, if any.
   *
   * Messaging is match-gated (PLAN §1), so the message action is not a
   * decoration that gets hidden — it does not exist without one. `undefined`
   * means "still checking", which is different from `null` meaning "no match",
   * and the footer must not flash a button it is about to take away.
   */
  const [match, setMatch] = useState<Match | null | undefined>(undefined);

  useEffect(() => {
    if (!id) return;
    void profilesService.getProfile(id).then(setProfile).catch(setError);
  }, [id]);

  useEffect(() => {
    if (!id) return;
    // A failed lookup is not an error worth showing — it just means no
    // message action, which is the same as not being matched.
    void matchesService
      .getMatchWithUser(id)
      .then(setMatch)
      .catch(() => setMatch(null));
  }, [id]);

  if (error) {
    return (
      <SheetShell title={copy.errors.notFoundTitle} fitToContents>
        <ErrorState title={copy.errors.notFoundTitle} message={copy.errors.notFoundBody} />
      </SheetShell>
    );
  }

  if (!profile) {
    return (
      <SheetShell fitToContents>
        {/*
          A floor, so the sheet does not open at spinner-size and jump when the
          profile lands. Roughly a profile with no bio, which is the short case.
        */}
        <Box style={{ minHeight: 320, justifyContent: "center", alignItems: "center" }}>
          <Spinner />
        </Box>
      </SheetShell>
    );
  }

  return (
    <SheetShell
      fitToContents
      footer={
        <Box style={{ gap: theme.spacing.sm }}>
          {match ? (
            <Button
              label={copy.profile.message}
              onPress={() => {
                // Replace, not push: the thread should not stack on top of a
                // sheet the reader then has to dismiss twice to get out of.
                router.back();
                router.push({ pathname: "/thread/[id]", params: { id: match.threadId } });
              }}
            />
          ) : null}

          <Button
            label={copy.common.done}
            variant={match ? "secondary" : "primary"}
            onPress={() => router.back()}
          />
        </Box>
      }
    >
      <Box style={{ alignItems: "center", gap: theme.spacing.md }}>
        <Avatar source={avatarSource(profile.avatarId)} name={profile.name} size="xl" />
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
        <InterestText interests={interestsByIds(profile.interestIds)} />
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
