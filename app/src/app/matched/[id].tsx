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
import { Confetti } from "@/components/deck/Confetti";
import { NotificationPrimer } from "@/components/notifications/NotificationPrimer";
import { copy } from "@/copy";
import { matchesService } from "@/services/matches.service";
import { useDeckStore } from "@/stores/deck.store";
import { useSettingsStore } from "@/stores/settings.store";
import { userById } from "@/mocks/profiles";

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
  const [partnerId, setPartnerId] = useState<string | undefined>(
    lastMatch?.userIds.find((userId) => userId !== "me"),
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
      setPartnerId(match?.userIds.find((userId) => userId !== "me"));
    });
  }, [id, partnerId]);

  const partner = partnerId ? userById(partnerId) : undefined;
  // Undefined rather than a placeholder: "You and them both liked each other"
  // is not a sentence, and the copy has a proper fallback for the unknown case.
  const name = partner?.name;

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
            <Avatar name="You" size="xl" />

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

            <Avatar name={name} size="xl" />
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
