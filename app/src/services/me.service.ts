/**
 * The signed-in user's own profile.
 *
 * Kept separate from `profiles.service` because the shapes differ: you see your
 * own birthday and exact location, and never your own distance from yourself.
 */

import { ApiError, request } from "./client";
import { CURRENT_USER } from "@/mocks/profiles";
import { calculateAge, isOldEnough } from "@/components/common/utils/calculateAge";
import type { User } from "./types";

let me: User = { ...CURRENT_USER };

export type MeUpdate = Partial<
  Pick<
    User,
    "name" | "birthday" | "gender" | "showGender" | "avatarId" | "bio" | "interestIds" | "location"
  >
>;

export const meService = {
  async getMe(): Promise<User> {
    return request(() => ({ ...me }));
  },

  async updateMe(patch: MeUpdate): Promise<User> {
    return request(() => {
      // The 18+ gate is enforced here as well as on the screen. A client-side
      // check alone is a suggestion; this is the one the data layer honours.
      if (patch.birthday !== undefined && !isOldEnough(patch.birthday)) {
        throw new ApiError("validation", "You must be 18 or over to use this app");
      }

      // Rebuilt, never mutated in place — React Compiler's one hard rule, and
      // stores read straight from this.
      me = { ...me, ...patch };
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
