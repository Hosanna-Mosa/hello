/**
 * Threads and messages.
 *
 * MESSAGING IS MATCH-GATED (PLAN §1). There is no endpoint here that reaches
 * someone you are not matched with, and the gate is membership of the thread
 * itself — which only an accepted request or a mutual like can create.
 *
 * Every "you may not see this" answers `notFound`, never `unauthorized`. A
 * different status for "exists but not yours" confirms the thread exists, which
 * is an existence leak: you could enumerate ids and learn who is talking.
 */

import { Types, type ClientSession } from "mongoose";

import { ApiError } from "@/errors/ApiError.js";
import { MessageModel, type MessageDoc } from "@/models/message.model.js";
import { ThreadModel, type ThreadDoc } from "@/models/thread.model.js";
import type { UserDoc } from "@/models/user.model.js";
import { hiddenUserIds } from "@/services/visibility.service.js";
import { decodeMessageCursor, encodeMessageCursor } from "@/utils/cursor.js";
import { withTransaction } from "@/utils/transaction.js";

export const PAGE_SIZE = 30;

const DUPLICATE_KEY = 11000;
const isDuplicate = (e: unknown) => (e as { code?: number } | null)?.code === DUPLICATE_KEY;

/**
 * The gate. Loads a thread only if the caller is in it.
 *
 * Every endpoint below goes through this rather than checking membership
 * itself — one of five hand-written checks is how the sixth gets forgotten.
 */
async function requireThread(viewer: UserDoc, threadId: string, session?: ClientSession): Promise<ThreadDoc> {
  if (!Types.ObjectId.isValid(threadId)) throw ApiError.notFound();

  const thread = await ThreadModel.findOne(
    { _id: threadId, participantIds: viewer._id },
    null,
    session ? { session } : {},
  );

  if (!thread) throw ApiError.notFound();
  return thread;
}

export async function listThreads(viewer: UserDoc): Promise<ThreadDoc[]> {
  // `lastMessage` is denormalised onto the thread, so the list renders from
  // one query rather than one per row.
  //
  // The hidden-set exclusion is DELIBERATELY REDUNDANT: blocking severs the
  // match and deletes the thread, so a blocked pair should have none left to
  // find. It is here because "a blocked person never appears in chat" is a
  // standing guarantee, and this makes it true even if a teardown failed
  // half-way — which it can, on a standalone Mongo with no transaction.
  const hidden = await hiddenUserIds(viewer);
  const rows = await ThreadModel.find({
    participantIds: { $eq: viewer._id, $nin: hidden },
  })
    .sort({ lastMessageAt: -1 })
    .limit(100);

  return rows as ThreadDoc[];
}

export async function getThread(viewer: UserDoc, threadId: string): Promise<ThreadDoc> {
  return requireThread(viewer, threadId);
}

export type MessagePage = { thread: ThreadDoc; items: MessageDoc[]; nextCursor: string | null };

/**
 * A page of messages, NEWEST FIRST.
 *
 * A chat opens at the bottom, so descending order makes the first page the one
 * the reader actually needs. The client reverses for render.
 */
export async function listMessages(viewer: UserDoc, threadId: string, rawCursor?: string): Promise<MessagePage> {
  const thread = await requireThread(viewer, threadId);
  const after = rawCursor ? decodeMessageCursor(rawCursor, String(viewer._id), threadId) : null;

  const query: Record<string, unknown> = { threadId: thread._id };
  if (after) {
    // Keyset: strictly older, or the same instant with a smaller id. Stable
    // while new messages arrive at the other end of the list.
    query.$or = [
      { createdAt: { $lt: new Date(after.t) } },
      { createdAt: new Date(after.t), _id: { $lt: new Types.ObjectId(after.i) } },
    ];
  }

  const rows = (await MessageModel.find(query)
    .sort({ createdAt: -1, _id: -1 })
    .limit(PAGE_SIZE + 1)) as MessageDoc[];

  const hasMore = rows.length > PAGE_SIZE;
  const items = hasMore ? rows.slice(0, PAGE_SIZE) : rows;
  const last = items[items.length - 1];

  return {
    thread,
    items,
    nextCursor:
      hasMore && last
        ? encodeMessageCursor({
            uid: String(viewer._id),
            tid: threadId,
            t: (last.createdAt ?? new Date()).getTime(),
            i: String(last._id),
          })
        : null,
  };
}

