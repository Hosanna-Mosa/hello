/**
 * Reference data: interests, avatars, plans.
 *
 * All three are small, static and read by every client on startup, so they are
 * served whole rather than paginated — a cursor over 60 rows is ceremony.
 * Retired rows (`active: false`) are excluded: a profile that still references
 * one keeps working, but nobody may pick it again.
 */

import type { Request, Response } from "express";

import { AvatarModel } from "@/models/avatar.model.js";
import { InterestModel } from "@/models/interest.model.js";
import { PlanModel } from "@/models/plan.model.js";
import { toAvatar, toInterest, toPlan } from "@/serializers/taxonomy.serializer.js";

export async function getInterests(_req: Request, res: Response): Promise<void> {
  const rows = await InterestModel.find({ active: true }).sort({ sortOrder: 1 });
  res.json(rows.map(toInterest));
}

export async function getAvatars(_req: Request, res: Response): Promise<void> {
  const rows = await AvatarModel.find({ active: true }).sort({ sortOrder: 1 });
  res.json(rows.map(toAvatar));
}

export async function getPlans(_req: Request, res: Response): Promise<void> {
  const rows = await PlanModel.find({ active: true }).sort({ sortOrder: 1 });
  res.json(rows.map(toPlan));
}
