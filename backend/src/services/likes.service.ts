/**
 * Likes, message requests and the matches they create.
 *
 * The ordering here is the contract's, and it is load-bearing:
 *
 *   quota is spent FIRST, so a rejected like writes nothing;
 *   every failure after the spend REFUNDS, so a like that did not happen is
 *   free;
 *   a like WITH a note creates a request, WITHOUT one is silent;
 *   accepting creates the match, the thread and the seed message together;
 *   declining is silent and must not be inferable.
 */

import { Types, type ClientSession } from "mongoose";

import { ApiError } from "@/errors/ApiError.js";
import { LikeModel, type LikeDoc } from "@/models/like.model.js";
import { MatchModel, pairKeyFor, type MatchDoc } from "@/models/match.model.js";
import { MessageModel } from "@/models/message.model.js";
import { MessageRequestModel, type MessageRequestDoc } from "@/models/messageRequest.model.js";
import { PassModel } from "@/models/pass.model.js";
import { ThreadModel, type ThreadDoc } from "@/models/thread.model.js";
import { UserModel, type UserDoc } from "@/models/user.model.js";
import { refundLike, spendLike } from "@/services/quota.service.js";
import { hiddenUserIds } from "@/services/visibility.service.js";
import { removeThreadVoice } from "@/services/voice.service.js";
import type { Connection } from "@/types/wire.js";
import { withTransaction } from "@/utils/transaction.js";

const DUPLICATE_KEY = 11000;
const isDuplicate = (e: unknown) => (e as { code?: number } | null)?.code === DUPLICATE_KEY;

/**
 * Creates the match, its thread and any seed message as one unit.
 *
 * The unique `pairKey` is what resolves a simultaneous mutual like: whoever
 * loses the race catches E11000 and reads the winner's row, so both callers
 * end up with the same match and neither needs a lock.
 */
async function createMatch(
  a: Types.ObjectId,
  b: Types.ObjectId,
  source: "mutualLike" | "acceptedRequest",
  seed: { senderId: Types.ObjectId; body: string } | null,
  session: ClientSession | undefined,
): Promise<MatchDoc> {
  const pairKey = pairKeyFor(a, b);
  const opts = session ? { session } : {};

  const existing = await MatchModel.findOne({ pairKey }, null, opts);
  if (existing) {
    // The pair is KEPT after an unmatch precisely so it cannot recur.
    if (existing.endedAt) throw ApiError.validation("You can't match with this person again.");
    return existing;
  }

  let match: MatchDoc;
  try {
    const [created] = await MatchModel.create([{ userIds: [a, b], pairKey, source }], opts);
    match = created!;
  } catch (e) {
    if (!isDuplicate(e)) throw e;
    const won = await MatchModel.findOne({ pairKey }, null, opts);
    if (!won) throw e;
    return won;
  }

  const now = new Date();
  const [thread] = await ThreadModel.create(
    [
      {
        matchId: match._id,
        participantIds: [a, b],
        participants: [
          { userId: a, unreadCount: 0 },
          { userId: b, unreadCount: 0 },
        ],
        lastMessageAt: now,
      },
    ],
    opts,
  );

  if (seed && thread) {
    const [message] = await MessageModel.create(
      [{ threadId: thread._id, senderId: seed.senderId, kind: "text", body: seed.body, createdAt: now }],
      opts,
    );

    if (message) {
      // The note becomes the first message, and it is unread for the person
      // who accepted — they have not seen it in the thread yet.
      const recipient = String(seed.senderId) === String(a) ? b : a;
      thread.lastMessage = {
        messageId: message._id,
        senderId: seed.senderId,
        kind: "text",
        body: seed.body,
        createdAt: now,
      };
      for (const p of thread.participants) {
        if (String(p.userId) === String(recipient)) p.unreadCount = 1;
      }
      await thread.save(opts);
    }
  }

  match.threadId = thread?._id ?? null;
  await match.save(opts);
  return match;
}

export type LikeResult = { like: LikeDoc; match: MatchDoc | null; request: MessageRequestDoc | null };

