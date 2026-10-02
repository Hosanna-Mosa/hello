/**
 * Profile controllers.
 */

import type { Request, Response } from "express";

import { ApiError } from "@/errors/ApiError.js";
import * as meService from "@/services/me.service.js";
import { peekQuota, UNLIMITED } from "@/services/quota.service.js";
import { isPremiumNow } from "@/utils/entitlements.js";
import { announceDeletion } from "@/sockets/io.js";
import { toPreferences, toUser } from "@/serializers/user.serializer.js";
import type { MeUpdateBody, PreferencesUpdateBody } from "@/validators/me.validator.js";

function requireUser(req: Request) {
  const user = req.user;
  if (!user) throw ApiError.unauthorized();
  return user;
}

export async function getMe(req: Request, res: Response): Promise<void> {
  res.json(toUser(requireUser(req)));
}

export async function patchMe(req: Request, res: Response): Promise<void> {
  const updated = await meService.updateMe(requireUser(req), req.body as MeUpdateBody);
  res.json(toUser(updated));
}

export async function deleteMe(req: Request, res: Response): Promise<void> {
  const { reason } = req.body as { reason?: string };
  const user = requireUser(req);
  const { ended } = await meService.deleteAccount(user, reason);

  // The other side of every ended conversation finds out now, not on its next
  // refresh — and this account's own sockets close, since its sessions are gone.
  announceDeletion(String(user._id), ended);

  res.status(204).end();
}

export async function getPreferences(req: Request, res: Response): Promise<void> {
  res.json(toPreferences(requireUser(req)));
}

export async function patchPreferences(req: Request, res: Response): Promise<void> {
  const updated = await meService.updatePreferences(requireUser(req), req.body as PreferencesUpdateBody);
  res.json(toPreferences(updated));
}

/**
 * The tier and today's like allowance, as the SERVER sees them. The app reads
 * this rather than keeping its own count, so free and premium mean the same
 * thing on the phone as they do where they are enforced. JSON has no
 * Infinity, so an unlimited allowance is `-1`.
 */
export async function getEntitlements(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  const quota = await peekQuota(user);
  res.json({
    isPremium: isPremiumNow(user),
    expiresAt: isPremiumNow(user) && user.entitlements.expiresAt ? user.entitlements.expiresAt.toISOString() : null,
    likesRemaining: quota.remaining === UNLIMITED ? -1 : quota.remaining,
    likesResetAt: quota.resetAt.toISOString(),
  });
}
