/**
 * Document -> wire type. The only place a response body is built.
 *
 * These are ALLOWLISTS, built field by field. A blocklist would mean every new
 * column is public until someone remembers to hide it; an allowlist means a new
 * column is private until someone deliberately exposes it. For a product whose
 * whole risk surface is personal data, that default has to point the safe way.
 *
 * The return types come from the app's own `types.ts`, so a field the client
 * does not expect cannot be added here without breaking the build on both
 * sides.
 */

import type { Gender, Preferences, Session, User } from "@/types/wire.js";
import type { UserDoc } from "@/models/user.model.js";
import { NOTIFICATION_CHANNELS } from "@/models/user.model.js";
import type { TokenPair } from "@/services/token.service.js";

const iso = (d: Date | null | undefined): string => (d ?? new Date()).toISOString();

/** `1998-03-14` — date only, per the contract. */
const isoDate = (d: Date | null | undefined): string => (d ? d.toISOString().slice(0, 10) : "");

function toGender(kind: string, label?: string | null): Gender {
  switch (kind) {
    case "woman":
    case "man":
    case "nonBinary":
      return { kind };
    case "selfDescribed":
      return { kind: "selfDescribed", label: label ?? "" };
    default:
      return { kind: "preferNotToSay" };
  }
}

/**
 * The OWNER's view. Carries birthday and coordinates, which no other endpoint
 * may ever return — `GET /me` is the only place they are legitimate.
 */
export function toUser(doc: UserDoc): User {
  const point = doc.location?.point;
  const coords = point?.coordinates;

  return {
    id: String(doc._id),
    name: doc.name ?? "",
    birthday: isoDate(doc.birthday),
    gender: toGender(doc.gender?.kind ?? "preferNotToSay", doc.gender?.label),
    showGender: doc.showGender ?? true,
    avatarId: doc.avatarId ?? "",
    bio: doc.bio ?? "",
    interestIds: doc.interestIds ?? [],
    location: {
      // GeoJSON is [lng, lat]; the client's Coordinate is {latitude, longitude}.
      // Getting this backwards puts London in the Indian Ocean.
      coordinate: {
        latitude: coords?.[1] ?? 0,
        longitude: coords?.[0] ?? 0,
      },
      ...(doc.location?.city ? { city: doc.location.city } : {}),
    },
    lastActiveAt: iso(doc.lastActiveAt),
    createdAt: iso(doc.get("createdAt") as Date),
  };
}

export function toPreferences(doc: UserDoc): Preferences {
  const stored = doc.preferences?.notifications;
  const notifications = Object.fromEntries(
    NOTIFICATION_CHANNELS.map((c) => [c, stored?.get(c) ?? true]),
  ) as Preferences["notifications"];

  return {
    discoverable: doc.preferences?.discoverable ?? true,
    notifications,
    notificationPrimerShown: doc.preferences?.notificationPrimerShown ?? false,
  };
}

export function toSession(doc: UserDoc, tokens: TokenPair): Session {
  return {
    userId: String(doc._id),
    token: tokens.token,
    refreshToken: tokens.refreshToken,
    expiresIn: tokens.expiresIn,
    phone: doc.phone?.display ?? "",
    onboardingComplete: doc.onboardingComplete ?? false,
    createdAt: iso(doc.get("createdAt") as Date),
  };
}
