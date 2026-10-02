/**
 * The owner's own profile.
 *
 * `updateMe` is a PATCH: a field that is absent is left alone, which is not the
 * same as a field set to `null`. The onboarding wizard sends one field at a
 * time, so treating absent as "clear it" would erase the previous six steps.
 *
 * Deletion is INSTANT (operator decision, 2026-10-02). A copy of the account
 * goes to `deletedaccounts`, then the live row is scrubbed to an anonymous
 * tombstone and its phone and email are released — so signing up again with
 * the same credentials is a brand-new account with a new id, and nothing of the
 * old one comes back. The app's three-step typed confirmation is what stands
 * between a mis-tap and this.
 */

import type { Types } from "mongoose";

import { logger } from "@/config/logger.js";
import { ApiError } from "@/errors/ApiError.js";
import { BlockModel } from "@/models/block.model.js";
import { CallModel } from "@/models/call.model.js";
import { DeletedAccountModel } from "@/models/deletedAccount.model.js";
import { LikeModel } from "@/models/like.model.js";
import { MatchModel } from "@/models/match.model.js";
import { MessageModel } from "@/models/message.model.js";
import { MessageRequestModel } from "@/models/messageRequest.model.js";
import { PassModel } from "@/models/pass.model.js";
import { ReportModel } from "@/models/report.model.js";
import { ThreadModel } from "@/models/thread.model.js";
import type { UserDoc } from "@/models/user.model.js";
import { NOTIFICATION_CHANNELS, UserModel } from "@/models/user.model.js";
import { revokeAllSessions } from "@/services/token.service.js";
import { invalidateHidden } from "@/services/visibility.service.js";
import { removeThreadVoice } from "@/services/voice.service.js";
import { withTransaction } from "@/utils/transaction.js";
import { consumeBucket } from "@/middlewares/rateLimit.js";
import { parseBirthdayOrThrow } from "@/utils/age.js";
import { haversineMetres } from "@/utils/geo.js";
import type { MeUpdateBody, PreferencesUpdateBody } from "@/validators/me.validator.js";

/** Faster than a commercial jet means the coordinate is not where the phone is. */
const MAX_TRAVEL_KMH = 1_000;
/** Moves under this skip the speed check: low-accuracy fixes jitter by tens of km. */
const TRAVEL_SLACK_M = 50_000;
/** A fix older than this is a cached position, not where the person is now. */
const MAX_FIX_AGE_MS = 15 * 60 * 1000;
/** Phones' clocks drift; a fix a little in the future is skew, a lot is forgery. */
const MAX_FIX_SKEW_MS = 2 * 60 * 1000;

type LocationPatch = NonNullable<MeUpdateBody["location"]>;

/**
 * Refuses coordinates that cannot be where the phone actually is. Not proof —
 * nothing a client sends is — but every check here defeats a casual spoof:
 * a mock-location app, a hand-typed coordinate, a replayed old fix, or a
 * position teleported across the world to triangulate someone.
 */
