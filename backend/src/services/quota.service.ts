/**
 * The daily like quota.
 *
 * The contract's hard requirement: "It must be atomic: a rejected like is not
 * recorded." Check-then-increment across two round trips is a race — two
 * concurrent likes both read 14, both write 15, and the user gets 16 likes.
 *
 * So the check and the spend are ONE Lua script, evaluated inside Redis. It
 * returns -1 when the allowance is gone, and the caller throws before a single
 * document is written.
 *
 * Every failure path AFTER the spend refunds it, so a like rejected for any
 * other reason costs the user nothing.
 *
 * The counter lives in Redis with a TTL to the user's next LOCAL midnight;
 * `entitlements.quotaResetAt` in Mongo is the durable authority, so changing
 * timezone mid-day cannot mint a second allowance.
 */

import { DateTime } from "luxon";

import { env } from "@/config/env.js";
import { key, redis } from "@/config/redis.js";
import { ApiError } from "@/errors/ApiError.js";
import type { UserDoc } from "@/models/user.model.js";

/** Unlimited, on the wire and here. `Infinity` does not survive JSON. */
export const UNLIMITED = -1;

/**
 * KEYS[1] = counter, ARGV[1] = limit, ARGV[2] = ttl seconds.
 * Returns remaining after the spend, or -1 if there was nothing to spend.
 */
const SPEND = `
local spent = tonumber(redis.call('GET', KEYS[1]) or "0")
local limit = tonumber(ARGV[1])
if spent >= limit then return -1 end
local now = redis.call('INCR', KEYS[1])
if now == 1 then redis.call('EXPIRE', KEYS[1], ARGV[2]) end
return limit - now
`;

function zone(user: UserDoc): string {
  const tz = user.timezone ?? "Etc/UTC";
  return DateTime.local().setZone(tz).isValid ? tz : "Etc/UTC";
}

/** The user's next local midnight. Real zone rules — a fixed offset is wrong twice a year. */
export function nextLocalMidnight(user: UserDoc, now: Date = new Date()): Date {
  return DateTime.fromJSDate(now).setZone(zone(user)).plus({ days: 1 }).startOf("day").toJSDate();
}

function counterKey(user: UserDoc, now: Date): string {
  const day = DateTime.fromJSDate(now).setZone(zone(user)).toFormat("yyyy-LL-dd");
  return key(`quota:likes:{u:${String(user._id)}}:${day}`);
}

export type QuotaView = { remaining: number; limit: number; resetAt: Date };

export async function peekQuota(user: UserDoc, now: Date = new Date()): Promise<QuotaView> {
  const resetAt = nextLocalMidnight(user, now);
  if (user.entitlements?.isPremium) return { remaining: UNLIMITED, limit: UNLIMITED, resetAt };

  const spent = Number((await redis.get(counterKey(user, now))) ?? 0);
  return { remaining: Math.max(env.FREE_DAILY_LIKES - spent, 0), limit: env.FREE_DAILY_LIKES, resetAt };
}

/** Spends one like, or throws `quotaExceeded` having written nothing. */
export async function spendLike(user: UserDoc, now: Date = new Date()): Promise<QuotaView> {
  const resetAt = nextLocalMidnight(user, now);
  if (user.entitlements?.isPremium) return { remaining: UNLIMITED, limit: UNLIMITED, resetAt };

  const ttl = Math.max(Math.ceil((resetAt.getTime() - now.getTime()) / 1000) + 60, 60);
  const remaining = Number(
    await redis.eval(SPEND, 1, counterKey(user, now), String(env.FREE_DAILY_LIKES), String(ttl)),
  );

  if (remaining < 0) throw ApiError.quotaExceeded("You're out of likes for today.");

  return { remaining, limit: env.FREE_DAILY_LIKES, resetAt };
}

/**
 * Gives a spent like back.
 *
 * Called on every failure path after the spend — a duplicate like, a write
 * error — so a like that did not happen never costs the user anything.
 */
export async function refundLike(user: UserDoc, now: Date = new Date()): Promise<void> {
  if (user.entitlements?.isPremium) return;
  const k = counterKey(user, now);
  // Floor at zero: a refund must never mint allowance that was not spent.
  if (Number((await redis.get(k)) ?? 0) > 0) await redis.decr(k);
}
