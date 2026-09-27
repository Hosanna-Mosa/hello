/**
 * Discovery controllers.
 */

import type { Request, Response } from "express";
import { Types } from "mongoose";

import { ApiError } from "@/errors/ApiError.js";
import { PassModel } from "@/models/pass.model.js";
import { toPublicProfile } from "@/serializers/profile.serializer.js";
import * as discovery from "@/services/discovery.service.js";
import { discoveryQuerySchema, searchQuerySchema } from "@/validators/discovery.validator.js";

function requireUser(req: Request) {
  const user = req.user;
  if (!user) throw ApiError.unauthorized();
  return user;
}

/** Query strings are validated here rather than by middleware, which owns bodies. */
function filtersFrom(req: Request) {
  const parsed = discoveryQuerySchema.safeParse(req.query);
  if (!parsed.success) throw parsed.error;

  const { cursor, ...filters } = parsed.data;
  return { filters, cursor };
}

export async function getProfiles(req: Request, res: Response): Promise<void> {
  const { filters, cursor } = filtersFrom(req);
  const page = await discovery.listNearby(requireUser(req), filters, cursor);

  res.json({
    items: page.items.map((doc) => toPublicProfile(doc, doc.distanceMetres)),
    nextCursor: page.nextCursor,
  });
}

export async function getProfilesCount(req: Request, res: Response): Promise<void> {
  const { filters } = filtersFrom(req);
  res.json({ count: await discovery.countMatching(requireUser(req), filters) });
}

export async function getProfile(req: Request, res: Response): Promise<void> {
  // Express 5 types a param as `string | string[]`; a repeated `:id` is not a
  // thing this route can serve, so anything but a single string is notFound.
  const id = req.params.id;
  if (typeof id !== "string" || !id) throw ApiError.notFound();

  const doc = await discovery.getProfile(requireUser(req), id);
  res.json(toPublicProfile(doc, doc.distanceMetres));
}

export async function searchProfiles(req: Request, res: Response): Promise<void> {
  const parsed = searchQuerySchema.safeParse(req.query);
  if (!parsed.success) throw parsed.error;

  const rows = await discovery.searchByName(requireUser(req), parsed.data.q ?? "");
  res.json(rows.map((doc) => toPublicProfile(doc, doc.distanceMetres)));
}

export async function postPass(req: Request, res: Response): Promise<void> {
  const viewer = requireUser(req);
  const { targetId } = req.body as { targetId: string };

  if (!Types.ObjectId.isValid(targetId)) throw ApiError.validation("Unknown profile.");
  if (String(viewer._id) === targetId) throw ApiError.validation("You cannot pass on yourself.");

  // Idempotent: swiping the same card twice on a flaky connection must not be
  // an error, and the unique index would otherwise make it one.
  await PassModel.updateOne(
    { userId: viewer._id, targetId },
    { $setOnInsert: { userId: viewer._id, targetId, source: "deck", createdAt: new Date() } },
    { upsert: true },
  );

  res.status(204).end();
}
