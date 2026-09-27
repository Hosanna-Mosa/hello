/**
 * Likes, requests and matches -> wire types.
 */

import type { Like, Match, MessageRequest, MessageRequestStatus } from "@/types/wire.js";
import type { LikeDoc } from "@/models/like.model.js";
import type { MatchDoc } from "@/models/match.model.js";
import type { MessageRequestDoc } from "@/models/messageRequest.model.js";

export function toLike(doc: LikeDoc): Like {
  return {
    id: String(doc._id),
    fromUserId: String(doc.fromUserId),
    toUserId: String(doc.toUserId),
    ...(doc.note ? { note: doc.note } : {}),
    createdAt: (doc.createdAt ?? new Date()).toISOString(),
  };
}

export function toMessageRequest(doc: MessageRequestDoc): MessageRequest {
  return {
    id: String(doc._id),
    likeId: String(doc.likeId),
    fromUserId: String(doc.fromUserId),
    toUserId: String(doc.toUserId),
    note: doc.note,
    status: (doc.status ?? "pending") as MessageRequestStatus,
    createdAt: (doc.createdAt ?? new Date()).toISOString(),
    resolvedAt: doc.resolvedAt ? doc.resolvedAt.toISOString() : null,
  };
}

export function toMatch(doc: MatchDoc): Match {
  const [a, b] = doc.userIds;
  return {
    id: String(doc._id),
    userIds: [String(a), String(b)],
    threadId: doc.threadId ? String(doc.threadId) : "",
    createdAt: (doc.createdAt ?? new Date()).toISOString(),
    endedAt: doc.endedAt ? doc.endedAt.toISOString() : null,
  };
}
