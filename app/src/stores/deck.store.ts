/**
 * The swipe deck.
 *
 * No undo and no superlike (PLAN §1), so the queue only ever moves forward.
 * That makes the state small: a list, a cursor, and whatever the last decision
 * produced.
 *
 * Every mutation rebuilds the array. Splicing the card list in place is exactly
 * the React Compiler breakage PLAN §2 warns about, and on this surface it would
 * show up as cards that refuse to re-render mid-gesture.
 */

import { create } from "zustand";

import { likesService } from "@/services/likes.service";
import { profilesService } from "@/services/profiles.service";
import type { ProfileFilters } from "@/services/profiles.service";
import type { Match, PublicProfile } from "@/services/types";

export type DeckState = {
  cards: PublicProfile[];
  index: number;
  loading: boolean;
  error: unknown;
  /** Set when a like produced a match — drives the celebration screen. */
  lastMatch: Match | null;
  /** True when the daily quota is spent (A16). */
  outOfLikes: boolean;
  /**
   * Where the next page starts, or null when there is none. Discovery is
   * paginated (12 a page) — without this the deck showed the first page only
   * and read "all caught up" with dozens more matching (PLAN #249).
   */
  nextCursor: string | null;
  /** The filters the current deck was loaded with, reused for later pages. */
  filters: ProfileFilters;

  load: (filters?: ProfileFilters) => Promise<void>;
  like: (note?: string) => Promise<Match | null>;
  pass: () => void;
  clearLastMatch: () => void;
  /** The card currently on top, or undefined when the deck is spent. */
  current: () => PublicProfile | undefined;
};

/** Bumped by every `load`, so a slow answer for old filters is dropped. */
let loadGeneration = 0;
/** One page fetch at a time. */
let fetchingMore = false;
/** Fetch the next page this many cards before the deck runs dry. */
const TOP_UP_AT = 3;

export const useDeckStore = create<DeckState>((set, get) => ({
  cards: [],
  index: 0,
  loading: false,
  error: null,
  lastMatch: null,
  outOfLikes: false,
  nextCursor: null,
  filters: {},

  load: async (filters?: ProfileFilters) => {
    const generation = ++loadGeneration;
    set({ loading: true, error: null, filters: filters ?? {} });
    try {
      const page = await profilesService.listNearby(filters ?? {});
      // A newer load (filters changed again) wins; this answer is stale.
      if (generation !== loadGeneration) return;
      set({ cards: page.items, index: 0, nextCursor: page.nextCursor });
    } catch (error) {
      if (generation === loadGeneration) set({ error });
    } finally {
      if (generation === loadGeneration) set({ loading: false });
    }
  },

  like: async (note) => {
    const card = get().current();
    if (!card) return null;

    try {
      const { match } = await likesService.sendLike(card.id, note);
      // Advance regardless of whether it matched — there is no undo.
      set((state) => ({ index: state.index + 1, lastMatch: match }));
      void topUp();
      return match;
    } catch (error) {
      // Quota exhaustion is a state, not a failure: the card stays put so the
      // user can still like it after midnight or after upgrading.
      if ((error as { code?: string }).code === "quotaExceeded") {
        set({ outOfLikes: true });
        return null;
      }
      throw error;
    }
  },

  pass: () => {
    set((state) => ({ index: state.index + 1 }));
    void topUp();
  },

  clearLastMatch: () => set({ lastMatch: null }),

  current: () => {
    const { cards, index } = get();
    return cards[index];
  },
}));

/**
 * Append the next page when the deck is nearly spent. Silent on failure — the
 * cards already there keep working, and the next swipe tries again.
 */
async function topUp(): Promise<void> {
  const { cards, index, nextCursor, filters } = useDeckStore.getState();
  if (fetchingMore || !nextCursor || cards.length - index > TOP_UP_AT) return;

  fetchingMore = true;
  const generation = loadGeneration;
  try {
    const page = await profilesService.listNearby(filters, nextCursor);
    if (generation !== loadGeneration) return;
    useDeckStore.setState((state) => {
      const seen = new Set(state.cards.map((c) => c.id));
      return {
        cards: [...state.cards, ...page.items.filter((c) => !seen.has(c.id))],
        nextCursor: page.nextCursor,
      };
    });
  } catch {
    // Keep what we have.
  } finally {
    fetchingMore = false;
  }
}
