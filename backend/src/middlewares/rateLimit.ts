/**
 * Rate limiting, backed by Redis so limits hold across processes.
 *
 * The OTP endpoints are the ones that matter most. Without a cap, `POST
 * /auth/code` is an open invitation to send SMS on someone else's account —
 * which is a direct bill the day delivery stops being faked, and a way to
 * harass a phone number in the meantime.
 *
 * Two dimensions per OTP route on purpose: per phone (stops one number being
 * hammered) and per IP (stops one attacker walking through many numbers).
 * Either alone leaves the other attack wide open.
 */

import type { NextFunction, Request, Response } from "express";
import { RateLimiterRedis } from "rate-limiter-flexible";

import { env } from "@/config/env.js";
import { redis } from "@/config/redis.js";
import { ApiError } from "@/errors/ApiError.js";
import { phoneHmac } from "@/utils/phone.js";

type Bucket = { points: number; durationSec: number };

const BUCKETS = {
  "auth-code-phone": { points: 5, durationSec: 3_600 },
  "auth-code-ip": { points: 20, durationSec: 3_600 },
  "auth-verify-phone": { points: 10, durationSec: 900 },
  "auth-email-ip": { points: 10, durationSec: 900 },
  "auth-refresh-ip": { points: 60, durationSec: 3_600 },
  "me-write": { points: 60, durationSec: 3_600 },
  /**
   * 60/min — one per second sustained.
   *
   * Was 30, which a heated back-and-forth can genuinely reach: that is one
   * message every two seconds, and a real conversation does hit that. A limit
   * that fires on legitimate use trains people to distrust the app, so this is
   * set to stop a script rather than to pace a person.
   */
  "message-send": { points: 60, durationSec: 60 },
  global: { points: 600, durationSec: 300 },
} satisfies Record<string, Bucket>;

export type BucketName = keyof typeof BUCKETS;

const limiters = new Map<BucketName, RateLimiterRedis>();

function limiter(name: BucketName): RateLimiterRedis {
  let found = limiters.get(name);
  if (!found) {
    const bucket = BUCKETS[name];
    found = new RateLimiterRedis({
      storeClient: redis,
      keyPrefix: `${env.REDIS_PREFIX}:rl:${name}`,
      points: bucket.points,
      duration: bucket.durationSec,
    });
    limiters.set(name, found);
  }
  return found;
}

/** Hashed, because a raw IP in a Redis key is personal data with no lookup need. */
function subjectFor(req: Request, by: "ip" | "phone"): string | null {
  if (by === "ip") return req.ip ?? "unknown";

  const { countryCode, phoneNumber } = (req.body ?? {}) as { countryCode?: string; phoneNumber?: string };
  if (!countryCode || !phoneNumber) return null;
  try {
    return phoneHmac(`+${String(countryCode).replace(/\D/g, "")}${String(phoneNumber).replace(/\D/g, "")}`);
  } catch {
    return null;
  }
}

export function rateLimit(name: BucketName, by: "ip" | "phone" = "ip") {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const subject = subjectFor(req, by);
    // No subject means a malformed body; validation will reject it in a moment
    // with a clearer message than a 429 would give.
    if (!subject) {
      next();
      return;
    }

    try {
      const result = await limiter(name).consume(subject);
      res.setHeader("x-ratelimit-remaining", String(result.remainingPoints));
      next();
    } catch (e) {
      const retryMs = (e as { msBeforeNext?: number }).msBeforeNext;
      if (typeof retryMs === "number") {
        const seconds = Math.ceil(retryMs / 1000);
        res.setHeader("retry-after", String(seconds));
        next(ApiError.rateLimited(`Too many attempts. Try again in ${seconds}s.`));
        return;
      }
      // A Redis outage must not lock everyone out of the product.
      next();
    }
  };
}
