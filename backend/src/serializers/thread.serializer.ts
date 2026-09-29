/**
 * Threads and messages -> wire types.
 *
 * Both shapes are VIEWER-RELATIVE, which is why this is a real layer rather
 * than a field rename:
 *
 *   Thread.unreadCount / muted   are per participant, not per thread. One
 *                                shared counter would mean reading your
 *                                messages clears the other person's badge.
 *
 *   Message.status               is NOT STORED. It is computed from the OTHER
 *                                participant's read and delivered cursors, so
 *                                "read" is a fact about who is looking rather
 *                                than about the message.
 *
 * Deriving it is also what keeps marking a thread read to ONE write: the
 * alternative — a status column per message — turns opening a 200-message
 * thread into 200 updates.
 */

import type { Message, MessageStatus, Reaction, Thread } from "@/types/wire.js";
import type { MessageDoc } from "@/models/message.model.js";
import type { ThreadDoc } from "@/models/thread.model.js";

type ParticipantView = {
  userId: unknown;
  unreadCount?: number;
  muted?: boolean;
  lastReadAt?: Date | null;
  lastDeliveredAt?: Date | null;
};

function participantOf(doc: ThreadDoc, userId: string): ParticipantView | undefined {
  return doc.participants?.find((p) => String(p.userId) === userId);
}

function otherOf(doc: ThreadDoc, userId: string): ParticipantView | undefined {
  return doc.participants?.find((p) => String(p.userId) !== userId);
}

export function toThread(doc: ThreadDoc, viewerId: string): Thread {
  const mine = participantOf(doc, viewerId);
  const [a, b] = doc.participantIds ?? [];

  return {
    id: String(doc._id),
    matchId: String(doc.matchId),
    participantIds: [String(a), String(b)],
    lastMessageAt: (doc.lastMessageAt ?? new Date()).toISOString(),
    unreadCount: mine?.unreadCount ?? 0,
    muted: mine?.muted ?? false,
    lastMessage: toLastMessage(doc, viewerId),
  };
}

/**
 * The denormalised newest message, as a wire `Message`.
 *
 * Null means nobody has said anything yet — a match without a conversation,
 * which the app lists under "New matches". Leaving the field out entirely
 * instead would make every thread look like that, which is exactly the bug
 * this was added to fix (PLAN #124).
 */
function toLastMessage(doc: ThreadDoc, viewerId: string): Message | null {
  const last = doc.lastMessage;
  if (!last) return null;

  return {
    id: String(last.messageId),
    threadId: String(doc._id),
    senderId: String(last.senderId),
    kind: last.kind as Message["kind"],
    body: last.body,
    // Derived from the same cursors as any other message, so a preview cannot
    // disagree with the thread it previews.
    status: statusFor(last, doc, viewerId),
    // Not denormalised: the row renders a body and a time. See the wire type.
    reactions: [],
    createdAt: last.createdAt.toISOString(),
  };
}

/**
 * The derived status.
 *
 * `sending` and `failed` are deliberately absent: they are client-only states
 * describing a request in flight, and a message the server knows about is by
 * definition neither.
 */
function statusFor(
  // Structural, not `MessageDoc`: the same rule has to answer for the
  // denormalised `thread.lastMessage`, which is a subdocument, not a message.
  message: { senderId: unknown; createdAt?: Date | null },
  thread: ThreadDoc,
  viewerId: string,
): MessageStatus {
  const isMine = String(message.senderId) === viewerId;

  // Someone else's message reached you — that is what receiving it means.
  if (!isMine) return "delivered";

  const other = otherOf(thread, viewerId);
  const createdAt = (message.createdAt ?? new Date()).getTime();

  if (other?.lastReadAt && createdAt <= other.lastReadAt.getTime()) return "read";
  if (other?.lastDeliveredAt && createdAt <= other.lastDeliveredAt.getTime()) return "delivered";
  return "sent";
}

function toReactions(doc: MessageDoc): Reaction[] {
  return (doc.reactions ?? []).map((r) => ({ emoji: r.emoji, userId: String(r.userId) }));
}

export function toMessage(doc: MessageDoc, thread: ThreadDoc, viewerId: string): Message {
  return {
    id: String(doc._id),
    threadId: String(doc.threadId),
    senderId: String(doc.senderId),
    kind: (doc.kind ?? "text") as Message["kind"],
    body: doc.body,
    // The storage path never leaves the server — only the gated stream URL.
    ...(doc.kind === "voice" && doc.voice
      ? { voice: { url: `/v1/messages/${String(doc._id)}/voice`, durationSec: doc.voice.durationSec } }
      : {}),
    status: statusFor(doc, thread, viewerId),
    reactions: toReactions(doc),
    createdAt: (doc.createdAt ?? new Date()).toISOString(),
  };
}
