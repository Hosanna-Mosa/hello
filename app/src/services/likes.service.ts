/**
 * Likes, and the message requests some of them become.
 *
 * The like-with-a-note model (PLAN §1): a plain like is silent, a like with a
 * note lands in the recipient's Requests segment. Accepting creates the match
 * and seeds the thread with the note. Declining discards it silently — the
 * sender is never told, which is deliberate (A18).
 *
 * Quota is spent here rather than in the UI, so every path that sends a like
 * goes through the same check.
 */

import { SEEDED_LIKES, SEEDED_REQUESTS } from "@/mocks/threads";

import { ApiError, nextId, nowIso, request } from "./client";
import { billingService } from "./billing.service";
import { matchesService } from "./matches.service";
import type { Like, Match, MessageRequest } from "./types";

const ME = "me";

let likes: Like[] = SEEDED_LIKES.map((l) => ({ ...l }));
let requests: MessageRequest[] = SEEDED_REQUESTS.map((r) => ({ ...r }));

/**
 * Which seeded people like you back. Deterministic so a demo behaves the same
 * way twice: liking one of these produces an instant match.
 */
const RECIPROCATES = new Set(["user-15", "user-16", "user-17"]);

export type LikeResult = {
  like: Like;
  /** Present when they had already liked you — the celebration screen. */
  match: Match | null;
};

export const likesService = {
  /** A plain like, or a like with a note. Both spend one from the daily quota. */
  async sendLike(toUserId: string, note?: string): Promise<LikeResult> {
    // Throws `quotaExceeded` when the free allowance is gone. Deliberately
    // before the like is recorded, so a rejected like is not half-applied.
    await billingService.consumeLike();

    return request(() => {
      const like: Like = {
        id: nextId("like"),
        fromUserId: ME,
        toUserId,
        note: note?.trim() || undefined,
        createdAt: nowIso(),
      };
      likes = [...likes, like];

      const match = RECIPROCATES.has(toUserId)
        ? matchesService.createMatchSync(toUserId, like.note)
        : null;

      return { like, match };
    });
  },

  /** Inbound likes without a note — the (blurred, on free) Likes grid. */
  async listInboundLikes(): Promise<Like[]> {
    return request(() =>
      likes
        .filter((l) => l.toUserId === ME)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .map((l) => ({ ...l })),
    );
  },

  async listRequests(status: MessageRequest["status"] = "pending"): Promise<MessageRequest[]> {
    return request(() =>
      requests
        .filter((r) => r.toUserId === ME && r.status === status)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .map((r) => ({ ...r })),
    );
  },

  /** Accept → match + thread seeded with the note. The match gate is preserved. */
  async acceptRequest(requestId: string): Promise<Match> {
    return request(() => {
      const target = requests.find((r) => r.id === requestId);
      if (!target) throw new ApiError("notFound");
      if (target.status !== "pending") {
        throw new ApiError("validation", "This request has already been answered");
      }

      const match = matchesService.createMatchSync(target.fromUserId, target.note);

      requests = requests.map((r) =>
        r.id === requestId ? { ...r, status: "accepted", resolvedAt: nowIso() } : r,
      );

      return match;
    });
  },

  /** Decline → silent discard. The sender is never notified (A18). */
  async declineRequest(requestId: string): Promise<void> {
    return request(() => {
      const target = requests.find((r) => r.id === requestId);
      if (!target) throw new ApiError("notFound");
      if (target.status !== "pending") {
        throw new ApiError("validation", "This request has already been answered");
      }

      requests = requests.map((r) =>
        r.id === requestId ? { ...r, status: "declined", resolvedAt: nowIso() } : r,
      );
    });
  },

  __reset(): void {
    likes = SEEDED_LIKES.map((l) => ({ ...l }));
    requests = SEEDED_REQUESTS.map((r) => ({ ...r }));
  },
};
