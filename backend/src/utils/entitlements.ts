/**
 * The ONE answer to "is this person premium right now?".
 *
 * `entitlements.isPremium` alone is not it: a purchased pass has an end date,
 * and a flag that is never flipped back would make every premium pass a
 * lifetime one. Every premium check on the server goes through here, so
 * expiry is honoured everywhere at once rather than at whichever call sites
 * remembered it.
 *
 * `expiresAt: null` with `isPremium: true` is an open-ended grant — only an
 * admin can make one.
 */

import type { UserDoc } from "@/models/user.model.js";

export function isPremiumNow(user: Pick<UserDoc, "entitlements">, now: Date = new Date()): boolean {
  const e = user.entitlements;
  if (!e?.isPremium) return false;
  return !e.expiresAt || e.expiresAt.getTime() > now.getTime();
}

/** The Mongo filter equivalent, for counts and listings. */
export function premiumNowFilter(now: Date = new Date()): Record<string, unknown> {
  return {
    "entitlements.isPremium": true,
    $or: [{ "entitlements.expiresAt": null }, { "entitlements.expiresAt": { $gt: now } }],
  };
}
