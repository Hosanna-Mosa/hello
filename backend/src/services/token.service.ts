/**
 * Access and refresh tokens.
 *
 * The access token is a stateless JWT (15 minutes). The refresh token is a JWT
 * too, but it is only accepted while Redis still holds its hash — so it is
 * revocable, which a bare JWT is not.
 *
 * ROTATION + REUSE DETECTION is the point of the design:
 *
 *   refresh #1 used -> #2 issued, hash(#1) kept as `prevHash`
 *   refresh #2 used -> #3 issued, hash(#2) becomes `prevHash`
 *   refresh #1 used AGAIN -> matches `prevHash` -> THEFT
 *
 * A legitimate client never replays a refresh token it has already exchanged.
 * Seeing one means two parties hold it, so the entire family is destroyed and
 * that device signs in again. Losing a session is the correct price when the
 * alternative is a silently shared account.
 *
 * Signing out also denylists the outstanding access token. Without that, "sign
 * out" leaves a working credential for up to 15 more minutes, which is not what
 * the button appears to promise.
 */

import { createHash, randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";

import { env } from "@/config/env.js";
import { key, redis } from "@/config/redis.js";
import { ApiError } from "@/errors/ApiError.js";
import { SessionModel } from "@/models/session.model.js";

type AccessClaims = { sub: string; sid: string; jti: string };
type RefreshClaims = { sub: string; sid: string; jti: string };

export type TokenPair = { token: string; refreshToken: string; expiresIn: number };

const sha = (v: string) => createHash("sha256").update(v).digest("hex");

const sessionKey = (userId: string, sessionId: string) => key(`sess:{u:${userId}}:${sessionId}`);
const sessionIndexKey = (userId: string) => key(`sess:index:{u:${userId}}`);
const accessDenyKey = (jti: string) => key(`atblock:${jti}`);

function signAccess(userId: string, sessionId: string): string {
  return jwt.sign({ sub: userId, sid: sessionId, jti: randomUUID() } satisfies AccessClaims, env.JWT_ACCESS_SECRET, {
    algorithm: "HS256",
    expiresIn: env.ACCESS_TTL_SEC,
  });
}

function signRefresh(userId: string, sessionId: string): string {
  return jwt.sign({ sub: userId, sid: sessionId, jti: randomUUID() } satisfies RefreshClaims, env.JWT_REFRESH_SECRET, {
    algorithm: "HS256",
    expiresIn: env.REFRESH_TTL_SEC,
  });
}

/** Opens a NEW session — a fresh sign-in, not a rotation. */
export async function issuePair(
  userId: string,
  meta: { userAgent?: string | undefined; ipHash?: string | undefined } = {},
): Promise<TokenPair> {
  const sessionId = randomUUID();
  const refreshToken = signRefresh(userId, sessionId);
  const token = signAccess(userId, sessionId);

  await SessionModel.create({
    userId,
    sessionId,
    expiresAt: new Date(Date.now() + env.REFRESH_TTL_SEC * 1000),
    userAgent: meta.userAgent ?? null,
    ipHash: meta.ipHash ?? null,
  });

  const k = sessionKey(userId, sessionId);
  await redis
    .multi()
    .hset(k, { refreshHash: sha(refreshToken), prevHash: "" })
    .expire(k, env.REFRESH_TTL_SEC)
    .sadd(sessionIndexKey(userId), sessionId)
    .expire(sessionIndexKey(userId), env.REFRESH_TTL_SEC)
    .exec();

  return { token, refreshToken, expiresIn: env.ACCESS_TTL_SEC };
}

/** Exchanges a refresh token, rotating it. Detects reuse. */
export async function rotatePair(presented: string): Promise<TokenPair> {
  let claims: RefreshClaims;
  try {
    claims = jwt.verify(presented, env.JWT_REFRESH_SECRET, { algorithms: ["HS256"] }) as RefreshClaims;
  } catch {
    throw ApiError.unauthorized("Your session has expired. Please sign in again.");
  }

  const { sub: userId, sid: sessionId } = claims;
  const k = sessionKey(userId, sessionId);
  const stored = await redis.hgetall(k);

  if (!stored.refreshHash) {
    throw ApiError.unauthorized("Your session has expired. Please sign in again.");
  }

  const presentedHash = sha(presented);

  // Already exchanged once, or simply wrong. Either way two parties hold it.
  if (presentedHash !== stored.refreshHash) {
    await revokeSession(userId, sessionId, "reuse");
    throw ApiError.unauthorized("Please sign in again.");
  }

  const refreshToken = signRefresh(userId, sessionId);
  const token = signAccess(userId, sessionId);

  await redis.multi().hset(k, { refreshHash: sha(refreshToken), prevHash: presentedHash }).expire(k, env.REFRESH_TTL_SEC).exec();
  await SessionModel.updateOne({ userId, sessionId }, { $set: { lastSeenAt: new Date() } });

  return { token, refreshToken, expiresIn: env.ACCESS_TTL_SEC };
}

export async function revokeSession(
  userId: string,
  sessionId: string,
  reason: "signout" | "reuse" | "adminRevoke" | "accountDeleted",
): Promise<void> {
  await redis.multi().del(sessionKey(userId, sessionId)).srem(sessionIndexKey(userId), sessionId).exec();
  await SessionModel.updateOne(
    { userId, sessionId, revokedAt: null },
    { $set: { revokedAt: new Date(), revokedReason: reason } },
  );
}

/** Sign out everywhere — used by account deletion and an admin revoke. */
export async function revokeAllSessions(userId: string, reason: "accountDeleted" | "adminRevoke"): Promise<void> {
  const ids = await redis.smembers(sessionIndexKey(userId));
  if (ids.length > 0) await redis.del(...ids.map((id) => sessionKey(userId, id)));
  await redis.del(sessionIndexKey(userId));
  await SessionModel.updateMany({ userId, revokedAt: null }, { $set: { revokedAt: new Date(), revokedReason: reason } });
}

/**
 * Kills an access token before its own expiry. The TTL is the token's remaining
 * life, so the key disappears exactly when it stops mattering.
 */
export async function denylistAccess(jti: string, expSeconds: number): Promise<void> {
  const ttl = Math.max(expSeconds - Math.floor(Date.now() / 1000), 1);
  await redis.set(accessDenyKey(jti), "1", "EX", ttl);
}

export async function isAccessDenylisted(jti: string): Promise<boolean> {
  return (await redis.exists(accessDenyKey(jti))) === 1;
}

export function verifyAccess(token: string): AccessClaims & { exp: number } {
  try {
    return jwt.verify(token, env.JWT_ACCESS_SECRET, { algorithms: ["HS256"] }) as AccessClaims & { exp: number };
  } catch {
    throw ApiError.unauthorized();
  }
}
