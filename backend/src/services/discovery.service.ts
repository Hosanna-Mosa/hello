/**
 * Discovery: who is nearby, and who may see whom.
 *
 * Built on `$geoNear`, which must be the FIRST stage of the pipeline and needs
 * `key` named explicitly — the geo index here is compound
 * (`status` + `discoverable` + `location.point`), and without `key` Mongo
 * refuses with "unable to find index for $geoNear query" rather than picking
 * one.
 *
 * Four rules are enforced here and nowhere else, because a screen that forgets
 * one is a privacy incident rather than a bug:
 *
 * 1. `minAge` FLOORS AT 18 whatever is requested. The contract is explicit.
 * 2. `preferNotToSay` ALWAYS passes the gender filter. Excluding those users
 *    would leak exactly the value they asked to keep private — you would learn
 *    someone's gender by noticing they vanished from a filtered search.
 * 3. `discoverable: false` and any non-active status are excluded server-side.
 *    It changes what OTHER people see, so a client filter would hide the wrong
 *    side of the relationship.
 * 4. Nobody sees themselves, anyone they have passed, or anyone either party
 *    has blocked.
 */

import type { PipelineStage } from "mongoose";
import { Types } from "mongoose";

import { ApiError } from "@/errors/ApiError.js";
import { PassModel } from "@/models/pass.model.js";
import { UserModel, type UserDoc } from "@/models/user.model.js";
import { hiddenUserIds } from "@/services/visibility.service.js";
import { MINIMUM_AGE, clampMinAge } from "@/utils/age.js";
import { decodeCursor, encodeCursor, filterHash } from "@/utils/cursor.js";

export const PAGE_SIZE = 12;
/** Ceiling on any requested radius. The slider tops out at 60km. */
const MAX_RADIUS_M = 100_000;

export type DiscoveryFilters = {
  maxDistanceMetres?: number | undefined;
  minAge?: number | undefined;
  maxAge?: number | undefined;
  interestIds?: string[] | undefined;
  activeRecently?: boolean | undefined;
  genders?: string[] | undefined;
};

const DAY_MS = 86_400_000;

/**
 * Age is a birthday RANGE, never a stored number.
 *
 * Someone is `age` years old for the year following their `age`th birthday, so
 * "at least minAge" means "born on or before today minus minAge years".
 */
function birthdayRange(minAge: number, maxAge: number | undefined, now: Date): { $lte: Date; $gte?: Date } {
  const latest = new Date(now);
  latest.setUTCFullYear(latest.getUTCFullYear() - minAge);

  if (maxAge === undefined) return { $lte: latest };

  const earliest = new Date(now);
  earliest.setUTCFullYear(earliest.getUTCFullYear() - maxAge - 1);
  earliest.setUTCDate(earliest.getUTCDate() + 1);

  return { $lte: latest, $gte: earliest };
}

/**
 * A `$geoNear.query` document. Mongoose 9 no longer exports `FilterQuery`, and
 * pinning to whatever it exports this month buys nothing here — this object is
 * handed straight to the aggregation.
 */
type MatchStage = Record<string, unknown>;

async function buildMatchStage(viewer: UserDoc, filters: DiscoveryFilters): Promise<MatchStage> {
  const now = new Date();
  const minAge = clampMinAge(filters.minAge);

  const excluded = [
    viewer._id,
    ...(await hiddenUserIds(viewer)),
    ...(await PassModel.find({ userId: viewer._id }).distinct("targetId")),
  ];

  const match: MatchStage = {
    _id: { $nin: excluded },
    status: "active",
    "preferences.discoverable": true,
    onboardingComplete: true,
    birthday: birthdayRange(minAge, filters.maxAge, now),
  };

  if (filters.interestIds?.length) {
    match.interestIds = { $in: filters.interestIds };
  }

  if (filters.activeRecently) {
    match.lastActiveAt = { $gte: new Date(now.getTime() - DAY_MS) };
  }

  if (filters.genders?.length) {
    // Rule 2. `preferNotToSay` is unioned in, never filtered out — otherwise
    // absence from a gender-filtered result reveals the hidden value.
    match.publicGenderKind = { $in: [...new Set([...filters.genders, "preferNotToSay"])] };
  }

  return match;
}

function viewerPoint(viewer: UserDoc): [number, number] {
  const coords = viewer.location?.point?.coordinates;
  if (!coords || coords.length !== 2) {
    throw ApiError.validation("Set your location before browsing people nearby.");
  }
  return [coords[0] as number, coords[1] as number];
}

export type DiscoveryPage = { items: (UserDoc & { distanceMetres: number })[]; nextCursor: string | null };