export type SentMessage = { thread: ThreadDoc; message: MessageDoc };

export async function sendMessage(
  viewer: UserDoc,
  threadId: string,
  body: string,
  clientMessageId?: string,
): Promise<SentMessage> {
  const text = body.trim();
  if (!text) throw ApiError.validation("Message cannot be empty.");

  return withTransaction(async (session) => {
    const thread = await requireThread(viewer, threadId, session);
    const opts = session ? { session } : {};
    const now = new Date();

    let message: MessageDoc;
    try {
      const [created] = await MessageModel.create(
        [
          {
            threadId: thread._id,
            senderId: viewer._id,
            kind: "text",
            body: text,
            createdAt: now,
            ...(clientMessageId ? { clientMessageId } : {}),
          },
        ],
        opts,
      );
      message = created!;
    } catch (e) {
      if (!isDuplicate(e) || !clientMessageId) throw e;

      // A retry of a request whose response never arrived. Hand back the
      // original rather than posting twice — which is the whole point of
      // `clientMessageId` on a mobile network.
      const existing = await MessageModel.findOne({ threadId: thread._id, clientMessageId }, null, opts);
      if (!existing) throw e;
      return { thread, message: existing as MessageDoc };
    }

    thread.lastMessageAt = now;
    thread.lastMessage = {
      messageId: message._id,
      senderId: viewer._id as Types.ObjectId,
      kind: "text",
      body: text,
      createdAt: now,
    };

    for (const p of thread.participants) {
      // The sender has obviously read their own message; everyone else has not.
      if (String(p.userId) === String(viewer._id)) p.lastReadAt = now;
      else p.unreadCount = (p.unreadCount ?? 0) + 1;
    }

    await thread.save(opts);
    return { thread, message };
  });
}

/**
 * Toggles a reaction.
 *
 * One emoji per user per message: a second emoji REPLACES the first, and the
 * same emoji twice removes it. Enforced here rather than by an index, because
 * "replace" is not something a unique constraint can express.
 */
export async function toggleReaction(viewer: UserDoc, messageId: string, emoji: string): Promise<SentMessage> {
  if (!Types.ObjectId.isValid(messageId)) throw ApiError.notFound();

  const message = (await MessageModel.findById(messageId)) as MessageDoc | null;
  if (!message) throw ApiError.notFound();

  const thread = await requireThread(viewer, String(message.threadId));
  const mine = message.reactions?.findIndex((r) => String(r.userId) === String(viewer._id)) ?? -1;

  if (mine >= 0) {
    const existing = message.reactions[mine];
    message.reactions.splice(mine, 1);
    // Same emoji again = remove. A different one = replace, so fall through.
    if (existing?.emoji !== emoji) {
      message.reactions.push({ userId: viewer._id as Types.ObjectId, emoji, createdAt: new Date() });
    }
  } else {
    message.reactions.push({ userId: viewer._id as Types.ObjectId, emoji, createdAt: new Date() });
  }

  await message.save();
  return { thread, message };
}

/** Marks everything read, in ONE write regardless of how many messages. */
export async function markRead(viewer: UserDoc, threadId: string): Promise<ThreadDoc> {
  const thread = await requireThread(viewer, threadId);
  const now = new Date();

  for (const p of thread.participants) {
    if (String(p.userId) === String(viewer._id)) {
      p.unreadCount = 0;
      p.lastReadAt = now;
      p.lastDeliveredAt = now;
    }
  }

  await thread.save();
  return thread;
}

export async function setMuted(viewer: UserDoc, threadId: string, muted: boolean): Promise<ThreadDoc> {
  const thread = await requireThread(viewer, threadId);

  for (const p of thread.participants) {
    // Muting is PER VIEWER. Muting a thread must not silence it for the other
    // person, which a thread-level flag would do.
    if (String(p.userId) === String(viewer._id)) p.muted = muted;
  }

  await thread.save();
  return thread;
}
