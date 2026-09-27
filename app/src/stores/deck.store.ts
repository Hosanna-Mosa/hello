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

  load: (filters?: ProfileFilters) => Promise<void>;
  like: (note?: string) => Promise<Match | null>;
  pass: () => void;
  clearLastMatch: () => void;
  /** The card currently on top, or undefined when the deck is spent. */
  current: () => PublicProfile | undefined;
};

export const useDeckStore = create<DeckState>((set, get) => ({
  cards: [],
  index: 0,
  loading: false,
  error: null,
  lastMatch: null,
  outOfLikes: false,

  load: async (filters?: ProfileFilters) => {
    set({ loading: true, error: null });
    try {
      const page = await profilesService.listNearby(filters ?? {});
      set({ cards: page.items, index: 0 });
    } catch (error) {
      set({ error });
    } finally {
      set({ loading: false });
    }
  },

  like: async (note) => {
    const card = get().current();
    if (!card) return null;

    try {
      const { match } = await likesService.sendLike(card.id, note);
      // Advance regardless of whether it matched — there is no undo.
      set((state) => ({ index: state.index + 1, lastMatch: match }));
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

  pass: () => set((state) => ({ index: state.index + 1 })),

  clearLastMatch: () => set({ lastMatch: null }),

  current: () => {
    const { cards, index } = get();
    return cards[index];
  },
}));
