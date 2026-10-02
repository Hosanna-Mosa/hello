/**
 * The signed-in user's own profile.
 *
 * Kept separate from `profiles.service` because the shapes differ: you see your
 * own birthday and exact location, and never your own distance from yourself.
 */

import { ApiError, http, isMockMode, request } from "./client";
import { CURRENT_USER } from "@/mocks/profiles";
import { calculateAge, isOldEnough } from "@/components/common/utils/calculateAge";
import type { User } from "./types";

let me: User = { ...CURRENT_USER };

/**
 * What the device's location API said about a fix. The server REQUIRES it with
 * every location change and refuses mocked, stale or impossible ones — a
 * coordinate typed in by hand has none of this.
 */
export type LocationFix = {
  /** ISO time the OS took the fix — not when we sent it. */
  capturedAt: string;
  accuracyMetres: number;
  /** Android only: true when a "mock location" app supplied the fix. */
  mocked?: boolean;
};

export type MeUpdate = Partial<
  Pick<User, "name" | "birthday" | "gender" | "showGender" | "avatarId" | "bio" | "interestIds">
> & {
  location?: User["location"] & { fix: LocationFix };
};

export const meService = {
  async getMe(): Promise<User> {
    if (!isMockMode()) return http<User>("GET", "/me");

    return request(() => ({ ...me }));
  },

  async updateMe(patch: MeUpdate): Promise<User> {
    if (!isMockMode()) {
      // The 18+ gate is enforced server-side too — the contract is explicit
      // that neither check replaces the other.
      me = await http<User>("PATCH", "/me", patch);
      return { ...me };
    }

    return request(() => {
      // The 18+ gate is enforced here as well as on the screen. A client-side
      // check alone is a suggestion; this is the one the data layer honours.
      if (patch.birthday !== undefined && !isOldEnough(patch.birthday)) {
        throw new ApiError("validation", "You must be 18 or over to use this app");
      }

      if (patch.location?.fix.mocked) {
        throw new ApiError("validation", "Your phone reported a simulated location.");
      }

      // Rebuilt, never mutated in place — React Compiler's one hard rule, and
      // stores read straight from this. The fix is request metadata, not
      // profile data, so it is not kept.
      const { location, ...rest } = patch;
      me = {
        ...me,
        ...rest,
        ...(location ? { location: { coordinate: location.coordinate, city: location.city } } : {}),
      };
      return { ...me };
    });
  },

  /** Convenience for the profile ring and the deck card. */
  async getMyAge(): Promise<number | null> {
    return request(() => (me.birthday ? calculateAge(me.birthday) : null));
  },

  __reset(): void {
    me = { ...CURRENT_USER };
  },
};
