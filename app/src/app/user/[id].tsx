import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";

import {
  Avatar,
  Body,
  Box,
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
import { ConnectionActions } from "@/components/user/organisms/ConnectionActions";
import { copy } from "@/copy";
import { avatarSource } from "@/mocks/avatars";
import { interestsByIds } from "@/mocks/interests";
import { likesService } from "@/services/likes.service";
import { profilesService } from "@/services/profiles.service";
import type { Connection, PublicProfile } from "@/services/types";

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
   * Where you stand with this person — the footer's one action.
   *
   * Messaging is match-gated (PLAN §1), so "Message" does not exist until they
   * have said yes. `undefined` means "still checking", and the footer must not
   * flash a button it is about to take away.
   */
  const [connection, setConnection] = useState<Connection | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    void profilesService.getProfile(id).then(setProfile).catch(setError);
  }, [id]);

  const loadConnection = useCallback(async () => {
    if (!id) return;
    try {
      setConnection(await likesService.getConnection(id));
    } catch {
      // Unknown is safest read as "nothing yet" — the worst case is a request
      // the server then answers for us.
      setConnection({ status: "none", threadId: null, requestId: null });
    }
  }, [id]);

  useEffect(() => {
    void loadConnection();
  }, [loadConnection]);

  const openThread = (threadId: string) => {
    // Close the sheet first: the thread should not stack on top of a sheet the
    // reader then has to dismiss twice to get out of.
    router.back();
    router.push({ pathname: "/thread/[id]", params: { id: threadId } });
  };

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setActionError(null);
    try {
      await action();
    } catch (err) {
      if ((err as { code?: string }).code === "quotaExceeded") {
        setActionError(copy.profile.outOfRequests);
        router.push("/paywall");
      } else {
        setActionError(copy.profile.requestFailed);
      }
    } finally {
      setBusy(false);
    }
  };

  const sendRequest = (note: string) =>
    run(async () => {
      if (!id) return;
      const { match } = await likesService.sendLike(id, note);
      // They had already liked you — straight to matched.
      setConnection(
        match
          ? { status: "matched", threadId: match.threadId, requestId: null }
          : { status: "requested", threadId: null, requestId: null },
      );
    });

  const acceptRequest = () =>
    run(async () => {
      if (!connection?.requestId) return;
      const match = await likesService.acceptRequest(connection.requestId);
      setConnection({ status: "matched", threadId: match.threadId, requestId: null });
    });

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
      footerInline
      footer={
        <ConnectionActions
          status={connection?.status}
          name={profile.name}
          busy={busy}
          error={actionError}
          onMessage={() => connection?.threadId && openThread(connection.threadId)}
          onAccept={() => void acceptRequest()}
          onSendRequest={(note) => void sendRequest(note)}
        />
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