export async function sendLike(viewer: UserDoc, toUserId: string, note?: string): Promise<LikeResult> {
  if (!Types.ObjectId.isValid(toUserId)) throw ApiError.notFound();
  if (String(viewer._id) === toUserId) throw ApiError.validation("You cannot like yourself.");

  const target = await UserModel.findOne({ _id: toUserId, status: "active" });
  if (!target) throw ApiError.notFound();

  const hidden = await hiddenUserIds(viewer);
  if (hidden.some((h) => String(h) === toUserId)) throw ApiError.notFound();

  const existing = await LikeModel.findOne({ fromUserId: viewer._id, toUserId });
  if (existing) {
    // Idempotent, and free: re-liking must not spend a second like.
    const pairKey = pairKeyFor(viewer._id, target._id);
    const match = await MatchModel.findOne({ pairKey, endedAt: null });
    const request = await MessageRequestModel.findOne({ likeId: existing._id });
    return { like: existing, match, request };
  }

  // Spent BEFORE any write, so a rejected like leaves no trace.
  await spendLike(viewer);

  try {
    return await withTransaction(async (session) => {
      const opts = session ? { session } : {};

      const [like] = await LikeModel.create(
        [{ fromUserId: viewer._id, toUserId: target._id, note: note?.trim() || null }],
        opts,
      );
      if (!like) throw ApiError.server();

      // Did they already like us? Then this is a match, note or not.
      const reciprocal = await LikeModel.findOne({ fromUserId: target._id, toUserId: viewer._id }, null, opts);

      if (reciprocal) {
        const seed = note?.trim()
          ? { senderId: viewer._id as Types.ObjectId, body: note.trim() }
          : reciprocal.note
            ? { senderId: target._id as Types.ObjectId, body: reciprocal.note }
            : null;

        const match = await createMatch(
          viewer._id as Types.ObjectId,
          target._id as Types.ObjectId,
          "mutualLike",
          seed,
          session,
        );

        // A pending request from them is now moot — the match supersedes it.
        await MessageRequestModel.updateMany(
          { fromUserId: target._id, toUserId: viewer._id, status: "pending" },
          { $set: { status: "accepted", resolvedAt: new Date() } },
          opts,
        );

        return { like, match, request: null };
      }

      // A note turns the like into a request; without one it is silent.
      let request: MessageRequestDoc | null = null;
      if (note?.trim()) {
        const [created] = await MessageRequestModel.create(
          [{ likeId: like._id, fromUserId: viewer._id, toUserId: target._id, note: note.trim() }],
          opts,
        );
        request = created ?? null;
      }

      return { like, match: null, request };
    });
  } catch (e) {
    // Anything at all after the spend gives the like back.
    await refundLike(viewer);
    throw e;
  }
}

/**
 * Where the viewer stands with one person — drives the profile's main button.
 *
 * Deliberately lossy in two places (see `ConnectionStatus` in the contract):
 *   - a request they DECLINED still reads `requested`: declines are never
 *     inferable by the sender (A18);
 *   - a silent like FROM them is not `incoming`: who likes you is premium.
 * Only a pending request WITH a note — already visible in the Requests tab —
 * is surfaced as `incoming`.
 */
export async function connectionWith(viewer: UserDoc, userId: string): Promise<Connection> {
  if (!Types.ObjectId.isValid(userId) || String(viewer._id) === userId) throw ApiError.notFound();

  const target = await UserModel.findOne({ _id: userId, status: "active" }).select("_id");
  if (!target) throw ApiError.notFound();
  const hidden = await hiddenUserIds(viewer);
  if (hidden.some((h) => String(h) === userId)) throw ApiError.notFound();

  const match = await MatchModel.findOne({ pairKey: pairKeyFor(viewer._id, target._id), endedAt: null });
  if (match) {
    return { status: "matched", threadId: match.threadId ? String(match.threadId) : null, requestId: null };
  }

  const incoming = await MessageRequestModel.findOne({
    fromUserId: target._id,
    toUserId: viewer._id,
    status: "pending",
  });
  if (incoming) return { status: "incoming", threadId: null, requestId: String(incoming._id) };

  const mine = await LikeModel.exists({ fromUserId: viewer._id, toUserId: target._id });
  return { status: mine ? "requested" : "none", threadId: null, requestId: null };
}

export async function listInboundLikes(viewer: UserDoc): Promise<LikeDoc[]> {
  const hidden = await hiddenUserIds(viewer);
  return LikeModel.find({ toUserId: viewer._id, fromUserId: { $nin: hidden } })
    .sort({ createdAt: -1, _id: -1 })
    .limit(100);
}

/**
 * People the viewer has liked — the "You liked" screen. Your own likes, so no
 * premium gate; blocked/hidden people and closed accounts drop out, the same
 * as everywhere else a person is listed.
 */