export async function listNearby(
  viewer: UserDoc,
  filters: DiscoveryFilters,
  rawCursor?: string,
): Promise<DiscoveryPage> {
  const hash = filterHash(filters);
  const after = rawCursor ? decodeCursor(rawCursor, String(viewer._id), hash) : null;

  const match = await buildMatchStage(viewer, filters);

  const pipeline: PipelineStage[] = [
    {
      $geoNear: {
        near: { type: "Point", coordinates: viewerPoint(viewer) },
        distanceField: "distanceMetres",
        maxDistance: Math.min(filters.maxDistanceMetres ?? MAX_RADIUS_M, MAX_RADIUS_M),
        // Required: the 2dsphere is part of a compound index, so Mongo will not
        // infer it.
        key: "location.point",
        query: match,
        spherical: true,
      },
    },
  ];

  if (after) {
    // Keyset, not offset: "strictly further away, or the same distance with a
    // larger id". Stable if someone is inserted between two page fetches.
    pipeline.push({
      $match: {
        $or: [
          { distanceMetres: { $gt: after.d } },
          { distanceMetres: after.d, _id: { $gt: new Types.ObjectId(after.i) } },
        ],
      },
    });
  }

  // $geoNear already sorts by distance; _id breaks ties so the order is total.
  pipeline.push({ $sort: { distanceMetres: 1, _id: 1 } }, { $limit: PAGE_SIZE + 1 });

  const rows = (await UserModel.aggregate(pipeline)) as (UserDoc & { distanceMetres: number })[];

  const hasMore = rows.length > PAGE_SIZE;
  const items = hasMore ? rows.slice(0, PAGE_SIZE) : rows;
  const last = items[items.length - 1];

  return {
    items,
    nextCursor:
      hasMore && last
        ? encodeCursor({ uid: String(viewer._id), d: last.distanceMetres, i: String(last._id), f: hash })
        : null,
  };
}

export async function countMatching(viewer: UserDoc, filters: DiscoveryFilters): Promise<number> {
  const match = await buildMatchStage(viewer, filters);

  const rows = await UserModel.aggregate([
    {
      $geoNear: {
        near: { type: "Point", coordinates: viewerPoint(viewer) },
        distanceField: "distanceMetres",
        maxDistance: Math.min(filters.maxDistanceMetres ?? MAX_RADIUS_M, MAX_RADIUS_M),
        key: "location.point",
        query: match,
        spherical: true,
      },
    },
    { $count: "count" },
  ]);

  return (rows[0] as { count?: number } | undefined)?.count ?? 0;
}

/**
 * One profile by id.
 *
 * `notFound` — never `unauthorized` — for someone blocked, deleted or hidden.
 * A different status for "exists but you may not see it" confirms the account
 * exists, which is the leak.
 */
export async function getProfile(viewer: UserDoc, id: string): Promise<UserDoc & { distanceMetres: number }> {
  if (!Types.ObjectId.isValid(id)) throw ApiError.notFound();

  const hidden = await hiddenUserIds(viewer);
  if (hidden.some((h) => String(h) === id)) throw ApiError.notFound();

  const target = await UserModel.findOne({ _id: id, status: "active" });
  if (!target) throw ApiError.notFound();

  const from = viewer.location?.point?.coordinates;
  const to = target.location?.point?.coordinates;
  let distanceMetres = 0;

  if (from && to) {
    const { haversineMetres } = await import("@/utils/geo.js");
    distanceMetres = haversineMetres(
      { longitude: from[0] as number, latitude: from[1] as number },
      { longitude: to[0] as number, latitude: to[1] as number },
    );
  }

  return Object.assign(target, { distanceMetres });
}

/** Name search. Deliberately name-only, per the contract — bios are not indexed. */
export async function searchByName(viewer: UserDoc, query: string): Promise<(UserDoc & { distanceMetres: number })[]> {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const match = await buildMatchStage(viewer, { minAge: MINIMUM_AGE });

  const rows = (await UserModel.aggregate([
    {
      $geoNear: {
        near: { type: "Point", coordinates: viewerPoint(viewer) },
        distanceField: "distanceMetres",
        maxDistance: MAX_RADIUS_M,
        key: "location.point",
        // Escaped: an unescaped user string in a regex is a denial-of-service
        // waiting for someone to send `(a+)+$`.
        query: { ...match, nameLower: { $regex: `^${q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}` } },
        spherical: true,
      },
    },
    { $sort: { distanceMetres: 1, _id: 1 } },
    { $limit: 20 },
  ])) as (UserDoc & { distanceMetres: number })[];

  return rows;
}
