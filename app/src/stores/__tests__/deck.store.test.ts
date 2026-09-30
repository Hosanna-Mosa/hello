/**
 * The deck pages through discovery instead of stopping at the first page
 * (PLAN #249): "93 people" on the Filters screen must mean 93 cards, not 12
 * and then "You're all caught up".
 */

import { billingService } from "@/services/billing.service";
import { configureClient, resetClient } from "@/services/client";
import { likesService } from "@/services/likes.service";
import { profilesService } from "@/services/profiles.service";
import { useDeckStore } from "@/stores/deck.store";

const flush = async () => {
  for (let i = 0; i < 6; i += 1) await new Promise((r) => setTimeout(r, 0));
};

const WIDE = { maxDistanceMetres: 100_000, minAge: 18, maxAge: 99 };

beforeEach(() => {
  resetClient();
  configureClient({ minLatencyMs: 0, maxLatencyMs: 0 });
  billingService.__reset();
  likesService.__reset();
  useDeckStore.setState({ cards: [], index: 0, nextCursor: null, filters: {}, outOfLikes: false });
});
afterAll(resetClient);

describe("deck store — pagination", () => {
  it("swiping through tops the deck up until every matching person has been shown", async () => {
    const total = await profilesService.countMatching(WIDE);
    expect(total).toBeGreaterThan(12); // more than one page, or this test proves nothing

    await useDeckStore.getState().load(WIDE);
    expect(useDeckStore.getState().cards.length).toBeLessThan(total);

    const seen = new Set<string>();
    for (let i = 0; i < total + 5; i += 1) {
      const card = useDeckStore.getState().current();
      if (!card) break;
      seen.add(card.id);
      useDeckStore.getState().pass();
      await flush();
    }

    expect(seen.size).toBe(total);
    expect(useDeckStore.getState().current()).toBeUndefined();
  });

  it("a newer load wins over a slower, older one", async () => {
    const slow = useDeckStore.getState().load({ ...WIDE, maxDistanceMetres: 1_000 });
    const fast = useDeckStore.getState().load(WIDE);
    await Promise.all([slow, fast]);
    expect(useDeckStore.getState().filters).toEqual(WIDE);
  });
});
