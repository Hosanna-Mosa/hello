/**
 * One-time codes, held in Redis.
 *
 * Redis, not Mongo, because the whole lifecycle is "exists for five minutes
 * then stops existing" — which is a TTL, not a row. Nothing here needs to
 * survive a restart, and an expired code that lingers is a liability.
 *
 * The code is stored as an HMAC. A Redis dump is then not a list of working
 * logins, and the comparison is constant-time so response timing cannot be used
 * to guess digit by digit.
 *
 * Attempts are capped. Six digits is a million combinations, which sounds
 * plenty until you notice nothing stops an attacker trying all of them against
 * a five-minute window — so five wrong guesses burn the code.
 */

import { createHmac, randomInt } from "node:crypto";

import { env } from "@/config/env.js";
import { key, redis } from "@/config/redis.js";
import { ApiError } from "@/errors/ApiError.js";
import { safeEqual } from "@/utils/phone.js";

const MAX_ATTEMPTS = 5;

const codeKey = (phoneHmac: string) => key(`otp:code:${phoneHmac}`);
const resendKey = (phoneHmac: string) => key(`otp:resend:${phoneHmac}`);

const hashCode = (code: string, phoneHmac: string) =>
  createHmac("sha256", env.PHONE_PEPPER).update(`${phoneHmac}:${code}`).digest("hex");

/** Always six digits, including leading zeros — `000123` is a valid code. */
function generateCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export type IssuedOtp = { code: string; resendAfterSec: number };

/**
 * Issues a code, or refuses if one was issued too recently.
 *
 * The resend gate IS the TTL on its own key — there is no stored timestamp to
 * drift, and `resendAfterSec` is read straight back off it so the client's
 * countdown matches the server's reality.
 */
export async function issueOtp(phoneHmac: string): Promise<IssuedOtp> {
  const waiting = await redis.ttl(resendKey(phoneHmac));
  if (waiting > 0) {
    throw ApiError.rateLimited(`Wait ${waiting}s before requesting another code.`);
  }

  const code = generateCode();

  await redis
    .multi()
    .hset(codeKey(phoneHmac), { codeHash: hashCode(code, phoneHmac), attempts: 0 })
    .expire(codeKey(phoneHmac), env.OTP_TTL_SEC)
    .set(resendKey(phoneHmac), "1", "EX", env.OTP_RESEND_SEC)
    .exec();

  return { code, resendAfterSec: env.OTP_RESEND_SEC };
}

/**
 * Consumes a code. A correct code is deleted immediately, so it cannot be
 * replayed even inside its TTL.
 */
export async function verifyOtp(phoneHmac: string, code: string): Promise<void> {
  const k = codeKey(phoneHmac);
  const stored = await redis.hgetall(k);

  if (!stored.codeHash) {
    throw ApiError.validation("That code has expired. Request a new one.");
  }

  const attempts = Number(stored.attempts ?? 0);
  if (attempts >= MAX_ATTEMPTS) {
    await redis.del(k);
    throw ApiError.rateLimited("Too many attempts. Request a new code.");
  }

  if (!safeEqual(hashCode(code, phoneHmac), stored.codeHash)) {
    await redis.hincrby(k, "attempts", 1);
    throw ApiError.validation("That code isn't right.");
  }

  await redis.del(k);
}
