import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";

import {
  Avatar,
  Body,
  Box,
  Button,
  Heading,
  Icon,
  SafeArea,
  useTheme,
} from "@/components/common";
import { Confetti } from "@/components/matched/molecules/Confetti";
import { NotificationPrimer } from "@/components/matched/organisms/NotificationPrimer";
import { copy } from "@/copy";
import { avatarSource } from "@/mocks/avatars";
import { matchesService } from "@/services/matches.service";
import { meService } from "@/services/me.service";
import { profilesService } from "@/services/profiles.service";
import { currentUserIdOrMe } from "@/services/client";
import { useDeckStore } from "@/stores/deck.store";
import { useSettingsStore } from "@/stores/settings.store";

/**
 * "It's a Connect!"
 *
 * Presented as a transparent modal over the deck, so the celebration feels like
 * something that happened rather than somewhere you navigated.
 *
 * Two ways out, both real: open the conversation now, or keep going. Neither is
 * a dead end, and "Keep swiping" is not styled as a dismissal — plenty of
 * people will want to carry on.
 */
export default function MatchedScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const clearLastMatch = useDeckStore((state) => state.clearLastMatch);
  const lastMatch = useDeckStore((state) => state.lastMatch);

  const preferences = useSettingsStore((state) => state.preferences);
  const loadPreferences = useSettingsStore((state) => state.load);
  const markPrimerShown = useSettingsStore((state) => state.markPrimerShown);

  /**
   * Resolved from the route param, not just the store.
   *
   * The store has the match that was just made, but relying on it alone would
   * make this screen blank on a deep link or after a reload — the param is the
   * only thing that survives both. The store is the fast path.
   */
  /** The mock's literal `"me"` is not the signed-in id against the real API. */
  const viewerId = currentUserIdOrMe();

  const [partnerId, setPartnerId] = useState<string | undefined>(
    lastMatch?.userIds.find((userId) => userId !== viewerId),
  );

  /*
   * A4: the notification primer fires here, after the first match, and only
   * once. This screen is the moment — someone is now waiting on a reply, which
   * is the only point where being notified obviously earns its keep.
   */
  useEffect(() => {
    void loadPreferences();
  }, [loadPreferences]);


  useEffect(() => {
    if (partnerId || !id) return;
    void matchesService.getMatchForThread(id).then((match) => {
      setPartnerId(match?.userIds.find((userId) => userId !== viewerId));
    });
  }, [id, partnerId, viewerId]);

  /**
   * Undefined rather than a placeholder: "You and them both liked each other"
   * is not a sentence, and the copy has a proper fallback for the unknown case.
   *
   * Read through the service, not the mock's `userById` — that lookup only ever
   * knew the 40 seeded people, so against the real API a genuine new match had
   * no name here at all.
   */
  const [name, setName] = useState<string | undefined>(undefined);
  const [avatar, setAvatar] = useState<number | undefined>(undefined);
  /**
   * Your own avatar, for the left-hand side of the pair.
   *
   * It was the literal "You" on a tinted circle — which was the only thing
   * available before the artwork existed, and is now the one face on this
   * screen that the user has actually chosen.
   */
  const [myAvatar, setMyAvatar] = useState<number | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;

    void meService
      .getMe()
      .then((me) => {
        if (!cancelled) setMyAvatar(avatarSource(me.avatarId));
      })
      .catch(() => {
        // The initial fallback is a perfectly good "you" — this screen
        // dismisses itself, so there is nothing to retry into.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!partnerId) return;
    let cancelled = false;

    void profilesService
      .getProfile(partnerId)
      .then((profile) => {
        if (!cancelled) {
          setName(profile.name);
          setAvatar(avatarSource(profile.avatarId));
        }
      })
      .catch(() => {
        // The fallback copy is the failure state — there is nothing to retry
        // on a celebration screen that dismisses itself.
      });

    return () => {
      cancelled = true;
    };
  }, [partnerId]);

  function close() {
    clearLastMatch();
    router.back();
  }

  return (
    <Box style={{ flex: 1, backgroundColor: theme.color.background }}>
      <Confetti />

      <SafeArea style={{ flex: 1 }}>
        <Box
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: theme.spacing.xl,
          }}
        >
          <Box style={{ flexDirection: "row", alignItems: "center" }}>
            <Avatar source={myAvatar} name="You" size="xl" />

            {/* The heart badge sits between the two, overlapping both. */}
            <Box
              style={{
                width: 64,
                height: 64,
                borderRadius: theme.radius.pill,
                backgroundColor: theme.color.surface,
                alignItems: "center",
                justifyContent: "center",
                marginHorizontal: -theme.spacing.lg,
                zIndex: theme.zIndex.card,
                ...theme.shadow.md,
              }}
            >
              <Icon name={{ ios: "heart.fill", android: "favorite" }} size={30} color="accent" />
            </Box>

            <Avatar source={avatar} name={name} size="xl" />
          </Box>

          <Heading
            level="display"
            style={{ textAlign: "center", marginTop: theme.spacing.xxl }}
          >
            {copy.deck.matchedTitle}
          </Heading>

          <Body
            color="textSecondary"
            style={{
              textAlign: "center",
              marginTop: theme.spacing.md,
              fontSize: 16,
              lineHeight: 24,
            }}
          >
            {copy.deck.matchedBody(name)}
          </Body>
        </Box>

        <Box style={{ padding: theme.spacing.xl, gap: theme.spacing.sm }}>
          <Button
            label={copy.deck.matchedCta}
            onPress={() => {
              clearLastMatch();
              // `id` is the thread id — the route param the deck pushed.
              router.replace({ pathname: "/thread/[id]", params: { id } });
            }}
          />
          <Button label={copy.deck.matchedLater} onPress={close} variant="secondary" />
        </Box>
      </SafeArea>

      <NotificationPrimer
        visible={preferences !== null && !preferences.notificationPrimerShown}
        onAccept={() => void markPrimerShown()}
        onDecline={() => void markPrimerShown()}
      />
    </Box>
  );
}
