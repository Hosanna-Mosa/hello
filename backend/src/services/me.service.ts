/**
 * The owner's own profile.
 *
 * `updateMe` is a PATCH: a field that is absent is left alone, which is not the
 * same as a field set to `null`. The onboarding wizard sends one field at a
 * time, so treating absent as "clear it" would erase the previous six steps.
 *
 * Deletion is SOFT with a 30-day grace. The account disappears from everyone
 * else immediately, sessions are revoked, and a job erases it later. An
 * immediate hard delete cannot be undone by someone who tapped the wrong thing,
 * and would also tear messages out of other people's threads with no warning.
 */

import { logger } from "@/config/logger.js";
import { ApiError } from "@/errors/ApiError.js";
import type { UserDoc } from "@/models/user.model.js";
import { NOTIFICATION_CHANNELS } from "@/models/user.model.js";
import { revokeAllSessions } from "@/services/token.service.js";
import { parseBirthdayOrThrow } from "@/utils/age.js";
import type { MeUpdateBody, PreferencesUpdateBody } from "@/validators/me.validator.js";

export const DELETION_GRACE_DAYS = 30;

export async function updateMe(user: UserDoc, patch: MeUpdateBody): Promise<UserDoc> {
  if (patch.name !== undefined) user.name = patch.name.trim();

  // The 18+ gate. The contract is explicit that the server must REJECT, not
  // silently hide — and that the client checking too does not replace this.
  if (patch.birthday !== undefined) user.birthday = parseBirthdayOrThrow(patch.birthday);

  if (patch.gender !== undefined) {
    user.set("gender", patch.gender.kind === "selfDescribed" ? patch.gender : { kind: patch.gender.kind });
  }
  if (patch.showGender !== undefined) user.showGender = patch.showGender;
  if (patch.avatarId !== undefined) user.avatarId = patch.avatarId;
  if (patch.bio !== undefined) user.bio = patch.bio;
  if (patch.interestIds !== undefined) user.interestIds = patch.interestIds;
  if (patch.timezone !== undefined) user.timezone = patch.timezone;

  if (patch.location !== undefined) {
    user.set("location", {
      point: {
        type: "Point",
        // GeoJSON order. The client sends {latitude, longitude}; storing them
        // in that order would put every user in the wrong hemisphere.
        coordinates: [patch.location.coordinate.longitude, patch.location.coordinate.latitude],
      },
      ...(patch.location.city ? { city: patch.location.city } : {}),
    });
  }

  user.lastActiveAt = new Date();
  await user.save();
  return user;
}

export async function updatePreferences(user: UserDoc, patch: PreferencesUpdateBody): Promise<UserDoc> {
  if (patch.discoverable !== undefined) user.preferences.discoverable = patch.discoverable;
  if (patch.notificationPrimerShown !== undefined) {
    user.preferences.notificationPrimerShown = patch.notificationPrimerShown;
  }

  if (patch.notifications) {
    for (const channel of NOTIFICATION_CHANNELS) {
      const next = patch.notifications[channel];
      if (next !== undefined) user.preferences.notifications.set(channel, next);
    }
  }

  await user.save();
  return user;
}

export async function requestDeletion(user: UserDoc, reason?: string): Promise<void> {
  if (user.status === "erased") throw ApiError.notFound();

  const purgeAt = new Date(Date.now() + DELETION_GRACE_DAYS * 24 * 60 * 60 * 1000);

  user.status = "pendingDeletion";
  user.deletionRequestedAt = new Date();
  user.purgeAt = purgeAt;
  user.deletionReason = reason?.slice(0, 200) ?? null;
  await user.save();

  // NOTE: `preferences.discoverable` is deliberately NOT touched.
  //
  // Hiding the account is `status !== "active"`, which every discovery query
  // filters on and which the compound index leads with. Flipping `discoverable`
  // as well would be redundant — and destructive: it overwrites a setting the
  // user may have chosen themselves, and restoring cannot tell the two apart,
  // so a restored account would come back permanently invisible.

  await revokeAllSessions(String(user._id), "accountDeleted");
  logger.info({ userId: String(user._id), purgeAt }, "account deletion requested");
}

