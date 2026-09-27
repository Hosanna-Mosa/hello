/**
 * Profile controllers.
 */

import type { Request, Response } from "express";

import { ApiError } from "@/errors/ApiError.js";
import * as meService from "@/services/me.service.js";
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
  await meService.requestDeletion(requireUser(req), reason);
  res.status(204).end();
}

export async function getPreferences(req: Request, res: Response): Promise<void> {
  res.json(toPreferences(requireUser(req)));
}

export async function patchPreferences(req: Request, res: Response): Promise<void> {
  const updated = await meService.updatePreferences(requireUser(req), req.body as PreferencesUpdateBody);
  res.json(toPreferences(updated));
}