export async function listOutboundLikes(viewer: UserDoc): Promise<LikeDoc[]> {
  const hidden = await hiddenUserIds(viewer);
  return LikeModel.find({ fromUserId: viewer._id, toUserId: { $nin: hidden } })
    .sort({ createdAt: -1, _id: -1 })
    .limit(100);
}

export type RequestStatus = "pending" | "accepted" | "declined";

export async function listRequests(viewer: UserDoc, status: RequestStatus = "pending"): Promise<MessageRequestDoc[]> {
  const hidden = await hiddenUserIds(viewer);
  // Asserted at the boundary: `exactOptionalPropertyTypes` and Mongoose's
  // inferred query types disagree about optional fields, and the assertion is
  // cheaper than loosening the compiler for the whole package.
  const rows = await MessageRequestModel.find({ toUserId: viewer._id, status, fromUserId: { $nin: hidden } })
    .sort({ createdAt: -1, _id: -1 })
    .limit(100);
  return rows as MessageRequestDoc[];
}

export async function acceptRequest(viewer: UserDoc, requestId: string): Promise<MatchDoc> {
  if (!Types.ObjectId.isValid(requestId)) throw ApiError.notFound();

  return withTransaction(async (session) => {
    const opts = session ? { session } : {};

    const request = await MessageRequestModel.findOne({ _id: requestId, toUserId: viewer._id }, null, opts);
    if (!request) throw ApiError.notFound();
    if (request.status !== "pending") throw ApiError.validation("This request has already been answered.");

    const match = await createMatch(
      request.fromUserId as Types.ObjectId,
      request.toUserId as Types.ObjectId,
      "acceptedRequest",
      { senderId: request.fromUserId as Types.ObjectId, body: request.note },
      session,
    );

    request.status = "accepted";
    request.resolvedAt = new Date();
    await request.save(opts);

    return match;
  });
}

/**
 * Declines silently.
 *
 * A18: the sender is never told and must not be able to infer it. So there is
 * no notification, no socket event, and nothing on the sender's side changes —
 * the request simply stays pending from their point of view forever, which is
 * indistinguishable from not having been read yet.
 *
 * A pass is recorded so the decliner does not see them again in the deck.
 */
export async function declineRequest(viewer: UserDoc, requestId: string): Promise<void> {
  if (!Types.ObjectId.isValid(requestId)) throw ApiError.notFound();

  const request = await MessageRequestModel.findOne({ _id: requestId, toUserId: viewer._id });
  if (!request) throw ApiError.notFound();
  if (request.status !== "pending") throw ApiError.validation("This request has already been answered.");

  request.status = "declined";
  request.resolvedAt = new Date();
  await request.save();

  await PassModel.updateOne(
    { userId: viewer._id, targetId: request.fromUserId },
    { $setOnInsert: { userId: viewer._id, targetId: request.fromUserId, source: "declinedRequest", createdAt: new Date() } },
    { upsert: true },
  );
}

export async function listMatches(viewer: UserDoc): Promise<MatchDoc[]> {
  return MatchModel.find({ userIds: viewer._id, endedAt: null }).sort({ createdAt: -1 });
}

/**
 * Unmatch.
 *
 * The match row is KEPT with `endedAt` set — that is what stops the pair
 * recurring, via the unique `pairKey`. The thread and its messages are deleted
 * for both sides, per the contract.
 */
export async function unmatch(viewer: UserDoc, matchId: string): Promise<void> {
  if (!Types.ObjectId.isValid(matchId)) throw ApiError.notFound();

  let endedThreadId: string | null = null;

  await withTransaction(async (session) => {
    const opts = session ? { session } : {};

    const match = await MatchModel.findOne({ _id: matchId, userIds: viewer._id, endedAt: null }, null, opts);
    if (!match) throw ApiError.notFound();

    if (match.threadId) {
      endedThreadId = String(match.threadId);
      await MessageModel.deleteMany({ threadId: match.threadId }, opts);
      await ThreadModel.deleteOne({ _id: match.threadId }, opts);
    }

    match.endedAt = new Date();
    match.endedBy = viewer._id as Types.ObjectId;
    match.threadId = null;
    await match.save(opts);
  });

  // After the commit, never inside it: a rolled-back unmatch must not have
  // already destroyed the audio of a conversation that still exists.
  if (endedThreadId) await removeThreadVoice(endedThreadId);
}

export type { ThreadDoc };
