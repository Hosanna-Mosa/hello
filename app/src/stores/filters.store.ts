/**
 * Discovery filters.
 *
 * Shared by Home nearby and the Match deck, so changing the radius in one place
 * changes both — two surfaces disagreeing about who is nearby would read as a
 * bug.
 *
 * Interests and active-recently are premium-gated in the UI. The gate is not
 * enforced here on purpose: the store holds what the user asked for, and the
 * screen decides whether they may have it. That way flipping premium on does
 * not lose their selection.
 */

import { create } from "zustand";

import type { ProfileFilters } from "@/services/profiles.service";
import type { Gender } from "@/services/types";

export const DEFAULT_FILTERS = {
  maxDistanceMetres: 25_000,
  minAge: 18,
  maxAge: 45,
  interestIds: [] as string[],
  activeRecently: false,
  /** Empty means everyone — the design's "All genders". */
  genders: [] as Gender["kind"][],
};

export type FiltersState = typeof DEFAULT_FILTERS & {
  setDistance: (metres: number) => void;
  setAgeRange: (min: number, max: number) => void;
  toggleInterest: (id: string) => void;
  toggleGender: (kind: Gender["kind"]) => void;
  setActiveRecently: (value: boolean) => void;
  reset: () => void;
  /** The shape the service layer wants. */
  toQuery: () => ProfileFilters;
};

export const useFiltersStore = create<FiltersState>((set, get) => ({
  ...DEFAULT_FILTERS,

  setDistance: (metres) => set({ maxDistanceMetres: metres }),

  // Floors at 18 whatever the slider does (PLAN §1).
  setAgeRange: (min, max) => set({ minAge: Math.max(18, min), maxAge: Math.max(Math.max(18, min), max) }),

  toggleInterest: (id) =>
    set((state) => ({
      // Rebuilt, never spliced — in-place mutation is the #1 React Compiler breakage.
      interestIds: state.interestIds.includes(id)
        ? state.interestIds.filter((i) => i !== id)
        : [...state.interestIds, id],
    })),

  toggleGender: (kind) =>
    set((state) => ({
      genders: state.genders.includes(kind)
        ? state.genders.filter((g) => g !== kind)
        : [...state.genders, kind],
    })),

  setActiveRecently: (value) => set({ activeRecently: value }),

  reset: () => set({ ...DEFAULT_FILTERS, interestIds: [], genders: [] }),

  toQuery: () => {
    const { maxDistanceMetres, minAge, maxAge, interestIds, activeRecently, genders } = get();
    return {
      maxDistanceMetres,
      minAge,
      maxAge,
      interestIds: interestIds.length ? interestIds : undefined,
      activeRecently: activeRecently || undefined,
      genders: genders.length ? genders : undefined,
    };
  },
}));
