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
  /** Password sign-in. Successes count too, so this is set above a person's retries. */
  "auth-login-ip": { points: 20, durationSec: 900 },
  /** Per account, whoever is asking — a distributed guesser still meets this one. */
  "auth-login-account": { points: 10, durationSec: 900 },
  /** Account creation. Also caps how fast "email already exists" can be probed. */
  "auth-signup-ip": { points: 10, durationSec: 3_600 },
  "auth-refresh-ip": { points: 60, durationSec: 3_600 },
  /** Admin sign-in, per IP. The per-account lockout lives on the admin row. */
  "admin-login-ip": { points: 10, durationSec: 900 },
  "me-write": { points: 60, durationSec: 3_600 },
  /** Opening support tickets. Generous for a person, a wall for a script. */
  "support-create": { points: 10, durationSec: 3_600 },
  /**
   * 60/min — one per second sustained.
   *
   * Was 30, which a heated back-and-forth can genuinely reach: that is one
   * message every two seconds, and a real conversation does hit that. A limit
   * that fires on legitimate use trains people to distrust the app, so this is
   * set to stop a script rather than to pace a person.
   */
  "message-send": { points: 60, durationSec: 60 },
  /**
   * Location changes, per account per day. A real phone moves a handful of
   * times a day; walking a spoofed position around to triangulate someone
   * needs many more.
   */
  "location-change": { points: 20, durationSec: 86_400 },
  /** Creating payment orders. Each one makes a Razorpay link; a person needs a few. */
  "billing-order": { points: 10, durationSec: 3_600 },
  /** Starting a call rings someone's phone. Stops a script from ring-bombing a match. */
  "call-start": { points: 30, durationSec: 600 },
  /**
   * Every signed-in request, per ACCOUNT. 2/s sustained over five minutes is far
   * above what a person tapping through the app produces, and far below what a
   * scraper walking `/profiles/:id` needs.
   */
  "api-user": { points: 600, durationSec: 300 },
  /**
   * Every socket event, per account. ICE trickling sends a burst of candidates
   * per call, so this is a flood stop (6/s sustained), not a pacer — the
   * per-action buckets above still apply to the events that have one.
   */
  "socket-event": { points: 1_800, durationSec: 300 },
  /** Every authenticated admin request, per operator. */
  "admin-api": { points: 600, durationSec: 300 },
  /**
   * Every request, per IP — the flood floor under everything else, applied in
   * `app.ts`. Deliberately generous: Indian carriers put thousands of phones
   * behind one CGNAT address, so a tight per-IP limit would throttle real
   * people. The per-account buckets above are the ones that pace a person.
   */
  global: { points: 3_000, durationSec: 300 },
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
function subjectFor(req: Request, by: Subject): string | null {
  if (by === "ip") return req.ip ?? "unknown";

  if (by === "user") {
    // Per account, so people sharing a carrier's NAT address do not share a
    // budget. Mounted after `requireAuth` / `requireAdmin`; the IP fallback only
    // matters if a route ever forgets that ordering.
    if (req.user) return `u:${String(req.user._id)}`;
    if (req.admin) return `a:${String(req.admin._id)}`;
    return `ip:${req.ip ?? "unknown"}`;
  }

  if (by === "identifier") {
    // The sign-in identifier, normalised the way `auth.service.login` reads it
    // so `A@x.com` and `a@x.com ` share one bucket. Hashed under the pepper —
    // a raw email in a Redis key is personal data.
    const raw = String((req.body as { identifier?: unknown } | undefined)?.identifier ?? "").trim();
    if (!raw) return null;
    const norm = raw.includes("@") ? raw.toLowerCase() : `+${raw.replace(/\D/g, "")}`;
    return phoneHmac(`login:${norm}`);
  }

  const { countryCode, phoneNumber } = (req.body ?? {}) as { countryCode?: string; phoneNumber?: string };
  if (!countryCode || !phoneNumber) return null;
  try {
    return phoneHmac(`+${String(countryCode).replace(/\D/g, "")}${String(phoneNumber).replace(/\D/g, "")}`);
  } catch {
    return null;
  }
}

type Subject = "ip" | "phone" | "identifier" | "user";

/**
 * `rateLimit` for code that is not an HTTP middleware — socket handlers, and
 * services that limit one field of a larger request (a location change). `subject` should match what the HTTP
 * path uses (`u:<userId>`), so REST and socket share ONE budget and neither door
 * is a way around the other. False when spent; true on a Redis outage, for the
 * same reason the HTTP path fails open.
 */
export async function consumeBucket(name: BucketName, subject: string): Promise<boolean> {
  try {
    await limiter(name).consume(subject);
    return true;
  } catch (e) {
    return typeof (e as { msBeforeNext?: number }).msBeforeNext !== "number";
  }
}

export function rateLimit(name: BucketName, by: Subject = "ip") {
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
