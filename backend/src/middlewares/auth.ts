/**
 * Bearer auth.
 *
 * Three things are checked, in this order, because each is cheaper than the
 * next: the signature, the denylist (one Redis hit — this is what makes sign-out
 * immediate rather than "within 15 minutes"), then the account's own state.
 *
 * A suspended or erased account is rejected here rather than in every
 * controller, because a token issued before the account was closed is still
 * cryptographically valid and would otherwise keep working.
 */

import type { NextFunction, Request, Response } from "express";

import { ApiError } from "@/errors/ApiError.js";
import { UserModel, type UserDoc } from "@/models/user.model.js";
import { isAccessDenylisted, verifyAccess } from "@/services/token.service.js";

declare module "express-serve-static-core" {
  interface Request {
    user?: UserDoc;
    sessionId?: string;
    accessJti?: string;
    accessExp?: number;
  }
}

function bearer(req: Request): string {
  const header = req.header("authorization");
  if (!header?.startsWith("Bearer ")) throw ApiError.unauthorized();
  const token = header.slice("Bearer ".length).trim();
  if (!token) throw ApiError.unauthorized();
  return token;
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const claims = verifyAccess(bearer(req));

    if (await isAccessDenylisted(claims.jti)) throw ApiError.unauthorized();

    const user = await UserModel.findById(claims.sub);
    if (!user) throw ApiError.unauthorized();

    // A token minted before deletion is still validly signed, and the access
    // token outlives the refresh revocation by up to its own 15 minutes. So the
    // ACCOUNT STATE is the authority, not the token.
    //
    // `pendingDeletion` is rejected too: the user asked to be deleted, and a
    // request that still works afterwards makes the button a lie. Coming back
    // is done by signing in again, which restores the account inside the grace
    // period — that path needs no token, which is just as well, because
    // deletion revoked them all.
    if (user.status !== "active") throw ApiError.unauthorized();

    req.user = user;
    req.sessionId = claims.sid;
    req.accessJti = claims.jti;
    req.accessExp = claims.exp;
    next();
  } catch (e) {
    next(e);
  }
}

/**
 * Guards everything that assumes a finished profile.
 *
 * Deliberately NOT applied to `/me` — a half-onboarded user has to be able to
 * read and patch their own profile, which is precisely how they finish
 * onboarding.
 */
export function requireOnboarded(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user?.onboardingComplete) {
    next(ApiError.validation("Finish setting up your profile first."));
    return;
  }
  next();
}
