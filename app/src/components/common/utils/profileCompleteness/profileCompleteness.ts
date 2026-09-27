/**
 * How finished a profile is, 0 to 1.
 *
 * Drives the ring on the profile screen. Structurally typed rather than
 * importing the Phase 3 `User` entity, so the data layer can land without
 * this needing to change.
 *
 * Weighted, not a plain count: with no photographs anywhere in this product,
 * interests and bio are what actually carry a card, so they are worth more
 * than the fields collected automatically.
 */

export type CompletableProfile = {
  name?: string;
  birthday?: string;
  gender?: string;
  avatarId?: string;
  bio?: string;
  interests?: readonly string[];
};

const WEIGHTS = {
  name: 1,
  birthday: 1,
  gender: 1,
  avatarId: 2,
  bio: 3,
  interests: 3,
} as const;

const TOTAL = Object.values(WEIGHTS).reduce((sum, weight) => sum + weight, 0);

/** Minimum interests required at onboarding (A6). */
export const MINIMUM_INTERESTS = 3;

export function profileCompleteness(profile: CompletableProfile): number {
  let earned = 0;

  if (profile.name?.trim()) earned += WEIGHTS.name;
  if (profile.birthday?.trim()) earned += WEIGHTS.birthday;
  if (profile.gender?.trim()) earned += WEIGHTS.gender;
  if (profile.avatarId?.trim()) earned += WEIGHTS.avatarId;
  if (profile.bio?.trim()) earned += WEIGHTS.bio;
  if ((profile.interests?.length ?? 0) >= MINIMUM_INTERESTS) earned += WEIGHTS.interests;

  return earned / TOTAL;
}

/** The same number as a whole percent, for "70% complete". */
export function profileCompletenessPercent(profile: CompletableProfile): number {
  return Math.round(profileCompleteness(profile) * 100);
}
