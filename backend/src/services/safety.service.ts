/**
 * Blocks and reports.
 *
 * Blocking is not just a filter. The PLAN's verification for this phase is
 * that after a block both parties vanish from discovery, search, likes,
 * matches and sockets IN THE SAME REQUEST — so blocking also ends any match
 * between them and deletes the conversation, exactly as unmatching does.
 * Leaving the thread in place would let a blocked person keep a live socket
 * room with someone who blocked them.
 *
 * Reporting is fire-and-forget from the reporter's side: they are never told
 * what happened to the person they reported.
 */

import { Types } from "mongoose";

import { ApiError } from "@/errors/ApiError.js";
import { BlockModel, type BlockDoc } from "@/models/block.model.js";
import { LikeModel } from "@/models/like.model.js";
import { MatchModel } from "@/models/match.model.js";
import { MessageModel } from "@/models/message.model.js";
import { MessageRequestModel } from "@/models/messageRequest.model.js";
import { ReportModel, type ReportDoc } from "@/models/report.model.js";
import { ThreadModel } from "@/models/thread.model.js";
import { UserModel, type UserDoc } from "@/models/user.model.js";
import type { ReportReason } from "@/types/wire.js";
import { invalidateHidden } from "@/services/visibility.service.js";
import { withTransaction } from "@/utils/transaction.js";

const DUPLICATE_KEY = 11000;
const isDuplicate = (e: unknown) => (e as { code?: number } | null)?.code === DUPLICATE_KEY;

/** How much of a conversation a report keeps as evidence. */
const SNAPSHOT_MESSAGES = 20;

function requireId(id: string): Types.ObjectId {
  if (!Types.ObjectId.isValid(id)) throw ApiError.notFound();
  return new Types.ObjectId(id);
}

/**
 * The relationship teardown a block implies.
 *
 * Returns the thread and match it ended, so the caller can tell both sockets.
 * Deliberately symmetric and total: likes and pending requests go too, or the
 * blocked person reappears in the other's Likes grid having been "blocked".
 */
async function severFor(
  a: Types.ObjectId,
  b: Types.ObjectId,
): Promise<{ threadId: string | null; matchId: string | null; userIds: string[] }> {
  let threadId: string | null = null;
  let matchId: string | null = null;

  await withTransaction(async (session) => {
    const opts = session ? { session } : {};

    const match = await MatchModel.findOne({ userIds: { $all: [a, b] }, endedAt: null }, null, opts);

    if (match) {
      matchId = String(match._id);

      if (match.threadId) {
        threadId = String(match.threadId);
        await MessageModel.deleteMany({ threadId: match.threadId }, opts);
        await ThreadModel.deleteOne({ _id: match.threadId }, opts);
      }

      match.endedAt = new Date();
      match.endedBy = a;
      // The `pairKey` row stays, so the pair can never resurface in the deck.
      match.threadId = null;
      await match.save(opts);
    }

    // A like or a pending request is a way back in. Both directions.
    await LikeModel.deleteMany(
      { $or: [{ fromUserId: a, toUserId: b }, { fromUserId: b, toUserId: a }] },
      opts,
    );
    await MessageRequestModel.deleteMany(
      { $or: [{ fromUserId: a, toUserId: b }, { fromUserId: b, toUserId: a }] },
      opts,
    );
  });

  return { threadId, matchId, userIds: [String(a), String(b)] };
}

export type BlockResult = {
  block: BlockDoc;
  severed: { threadId: string | null; matchId: string | null; userIds: string[] };
};

export async function block(viewer: UserDoc, targetId: string): Promise<BlockResult> {
  const target = requireId(targetId);
  if (String(target) === String(viewer._id)) {
    throw ApiError.validation("You cannot block yourself.");
  }

  // Must exist, but ANY status: blocking someone mid-deletion is legitimate,
  // and a 404 here would tell you their account state.
  const exists = await UserModel.exists({ _id: target });
  if (!exists) throw ApiError.notFound();

  const viewerId = viewer._id as Types.ObjectId;
  let doc: BlockDoc;

  try {
    doc = await BlockModel.create({ blockerId: viewerId, blockedUserId: target });
  } catch (e) {
    if (!isDuplicate(e)) throw e;
    // Already blocked. Idempotent — and still worth re-severing, because a
    // failed teardown last time must not leave the thread alive forever.
    const existing = await BlockModel.findOne({ blockerId: viewerId, blockedUserId: target });
    if (!existing) throw e;
    doc = existing;
  }

  const severed = await severFor(viewerId, target);
  await invalidateHidden(viewerId, target);

  return { block: doc, severed };
}

