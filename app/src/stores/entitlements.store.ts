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
  /** The dev-only toggle. Not a purchase (A15). Mock mode only. */
  setPremium: (isPremium: boolean) => Promise<void>;
  /** An order waiting for its payment to be confirmed. */
  pendingOrderId: string | null;
  /** Starts a purchase. "premium" = already granted (mock); "pending" = Razorpay opened. */
  purchase: (planId: string) => Promise<"premium" | "pending">;
  /** Checks the pending order. "paid" = premium is on; "closed" = expired or failed. */
  checkPurchase: () => Promise<"paid" | "pending" | "closed">;
  restore: () => Promise<void>;
};

export const useEntitlementsStore = create<EntitlementsState>((set, get) => ({
  entitlements: null,
  plans: [],
  loading: false,
  pendingOrderId: null,

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

  purchase: async (planId) => {
    const started = await billingService.purchase(planId);
    if (started.kind === "premium") {
      set({ entitlements: started.entitlements, pendingOrderId: null });
      return "premium";
    }
    set({ pendingOrderId: started.orderId });
    return "pending";
  },

  checkPurchase: async () => {
    const orderId = get().pendingOrderId;
    if (!orderId) return "closed";

    const status = await billingService.checkOrder(orderId);
    if (status === "paid") {
      // The server granted it; read the tier back from the server.
      set({ entitlements: await billingService.getEntitlements(), pendingOrderId: null });
      return "paid";
    }
    if (status === "created") return "pending";
    set({ pendingOrderId: null });
    return "closed";
  },
}));
