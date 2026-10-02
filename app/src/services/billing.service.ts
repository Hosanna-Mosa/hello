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

import { Linking } from "react-native";

import { ApiError, http, isMockMode, request } from "./client";
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

/** `GET /me/entitlements`. JSON has no Infinity, so unlimited arrives as -1. */
type WireEntitlements = { isPremium: boolean; likesRemaining: number; likesResetAt: string; expiresAt?: string | null };

/** `POST /billing/orders` / `GET /billing/orders/:id`. */
type WireOrder = { id: string; status: "created" | "paid" | "expired" | "cancelled" | "failed"; paymentUrl: string | null };

export type PurchaseStart = { kind: "premium"; entitlements: Entitlements } | { kind: "pending"; orderId: string };
export type OrderStatus = WireOrder["status"];

export const billingService = {
  async getEntitlements(): Promise<Entitlements> {
    if (!isMockMode()) {
      // The SERVER's view — the one it enforces on likes, "who likes you" and
      // filters. A local counter here could only ever disagree with it.
      const wire = await http<WireEntitlements>("GET", "/me/entitlements");
      return {
        isPremium: wire.isPremium,
        likesRemaining: wire.likesRemaining < 0 ? Number.POSITIVE_INFINITY : wire.likesRemaining,
        likesResetAt: wire.likesResetAt,
        expiresAt: wire.expiresAt ?? null,
      };
    }

    return request(() => {
      refreshQuota();
      return { ...entitlements };
    });
  },

  /**
   * The dev-only premium toggle. Not a purchase.
   *
   * Mock mode only. Against a real server the tier is the server's to grant —
   * flipping it here would show premium on the phone while every premium
   * request was still refused, and there is no billing provider yet (A15).
   */
  async setPremium(isPremium: boolean): Promise<Entitlements> {
    if (!isMockMode()) {
      throw new ApiError("validation", "Purchases aren't available yet.");
    }

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
    // Live: the server's plans — the same rows it charges from, so the price
    // shown is the price Razorpay will ask for.
    if (!isMockMode()) return http<Plan[]>("GET", "/plans");
    return request(() => PLANS.map((plan) => ({ ...plan })));
  },

  /**
   * Starts buying a plan.
   *
   * Live: the server creates the order and a Razorpay payment link, and the
   * phone's browser opens Razorpay's own checkout — card and UPI details never
   * touch this app. Nothing is granted here: premium arrives only once the
   * server has confirmed the payment with Razorpay (`checkOrder`).
   *
   * Mock: there is no provider, so a purchase is the demo toggle (A15).
   */
  async purchase(planId: string): Promise<PurchaseStart> {
    if (!isMockMode()) {
      const order = await http<WireOrder>("POST", "/billing/orders", { planId });
      if (!order.paymentUrl) throw new ApiError("server", "We couldn't start the payment. Please try again.");
      await Linking.openURL(order.paymentUrl);
      return { kind: "pending", orderId: order.id };
    }
    return { kind: "premium", entitlements: await billingService.setPremium(true) };
  },

  /** Asks the server whether an order has been paid. The server asks Razorpay. */
  async checkOrder(orderId: string): Promise<OrderStatus> {
    if (!isMockMode()) {
      const res = await http<{ order: WireOrder; isPremium: boolean }>(
        "GET",
        `/billing/orders/${encodeURIComponent(orderId)}`,
      );
      return res.order.status;
    }
    return request(() => "paid" as const);
  },

  /** Mandatory on the App Store (R13). Mocked, but present from day one. */
  async restorePurchases(): Promise<Entitlements> {
    if (!isMockMode()) return billingService.getEntitlements();
    return request(() => ({ ...entitlements }));
  },

  __reset(): void {
    entitlements = freshEntitlements();
  },
};