export async function unblock(viewer: UserDoc, targetId: string): Promise<void> {
  const target = requireId(targetId);

  // Only YOUR block. If they also blocked you, that one stands — which is why
  // blocks are one directional row rather than a symmetric pair.
  await BlockModel.deleteOne({ blockerId: viewer._id, blockedUserId: target });
  await invalidateHidden(viewer._id as Types.ObjectId, target);
}

/**
 * The people this viewer has blocked — not the people who blocked them.
 *
 * Returned with a profile summary attached, because the blocked list has to
 * show a name and the blocked user is excluded from `GET /profiles/:id` by
 * definition. Without it the one screen that must look a blocked person up
 * cannot (resolved contract gap, PLAN #131).
 */
export async function listBlocked(viewer: UserDoc): Promise<{ block: BlockDoc; user: UserDoc | null }[]> {
  const rows = await BlockModel.find({ blockerId: viewer._id }).sort({ createdAt: -1 }).limit(200);
  if (rows.length === 0) return [];

  const users = await UserModel.find({ _id: { $in: rows.map((r) => r.blockedUserId) } });
  const byId = new Map(users.map((u) => [String(u._id), u]));

  return rows.map((row) => ({ block: row, user: byId.get(String(row.blockedUserId)) ?? null }));
}

export async function isBlocked(viewer: UserDoc, targetId: string): Promise<boolean> {
  if (!Types.ObjectId.isValid(targetId)) return false;
  return (await BlockModel.exists({ blockerId: viewer._id, blockedUserId: targetId })) !== null;
}

export type ReportInput = {
  reportedUserId: string;
  // The shared contract union, not `string` — the model's enum and the app's
  // reason list are the same seven values and must not drift apart.
  reason: ReportReason;
  details?: string;
  alsoBlock: boolean;
};

export type ReportResult = {
  report: ReportDoc;
  /**
   * What the optional block tore down, so the caller can tell both sockets.
   *
   * Returned rather than emitted here because emitting is the controller's
   * job — and because a report that blocks must produce EXACTLY the same
   * socket traffic as a plain block. Leaving it out meant the reported person
   * sat in a live thread room for a conversation that no longer existed.
   */
  severed: BlockResult["severed"] | null;
};

export async function report(viewer: UserDoc, input: ReportInput): Promise<ReportResult> {
  const target = requireId(input.reportedUserId);
  if (String(target) === String(viewer._id)) {
    throw ApiError.validation("You cannot report yourself.");
  }

  const reported = await UserModel.findById(target);
  if (!reported) throw ApiError.notFound();

  // Frozen NOW, before any block tears the conversation down — the evidence
  // has to outlive both the thread and the account.
  const snapshot = await snapshotOf(viewer, reported);

  const severed = input.alsoBlock ? (await block(viewer, input.reportedUserId)).severed : null;

  const filed = await ReportModel.create({
    reporterId: viewer._id,
    reportedUserId: target,
    reason: input.reason,
    ...(input.details ? { details: input.details } : {}),
    alsoBlocked: input.alsoBlock,
    snapshot,
  });

  return { report: filed, severed };
}

async function snapshotOf(viewer: UserDoc, reported: UserDoc) {
  const match = await MatchModel.findOne({
    userIds: { $all: [viewer._id, reported._id] },
  }).sort({ createdAt: -1 });

  const messages = match?.threadId
    ? await MessageModel.find({ threadId: match.threadId })
        .sort({ createdAt: -1 })
        .limit(SNAPSHOT_MESSAGES)
    : [];

  return {
    name: reported.name ?? "",
    bio: reported.bio ?? "",
    phoneHmac: reported.phone?.hmac ?? null,
    // Oldest first, so the record reads as a conversation.
    messages: [...messages].reverse().map((m) => ({
      senderId: m.senderId,
      body: m.body,
      createdAt: m.createdAt ?? new Date(),
    })),
  };
}
