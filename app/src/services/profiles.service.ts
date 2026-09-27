/**
 * Other people: browsing, filtering, searching.
 *
 * Distances come from the mock table rather than the coordinates (A12) — the
 * coordinate exists so the permission flow is real, not so we can triangulate
 * anyone.
 *
 * Blocked users are filtered out at this layer so no surface has to remember.
 */

import { calculateAge } from "@/components/common/utils/calculateAge";
import { MOCK_DISTANCES, SEEDED_USERS } from "@/mocks/profiles";

import { ApiError, request, http, isMockMode } from "./client";
import { safetyService } from "./safety.service";
import type { Gender, Paginated, PublicProfile, User } from "./types";

export type ProfileFilters = {
  /** Metres. */
  maxDistanceMetres?: number;
  minAge?: number;
  maxAge?: number;
  /** Premium-gated in the UI; the service does not care. */
  interestIds?: string[];
  /** Active in the last 24h. Premium-gated in the UI. */
  activeRecently?: boolean;
  /**
   * Which genders to show. Omit or empty for everyone.
   *
   * Someone who asked us not to show their gender (A5) is never excluded by
   * this filter — hiding them from a gender-filtered search would leak the
   * value they chose to keep private.
   */
  genders?: Gender["kind"][];
};

const PAGE_SIZE = 12;
const DAY_MS = 86_400_000;

export function toPublicProfile(user: User): PublicProfile {
  const { birthday, location, showGender, ...rest } = user;

  return {
    ...rest,
    age: calculateAge(birthday),
    distanceMetres: MOCK_DISTANCES.get(user.id) ?? 0,
    // A5: hide gender entirely when the user asked us to.
    gender: showGender ? user.gender : { kind: "preferNotToSay" },
  };
}

function applyFilters(
  profiles: PublicProfile[],
  filters: ProfileFilters,
  now: number,
): PublicProfile[] {
  return profiles.filter((profile) => {
    if (filters.maxDistanceMetres !== undefined && profile.distanceMetres > filters.maxDistanceMetres) {
      return false;
    }
    // Floors at 18 regardless of what is asked for.
    if (profile.age < Math.max(filters.minAge ?? 18, 18)) return false;
    if (filters.maxAge !== undefined && profile.age > filters.maxAge) return false;

    if (filters.interestIds?.length) {
      const shares = filters.interestIds.some((id) => profile.interestIds.includes(id));
      if (!shares) return false;
    }

    if (filters.genders?.length) {
      // `preferNotToSay` covers both "chose not to say" and "hidden on
      // profile", so it always passes rather than being filtered out.
      const kind = profile.gender.kind;
      if (kind !== "preferNotToSay" && !filters.genders.includes(kind)) return false;
    }

    if (filters.activeRecently) {
      if (now - new Date(profile.lastActiveAt).getTime() > DAY_MS) return false;
    }

    return true;
  });
}


/**
 * `ProfileFilters` -> query string.
 *
 * Arrays go as comma-separated values; the server accepts either that or a
 * repeated param. Undefined and empty are omitted entirely rather than sent as
 * blanks, because `?genders=` reads as "an empty gender filter" rather than
 * "no gender filter".
 */
function toQueryString(filters: ProfileFilters, cursor?: string): string {
  const q = new URLSearchParams();

  if (filters.maxDistanceMetres !== undefined) q.set("maxDistanceMetres", String(filters.maxDistanceMetres));
  if (filters.minAge !== undefined) q.set("minAge", String(filters.minAge));
  if (filters.maxAge !== undefined) q.set("maxAge", String(filters.maxAge));
  if (filters.activeRecently) q.set("activeRecently", "true");
  if (filters.interestIds?.length) q.set("interestIds", filters.interestIds.join(","));
  if (filters.genders?.length) q.set("genders", filters.genders.join(","));
  if (cursor) q.set("cursor", cursor);

  const s = q.toString();
  return s ? `?${s}` : "";
}

export const profilesService = {
  async listNearby(
    filters: ProfileFilters = {},
    cursor?: string,
  ): Promise<Paginated<PublicProfile>> {
    if (!isMockMode()) {
      return http<Paginated<PublicProfile>>("GET", `/profiles${toQueryString(filters, cursor)}`);
    }

    return request(() => {
      const blocked = safetyService.blockedIdsSync();
      const now = Date.now();

      const all = applyFilters(
        SEEDED_USERS.filter((u) => !blocked.has(u.id)).map(toPublicProfile),
        filters,
        now,
      ).sort((a, b) => a.distanceMetres - b.distanceMetres);

      const start = cursor ? Number(cursor) : 0;
      const items = all.slice(start, start + PAGE_SIZE);
      const next = start + PAGE_SIZE;

      return { items, nextCursor: next < all.length ? String(next) : null };
    });
  },

  /** The live count under the distance slider. */
  async countMatching(filters: ProfileFilters = {}): Promise<number> {
    if (!isMockMode()) {
      const res = await http<{ count: number }>("GET", `/profiles/count${toQueryString(filters)}`);
      return res.count;
    }

    return request(() => {
      const blocked = safetyService.blockedIdsSync();
      return applyFilters(
        SEEDED_USERS.filter((u) => !blocked.has(u.id)).map(toPublicProfile),
        filters,
        Date.now(),
      ).length;
    });
  },

  async getProfile(id: string): Promise<PublicProfile> {
    if (!isMockMode()) return http<PublicProfile>("GET", `/profiles/${encodeURIComponent(id)}`);

    return request(() => {
      const user = SEEDED_USERS.find((u) => u.id === id);
      if (!user) throw new ApiError("notFound");
      return toPublicProfile(user);
    });
  },

  /** People by name only (PLAN Phase 5) — not bios, not interests. */
  async searchByName(query: string): Promise<PublicProfile[]> {
    if (!isMockMode()) {
      const q = query.trim();
      // The server treats an empty q as no results; short-circuit so an empty
      // search box does not make a round trip on every keystroke.
      if (!q) return [];
      return http<PublicProfile[]>("GET", `/profiles/search?q=${encodeURIComponent(q)}`);
    }

    return request(() => {
      const needle = query.trim().toLowerCase();
      if (!needle) return [];

      const blocked = safetyService.blockedIdsSync();
      return SEEDED_USERS.filter(
        (u) => !blocked.has(u.id) && u.name.toLowerCase().includes(needle),
      ).map(toPublicProfile);
    });
  },
};
