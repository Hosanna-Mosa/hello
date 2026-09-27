/**
 * Matches — and the thread each one owns.
 *
 * Creating a match always creates its thread, in one step, because a match
 * without a thread is a state the UI has no screen for.
 *
 * Unmatching keeps the `Match` row with an `endedAt` rather than deleting it,
 * so the pair cannot silently resurface in the deck later.
 */

import { SEEDED_MATCHES } from "@/mocks/threads";

import { ApiError, nextId, nowIso, request, http, isMockMode } from "./client";
import { chatService } from "./chat.service";
import type { Match } from "./types";

const ME = "me";

let matches: Match[] = SEEDED_MATCHES.map((m) => ({ ...m }));

export const matchesService = {
  async listMatches(): Promise<Match[]> {
    if (!isMockMode()) return http<Match[]>("GET", "/matches");

    return request(() =>
      matches
        .filter((m) => !m.endedAt)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .map((m) => ({ ...m })),
    );
  },

  /** Used by `likes.service` when a like is reciprocated or a request accepted. */
  createMatchSync(partnerId: string, seedBody?: string): Match {
    const matchId = nextId("match");
    const thread = chatService.createThreadSync(matchId, partnerId, seedBody);

    const match: Match = {
      id: matchId,
      userIds: [ME, partnerId],
      threadId: thread.id,
      createdAt: nowIso(),
      endedAt: null,
    };
    matches = [...matches, match];
    return match;
  },

  async unmatch(matchId: string): Promise<void> {
    if (!isMockMode()) {
      // Keeps the match row with `endedAt` set so the pair cannot recur, and
      // deletes the thread and its messages for both sides.
      return http<void>("DELETE", `/matches/${encodeURIComponent(matchId)}`);
    }

    return request(() => {
      const match = matches.find((m) => m.id === matchId);
      if (!match) throw new ApiError("notFound");

      matches = matches.map((m) => (m.id === matchId ? { ...m, endedAt: nowIso() } : m));
      // The conversation goes with it — "this can't be undone" is literal.
      chatService.removeThreadSync(match.threadId);
    });
  },

  /**
   * The other side unmatched — mock-only, for the demo and for tests.
   *
   * Deliberately NOT `unmatch`: when *they* end it, your thread survives and
   * goes read-only, because deleting a conversation out from under someone with
   * no explanation is worse than leaving it there greyed out. `unmatch` above
   * is the symmetric case and does remove the thread, which is what
   * "this can't be undone" promises.
   */
  endMatchByThemSync(matchId: string): void {
    matches = matches.map((m) => (m.id === matchId ? { ...m, endedAt: nowIso() } : m));
  },

  /**
   * The active match with a specific person, if there is one.
   *
   * Exists because messaging is MATCH-GATED: a screen that wants to offer
   * "message this person" has to establish that a thread is allowed at all,
   * and the answer is a match. Returns null for a stranger, and for a pair
   * whose match has ended.
   *
   * Filtered client-side rather than through a dedicated endpoint — the list
   * is small, already fetched on the Chat tab, and `GET /matches` returns only
   * active matches anyway.
   */
  async getMatchWithUser(userId: string): Promise<Match | null> {
    const matches = await matchesService.listMatches();
    return matches.find((match) => !match.endedAt && match.userIds.includes(userId)) ?? null;
  },

  /**
   * The match that owns a thread, if it is still live.
   *
   * This is what decides whether the composer is shown: null means the other
   * person unmatched, and the thread goes read-only. It had NO real-API branch
   * and read the in-memory mock array in both modes — against the server that
   * array still holds only the mock seed, whose thread ids are `thread-01`
   * style, so a real Mongo thread id matched nothing and EVERY live
   * conversation rendered as "this person is no longer available".
   *
   * Filtered from `GET /matches` for the same reason `getMatchWithUser` is:
   * the list is small, already fetched by the Chat tab, and the endpoint
   * returns only active matches — so a missing row IS the read-only answer.
   */
  async getMatchForThread(threadId: string): Promise<Match | null> {
    if (!isMockMode()) {
      const live = await matchesService.listMatches();
      return live.find((m) => m.threadId === threadId && !m.endedAt) ?? null;
    }

    return request(() => {
      const match = matches.find((m) => m.threadId === threadId && !m.endedAt);
      return match ? { ...match } : null;
    });
  },

  __reset(): void {
    matches = SEEDED_MATCHES.map((m) => ({ ...m }));
  },
};
