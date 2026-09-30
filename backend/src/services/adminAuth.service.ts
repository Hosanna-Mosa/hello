/**
 * Admin sign-in and sessions.
 *
 * The token is a JWT signed with `ADMIN_JWT_SECRET` and an `aud` of "admin",
 * so neither an app access token nor anything signed with the app's secret can
 * pass as one. It is only accepted while Redis holds its session key, which is
 * what makes sign-out immediate and every session revocable.
 *
 * Failure messages are identical for "no such email", "wrong password" and
 * "disabled": telling them apart tells a guesser which emails are worth
 * attacking.
 */

import { randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";

import { env } from "@/config/env.js";
import { logger } from "@/config/logger.js";
import { key, redis } from "@/config/redis.js";
import { ApiError } from "@/errors/ApiError.js";
import { AdminModel, type AdminDoc } from "@/models/admin.model.js";
import { decoyHash, verifyPassword } from "@/utils/password.js";

const MAX_FAILURES = 5;
const LOCK_MS = 15 * 60 * 1000;
const AUDIENCE = "admin";
const BAD_CREDENTIALS = "Email or password is incorrect.";

type AdminClaims = { sub: string; jti: string; exp: number };

const sessionKey = (jti: string) => key(`adminsess:${jti}`);

export function adminAuthConfigured(): boolean {
  return Boolean(env.ADMIN_JWT_SECRET);
}

function secret(): string {
  if (!env.ADMIN_JWT_SECRET) throw ApiError.unauthorized("Admin access is not configured on this server.");
  return env.ADMIN_JWT_SECRET;
}

export async function login(email: string, password: string): Promise<{ admin: AdminDoc; token: string }> {
  const admin = await AdminModel.findOne({ email: email.trim().toLowerCase() });

  if (!admin) {
    await verifyPassword(password, await decoyHash());
    throw ApiError.unauthorized(BAD_CREDENTIALS);
  }

  if (admin.lockedUntil && admin.lockedUntil.getTime() > Date.now()) {
    throw ApiError.rateLimited("Too many failed attempts. Try again in 15 minutes.");
  }

  const ok = await verifyPassword(password, admin.passwordHash);
  if (!ok || admin.status !== "active") {
    admin.failedAttempts += 1;
    if (admin.failedAttempts >= MAX_FAILURES) {
      admin.lockedUntil = new Date(Date.now() + LOCK_MS);
      admin.failedAttempts = 0;
      logger.warn({ adminId: String(admin._id) }, "[admin] account locked after repeated failures");
    }
    await admin.save();
    throw ApiError.unauthorized(BAD_CREDENTIALS);
  }

  admin.failedAttempts = 0;
  admin.lockedUntil = null;
  admin.lastLoginAt = new Date();
  await admin.save();

  const jti = randomUUID();
  const token = jwt.sign({ sub: String(admin._id), jti }, secret(), {
    audience: AUDIENCE,
    expiresIn: env.ADMIN_SESSION_TTL_SEC,
  });
  await redis.set(sessionKey(jti), String(admin._id), "EX", env.ADMIN_SESSION_TTL_SEC);

  logger.info({ adminId: String(admin._id) }, "[admin] signed in");
  return { admin, token };
}

/** Signature, audience and expiry, then the live session, then the account. */
export async function authenticate(token: string): Promise<{ admin: AdminDoc; jti: string }> {
  let claims: AdminClaims;
  try {
    claims = jwt.verify(token, secret(), { audience: AUDIENCE }) as AdminClaims;
  } catch (e) {
    if (e instanceof ApiError) throw e;
    throw ApiError.unauthorized();
  }

  const owner = await redis.get(sessionKey(claims.jti));
  if (owner !== claims.sub) throw ApiError.unauthorized();

  const admin = await AdminModel.findById(claims.sub);
  if (!admin || admin.status !== "active") throw ApiError.unauthorized();

  return { admin, jti: claims.jti };
}

export async function logout(jti: string): Promise<void> {
  await redis.del(sessionKey(jti));
}

// ---------------------------------------------------------------------------
// Socket tickets
// ---------------------------------------------------------------------------

/**
 * The panel's live connection cannot use the session cookie: it is HttpOnly
 * and scoped to `/v1/admin`, and the socket handshake goes to `/socket.io`.
 * Widening the cookie's path would hand it to every request on the host.
 *
 * So the panel trades its cookie for a SOCKET TICKET: a JWT with its own
 * audience, bound to the session that issued it, valid for one minute — long
 * enough to open a socket, useless afterwards. The socket then lives only as
 * long as that session does (see `sockets/admin.socket.ts`).
 */
const SOCKET_AUDIENCE = "admin-socket";
const SOCKET_TICKET_TTL_SEC = 60;

type SocketClaims = { sub: string; sid: string };

export function issueSocketTicket(admin: AdminDoc, jti: string): { token: string; expiresIn: number } {
  const token = jwt.sign({ sub: String(admin._id), sid: jti }, secret(), {
    audience: SOCKET_AUDIENCE,
    expiresIn: SOCKET_TICKET_TTL_SEC,
  });
  return { token, expiresIn: SOCKET_TICKET_TTL_SEC };
}

/**
 * A socket ticket, then the session it names, then the account.
 *
 * Returns how long the session has left, so the socket can be closed the
 * moment the session would have expired instead of outliving it.
 */
export async function authenticateSocketTicket(
  token: string,
): Promise<{ admin: AdminDoc; jti: string; sessionMsLeft: number }> {
  let claims: SocketClaims;
  try {
    claims = jwt.verify(token, secret(), { audience: SOCKET_AUDIENCE }) as SocketClaims;
  } catch (e) {
    if (e instanceof ApiError) throw e;
    throw ApiError.unauthorized();
  }

  const [owner, msLeft] = await Promise.all([redis.get(sessionKey(claims.sid)), redis.pttl(sessionKey(claims.sid))]);
  if (owner !== claims.sub || msLeft <= 0) throw ApiError.unauthorized();

  const admin = await AdminModel.findById(claims.sub);
  if (!admin || admin.status !== "active") throw ApiError.unauthorized();

  return { admin, jti: claims.sid, sessionMsLeft: msLeft };
}
