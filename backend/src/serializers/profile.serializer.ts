/**
 * Another person's profile, as the client may see it.
 *
 * `PublicProfile` is `Omit<User, "birthday" | "location" | "showGender"> &
 * { age, distanceMetres }`. The omissions are the point, and they are built by
 * ALLOWLIST here rather than by deleting fields from a user document — a
 * delete-list silently starts leaking the day someone adds a column.
 *
 * Three rules this file exists to hold:
 *
 * 1. NO COORDINATE EVER. The contract is explicit: "The client must never
 *    receive another user's coordinates." Only a quantised distance leaves.
 * 2. NO BIRTHDAY. Age is derived. A birthday is a real identifier and is
 *    needed by nobody but its owner.
 * 3. GENDER COMES FROM `publicGenderKind`, never from `gender`. That field is
 *    derived in a model hook from `showGender`, so a caller here cannot leak a
 *    hidden gender by forgetting to check a flag.
 */

import type { Gender, PublicProfile } from "@/types/wire.js";
import type { UserDoc } from "@/models/user.model.js";
import { ageFrom } from "@/utils/age.js";
import { quantiseMetres } from "@/utils/geo.js";

/**
 * A row from the discovery aggregation.
 *
 * NOT a hydrated Mongoose document: `aggregate()` returns PLAIN OBJECTS, so
 * `doc.get(...)` does not exist on them. Everything below reads properties
 * directly, which works for both a POJO and a hydrated doc — `findOne` results
 * reach this serializer too.
 */
export type ProfileWithDistance = Omit<UserDoc, "get"> & {
  distanceMetres?: number;
  createdAt?: Date;
};

function publicGender(doc: ProfileWithDistance): Gender {
  const kind = doc.publicGenderKind ?? "preferNotToSay";

  // `selfDescribed` keeps its free-text label ONLY while it is public. If the
  // user hid their gender, `publicGenderKind` is already `preferNotToSay` and
  // the label never reaches this branch.
  if (kind === "selfDescribed") {
    return { kind: "selfDescribed", label: doc.gender?.label ?? "" };
  }
  if (kind === "woman" || kind === "man" || kind === "nonBinary") return { kind };
  return { kind: "preferNotToSay" };
}

export function toPublicProfile(doc: ProfileWithDistance, distanceMetres?: number): PublicProfile {
  const metres = distanceMetres ?? doc.distanceMetres ?? 0;

  return {
    id: String(doc._id),
    name: doc.name ?? "",
    gender: publicGender(doc),
    avatarId: doc.avatarId ?? "",
    bio: doc.bio ?? "",
    interestIds: doc.interestIds ?? [],
    age: doc.birthday ? ageFrom(doc.birthday) : 0,
    // Quantised. Exact metres from a few vantage points trilaterate a home
    // address, and the client's formatter already rounds, so nothing is lost.
    distanceMetres: quantiseMetres(metres),
    lastActiveAt: (doc.lastActiveAt ?? new Date()).toISOString(),
    createdAt: (doc.createdAt ?? new Date()).toISOString(),
  };
}