async function assertGenuineFix(user: UserDoc, location: LocationPatch): Promise<void> {
  const { coordinate, fix } = location;

  if (fix.mocked === true) {
    throw ApiError.validation("Your phone reported a simulated location. Turn off any mock location app and try again.");
  }

  const age = Date.now() - Date.parse(fix.capturedAt);
  if (age > MAX_FIX_AGE_MS || age < -MAX_FIX_SKEW_MS) {
    throw ApiError.validation("That location is out of date. Please try again.");
  }

  // "Null island" — what a broken or defaulted location API reports.
  if (Math.abs(coordinate.latitude) < 0.01 && Math.abs(coordinate.longitude) < 0.01) {
    throw ApiError.validation("We couldn't get a real location. Please try again.");
  }

  const prev = user.location?.point?.coordinates;
  const prevAt = user.location?.updatedAt;
  if (prev && prev.length === 2 && prevAt) {
    const moved = haversineMetres({ latitude: prev[1]!, longitude: prev[0]! }, coordinate);
    // At least a minute, so two quick fixes a few km apart are not "infinitely fast".
    const hours = Math.max(Date.now() - prevAt.getTime(), 60_000) / 3_600_000;
    if (moved > TRAVEL_SLACK_M && moved / 1000 / hours > MAX_TRAVEL_KMH) {
      throw ApiError.validation("That location change isn't possible this quickly. Please try again later.");
    }
  }

  // Last, so a refused fix does not spend the day's allowance.
  if (!(await consumeBucket("location-change", `u:${String(user._id)}`))) {
    throw ApiError.rateLimited("You've changed your location too many times today. Try again tomorrow.");
  }
}

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
    await assertGenuineFix(user, patch.location);
    user.set("location", {
      point: {
        type: "Point",
        // GeoJSON order. The client sends {latitude, longitude}; storing them
        // in that order would put every user in the wrong hemisphere.
        coordinates: [patch.location.coordinate.longitude, patch.location.coordinate.latitude],
      },
      ...(patch.location.city ? { city: patch.location.city } : {}),
      updatedAt: new Date(),
      accuracyMetres: Math.round(patch.location.fix.accuracyMetres),
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

export type DeletionResult = {
  /** Conversations that ended with the account, so the controller can tell the other person live. */
  ended: { threadId: string; matchId: string; userIds: string[] }[];
};

/**
 * Archive, then erase, in ONE transaction: an archive with no erasure is a
 * "deleted" account that still signs in, and an erasure with no archive is
 * data the operator said must be kept.
 */
export async function deleteAccount(
  user: UserDoc,
  reason?: string,
  deletedBy: "user" | "admin" = "user",
): Promise<DeletionResult> {
  if (user.status === "erased") throw ApiError.notFound();

  const userId = user._id as Types.ObjectId;
  const now = new Date();
  const note = reason?.slice(0, 200) ?? null;
  let ended: DeletionResult["ended"] = [];
  let blockedIds: Types.ObjectId[] = [];

  await withTransaction(async (session) => {
    const opts = session ? { session } : {};
    // Reset on every attempt: `withTransaction` may retry this callback.
    ended = [];
    blockedIds = [];

    // `requireAuth` loads the user without `passwordHash` (select: false); it
    // is stripped again here so no future caller can archive a credential.
    const snapshot = user.toObject({ depopulate: true }) as Record<string, unknown>;
    delete snapshot.passwordHash;

    // Sequential, not Promise.all: operations inside one transaction session
    // must not run concurrently.
    const matches = await MatchModel.find({ userIds: userId, endedAt: null }, null, opts);
    for (const match of matches) {
      if (match.threadId) {
        ended.push({ threadId: String(match.threadId), matchId: String(match._id), userIds: match.userIds.map(String) });
        await MessageModel.deleteMany({ threadId: match.threadId }, opts);
        await CallModel.deleteMany({ threadId: match.threadId }, opts);
        await ThreadModel.deleteOne({ _id: match.threadId }, opts);
      }
      match.endedAt = now;
      match.endedBy = userId;
      match.threadId = null;
      await match.save(opts);
    }

    const blocks = await BlockModel.find({ $or: [{ blockerId: userId }, { blockedUserId: userId }] }, null, opts);
    blockedIds = blocks.map((b) => (String(b.blockerId) === String(userId) ? b.blockedUserId : b.blockerId));

    const likesSent = await LikeModel.countDocuments({ fromUserId: userId }, opts);
    const likesReceived = await LikeModel.countDocuments({ toUserId: userId }, opts);
    const reportsFiled = await ReportModel.countDocuments({ reporterId: userId }, opts);
    const reportsAgainst = await ReportModel.countDocuments({ reportedUserId: userId }, opts);

    await DeletedAccountModel.create(
      [
        {
          originalUserId: userId,
          phoneHmac: user.phone?.hmac ?? null,
          emailHmac: user.email?.hmac ?? null,
          deletedAt: now,
          reason: note,
          deletedBy,
          snapshot,
          related: {
            matchIds: matches.map((m) => m._id),
            threadIds: ended.map((e) => e.threadId),
            likesSent,
            likesReceived,
            blocksMade: blocks.filter((b) => String(b.blockerId) === String(userId)).map((b) => b.blockedUserId),
            reportsFiled,
            reportsAgainst,
          },
        },
      ],
      opts,
    );

    // Every way back in, both directions. Reports are KEPT: they are
    // moderation evidence, and they point at the tombstone id, which the
    // archive links back to.
    const either = (a: string, b: string) => ({ $or: [{ [a]: userId }, { [b]: userId }] });
    await LikeModel.deleteMany(either("fromUserId", "toUserId"), opts);
    await MessageRequestModel.deleteMany(either("fromUserId", "toUserId"), opts);
    await PassModel.deleteMany(either("userId", "targetId"), opts);
    await BlockModel.deleteMany(either("blockerId", "blockedUserId"), opts);

    // The tombstone. `updateOne` skips the required-path validators on purpose:
    // unsetting `phone.hmac` (and nulling `email`) takes the row out of the
    // PARTIAL unique indexes, which is what lets the same person sign up again
    // as someone new.
    await UserModel.updateOne(
      { _id: userId },
      {
        $set: {
          email: null,
          passwordHash: null,
          "phone.e164": "",
          "phone.countryCode": "",
          "phone.national": "",
          "phone.display": "",
          name: "",
          nameLower: "",
          birthday: null,
          gender: { kind: "preferNotToSay" },
          showGender: false,
          publicGenderKind: "preferNotToSay",
          avatarId: "",
          bio: "",
          interestIds: [],
          "location.point": null,
          "preferences.discoverable": false,
          "entitlements.isPremium": false,
          "entitlements.since": null,
          "entitlements.expiresAt": null,
          "entitlements.source": null,
          suspendedAt: null,
          suspendedReason: null,
          onboardingComplete: false,
          status: "erased",
          deletionRequestedAt: now,
          purgeAt: null,
          deletionReason: note,
        },
        $unset: { "phone.hmac": "", "location.city": "" },
      },
      opts,
    );
  });

  // After the commit, never inside it — a rolled-back deletion must not have
  // destroyed audio, sessions or caches for an account that still exists.
  for (const e of ended) await removeThreadVoice(e.threadId);
  await revokeAllSessions(String(userId), "accountDeleted");
  if (blockedIds.length > 0) await invalidateHidden(userId, ...blockedIds);

  logger.info({ userId: String(userId), endedThreads: ended.length, deletedBy }, "account deleted and archived");
  return { ended };
}

