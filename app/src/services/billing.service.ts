/**
 * Entitlements and the placeholder plans.
 *
 * There is no billing provider and no purchase (A15). Premium is a session
 * toggle, so this service exists to give every gated surface one place to ask
 * rather than each deciding for itself.
 *
 * R13 is worth repeating here: this paywall will not pass App Store review as
 * it stands. Real in-app purchase, stated renewal terms and a working Restore
 * are all required, and all three are future work.
 */

import { ApiError, request } from "./client";
import type { Entitlements, Plan } from "./types";

/** A16 — 15 a day on free, resetting at local midnight. */
export const FREE_DAILY_LIKES = 15;

/** Placeholder prices, in paise (INR only — the app shows no other currency). No store integration. */
export const PLANS: Plan[] = [
  { id: "plan-1m", label: "1 month", priceMinor: 29900, currency: "INR", period: "month", highlighted: false },
  { id: "plan-6m", label: "6 months", priceMinor: 149900, currency: "INR", period: "sixMonths", highlighted: true },
  { id: "plan-12m", label: "12 months", priceMinor: 249900, currency: "INR", period: "year", highlighted: false },
];

function nextLocalMidnight(from: Date = new Date()): string {
  const midnight = new Date(from);
  midnight.setHours(24, 0, 0, 0);
  return midnight.toISOString();
}

function freshEntitlements(): Entitlements {
  return {
    isPremium: false,
    likesRemaining: FREE_DAILY_LIKES,
    likesResetAt: nextLocalMidnight(),
  };
}

let entitlements: Entitlements = freshEntitlements();

/** Roll the quota over if the reset time has passed. */
function refreshQuota(): void {
  if (Date.now() >= new Date(entitlements.likesResetAt).getTime()) {
    entitlements = {
      ...entitlements,
      likesRemaining: FREE_DAILY_LIKES,
      likesResetAt: nextLocalMidnight(),
    };
  }
}

export const billingService = {
  async getEntitlements(): Promise<Entitlements> {
    return request(() => {
      refreshQuota();
      return { ...entitlements };
    });
  },

  /** The dev-only premium toggle. Not a purchase. */
  async setPremium(isPremium: boolean): Promise<Entitlements> {
    return request(() => {
      entitlements = {
        ...entitlements,
        isPremium,
        // Premium removes the cap entirely rather than raising it.
        likesRemaining: isPremium ? Number.POSITIVE_INFINITY : FREE_DAILY_LIKES,
      };
      return { ...entitlements };
    });
  },

  /**
   * Spend one like. Throws `quotaExceeded` when the free allowance is gone,
   * which is what drives the out-of-likes state and its countdown.
   */
  async consumeLike(): Promise<Entitlements> {
    return request(() => {
      refreshQuota();

      if (entitlements.isPremium) return { ...entitlements };

      if (entitlements.likesRemaining <= 0) {
        throw new ApiError("quotaExceeded", "You're out of likes for today");
      }

      entitlements = { ...entitlements, likesRemaining: entitlements.likesRemaining - 1 };
      return { ...entitlements };
    });
  },

  async listPlans(): Promise<Plan[]> {
    return request(() => PLANS.map((plan) => ({ ...plan })));
  },

  /** Mandatory on the App Store (R13). Mocked, but present from day one. */
  async restorePurchases(): Promise<Entitlements> {
    return request(() => ({ ...entitlements }));
  },

  __reset(): void {
    entitlements = freshEntitlements();
  },
};
