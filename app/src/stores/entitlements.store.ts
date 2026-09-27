/**
 * Premium, and the daily like quota.
 *
 * The single source every gated surface reads. No screen decides for itself
 * whether to show an ad or a lock — they all ask here, which is what makes
 * "all ad slots disappear when premium flips on" true by construction rather
 * than by twenty separate correct decisions.
 */

import { create } from "zustand";

import { billingService } from "@/services/billing.service";
import type { Entitlements, Plan } from "@/services/types";

export type EntitlementsState = {
  entitlements: Entitlements | null;
  plans: Plan[];
  loading: boolean;

  refresh: () => Promise<void>;
  loadPlans: () => Promise<void>;
  /** The dev-only toggle. Not a purchase (A15). */
  setPremium: (isPremium: boolean) => Promise<void>;
  restore: () => Promise<void>;
};

export const useEntitlementsStore = create<EntitlementsState>((set) => ({
  entitlements: null,
  plans: [],
  loading: false,

  refresh: async () => {
    set({ loading: true });
    try {
      set({ entitlements: await billingService.getEntitlements() });
    } finally {
      set({ loading: false });
    }
  },

  loadPlans: async () => {
    set({ plans: await billingService.listPlans() });
  },

  setPremium: async (isPremium) => {
    set({ entitlements: await billingService.setPremium(isPremium) });
  },

  restore: async () => {
    set({ entitlements: await billingService.restorePurchases() });
  },
}));
