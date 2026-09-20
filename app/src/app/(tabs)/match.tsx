import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";

import {
  Box,
  Caption,
  EmptyState,
  ErrorState,
  TabScreenShell,
  useCountdown,
  useEntitlements,
  useTheme,
} from "@/components/common";
import { AdCard, AD_EVERY } from "@/components/ads/AdCard";
import { DeckActions } from "@/components/deck/DeckActions";
import { DeckSkeleton } from "@/components/deck/DeckSkeleton";
import { SwipeCard } from "@/components/deck/SwipeCard";
import { SwipeDeck, type SwipeDeckHandle } from "@/components/deck/SwipeDeck";
import { copy } from "@/copy";
import { interestsByIds } from "@/mocks/interests";
import type { PublicProfile } from "@/services/types";
import { useDeckStore } from "@/stores/deck.store";
import { useFiltersStore } from "@/stores/filters.store";

/**
 * A card in the stack: someone, or an ad slot.
 *
 * `SwipeDeck` is generic, so the ad is a real card you swipe away rather than
 * an overlay you tap past — which is the whole point of putting it in the deck
 * instead of over it.
 */
type DeckItem =
  | { kind: "profile"; id: string; profile: PublicProfile }
  | { kind: "ad"; id: string };

/**
 * One ad after every `AD_EVERY` profiles.
 *
 * Positions are fixed to the profile sequence, so the ad that follows profile
 * 10 stays there however many times the deck re-renders.
 */
function interleave(cards: readonly PublicProfile[], showAds: boolean): DeckItem[] {
  const items: DeckItem[] = [];

  cards.forEach((profile, position) => {
    if (showAds && position > 0 && position % AD_EVERY === 0) {
      items.push({ kind: "ad", id: `ad-${position}` });
    }
    items.push({ kind: "profile", id: profile.id, profile });
  });

  return items;
}

/** How many ad cards sit before profile `position`. */
function adsBefore(position: number, showAds: boolean): number {
  return showAds && position > 0 ? Math.floor(position / AD_EVERY) : 0;
}

/**
 * The match deck.
 *
 * Home is browse, this is decide — keeping the two jobs distinct is what stops
 * them feeling redundant (R9).
 *
 * The buttons go through the deck's imperative handle rather than calling the
 * store directly, so a tap runs exactly the same animation as a swipe.
 */
export default function MatchScreen() {
  const theme = useTheme();
  const deckRef = useRef<SwipeDeckHandle>(null);
  const toQuery = useFiltersStore((state) => state.toQuery);

  const cards = useDeckStore((state) => state.cards);
  const index = useDeckStore((state) => state.index);
  const loading = useDeckStore((state) => state.loading);
  const error = useDeckStore((state) => state.error);
  const outOfLikes = useDeckStore((state) => state.outOfLikes);
  const load = useDeckStore((state) => state.load);
  const like = useDeckStore((state) => state.like);
  const pass = useDeckStore((state) => state.pass);

  const { showAds, isPremium, likesRemaining, likesResetAt } = useEntitlements();
  const resetsIn = useCountdown(likesResetAt);

  /**
   * How many ad cards the user has already swiped away.
   *
   * Kept here rather than in the deck store because an ad is not a decision —
   * dismissing one must not spend a like or burn a profile, and the store's
   * `index` counts profiles only.
   */
  const [adsDismissed, setAdsDismissed] = useState(0);

  const items = interleave(cards, showAds);
  /** An ad is due when the profile we are on has one in front of it. */
  const showingAd = adsDismissed < adsBefore(index, showAds);
  const visualIndex = index + adsDismissed;

  useEffect(() => {
    void (async () => {
      await load(toQuery());
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // NOTE: PLAN asks for the next N avatars to be prefetched through expo-image's
  // cache. That cannot be written yet — the preset avatar artwork does not exist
  // (R2), so there are no sources to warm. Left out rather than stubbed as a
  // no-op effect; see parking log.

  async function handleLike() {
    const match = await like();
    if (match) {
      // Celebration, then straight into the conversation.
      router.push({ pathname: "/matched/[id]", params: { id: match.threadId } });
    }
  }

  const current = cards[index];

  function body() {
    if (loading) {
      return (
        <Box
          style={{
            flex: 1,
            paddingHorizontal: theme.spacing.xl,
            paddingBottom: theme.spacing.md,
          }}
        >
          <DeckSkeleton />
        </Box>
      );
    }

    if (error) {
      return <ErrorState onRetry={() => void load(toQuery())} />;
    }

    if (outOfLikes) {
      return (
        <EmptyState
          icon={{ ios: "hourglass", android: "hourglass_empty" }}
          title={copy.deck.outOfLikesTitle}
          // A real countdown, not the word "midnight" — the quota is the one
          // thing on this screen the user is waiting on.
          message={copy.deck.outOfLikesBody(resetsIn ?? "midnight")}
          // One of the five doors into the paywall. Waiting is the free option
          // and it is still there; this is the other one.
          actionLabel={isPremium ? undefined : copy.premium.unlimitedLikes}
          onActionPress={isPremium ? undefined : () => router.push("/paywall")}
        />
      );
    }

    if (!current) {
      return (
        <EmptyState
          icon={{ ios: "checkmark.circle", android: "check_circle" }}
          title={copy.deck.emptyTitle}
          message={copy.deck.emptyBody}
          actionLabel={copy.deck.emptyCta}
          onActionPress={() => router.push("/filters")}
        />
      );
    }

    return (
      <Box style={{ flex: 1, paddingHorizontal: theme.spacing.xl, paddingBottom: theme.spacing.md }}>
        <SwipeDeck<DeckItem>
          ref={deckRef}
          cards={items}
          index={visualIndex}
          keyExtractor={(item) => item.id}
          // Swiping an ad away in either direction just dismisses it.
          onLike={() => (showingAd ? setAdsDismissed((n) => n + 1) : void handleLike())}
          onPass={() => (showingAd ? setAdsDismissed((n) => n + 1) : pass())}
          onExpand={(item) =>
            item.kind === "profile"
              ? router.push({ pathname: "/user/[id]", params: { id: item.profile.id } })
              : undefined
          }
          renderCard={(item) =>
            item.kind === "ad" ? (
              <AdCard />
            ) : (
              <SwipeCard
                person={{
                  id: item.profile.id,
                  name: item.profile.name,
                  age: item.profile.age,
                  distanceMetres: item.profile.distanceMetres,
                  bio: item.profile.bio,
                  interests: interestsByIds(item.profile.interestIds),
                }}
              />
            )
          }
        />
      </Box>
    );
  }

  return (
    <TabScreenShell title={copy.tabs.match}>
      {body()}

      {/*
        The remaining-likes counter (A16). Premium says so instead of counting,
        because "∞ likes left" is not a sentence.
      */}
      {current && !loading && !error && !outOfLikes ? (
        <Box style={{ alignItems: "center" }}>
          <Caption color={likesRemaining <= 3 && !isPremium ? "accent" : "textTertiary"}>
            {isPremium ? copy.premium.unlimitedLikes : copy.premium.likesLeft(likesRemaining)}
          </Caption>
        </Box>
      ) : null}

      {current && !loading && !error && !outOfLikes && !showingAd ? (
        <DeckActions
          onPass={() => deckRef.current?.pass()}
          onLike={() => deckRef.current?.like()}
          onNote={() =>
            router.push({ pathname: "/like-note/[id]", params: { id: current.id } })
          }
        />
      ) : null}
    </TabScreenShell>
  );
}
